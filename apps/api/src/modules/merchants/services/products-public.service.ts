import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Product, ProductDocument } from '../schemas/product.schema';
import { Merchant, MerchantApprovalStatus, MerchantDocument } from '../schemas/merchant.schema';
import { Topping, ToppingDocument } from '../schemas/topping.schema';
import { ProductOption, ProductOptionDocument } from '../schemas/product-option.schema';

import { GeoService } from 'src/modules/geo/services/geo.service';

@Injectable()
export class ProductsPublicService {
    constructor(
        @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
        @InjectModel(Merchant.name) private readonly merchantModel: Model<MerchantDocument>,
        @InjectModel(Topping.name) private readonly toppingModel: Model<ToppingDocument>,
        @InjectModel(ProductOption.name) private readonly optionModel: Model<ProductOptionDocument>,
        private readonly geo: GeoService, // ✅ thêm geo
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${name}`);
        return new Types.ObjectId(id);
    }

    private normalizeImages(images: any[]) {
        const arr = Array.isArray(images) ? images.slice() : [];
        arr.sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0));
        return arr
            .filter(Boolean)
            .map((x) => ({
                url: x.url,
                public_id: x.public_id,
                position: x.position ?? 0,
            }))
            .filter((x) => !!x.url);
    }

    /**
     * ✅ Copy logic từ MerchantsPublicService.getMerchantWithDistanceAndEta()
     */
    private async getMerchantWithDistanceAndEta(params: {
        merchantId: Types.ObjectId;
        lat?: number;
        lng?: number;
    }) {
        const { merchantId, lat, lng } = params;

        // 1) lấy merchant (ưu tiên $geoNear nếu có lat/lng)
        let m: any = null;

        if (typeof lat === 'number' && typeof lng === 'number') {
            const rows = await this.merchantModel.aggregate([
                {
                    $geoNear: {
                        near: { type: 'Point', coordinates: [lng, lat] },
                        key: 'location',
                        spherical: true,
                        distanceField: 'distance_m',
                        query: {
                            _id: merchantId,
                            deleted_at: null,
                            approval_status: MerchantApprovalStatus.APPROVED,
                            location: { $ne: null },
                        },
                    },
                },
                { $addFields: { distance_km: { $divide: ['$distance_m', 1000] } } },
                {
                    $project: {
                        name: 1,
                        logo_url: 1,
                        cover_image_url: 1,
                        address: 1,
                        category: 1,
                        average_rating: 1,
                        total_reviews: 1,
                        is_accepting_orders: 1,
                        average_prep_time_min: 1,
                        delivery_radius_km: 1,
                        distance_km: 1,
                        location: 1,
                    },
                },
            ]);

            m = rows?.[0] ?? null;
        }

        // fallback: nếu không có lat/lng hoặc merchant không có location -> findOne
        if (!m) {
            m = await this.merchantModel
                .findOne({
                    _id: merchantId,
                    deleted_at: null,
                    approval_status: MerchantApprovalStatus.APPROVED,
                })
                .select({
                    name: 1,
                    logo_url: 1,
                    cover_image_url: 1,
                    address: 1,
                    category: 1,
                    average_rating: 1,
                    total_reviews: 1,
                    is_accepting_orders: 1,
                    average_prep_time_min: 1,
                    delivery_radius_km: 1,
                    location: 1,
                })
                .lean();
        }

        if (!m) throw new NotFoundException('Merchant not found');

        const prep = Number(m.average_prep_time_min ?? 15);
        const radiusKm = Number(m.delivery_radius_km ?? 0);

        // mặc định (fallback)
        const straightKm = Number(m.distance_km ?? 0);
        let distanceKm = straightKm;

        let travelMin: number | null = null;

        // 2) gọi geo directions nếu đủ tọa độ
        const coords = m.location?.coordinates;
        if (
            typeof lat === 'number' &&
            typeof lng === 'number' &&
            Array.isArray(coords) &&
            coords.length === 2
        ) {
            const dest = { lng: Number(coords[0]), lat: Number(coords[1]) };

            try {
                const r = await this.geo.getEtaDirections({
                    origin: { lat, lng },
                    destination: dest,
                    mode: 'motorcycling',
                    new_admin: true,
                });

                if (r.ok) {
                    const routeKm = (Number(r.distance_m ?? 0) || 0) / 1000;
                    if (routeKm > 0) distanceKm = routeKm;

                    const sec = Number(r.duration_s ?? 0) || 0;
                    if (sec > 0) travelMin = Math.max(1, Math.ceil(sec / 60));
                }
            } catch {
                // ignore -> fallback
            }
        }

        // 3) fallback travelMin theo distanceKm
        if (travelMin == null) {
            // ~4 phút/km + 8 phút base, min 6
            travelMin = Math.max(6, Math.ceil(distanceKm * 4 + 8));
        }

        // buffer nhỏ
        const etaMin = prep + travelMin + 2;

        // ⚠️ nếu không có lat/lng thì distanceKm=0 => canDeliver dễ sai
        // => cho false để FE không hiểu nhầm
        const hasGeo = typeof lat === 'number' && typeof lng === 'number';
        const canDeliver = hasGeo && radiusKm > 0 ? distanceKm <= radiusKm : false;

        return {
            merchant: m,
            distanceKm,
            canDeliver,
            etaMin,
            etaAt: new Date(Date.now() + etaMin * 60 * 1000).toISOString(),
        };
    }

    async getDetail(productId: string, geo?: { lat?: number; lng?: number }) {
        const pid = this.oid(productId, 'productId');

        const product = await this.productModel
            .findOne({ _id: pid, is_active: true, deleted_at: null })
            .lean();

        if (!product) throw new NotFoundException('Product not found');

        // ✅ merchant + eta/distance bằng GeoService (y hệt merchant detail)
        const { merchant, distanceKm, canDeliver, etaMin, etaAt } =
            await this.getMerchantWithDistanceAndEta({
                merchantId: product.merchant_id as any,
                lat: geo?.lat,
                lng: geo?.lng,
            });

        // images sort theo position
        const images = this.normalizeImages(product.images);

        // pricing
        const base = Number(product.base_price ?? 0);
        const sale = Number(product.sale_price ?? 0);
        const finalPrice = sale > 0 && sale < base ? sale : base;
        const discountAmount = base > finalPrice ? base - finalPrice : 0;

        // has options?
        const hasOptions = Boolean(
            await this.optionModel.exists({ product_id: pid, deleted_at: null }),
        );

        // toppings theo product
        let toppings: any[] = [];
        const toppingIds = (product.topping_ids ?? []).filter((x) => x);
        if (toppingIds.length) {
            toppings = await this.toppingModel
                .find({
                    _id: { $in: toppingIds },
                    merchant_id: product.merchant_id,
                    is_active: true,
                    deleted_at: null,
                })
                .sort({ sort_order: 1, created_at: 1 })
                .select({ name: 1, price: 1, is_available: 1, image_url: 1, max_quantity: 1, description: 1 })
                .lean();
        }

        return {
            product: {
                id: String(product._id),
                merchant_id: String(product.merchant_id),
                category_id: String(product.category_id),
                name: product.name,
                description: product.description ?? '',
                images,
                base_price: base,
                sale_price: sale,
                final_price: finalPrice,
                discount_amount: discountAmount,
                is_available: product.is_available !== false,
                total_sold: Number(product.total_sold ?? 0),
                average_rating: Number(product.average_rating ?? 0),
                total_reviews: Number(product.total_reviews ?? 0),
                has_options: hasOptions,
            },
            merchant: {
                id: String(merchant._id),
                name: merchant.name,
                logo_url: merchant.logo_url ?? null,
                address: merchant.address ?? null,
                category: merchant.category ?? null,
                average_rating: Number(merchant.average_rating ?? 0),
                total_reviews: Number(merchant.total_reviews ?? 0),
                is_accepting_orders: !!merchant.is_accepting_orders,
                delivery_radius_km: Number(merchant.delivery_radius_km ?? 0),
                distance_km: Number(distanceKm.toFixed(2)),
                can_deliver: canDeliver,
                eta_min: etaMin,
                eta_at: etaAt,
            },
            toppings: toppings.map((t: any) => ({
                id: String(t._id),
                name: t.name,
                description: t.description ?? null,
                price: Number(t.price ?? 0),
                is_available: t.is_available !== false,
                max_quantity: Number(t.max_quantity ?? 1),
                image_url: t.image_url ?? null,
            })),
        };
    }
}
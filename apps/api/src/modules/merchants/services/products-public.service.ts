import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Product, ProductDocument } from '../schemas/product.schema';
import { Merchant, MerchantDocument, MerchantApprovalStatus } from '../schemas/merchant.schema';
import { Topping, ToppingDocument } from '../schemas/topping.schema';
import { ProductOption, ProductOptionDocument } from '../schemas/product-option.schema';

@Injectable()
export class ProductsPublicService {
    constructor(
        @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
        @InjectModel(Merchant.name) private readonly merchantModel: Model<MerchantDocument>,
        @InjectModel(Topping.name) private readonly toppingModel: Model<ToppingDocument>,
        @InjectModel(ProductOption.name) private readonly optionModel: Model<ProductOptionDocument>,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${name}`);
        return new Types.ObjectId(id);
    }

    async getDetail(productId: string, geo?: { lat?: number; lng?: number }) {
        const pid = this.oid(productId, 'productId');

        const product = await this.productModel
            .findOne({ _id: pid, is_active: true, deleted_at: null })
            .lean();

        if (!product) throw new NotFoundException('Product not found');

        const merchant = await this.merchantModel
            .findOne({
                _id: product.merchant_id,
                deleted_at: null,
                approval_status: MerchantApprovalStatus.APPROVED,
            })
            .lean();

        if (!merchant) throw new NotFoundException('Merchant not found');

        // images sort theo position
        const images = [...(product.images ?? [])].sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0),
        );

        // pricing
        const base = Number(product.base_price ?? 0);
        const sale = Number(product.sale_price ?? 0);
        const finalPrice = sale > 0 && sale < base ? sale : base;
        const discountAmount = base > finalPrice ? base - finalPrice : 0;

        // has options?
        const hasOptions = Boolean(
            await this.optionModel.exists({ product_id: pid, deleted_at: null }),
        );

        // toppings
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
                .select({ name: 1, price: 1, is_available: 1, image_url: 1 })
                .lean();
        }

        // distance/eta (tính đơn giản bằng haversine)
        const { distance_km, eta_min } = this.computeDistanceEta(merchant, geo?.lat, geo?.lng);

        return {
            product: {
                id: String(product._id),
                merchant_id: String(product.merchant_id),
                category_id: String(product.category_id),
                name: product.name,
                description: product.description ?? '',
                images: images.map((x) => ({
                    url: x.url,
                    public_id: x.public_id,
                    position: x.position ?? 0,
                })),
                base_price: base,
                sale_price: sale,
                final_price: finalPrice,
                discount_amount: discountAmount,
                is_available: !!product.is_available,
                is_active: !!product.is_active,
                total_sold: Number(product.total_sold ?? 0),
                average_rating: Number(product.average_rating ?? 0),
                total_reviews: Number(product.total_reviews ?? 0),
                has_options: hasOptions,
            },
            merchant: {
                id: String(merchant._id),
                name: merchant.name,
                logo_url: merchant.logo_url,
                address: merchant.address,
                average_rating: Number(merchant.average_rating ?? 0),
                total_reviews: Number(merchant.total_reviews ?? 0),
                is_accepting_orders: !!merchant.is_accepting_orders,
                delivery_radius_km: Number(merchant.delivery_radius_km ?? 0),
                average_prep_time_min: Number(merchant.average_prep_time_min ?? 0),
                distance_km,
                eta_min,
            },
            toppings: toppings.map((t) => ({
                id: String(t._id),
                name: t.name,
                price: Number(t.price ?? 0),
                is_available: !!t.is_available,
                image_url: t.image_url ?? null,
            })),
        };
    }

    private computeDistanceEta(merchant: any, lat?: number, lng?: number) {
        const prep = Number(merchant?.average_prep_time_min ?? 0);

        const coords = merchant?.location?.coordinates;
        if (!coords || lat == null || lng == null) {
            // không có vị trí => trả ETA theo prep time
            return { distance_km: 0, eta_min: prep };
        }

        const [mLng, mLat] = coords as [number, number];
        const distanceKm = this.haversineKm(lat, lng, mLat, mLng);

        // ETA: prep + ~4 phút/km (bạn chỉnh hệ số tuỳ app)
        const eta = Math.max(5, Math.round(prep + distanceKm * 4));
        return {
            distance_km: Number(distanceKm.toFixed(2)),
            eta_min: eta,
        };
    }

    private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371; // km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
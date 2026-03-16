import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';

import {
    Merchant,
    MerchantApprovalStatus,
    MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import {
    Product,
    ProductDocument,
} from '../../merchants/schemas/product.schema';
import {
    ProductOption,
    ProductOptionDocument,
} from '../../merchants/schemas/product-option.schema';


import {
    escapeRegex,
    splitSearchTokens,
} from '../utils/search-normalizer.util';
import { SearchListQueryDto, SearchOverviewQueryDto, SearchTabDto } from '../dtos/search-query.dto';

type Coords = {
    lat: number;
    lng: number;
};

type MerchantSearchExecParams = {
    q: string;
    tab: SearchTabDto;
    lat: number | null;
    lng: number | null;
    page: number;
    limit: number;
};

type ProductSearchExecParams = {
    q: string;
    tab: SearchTabDto;
    lat: number | null;
    lng: number | null;
    page: number;
    limit: number;
};

@Injectable()
export class SearchService {
    constructor(
        @InjectModel(Merchant.name)
        private readonly merchantModel: Model<MerchantDocument>,
        @InjectModel(Product.name)
        private readonly productModel: Model<ProductDocument>,
        @InjectModel(ProductOption.name)
        private readonly productOptionModel: Model<ProductOptionDocument>,
    ) { }

    async searchOverview(query: SearchOverviewQueryDto) {
        const q = (query.q ?? '').trim();
        if (!q) {
            return {
                query: '',
                tab: query.tab ?? SearchTabDto.ALL,
                merchants: this.emptyPagedResult(1, 10),
                products: this.emptyPagedResult(1, 10),
            };
        }

        const tab = query.tab ?? SearchTabDto.ALL;
        const lat = this.parseNullableNumber(query.lat);
        const lng = this.parseNullableNumber(query.lng);

        const merchantPage = this.parsePage(query.merchant_page, 1);
        const merchantLimit = this.parseLimit(query.merchant_limit, 10, 20);

        const productPage = this.parsePage(query.product_page, 1);
        const productLimit = this.parseLimit(query.product_limit, 10, 20);

        const [merchants, products] = await Promise.all([
            this.searchMerchantsInternal({
                q,
                tab,
                lat,
                lng,
                page: merchantPage,
                limit: merchantLimit,
            }),
            this.searchProductsInternal({
                q,
                tab,
                lat,
                lng,
                page: productPage,
                limit: productLimit,
            }),
        ]);

        return {
            query: q,
            tab,
            merchants,
            products,
        };
    }

    async searchMerchants(query: SearchListQueryDto) {
        const q = (query.q ?? '').trim();
        const tab = query.tab ?? SearchTabDto.ALL;
        const lat = this.parseNullableNumber(query.lat);
        const lng = this.parseNullableNumber(query.lng);
        const page = this.parsePage(query.page, 1);
        const limit = this.parseLimit(query.limit, 10, 20);

        return this.searchMerchantsInternal({
            q,
            tab,
            lat,
            lng,
            page,
            limit,
        });
    }

    async searchProducts(query: SearchListQueryDto) {
        const q = (query.q ?? '').trim();
        const tab = query.tab ?? SearchTabDto.ALL;
        const lat = this.parseNullableNumber(query.lat);
        const lng = this.parseNullableNumber(query.lng);
        const page = this.parsePage(query.page, 1);
        const limit = this.parseLimit(query.limit, 10, 20);

        return this.searchProductsInternal({
            q,
            tab,
            lat,
            lng,
            page,
            limit,
        });
    }

    private async searchMerchantsInternal(params: MerchantSearchExecParams) {
        const { q, tab, lat, lng, page, limit } = params;

        if (!q) return this.emptyPagedResult(page, limit);

        if (tab === SearchTabDto.NEAR_ME && (lat == null || lng == null)) {
            return this.emptyPagedResult(page, limit);
        }

        const skip = (page - 1) * limit;
        const hasCoords = lat != null && lng != null;

        const nameFilter = this.buildNameSearchFilter(q);

        const baseMatch: Record<string, any> = {
            deleted_at: null,
            approval_status: MerchantApprovalStatus.APPROVED,
            ...(nameFilter ?? {}),
        };

        const pipeline: PipelineStage[] = [];

        if (hasCoords) {
            pipeline.push({
                $geoNear: {
                    near: { type: 'Point', coordinates: [lng!, lat!] },
                    key: 'location',
                    spherical: true,
                    distanceField: 'distance_m',
                    query: baseMatch,
                },
            });

            pipeline.push({
                $addFields: {
                    distance_km: { $divide: ['$distance_m', 1000] },
                },
            });

            pipeline.push({
                $addFields: {
                    can_deliver: {
                        $cond: [
                            { $gt: ['$delivery_radius_km', 0] },
                            { $lte: ['$distance_km', '$delivery_radius_km'] },
                            false,
                        ],
                    },
                },
            });

            if (tab === SearchTabDto.NEAR_ME) {
                pipeline.push({
                    $match: {
                        can_deliver: true,
                    },
                });
            }

            pipeline.push({
                $sort:
                    tab === SearchTabDto.NEAR_ME
                        ? { distance_km: 1, total_orders: -1, average_rating: -1 }
                        : { distance_km: 1, total_orders: -1, average_rating: -1 },
            });
        } else {
            pipeline.push({ $match: baseMatch });
            pipeline.push({
                $sort: {
                    total_orders: -1,
                    average_rating: -1,
                    total_reviews: -1,
                    created_at: -1,
                },
            });
        }

        pipeline.push(
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    logo_url: 1,
                    cover_image_url: 1,
                    category: 1,
                    address: 1,
                    average_rating: 1,
                    total_reviews: 1,
                    is_accepting_orders: 1,
                    average_prep_time_min: 1,
                    delivery_radius_km: 1,
                    distance_km: 1,
                    can_deliver: 1,
                },
            },
            { $skip: skip },
            { $limit: limit + 1 },
        );

        const rows = await this.merchantModel.aggregate(pipeline);
        const hasMore = rows.length > limit;
        const pageRows = hasMore ? rows.slice(0, limit) : rows;

        const items = pageRows.map((row: any) => {
            const distanceKm =
                typeof row.distance_km === 'number'
                    ? this.round2(row.distance_km)
                    : null;

            const prep = Number(row.average_prep_time_min ?? 15);
            const eta = this.buildEta(distanceKm, prep);

            return {
                id: String(row._id),
                name: row.name ?? '',
                description: row.description ?? null,
                logo_url: row.logo_url ?? null,
                cover_image_url: row.cover_image_url ?? null,
                category: row.category ?? null,
                address: row.address ?? null,
                average_rating: Number(row.average_rating ?? 0),
                total_reviews: Number(row.total_reviews ?? 0),
                is_accepting_orders: !!row.is_accepting_orders,
                average_prep_time_min: prep,
                delivery_radius_km: Number(row.delivery_radius_km ?? 0),
                distance_km: distanceKm,
                eta_min: eta.etaMin,
                eta_at: eta.etaAt,
                can_deliver:
                    typeof row.can_deliver === 'boolean' ? row.can_deliver : false,
            };
        });

        return {
            items,
            page,
            limit,
            has_more: hasMore,
        };
    }

    private async searchProductsInternal(params: ProductSearchExecParams) {
        const { q, tab, lat, lng, page, limit } = params;

        if (!q) return this.emptyPagedResult(page, limit);

        if (tab === SearchTabDto.NEAR_ME && (lat == null || lng == null)) {
            return this.emptyPagedResult(page, limit);
        }

        const skip = (page - 1) * limit;
        const hasCoords = lat != null && lng != null;

        const nameFilter = this.buildNameSearchFilter(q);

        let orderedNearbyMerchantIds: Types.ObjectId[] = [];
        if (tab === SearchTabDto.NEAR_ME && hasCoords) {
            orderedNearbyMerchantIds = await this.getNearbyDeliverableMerchantIds({
                lat: lat!,
                lng: lng!,
            });

            if (!orderedNearbyMerchantIds.length) {
                return this.emptyPagedResult(page, limit);
            }
        }

        const baseMatch: Record<string, any> = {
            deleted_at: null,
            is_active: true,
            ...(nameFilter ?? {}),
        };

        if (tab === SearchTabDto.NEAR_ME) {
            baseMatch.merchant_id = { $in: orderedNearbyMerchantIds };
        }

        const pipeline: PipelineStage[] = [
            { $match: baseMatch },
            {
                $lookup: {
                    from: 'merchants',
                    localField: 'merchant_id',
                    foreignField: '_id',
                    as: 'merchant',
                },
            },
            {
                $unwind: '$merchant',
            },
            {
                $match: {
                    'merchant.deleted_at': null,
                    'merchant.approval_status': MerchantApprovalStatus.APPROVED,
                },
            },
        ];

        if (tab === SearchTabDto.NEAR_ME && orderedNearbyMerchantIds.length) {
            pipeline.push({
                $addFields: {
                    merchant_sort_index: {
                        $indexOfArray: [orderedNearbyMerchantIds, '$merchant_id'],
                    },
                },
            });

            pipeline.push({
                $sort: {
                    merchant_sort_index: 1,
                    total_sold: -1,
                    average_rating: -1,
                    created_at: -1,
                },
            });
        } else {
            pipeline.push({
                $sort: {
                    total_sold: -1,
                    average_rating: -1,
                    total_reviews: -1,
                    created_at: -1,
                },
            });
        }

        pipeline.push(
            {
                $project: {
                    _id: 1,
                    merchant_id: 1,
                    category_id: 1,
                    name: 1,
                    description: 1,
                    images: 1,
                    base_price: 1,
                    sale_price: 1,
                    is_available: 1,
                    total_sold: 1,
                    average_rating: 1,
                    total_reviews: 1,
                    merchant: {
                        _id: '$merchant._id',
                        name: '$merchant.name',
                        logo_url: '$merchant.logo_url',
                        address: '$merchant.address',
                        average_prep_time_min: '$merchant.average_prep_time_min',
                        delivery_radius_km: '$merchant.delivery_radius_km',
                    },
                },
            },
            { $skip: skip },
            { $limit: limit + 1 },
        );

        const rows = await this.productModel.aggregate(pipeline);
        const hasMore = rows.length > limit;
        const pageRows = hasMore ? rows.slice(0, limit) : rows;

        const productIds = pageRows.map((row: any) => row._id);
        const merchantIds = this.uniqueObjectIds(
            pageRows.map((row: any) => row.merchant_id),
        );

        const [optionProductIds, merchantMetaMap] = await Promise.all([
            this.getProductIdsHasOptions(productIds),
            this.getMerchantMetaMap(merchantIds, hasCoords ? { lat: lat!, lng: lng! } : null),
        ]);

        const optionIdSet = new Set(optionProductIds.map((id) => String(id)));

        const items = pageRows
            .map((row: any) => {
                const merchantMeta = merchantMetaMap.get(String(row.merchant_id));
                if (!merchantMeta && tab === SearchTabDto.NEAR_ME) return null;

                const basePrice = Number(row.base_price ?? 0);
                const salePrice = Number(row.sale_price ?? 0);
                const finalPrice =
                    salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
                const discountAmount =
                    basePrice > finalPrice ? basePrice - finalPrice : 0;
                const discountPercent =
                    discountAmount > 0 && basePrice > 0
                        ? Math.round((discountAmount / basePrice) * 100)
                        : 0;

                return {
                    id: String(row._id),
                    name: row.name ?? '',
                    description: row.description ?? null,
                    image_url: this.pickFirstImage(row.images),
                    base_price: basePrice,
                    sale_price: salePrice,
                    final_price: finalPrice,
                    discount_amount: discountAmount,
                    discount_percent: discountPercent,
                    is_available: row.is_available !== false,
                    average_rating: Number(row.average_rating ?? 0),
                    total_reviews: Number(row.total_reviews ?? 0),
                    total_sold: Number(row.total_sold ?? 0),
                    has_options: optionIdSet.has(String(row._id)),
                    merchant: {
                        id: String(row.merchant?._id ?? row.merchant_id),
                        name: row.merchant?.name ?? '',
                        logo_url: row.merchant?.logo_url ?? null,
                        address: row.merchant?.address ?? null,
                    },
                    distance_km: merchantMeta?.distance_km ?? null,
                    eta_min: merchantMeta?.eta_min ?? null,
                    can_deliver: merchantMeta?.can_deliver ?? false,
                };
            })
            .filter(Boolean);

        return {
            items,
            page,
            limit,
            has_more: hasMore,
        };
    }

    private async getNearbyDeliverableMerchantIds(coords: Coords) {
        const rows = await this.merchantModel.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [coords.lng, coords.lat] },
                    key: 'location',
                    spherical: true,
                    distanceField: 'distance_m',
                    query: {
                        deleted_at: null,
                        approval_status: MerchantApprovalStatus.APPROVED,
                    },
                    maxDistance: 50000,
                },
            },
            {
                $addFields: {
                    distance_km: { $divide: ['$distance_m', 1000] },
                },
            },
            {
                $addFields: {
                    can_deliver: {
                        $cond: [
                            { $gt: ['$delivery_radius_km', 0] },
                            { $lte: ['$distance_km', '$delivery_radius_km'] },
                            false,
                        ],
                    },
                },
            },
            {
                $match: {
                    can_deliver: true,
                },
            },
            {
                $project: {
                    _id: 1,
                },
            },
        ]);

        return rows.map((row: any) => row._id as Types.ObjectId);
    }

    private async getProductIdsHasOptions(productIds: any[]) {
        if (!productIds.length) return [];

        return this.productOptionModel.distinct('product_id', {
            product_id: { $in: productIds },
            deleted_at: null,
        });
    }

    private async getMerchantMetaMap(
        merchantIds: Types.ObjectId[],
        coords: Coords | null,
    ) {
        const map = new Map<
            string,
            {
                distance_km: number | null;
                eta_min: number | null;
                eta_at: string | null;
                can_deliver: boolean;
            }
        >();

        if (!merchantIds.length) return map;

        if (!coords) {
            const rows = await this.merchantModel
                .find({
                    _id: { $in: merchantIds },
                    deleted_at: null,
                    approval_status: MerchantApprovalStatus.APPROVED,
                })
                .select({
                    _id: 1,
                })
                .lean();

            for (const row of rows) {
                map.set(String(row._id), {
                    distance_km: null,
                    eta_min: null,
                    eta_at: null,
                    can_deliver: false,
                });
            }

            return map;
        }

        const rows = await this.merchantModel.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [coords.lng, coords.lat] },
                    key: 'location',
                    spherical: true,
                    distanceField: 'distance_m',
                    query: {
                        _id: { $in: merchantIds },
                        deleted_at: null,
                        approval_status: MerchantApprovalStatus.APPROVED,
                    },
                },
            },
            {
                $addFields: {
                    distance_km: { $divide: ['$distance_m', 1000] },
                },
            },
            {
                $project: {
                    _id: 1,
                    average_prep_time_min: 1,
                    delivery_radius_km: 1,
                    distance_km: 1,
                },
            },
        ]);

        for (const row of rows) {
            const distanceKm =
                typeof row.distance_km === 'number'
                    ? this.round2(row.distance_km)
                    : null;
            const prep = Number(row.average_prep_time_min ?? 15);
            const eta = this.buildEta(distanceKm, prep);
            const radius = Number(row.delivery_radius_km ?? 0);

            map.set(String(row._id), {
                distance_km: distanceKm,
                eta_min: eta.etaMin,
                eta_at: eta.etaAt,
                can_deliver:
                    distanceKm != null && radius > 0 ? distanceKm <= radius : false,
            });
        }

        return map;
    }

    private buildNameSearchFilter(q: string) {
        const tokens = splitSearchTokens(q);
        if (!tokens.length) return null;

        return {
            $and: tokens.map((token) => ({
                name_search: {
                    $regex: escapeRegex(token),
                    $options: 'i',
                },
            })),
        };
    }

    private buildEta(distanceKm: number | null, prepTimeMin: number) {
        if (distanceKm == null) {
            return {
                etaMin: null,
                etaAt: null,
            };
        }

        const travelMin = Math.max(6, Math.ceil(distanceKm * 4 + 8));
        const etaMin = prepTimeMin + travelMin + 2;

        return {
            etaMin,
            etaAt: new Date(Date.now() + etaMin * 60 * 1000).toISOString(),
        };
    }

    private pickFirstImage(images: any[]): string | null {
        if (!Array.isArray(images) || !images.length) return null;

        const sorted = images
            .filter(Boolean)
            .slice()
            .sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0));

        return sorted[0]?.url ?? null;
    }

    private uniqueObjectIds(values: any[]) {
        const map = new Map<string, Types.ObjectId>();

        for (const value of values) {
            if (!value) continue;
            const id = String(value);
            if (!Types.ObjectId.isValid(id)) continue;
            if (!map.has(id)) {
                map.set(id, new Types.ObjectId(id));
            }
        }

        return [...map.values()];
    }

    private parseNullableNumber(value?: string) {
        if (value == null || value === '') return null;
        const n = Number(value);
        if (!Number.isFinite(n)) {
            throw new BadRequestException(`Invalid number: ${value}`);
        }
        return n;
    }

    private parsePage(value: string | undefined, fallback = 1) {
        const n = Number(value ?? fallback);
        if (!Number.isFinite(n) || n < 1) return fallback;
        return Math.floor(n);
    }

    private parseLimit(value: string | undefined, fallback = 10, max = 20) {
        const n = Number(value ?? fallback);
        if (!Number.isFinite(n) || n < 1) return fallback;
        return Math.min(Math.floor(n), max);
    }

    private round2(value: number) {
        return Math.round(value * 100) / 100;
    }

    private emptyPagedResult(page: number, limit: number) {
        return {
            items: [],
            page,
            limit,
            has_more: false,
        };
    }
}
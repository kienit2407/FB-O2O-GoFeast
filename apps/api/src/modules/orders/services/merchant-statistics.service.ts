import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
    Order,
    OrderDocument,
    OrderStatus,
} from '../schemas/order.schema';

import {
    Merchant,
    MerchantDocument,
} from 'src/modules/merchants/schemas/merchant.schema';

@Injectable()
export class MerchantStatisticsService {
    private readonly tz = 'Asia/Ho_Chi_Minh';

    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,
        @InjectModel(Merchant.name)
        private readonly merchantModel: Model<MerchantDocument>,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${name}`);
        }
        return new Types.ObjectId(id);
    }

    private async getMerchantByOwnerUserId(ownerUserId: string) {
        const merchant = await this.merchantModel
            .findOne({
                owner_user_id: this.oid(ownerUserId, 'ownerUserId'),
                deleted_at: null,
            })
            .lean();

        if (!merchant) {
            throw new NotFoundException('Merchant not found');
        }

        return merchant;
    }

    private getPeriodDays(period: '7d' | '30d' | '90d') {
        switch (period) {
            case '30d':
                return 30;
            case '90d':
                return 90;
            case '7d':
            default:
                return 7;
        }
    }

    private startOfDay(date: Date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    private addDays(date: Date, days: number) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }

    private ymd(date: Date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    private getPeriodRange(period: '7d' | '30d' | '90d') {
        const days = this.getPeriodDays(period);
        const today = this.startOfDay(new Date());
        const start = this.addDays(today, -(days - 1));
        const endExclusive = this.addDays(today, 1);

        const labels: string[] = [];
        let cursor = new Date(start);

        while (cursor < endExclusive) {
            labels.push(this.ymd(cursor));
            cursor = this.addDays(cursor, 1);
        }

        return {
            period,
            days,
            start,
            endExclusive,
            labels,
        };
    }

    private percentChange(current: number, previous: number) {
        if (previous <= 0) {
            return current > 0 ? 100 : 0;
        }
        return Number((((current - previous) / previous) * 100).toFixed(1));
    }

    private async getRevenueSeries(
        merchantId: Types.ObjectId,
        period: '7d' | '30d' | '90d',
    ) {
        const { start, endExclusive, labels } = this.getPeriodRange(period);

        const rows = await this.orderModel.aggregate([
            {
                $match: {
                    merchant_id: merchantId,
                    status: OrderStatus.COMPLETED,
                    updated_at: {
                        $gte: start,
                        $lt: endExclusive,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$updated_at',
                            timezone: this.tz,
                        },
                    },
                    revenue: {
                        $sum: {
                            $ifNull: ['$settlement.merchant_net', 0],
                        },
                    },
                    gross_revenue: {
                        $sum: {
                            $ifNull: ['$settlement.merchant_gross', '$subtotal'],
                        },
                    },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const rowMap = new Map(
            rows.map((x: any) => [
                String(x._id),
                {
                    date: String(x._id),
                    revenue: Number(x.revenue ?? 0),
                    gross_revenue: Number(x.gross_revenue ?? 0),
                    orders: Number(x.orders ?? 0),
                },
            ]),
        );

        return labels.map((date) => {
            const found = rowMap.get(date);
            return (
                found ?? {
                    date,
                    revenue: 0,
                    gross_revenue: 0,
                    orders: 0,
                }
            );
        });
    }

    private async getBestSellerRows(
        merchantId: Types.ObjectId,
        period: '7d' | '30d' | '90d',
    ) {
        const { start, endExclusive } = this.getPeriodRange(period);

        const rows = await this.orderModel.aggregate([
            {
                $match: {
                    merchant_id: merchantId,
                    status: OrderStatus.COMPLETED,
                    updated_at: {
                        $gte: start,
                        $lt: endExclusive,
                    },
                },
            },
            { $unwind: '$items' },
            {
                $match: {
                    'items.item_type': { $ne: 'topping' },
                    'items.product_id': { $ne: null },
                },
            },
            {
                $group: {
                    _id: {
                        product_id: '$items.product_id',
                        product_name: '$items.product_name',
                    },
                    quantity: {
                        $sum: { $ifNull: ['$items.quantity', 0] },
                    },
                    revenue: {
                        $sum: { $ifNull: ['$items.item_total', 0] },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    product_id: { $toString: '$_id.product_id' },
                    product_name: {
                        $ifNull: ['$_id.product_name', 'Sản phẩm'],
                    },
                    quantity: { $toInt: '$quantity' },
                    revenue: { $round: ['$revenue', 0] },
                    avg_price: {
                        $cond: [
                            { $gt: ['$quantity', 0] },
                            { $round: [{ $divide: ['$revenue', '$quantity'] }, 0] },
                            0,
                        ],
                    },
                },
            },
            {
                $sort: {
                    quantity: -1,
                    revenue: -1,
                    product_name: 1,
                },
            },
        ]);

        return rows.map((x: any) => ({
            product_id: String(x.product_id),
            product_name: String(x.product_name ?? ''),
            quantity: Number(x.quantity ?? 0),
            revenue: Number(x.revenue ?? 0),
            avg_price: Number(x.avg_price ?? 0),
        }));
    }

    async getDashboard(ownerUserId: string) {
        const merchant = await this.getMerchantByOwnerUserId(ownerUserId);

        const [revenueChart, bestSellerRows, newOrders, preparingOrders] =
            await Promise.all([
                this.getRevenueSeries(merchant._id, '7d'),
                this.getBestSellerRows(merchant._id, '7d'),
                this.orderModel.countDocuments({
                    merchant_id: merchant._id,
                    status: OrderStatus.PENDING,
                }),
                this.orderModel.countDocuments({
                    merchant_id: merchant._id,
                    status: {
                        $in: [
                            OrderStatus.CONFIRMED,
                            OrderStatus.PREPARING,
                            OrderStatus.READY_FOR_PICKUP,
                        ],
                    },
                }),
            ]);

        const today = revenueChart[revenueChart.length - 1] ?? {
            revenue: 0,
            gross_revenue: 0,
            orders: 0,
            date: this.ymd(new Date()),
        };

        const yesterday = revenueChart[revenueChart.length - 2] ?? {
            revenue: 0,
            gross_revenue: 0,
            orders: 0,
            date: '',
        };

        return {
            summary: {
                today_revenue: today.revenue,
                today_gross_revenue: today.gross_revenue,
                yesterday_revenue: yesterday.revenue,
                revenue_change_pct: this.percentChange(
                    today.revenue,
                    yesterday.revenue,
                ),
                new_orders: Number(newOrders ?? 0),
                preparing_orders: Number(preparingOrders ?? 0),
                average_rating: Number(merchant.average_rating ?? 0),
                total_reviews: Number(merchant.total_reviews ?? 0),
                average_prep_time_min: Number(merchant.average_prep_time_min ?? 0),
            },
            revenueChart,
            best_sellers: bestSellerRows.slice(0, 5),
        };
    }

    async getRevenueReport(
        ownerUserId: string,
        query: { period?: '7d' | '30d' | '90d' },
    ) {
        const merchant = await this.getMerchantByOwnerUserId(ownerUserId);
        const period = query.period ?? '7d';
        const days = this.getPeriodDays(period);

        const chart = await this.getRevenueSeries(merchant._id, period);

        const totalRevenue = chart.reduce((sum, x) => sum + x.revenue, 0);
        const totalGrossRevenue = chart.reduce(
            (sum, x) => sum + x.gross_revenue,
            0,
        );
        const totalOrders = chart.reduce((sum, x) => sum + x.orders, 0);

        const lastDay = chart[chart.length - 1] ?? {
            revenue: 0,
            gross_revenue: 0,
            orders: 0,
            date: '',
        };

        const prevDay = chart[chart.length - 2] ?? {
            revenue: 0,
            gross_revenue: 0,
            orders: 0,
            date: '',
        };

        return {
            period,
            summary: {
                total_revenue: totalRevenue,
                total_gross_revenue: totalGrossRevenue,
                total_orders: totalOrders,
                avg_order_value:
                    totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
                avg_orders_per_day:
                    days > 0 ? Number((totalOrders / days).toFixed(1)) : 0,
                revenue_change_pct: this.percentChange(
                    lastDay.revenue,
                    prevDay.revenue,
                ),
            },
            chart,
            breakdown: [...chart].reverse(),
        };
    }

    async getBestSellers(
        ownerUserId: string,
        query: { period?: '7d' | '30d' | '90d'; limit?: number },
    ) {
        const merchant = await this.getMerchantByOwnerUserId(ownerUserId);
        const period = query.period ?? '7d';
        const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 50);

        const rows = await this.getBestSellerRows(merchant._id, period);

        const totalQuantity = rows.reduce((sum, x) => sum + x.quantity, 0);
        const totalRevenue = rows.reduce((sum, x) => sum + x.revenue, 0);
        const top = rows[0] ?? null;

        return {
            period,
            summary: {
                total_quantity: totalQuantity,
                total_revenue: totalRevenue,
                top_product_name: top?.product_name ?? null,
                top_product_quantity: top?.quantity ?? 0,
                top_product_revenue: top?.revenue ?? 0,
            },
            items: rows.slice(0, limit),
        };
    }
}
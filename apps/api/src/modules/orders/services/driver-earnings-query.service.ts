import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
    Order,
    OrderDocument,
    OrderStatus,
    OrderType,
} from '../schemas/order.schema';
import {
    DriverProfile,
    DriverProfileDocument,
} from 'src/modules/drivers/schemas/driver-profile.schema';
import {
    DriverEarningsQueryDto,
    DriverEarningsRange,
} from '../dtos/driver-earnings.query.dto';

type EarningsHistoryItemType = 'trip' | 'deduction';

@Injectable()
export class DriverEarningsQueryService {
    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,
        @InjectModel(DriverProfile.name)
        private readonly driverProfileModel: Model<DriverProfileDocument>,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${name}`);
        }
        return new Types.ObjectId(id);
    }

    private formatYmd(date: Date) {
        const y = date.getFullYear();
        const m = `${date.getMonth() + 1}`.padStart(2, '0');
        const d = `${date.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    private resolvePeriod(range: DriverEarningsRange, date?: string) {
        let base: Date;

        if (date) {
            base = new Date(`${date}T00:00:00`);
            if (Number.isNaN(base.getTime())) {
                throw new BadRequestException('Invalid date');
            }
        } else {
            base = new Date();
        }

        const dayStart = new Date(
            base.getFullYear(),
            base.getMonth(),
            base.getDate(),
            0,
            0,
            0,
            0,
        );

        let from = new Date(dayStart);
        let toExclusive = new Date(dayStart);

        switch (range) {
            case DriverEarningsRange.DAY: {
                toExclusive.setDate(toExclusive.getDate() + 1);
                break;
            }

            case DriverEarningsRange.WEEK: {
                const jsWeekday = from.getDay(); // 0 = Sunday, 1 = Monday
                const diffToMonday = jsWeekday === 0 ? 6 : jsWeekday - 1;
                from.setDate(from.getDate() - diffToMonday);

                toExclusive = new Date(from);
                toExclusive.setDate(toExclusive.getDate() + 7);
                break;
            }

            case DriverEarningsRange.MONTH: {
                from = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
                toExclusive = new Date(
                    base.getFullYear(),
                    base.getMonth() + 1,
                    1,
                    0,
                    0,
                    0,
                    0,
                );
                break;
            }

            default:
                throw new BadRequestException('Invalid range');
        }

        return {
            range,
            date: this.formatYmd(base),
            from,
            toExclusive,
            to: new Date(toExclusive.getTime() - 1),
        };
    }

    private getCompletedAt(order: any): Date {
        const history = Array.isArray(order?.status_history) ? order.status_history : [];

        const completed = history
            .filter((x: any) => x?.status === OrderStatus.COMPLETED && x?.changed_at)
            .sort(
                (a: any, b: any) =>
                    new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
            )[0];

        if (completed?.changed_at) {
            return new Date(completed.changed_at);
        }

        if (order?.updated_at) return new Date(order.updated_at);
        if (order?.created_at) return new Date(order.created_at);

        return new Date();
    }

    private buildOrderFilter(driverUserId: string, query: DriverEarningsQueryDto) {
        const period = this.resolvePeriod(query.range, query.date);

        const filter: any = {
            driver_id: this.oid(driverUserId, 'driverUserId'),
            status: OrderStatus.COMPLETED,
            status_history: {
                $elemMatch: {
                    status: OrderStatus.COMPLETED,
                    changed_at: {
                        $gte: period.from,
                        $lt: period.toExclusive,
                    },
                },
            },
        };

        return { filter, period };
    }

    async getSummary(driverUserId: string, query: DriverEarningsQueryDto) {
        const { filter, period } = this.buildOrderFilter(driverUserId, query);

        const [agg, driverProfile] = await Promise.all([
            this.orderModel.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        trip_income: {
                            $sum: { $ifNull: ['$settlement.driver_gross', 0] },
                        },
                        deduction: {
                            $sum: { $ifNull: ['$settlement.driver_commission_amount', 0] },
                        },
                        total: {
                            $sum: { $ifNull: ['$settlement.driver_net', 0] },
                        },
                        trip_count: { $sum: 1 },
                    },
                },
            ]),
            this.driverProfileModel
                .findOne({
                    user_id: this.oid(driverUserId, 'driverUserId'),
                })
                .select('average_rating')
                .lean(),
        ]);

        const row = agg?.[0] ?? {};

        return {
            range: period.range,
            date: period.date,
            from: period.from.toISOString(),
            to: period.to.toISOString(),
            summary: {
                trip_income: Number(row.trip_income ?? 0),
                deduction: Number(row.deduction ?? 0),
                trip_count: Number(row.trip_count ?? 0),
                average_rating: Number(driverProfile?.average_rating ?? 0),
                total: Number(row.total ?? 0),
            },
        };
    }

    async getHistory(driverUserId: string, query: DriverEarningsQueryDto) {
        const { filter, period } = this.buildOrderFilter(driverUserId, query);

        const page = Number(query.page ?? 1);
        const limit = Number(query.limit ?? 20);

        const orders = await this.orderModel
            .find(filter)
            .select(
                [
                    '_id',
                    'order_number',
                    'order_type',
                    'settlement',
                    'status_history',
                    'updated_at',
                    'created_at',
                ].join(' '),
            )
            .sort({ updated_at: -1 })
            .lean();

        const items = orders.flatMap((order: any) => {
            const completedAt = this.getCompletedAt(order);
            const occurredAt = completedAt.toISOString();

            const tripAmount = Number(order?.settlement?.driver_gross ?? 0);
            const deductionAmount = Number(
                order?.settlement?.driver_commission_amount ?? 0,
            );

            const orderLabel =
                order?.order_type === OrderType.DINE_IN
                    ? 'Đơn tại quán hoàn tất'
                    : 'Đơn giao hàng thành công';

            const result: Array<{
                id: string;
                type: EarningsHistoryItemType;
                title: string;
                subtitle: string;
                amount: number;
                is_positive: boolean;
                occurred_at: string;
                order_id: string;
                order_number: string;
            }> = [];

            result.push({
                id: `trip_${String(order._id)}`,
                type: 'trip',
                title: `Đơn #${order.order_number}`,
                subtitle: orderLabel,
                amount: tripAmount,
                is_positive: true,
                occurred_at: occurredAt,
                order_id: String(order._id),
                order_number: order.order_number,
            });

            if (deductionAmount > 0) {
                result.push({
                    id: `deduction_${String(order._id)}`,
                    type: 'deduction',
                    title: `Khấu trừ đơn #${order.order_number}`,
                    subtitle: 'Phí commission tài xế',
                    amount: deductionAmount,
                    is_positive: false,
                    occurred_at: occurredAt,
                    order_id: String(order._id),
                    order_number: order.order_number,
                });
            }

            return result;
        });

        items.sort(
            (a, b) =>
                new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
        );

        const total = items.length;
        const start = (page - 1) * limit;
        const paged = items.slice(start, start + limit);

        return {
            range: period.range,
            date: period.date,
            from: period.from.toISOString(),
            to: period.to.toISOString(),
            items: paged,
            total,
            page,
            limit,
        };
    }
}
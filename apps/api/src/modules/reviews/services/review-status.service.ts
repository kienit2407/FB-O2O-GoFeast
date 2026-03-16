import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Order, OrderDocument } from '../../orders/schemas/order.schema';
import { MerchantReview, MerchantReviewDocument } from '../schemas/merchant-review.schema';
import { DriverReview, DriverReviewDocument } from '../schemas/driver-review.schema';
import { Review, ReviewDocument } from '../schemas/review.schema';

@Injectable()
export class ReviewStatusService {
    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,
        @InjectModel(MerchantReview.name)
        private readonly merchantReviewModel: Model<MerchantReviewDocument>,
        @InjectModel(DriverReview.name)
        private readonly driverReviewModel: Model<DriverReviewDocument>,
        @InjectModel(Review.name)
        private readonly reviewModel: Model<ReviewDocument>,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${name}`);
        }
        return new Types.ObjectId(id);
    }
    private mapSingle(row: any) {
        if (!row) {
            return {
                exists: false,
                id: null,
                rating: 0,
                comment: '',
                images: [],
                video_url: null,
            };
        }

        return {
            exists: true,
            id: String(row._id),
            rating: Number(row.rating ?? 0),
            comment: row.comment ?? '',
            images: Array.isArray(row.images) ? row.images : [],
            video_url: row.video_url ?? null,
        };
    }
    async getOrderReviewStatus(customerUserId: string, orderId: string) {
        const order = await this.orderModel
            .findById(this.oid(orderId, 'orderId'))
            .select('_id customer_id merchant_id driver_id items status')
            .lean();

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (String(order.customer_id) !== String(this.oid(customerUserId, 'customerUserId'))) {
            throw new ForbiddenException('Not allowed');
        }

        const [merchantReview, driverReview, productReviews] = await Promise.all([
            this.merchantReviewModel.findOne({
                order_id: order._id,
                customer_id: this.oid(customerUserId, 'customerUserId'),
                deleted_at: null,
            }).lean(),
            this.driverReviewModel.findOne({
                order_id: order._id,
                customer_id: this.oid(customerUserId, 'customerUserId'),
                deleted_at: null,
            }).lean(),
            this.reviewModel.find({
                order_id: order._id,
                user_id: this.oid(customerUserId, 'customerUserId'),
                deleted_at: null,
            }).lean(),
        ]);

        return {
            order_id: String(order._id),
            merchant_id: String(order.merchant_id),
            driver_user_id: order.driver_id ? String(order.driver_id) : null,

            merchant_review: this.mapSingle(merchantReview),
            driver_review: this.mapSingle(driverReview),

            product_reviews: productReviews.map((x: any) => ({
                exists: true,
                id: String(x._id),
                product_id: String(x.product_id),
                rating: Number(x.rating ?? 0),
                comment: x.comment ?? '',
                images: Array.isArray(x.images) ? x.images : [],
                video_url: x.video_url ?? null,
            })),

            can_review_merchant: order.status === 'completed',
            can_review_driver: order.status === 'completed' && Boolean(order.driver_id),
            can_review_product: order.status === 'completed',
        };
    }
}
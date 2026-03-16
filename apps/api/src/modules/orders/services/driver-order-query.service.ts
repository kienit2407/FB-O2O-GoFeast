import {
    BadRequestException,
    Injectable,
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
import { User, UserDocument } from 'src/modules/users/schemas/user.schema';

@Injectable()
export class DriverOrderQueryService {
    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,
        @InjectModel(Merchant.name)
        private readonly merchantModel: Model<MerchantDocument>,
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${name}`);
        }
        return new Types.ObjectId(id);
    }

    private extractLatLng(location: any) {
        const coords = location?.coordinates;
        if (!Array.isArray(coords) || coords.length !== 2) {
            return { lat: null, lng: null };
        }

        return {
            lng: Number(coords[0]),
            lat: Number(coords[1]),
        };
    }

    private computeEta(order: any) {
        const etaAt = order?.estimated_delivery_time
            ? new Date(order.estimated_delivery_time)
            : null;

        if (!etaAt) {
            return { eta_at: null, eta_min: null };
        }

        const diffMs = etaAt.getTime() - Date.now();
        const etaMin = Math.max(0, Math.ceil(diffMs / 60000));

        return {
            eta_at: etaAt.toISOString(),
            eta_min: etaMin,
        };
    }

    async getCurrentForDriver(driverUserId: string) {
        const activeStatuses = [
            OrderStatus.DRIVER_ASSIGNED,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.DRIVER_ARRIVED,
            OrderStatus.PICKED_UP,
            OrderStatus.DELIVERING,
            OrderStatus.DELIVERED,
        ];

        const order = await this.orderModel
            .findOne({
                driver_id: this.oid(driverUserId, 'driverUserId'),
                status: { $in: activeStatuses },
            })
            .sort({ updated_at: -1 })
            .lean();

        if (!order) return null;

        const merchant = await this.merchantModel
            .findById(order.merchant_id)
            .select('_id name address location')
            .lean();

        const customer = await this.userModel
            .findById(order.customer_id)
            .select('_id full_name phone avatar_url')
            .lean();

        const merchantLatLng = this.extractLatLng(merchant?.location);
        const customerLatLng = this.extractLatLng(order?.delivery_address?.location);
        const eta = this.computeEta(order);

        const itemCount = (order.items ?? []).reduce(
            (sum: number, it: any) => sum + Number(it.quantity ?? 0),
            0,
        );

        return {
            orderId: String(order._id),
            orderNumber: order.order_number,
            status: order.status,

            merchantName: merchant?.name ?? '',
            merchantAddress: merchant?.address ?? '',
            merchantLat: merchantLatLng.lat,
            merchantLng: merchantLatLng.lng,

            customerName:
                order?.delivery_address?.receiver_name ??
                customer?.full_name ??
                '',
            customerPhone:
                order?.delivery_address?.receiver_phone ??
                customer?.phone ??
                '',
            customerAddress: order?.delivery_address?.address ?? '',
            customerLat: customerLatLng.lat,
            customerLng: customerLatLng.lng,

            paymentMethod: order.payment_method ?? '',
            totalAmount: Number(order.total_amount ?? 0),
            deliveryFee: Number(order.delivery_fee ?? 0),
            itemCount,

            etaAt: eta.eta_at,
            etaMin: eta.eta_min,

            proofImages: order.proof_of_delivery_images ?? [],
        };
    }
}
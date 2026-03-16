import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
    Order,
    OrderDocument,
    OrderStatus,
    OrderType,
} from 'src/modules/orders/schemas/order.schema';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { RealtimeEvents } from 'src/modules/realtime/realtime.events';
import { DeliveryRouteResolverService } from 'src/modules/geo/services/delivery-route-resolver.service';

@Injectable()
export class DriverLocationRelayService {
    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,
        private readonly realtimeGateway: RealtimeGateway,
        private readonly deliveryRouteResolver: DeliveryRouteResolverService,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${name}`);
        }
        return new Types.ObjectId(id);
    }

    async relayActiveOrderLocation(params: {
        driverUserId: string;
        lat: number;
        lng: number;
    }) {
        const activeOrder = await this.orderModel
            .findOne({
                driver_id: this.oid(params.driverUserId, 'driverUserId'),
                order_type: OrderType.DELIVERY,
                status: {
                    $in: [
                        OrderStatus.DRIVER_ARRIVED,
                        OrderStatus.PICKED_UP,
                        OrderStatus.DELIVERING,
                    ],
                },
            })
            .sort({ updated_at: -1 })
            .lean();

        if (!activeOrder) return;

        let etaMin: number | null = null;
        let etaAt: string | null = null;

        try {
            const customerCoords = activeOrder.delivery_address?.location?.coordinates;
            if (Array.isArray(customerCoords) && customerCoords.length === 2) {
                const route = await this.deliveryRouteResolver.resolve({
                    origin: { lat: params.lat, lng: params.lng },
                    destination: {
                        lat: Number(customerCoords[1]),
                        lng: Number(customerCoords[0]),
                    },
                    prepMin: 0,
                    radiusKm: 999,
                });

                etaMin = route.etaMin;
                etaAt = route.etaAt;
            }
        } catch (_) { }

        const payload = {
            orderId: String(activeOrder._id),
            driverId: params.driverUserId,
            lat: params.lat,
            lng: params.lng,
            etaMin,
            etaAt,
            updatedAt: new Date().toISOString(),
        };

        this.realtimeGateway.emitToCustomer(
            String(activeOrder.customer_id),
            RealtimeEvents.CUSTOMER_DRIVER_LOCATION,
            payload,
        );

        this.realtimeGateway.emitToOrder(
            String(activeOrder._id),
            RealtimeEvents.CUSTOMER_DRIVER_LOCATION,
            payload,
        );
    }
}
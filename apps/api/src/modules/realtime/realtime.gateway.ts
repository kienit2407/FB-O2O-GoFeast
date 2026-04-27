import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Server } from 'socket.io';
import { Model, Types } from 'mongoose';

import { TokenService } from '../auth/services/token.service';
import { DispatchOfferService } from './services/dispatch-offer.service';
import type { AuthedSocket } from './types/authed-socket';
import { RealtimeEvents, RealtimeNamespace } from './realtime.events';
import { DineInSessionTokenService } from '../dinein/services/dinein-session-token.service';
import {
  Order,
  OrderDocument,
  OrderStatus,
} from '../orders/schemas/order.schema';

const MAX_CHAT_TEXT_LENGTH = 500;
const CLOSED_CHAT_STATUSES = new Set<string>([
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
]);

@Injectable()
@WebSocketGateway({
  namespace: RealtimeNamespace,
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly tokenService: TokenService,
    private readonly dispatchOfferService: DispatchOfferService,
    private readonly dineInTokenService: DineInSessionTokenService,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {
    this.dispatchOfferService.attachGateway(this);
  }

  @WebSocketServer()
  server: Server;

  async handleConnection(client: AuthedSocket) {
    try {
      const token = this.extractToken(client);
      const dineInToken = this.extractDineInToken(client);
      if (token) {
        const payload: any = await this.tokenService.verifyAccessToken(token);

        const userId = (payload?.sub ?? payload?.userId ?? '').toString();
        const role = (payload?.role ?? '').toString();
        const aud = payload?.aud?.toString();

        if (!userId || !role) {
          throw new UnauthorizedException('Invalid socket token payload');
        }

        client.user = {
          userId,
          role: role as any,
          aud,
          email: payload?.email ?? null,
        };

        client.join(this.roomUser(userId));

        if (role === 'customer') client.join(this.roomCustomer(userId));
        if (role === 'driver') client.join(this.roomDriver(userId));
        if (role === 'admin') client.join(this.roomAdmins());

        if (dineInToken) {
          const dineInTableSessionId = await this.tryJoinDineInSessionRoom(
            client,
            dineInToken,
          );
          if (dineInTableSessionId) {
            client.user.tableSessionId = dineInTableSessionId;
          }
        }

        client.emit(RealtimeEvents.SOCKET_READY, {
          ok: true,
          userId,
          role,
          tableSessionId: client.user.tableSessionId ?? null,
        });
        return;
      }

      if (!dineInToken) {
        throw new UnauthorizedException('Missing socket token');
      }

      const payload = await this.dineInTokenService.verify(dineInToken);
      const tableSessionId = payload?.table_session_id?.toString();
      if (!tableSessionId) {
        throw new UnauthorizedException('Invalid dine-in token payload');
      }

      client.user = {
        userId: `dinein:${tableSessionId}`,
        role: 'dine_in_guest',
        aud: 'dine_in',
        email: null,
        tableSessionId,
      };

      client.join(this.roomDineInSession(tableSessionId));

      client.emit(RealtimeEvents.SOCKET_READY, {
        ok: true,
        userId: client.user.userId,
        role: client.user.role,
        tableSessionId,
      });
    } catch (e) {
      client.emit(RealtimeEvents.SOCKET_ERROR, {
        message: 'Unauthorized socket',
      });
      client.disconnect(true);
    }
  }

  private async tryJoinDineInSessionRoom(
    client: AuthedSocket,
    dineInToken: string,
  ): Promise<string | null> {
    try {
      const payload = await this.dineInTokenService.verify(dineInToken);
      const tableSessionId = payload?.table_session_id?.toString();
      if (!tableSessionId) return null;

      client.join(this.roomDineInSession(tableSessionId));
      return tableSessionId;
    } catch {
      return null;
    }
  }

  handleDisconnect(client: AuthedSocket) {}

  private extractToken(client: AuthedSocket): string | null {
    const authToken = client.handshake?.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const headerValue = client.handshake?.headers?.authorization;
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue.replace(/^Bearer\s+/i, '').trim();
    }

    return null;
  }

  private extractDineInToken(client: AuthedSocket): string | null {
    const authToken = client.handshake?.auth?.dineInToken;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const headerValue = client.handshake?.headers?.['x-dine-in-token'];
    if (Array.isArray(headerValue)) {
      const first = headerValue.find(
        (x) => typeof x === 'string' && x.trim().length > 0,
      );
      if (first) return String(first).trim();
    }
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue.trim();
    }

    return null;
  }

  roomUser(userId: string) {
    return `user:${userId}`;
  }

  roomCustomer(userId: string) {
    return `customer:${userId}`;
  }

  roomDriver(userId: string) {
    return `driver:${userId}`;
  }

  roomMerchant(merchantId: string) {
    return `merchant:${merchantId}`;
  }

  roomOrder(orderId: string) {
    return `order:${orderId}`;
  }

  roomDineInSession(tableSessionId: string) {
    return `dinein_session:${tableSessionId}`;
  }

  roomAdmins() {
    return 'admin:global';
  }

  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(this.roomUser(userId)).emit(event, payload);
  }

  emitToCustomer(userId: string, event: string, payload: any) {
    this.server.to(this.roomCustomer(userId)).emit(event, payload);
  }

  emitToDriver(userId: string, event: string, payload: any) {
    this.server.to(this.roomDriver(userId)).emit(event, payload);
  }

  emitToDrivers(userIds: string[], event: string, payload: any) {
    for (const userId of userIds) {
      this.emitToDriver(userId, event, payload);
    }
  }

  emitToMerchant(merchantId: string, event: string, payload: any) {
    this.server.to(this.roomMerchant(merchantId)).emit(event, payload);
  }

  emitToOrder(orderId: string, event: string, payload: any) {
    this.server.to(this.roomOrder(orderId)).emit(event, payload);
  }

  emitToDineInSession(tableSessionId: string, event: string, payload: any) {
    this.server.to(this.roomDineInSession(tableSessionId)).emit(event, payload);
  }

  emitToAdmins(event: string, payload: any) {
    this.server.to(this.roomAdmins()).emit(event, payload);
  }

  @SubscribeMessage(RealtimeEvents.MERCHANT_ROOM_JOIN)
  async handleMerchantRoomJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { merchantId: string },
  ) {
    if (!client.user || client.user.role !== 'merchant') {
      throw new UnauthorizedException('Only merchant can join merchant room');
    }

    const merchantId = body?.merchantId?.toString();
    if (!merchantId) {
      return { ok: false, message: 'merchantId is required' };
    }

    client.join(this.roomMerchant(merchantId));

    return {
      ok: true,
      room: this.roomMerchant(merchantId),
    };
  }

  @SubscribeMessage(RealtimeEvents.ORDER_ROOM_JOIN)
  async handleOrderRoomJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { orderId: string },
  ) {
    if (!client.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (client.user.role === 'dine_in_guest') {
      return {
        ok: false,
        message: 'Guest socket cannot join order room directly',
      };
    }

    const orderId = body?.orderId?.toString();
    if (!orderId) {
      return { ok: false, message: 'orderId is required' };
    }

    client.join(this.roomOrder(orderId));

    return {
      ok: true,
      room: this.roomOrder(orderId),
    };
  }

  @SubscribeMessage(RealtimeEvents.ORDER_ROOM_LEAVE)
  async handleOrderRoomLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { orderId: string },
  ) {
    if (!client.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const orderId = body?.orderId?.toString();
    if (!orderId) {
      return { ok: false, message: 'orderId is required' };
    }

    client.leave(this.roomOrder(orderId));

    return {
      ok: true,
      room: this.roomOrder(orderId),
    };
  }

  @SubscribeMessage(RealtimeEvents.ORDER_CHAT_SEND)
  async handleOrderChatSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: {
      orderId: string;
      clientMessageId: string;
      text: string;
      createdAt?: string;
    },
  ) {
    if (!client.user || !['customer', 'driver'].includes(client.user.role)) {
      throw new UnauthorizedException(
        'Only customer or driver can send order chat',
      );
    }

    const orderId = body?.orderId?.toString().trim();
    if (!orderId || !Types.ObjectId.isValid(orderId)) {
      return { ok: false, message: 'orderId is invalid' };
    }

    const clientMessageId = body?.clientMessageId?.toString().trim();
    if (!clientMessageId) {
      return { ok: false, message: 'clientMessageId is required' };
    }

    const text = body?.text?.toString().trim() ?? '';
    if (!text) {
      return { ok: false, message: 'Tin nhắn không được để trống' };
    }
    if (text.length > MAX_CHAT_TEXT_LENGTH) {
      return {
        ok: false,
        message: `Tin nhắn tối đa ${MAX_CHAT_TEXT_LENGTH} ký tự`,
      };
    }

    const order = await this.orderModel
      .findById(orderId)
      .select('_id customer_id driver_id status')
      .lean();

    if (!order) {
      return { ok: false, message: 'Order not found' };
    }

    const customerId = order.customer_id?.toString?.() ?? '';
    const driverId = order.driver_id?.toString?.() ?? '';
    if (!customerId || !driverId) {
      return { ok: false, message: 'Đơn chưa ghép tài xế' };
    }
    if (CLOSED_CHAT_STATUSES.has(order.status?.toString?.() ?? '')) {
      return { ok: false, message: 'Đơn đã kết thúc' };
    }

    const senderId = client.user.userId;
    const senderRole = client.user.role;
    const isCustomer = senderRole === 'customer' && senderId === customerId;
    const isDriver = senderRole === 'driver' && senderId === driverId;
    if (!isCustomer && !isDriver) {
      throw new UnauthorizedException('You cannot chat in this order');
    }

    const createdAt = new Date().toISOString();
    const payload = {
      orderId,
      clientMessageId,
      text,
      senderRole,
      senderId,
      createdAt,
    };

    this.emitToCustomer(customerId, RealtimeEvents.ORDER_CHAT_NEW, payload);
    this.emitToDriver(driverId, RealtimeEvents.ORDER_CHAT_NEW, payload);

    return { ok: true, message: payload };
  }

  @SubscribeMessage(RealtimeEvents.DRIVER_OFFER_ACCEPT)
  async handleDriverAcceptOffer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { orderId: string },
  ) {
    if (!client.user || client.user.role !== 'driver') {
      throw new UnauthorizedException('Only driver can accept offer');
    }

    const orderId = body?.orderId?.toString();
    if (!orderId) {
      return { ok: false, message: 'orderId is required' };
    }

    return await this.dispatchOfferService.acceptOffer({
      orderId,
      driverId: client.user.userId,
    });
  }

  @SubscribeMessage(RealtimeEvents.DRIVER_OFFER_REJECT)
  async handleDriverRejectOffer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { orderId: string; reason?: string },
  ) {
    if (!client.user || client.user.role !== 'driver') {
      throw new UnauthorizedException('Only driver can reject offer');
    }

    const orderId = body?.orderId?.toString();
    if (!orderId) {
      return { ok: false, message: 'orderId is required' };
    }

    return await this.dispatchOfferService.rejectOffer({
      orderId,
      driverId: client.user.userId,
    });
  }
}

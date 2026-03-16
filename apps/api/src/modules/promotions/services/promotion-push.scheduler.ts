import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
    Promotion,
    PromotionCreatedByType,
    PromotionDocument,
} from '../schemas/promotion.schema';
import {
    User,
    UserDocument,
    UserRole,
    UserStatus,
} from 'src/modules/users/schemas/user.schema';
import {
    NotificationRecipientRole,
    NotificationType,
} from 'src/modules/notifications/schemas/notification.schema';
import { NotificationsService } from 'src/modules/notifications/services/notifications.service';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { RealtimeEvents } from 'src/modules/realtime/realtime.events';

@Injectable()
export class PromotionPushScheduler {
    private readonly logger = new Logger(PromotionPushScheduler.name);

    constructor(
        @InjectModel(Promotion.name)
        private readonly promotionModel: Model<PromotionDocument>,
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        private readonly notificationsService: NotificationsService,
        private readonly realtimeGateway: RealtimeGateway,
    ) { }

    @Cron('*/30 * * * * *')
    async handleDuePromotionPushes() {
        const now = new Date();

        const promotions = await this.promotionModel.find({
            created_by_type: PromotionCreatedByType.PLATFORM,
            merchant_id: null,
            is_active: true,
            show_push_noti: true,
            push_sent_at: null,
            'conditions.valid_from': { $lte: now, $ne: null },
            $or: [
                { 'conditions.valid_to': null },
                { 'conditions.valid_to': { $exists: false } },
                { 'conditions.valid_to': { $gte: now } },
            ],
        });

        for (const promo of promotions) {
            try {
                const customers = await this.userModel
                    .find({
                        role: UserRole.CUSTOMER,
                        status: UserStatus.ACTIVE,
                        deleted_at: null,
                    })
                    .select('_id')
                    .lean();

                const userIds = customers.map((x: any) => String(x._id));

                if (!userIds.length) {
                    promo.push_sent_at = new Date();
                    await promo.save();
                    continue;
                }

                const title =
                    promo.push_noti_title?.trim() || 'Ưu đãi mới dành cho bạn';
                const body =
                    promo.push_noti_body?.trim() ||
                    promo.description?.trim() ||
                    promo.name;

                await this.notificationsService.createMany(
                    userIds.map((userId) => ({
                        userId,
                        recipientRole: NotificationRecipientRole.CUSTOMER,
                        type: NotificationType.PROMOTION,
                        title,
                        body,
                        data: {
                            action: 'open_promotion',
                            promotion_id: promo._id,
                        },
                    })),
                );

                for (const userId of userIds) {
                    this.realtimeGateway.emitToCustomer(
                        userId,
                        RealtimeEvents.CUSTOMER_PROMOTION_PUSH,
                        {
                            promotionId: String(promo._id),
                            title,
                            body,
                            createdAt: new Date().toISOString(),
                        },
                    );
                }

                promo.push_sent_at = new Date();
                await promo.save();

                this.logger.log(`Promotion push sent: ${promo._id}`);
            } catch (e: any) {
                this.logger.error(
                    `Failed to send promotion push ${promo._id}: ${e?.message || e}`,
                );
            }
        }
    }
}
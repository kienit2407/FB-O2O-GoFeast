import { Types } from 'mongoose';
import {
    NotificationRecipientRole,
    NotificationReviewType,
    NotificationType,
} from '../schemas/notification.schema';

export class CreateNotificationDto {
    userId: string;
    recipientRole: NotificationRecipientRole;
    type: NotificationType;
    title: string;
    body: string;

    data?: {
        action?: string;
        order_id?: Types.ObjectId | string;
        merchant_id?: Types.ObjectId | string;
        image_url?: string;
        order_number?: string;
        driver_id?: Types.ObjectId | string;
        product_id?: Types.ObjectId | string;
        review_id?: Types.ObjectId | string;
        review_type?: NotificationReviewType;
        promotion_id?: Types.ObjectId | string;
        table_number?: string;
        order_type?: string;
    };
}
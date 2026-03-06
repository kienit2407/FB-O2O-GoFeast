// src/modules/benefits/services/benefits-usage.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UserVoucher, UserVoucherDocument } from '../schemas/user-voucher.schema';
import { PromotionUsage, PromotionUsageDocument } from '../schemas/promotion-usage.schema';

@Injectable()
export class BenefitsUsageService {
    constructor(
        @InjectModel(UserVoucher.name) private userVoucherModel: Model<UserVoucherDocument>,
        @InjectModel(PromotionUsage.name) private promoUsageModel: Model<PromotionUsageDocument>,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${name}`);
        return new Types.ObjectId(id);
    }
    async listSavedVouchers(userId: string, opts?: { limit?: number; cursor?: string }) {
        const uid = this.oid(userId, 'userId');
        const limit = Math.min(Math.max(Number(opts?.limit ?? 50), 1), 100);

        const q: any = {
            user_id: uid,
            deleted_at: null,
            is_saved: true,
        };

        if (opts?.cursor) {
            const d = new Date(opts.cursor);
            if (!Number.isNaN(d.getTime())) q.saved_at = { $lt: d };
        }

        const rows = await this.userVoucherModel
            .find(q)
            .sort({ saved_at: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = rows.length > limit;
        const slice = hasMore ? rows.slice(0, limit) : rows;

        const items = slice.map((r: any) => ({
            voucher_id: String(r.voucher_id),
            is_saved: !!r.is_saved,
            is_used: !!r.is_used,
            used_at: r.used_at ?? null,
            used_order_id: r.used_order_id ? String(r.used_order_id) : null,
            saved_at: (r.saved_at ?? r.created_at)?.toISOString?.() ?? null,
        }));

        const nextCursor = hasMore ? (slice[slice.length - 1]?.saved_at?.toISOString?.() ?? null) : null;
        return { items, nextCursor };
    }
    // ===== VOUCHER =====

    async saveVoucher(userId: string, voucherId: string) {
        const uid = this.oid(userId, 'userId');
        const vid = this.oid(voucherId, 'voucherId');

        const doc = await this.userVoucherModel.findOne({ user_id: uid, voucher_id: vid });
        if (doc) {
            // restore/save lại
            doc.is_saved = true;
            doc.deleted_at = null;
            if (!doc.saved_at) doc.saved_at = new Date();
            await doc.save();
            return { ok: true };
        }

        await this.userVoucherModel.create({
            user_id: uid,
            voucher_id: vid,
            is_saved: true,
            saved_at: new Date(),
            is_used: false,
            used_order_id: null,
            used_at: null,
            deleted_at: null,
        });

        return { ok: true };
    }

    async unsaveVoucher(userId: string, voucherId: string) {
        const uid = this.oid(userId, 'userId');
        const vid = this.oid(voucherId, 'voucherId');

        const doc = await this.userVoucherModel.findOne({ user_id: uid, voucher_id: vid, deleted_at: null });
        if (!doc) return { ok: true };

        // bạn có thể chọn soft-delete hoặc is_saved=false
        doc.is_saved = false;
        doc.deleted_at = new Date();
        await doc.save();
        return { ok: true };
    }

    async markVoucherUsed(args: { userId: string; voucherId: string; orderId: string }) {
        const uid = this.oid(args.userId, 'userId');
        const vid = this.oid(args.voucherId, 'voucherId');
        const oid = this.oid(args.orderId, 'orderId');

        const doc = await this.userVoucherModel.findOne({ user_id: uid, voucher_id: vid });
        if (!doc) {
            // nếu không cần “save trước” thì vẫn tạo record used
            await this.userVoucherModel.create({
                user_id: uid,
                voucher_id: vid,
                is_saved: false,
                saved_at: new Date(),
                is_used: true,
                used_order_id: oid,
                used_at: new Date(),
                deleted_at: null,
            });
            return { ok: true };
        }

        doc.is_used = true;
        doc.used_order_id = oid;
        doc.used_at = new Date();
        await doc.save();
        return { ok: true };
    }

    async getVoucherStates(userId: string, voucherIds: string[]) {
        const uid = this.oid(userId, 'userId');
        const vids = voucherIds.filter(Types.ObjectId.isValid).map((x) => new Types.ObjectId(x));

        const rows = await this.userVoucherModel
            .find({ user_id: uid, voucher_id: { $in: vids }, deleted_at: null })
            .select({ voucher_id: 1, is_saved: 1, is_used: 1, used_at: 1, used_order_id: 1 })
            .lean();

        const map = new Map<string, any>();
        rows.forEach((r: any) => {
            map.set(String(r.voucher_id), {
                is_saved: !!r.is_saved,
                is_used: !!r.is_used,
                used_at: r.used_at ?? null,
                used_order_id: r.used_order_id ? String(r.used_order_id) : null,
            });
        });
        return map;
    }

    // ===== PROMOTION USAGE =====

    async markPromotionUsed(args: { userId: string; promotionId: string; orderId: string }) {
        const uid = this.oid(args.userId, 'userId');
        const pid = this.oid(args.promotionId, 'promotionId');
        const oid = this.oid(args.orderId, 'orderId');

        const now = new Date();

        // upsert + increment used_count
        await this.promoUsageModel.updateOne(
            { user_id: uid, promotion_id: pid },
            {
                $setOnInsert: { first_used_at: now, used_count: 0 },
                $set: { last_used_at: now, last_used_order_id: oid },
                $inc: { used_count: 1 },
            },
            { upsert: true },
        );

        return { ok: true };
    }

    async getPromotionUsageCounts(userId: string, promotionIds: string[]) {
        const uid = this.oid(userId, 'userId');
        const pids = promotionIds.filter(Types.ObjectId.isValid).map((x) => new Types.ObjectId(x));

        const rows = await this.promoUsageModel
            .find({ user_id: uid, promotion_id: { $in: pids } })
            .select({ promotion_id: 1, used_count: 1 })
            .lean();

        const map = new Map<string, number>();
        rows.forEach((r: any) => map.set(String(r.promotion_id), Number(r.used_count ?? 0)));
        return map;
    }
}
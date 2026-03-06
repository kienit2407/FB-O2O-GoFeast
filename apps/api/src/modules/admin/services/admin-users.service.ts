// src/modules/admin/services/admin-users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument, UserStatus } from 'src/modules/users/schemas/user.schema';
import { GetAdminUsersDto } from '../dtos/get-admin-users.dto';

@Injectable()
export class AdminUsersService {
    constructor(
        @InjectModel('User') private readonly userModel: Model<UserDocument>,
    ) { }

    async listUsers(query: GetAdminUsersDto) {
        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 10, 50);
        const skip = (page - 1) * limit;

        const match: any = {};

        if (query.role) match.role = query.role;

        // ✅ status filter: nếu FE truyền status thì lọc
        // ✅ coi status missing/null = ACTIVE
        if (query.status) {
            if (query.status === UserStatus.ACTIVE) {
                match.$or = [
                    { status: UserStatus.ACTIVE },
                    { status: { $exists: false } },
                    { status: null },
                ];
            } else {
                match.status = query.status;
            }
        }

        // search
        if (query.q?.trim()) {
            const q = query.q.trim();
            const searchOr = [
                { email: { $regex: q, $options: 'i' } },
                { phone: { $regex: q, $options: 'i' } },
                { full_name: { $regex: q, $options: 'i' } },
            ];

            if (match.$and) match.$and.push({ $or: searchOr });
            else if (match.$or) match.$and = [{ $or: match.$or }, { $or: searchOr }];
            else match.$or = searchOr;
        }

        // sort base
        const baseSort: any = {};
        if (query.sortBy === 'created_at') {
            baseSort.created_at = query.sortDir === 'asc' ? 1 : -1;
        } else {
            baseSort.created_at = -1;
        }

        const pipeline: any[] = [
            { $match: match },

            // lookup lấy 1 record login cuối cùng (không trùng user)
            {
                $lookup: {
                    from: 'login_histories', // ⚠️ đúng collection của bạn
                    let: { uid: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$user_id', '$$uid'] } } },
                        { $sort: { created_at: -1 } },
                        { $limit: 1 },
                        {
                            $project: {
                                _id: 1,
                                created_at: 1,
                                ip: 1,
                                platform: 1,
                                device_id: 1,
                                user_agent: 1,
                                app: 1,
                                auth_method: 1,
                                oauth_provider: 1,
                            },
                        },
                    ],
                    as: 'last_login',
                },
            },
            { $unwind: { path: '$last_login', preserveNullAndEmptyArrays: true } },

            ...(query.sortBy === 'last_login_at'
                ? [
                    {
                        $sort: {
                            'last_login.created_at': query.sortDir === 'asc' ? 1 : -1,
                            created_at: -1,
                        },
                    },
                ]
                : [{ $sort: baseSort }]),

            {
                $facet: {
                    items: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 1,
                                email: 1,
                                phone: 1,
                                full_name: 1,
                                role: 1,
                                avatar_url: 1,
                                created_at: 1,
                                updated_at: 1,

                                // ✅ status luôn có giá trị cho FE
                                status: { $ifNull: ['$status', UserStatus.ACTIVE] },

                                last_login_at: '$last_login.created_at',
                                last_login_ip: '$last_login.ip',
                                last_login_platform: '$last_login.platform',
                                last_login_device_id: '$last_login.device_id',
                                last_login_user_agent: '$last_login.user_agent',
                                last_login_app: '$last_login.app',
                                last_login_auth_method: '$last_login.auth_method',
                                last_login_oauth_provider: '$last_login.oauth_provider',
                            },
                        },
                    ],
                    total: [{ $count: 'value' }],
                },
            },
            {
                $addFields: {
                    total: { $ifNull: [{ $arrayElemAt: ['$total.value', 0] }, 0] },
                },
            },
        ];

        const [result] = await this.userModel.aggregate(pipeline);

        const items = (result?.items ?? []).map((u: any) => {
            const { _id, ...rest } = u;
            return { ...rest, id: _id?.toString?.() ?? '' };
        });

        return {
            items,
            page,
            limit,
            total: result?.total ?? 0,
        };
    }

    async setActive(userId: string, active: boolean) {
        const _id = new Types.ObjectId(userId);
        const status = active ? UserStatus.ACTIVE : UserStatus.INACTIVE;

        const updated = await this.userModel
            .findByIdAndUpdate(_id, { status }, { new: true })
            .lean();

        if (!updated) throw new NotFoundException('User not found');

        // ✅ hide password_hash + normalize id
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, _id: rawId, status: rawStatus, ...rest } = updated as any;

        return {
            ...rest,
            status: rawStatus ?? UserStatus.ACTIVE,
            id: rawId?.toString?.() ?? '',
        };
    }

    async getUserDetail(userId: string, page = 1, limit = 20) {
        const uid = new Types.ObjectId(userId);
        const safeLimit = Math.min(limit, 100);
        const skip = (page - 1) * safeLimit;

        const user = await this.userModel.findById(uid).lean();
        if (!user) return null;

        // raw collection login_histories
        const db = this.userModel.db;
        const col = db.collection('login_histories');

        const [items, total] = await Promise.all([
            col
                .find({ user_id: uid })
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(safeLimit)
                .project({ user_id: 0, __v: 0 })
                .toArray(),
            col.countDocuments({ user_id: uid }),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, _id: rawId, status: rawStatus, ...restUser } = user as any;

        return {
            user: {
                ...restUser,
                status: rawStatus ?? UserStatus.ACTIVE,
                id: rawId?.toString?.() ?? '',
            },
            loginHistory: {
                items: items.map((h: any) => ({ ...h, id: h?._id?.toString?.() ?? '' })),
                page,
                limit: safeLimit,
                total,
            },
        };
    }
}
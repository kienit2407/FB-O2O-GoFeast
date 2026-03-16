import { BadRequestException, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CustomerProfile, CustomerProfileDocument } from '../schemas';
import { Model, Types } from 'mongoose';
import { GeoService } from 'src/modules/geo/services/geo.service';
import { CreateSavedAddressDto, UpdateSavedAddressDto } from '../dtos/customer-addres.dto';
import { UpdateCurrentLocationDto } from '../dtos/update-current-location.dto';
import { Order, OrderDocument, OrderStatus } from 'src/modules/orders/schemas';
import { UsersService } from 'src/modules/users/services/users.service';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { UpdateCustomerUserInfoDto } from '../dtos/update-customer-user-info.dto';

@Injectable()
export class CustomerProfilesService {
    constructor(
        @InjectModel(CustomerProfile.name) private model: Model<CustomerProfileDocument>,
        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,

        private readonly geo: GeoService,
        private readonly users: UsersService,
        private readonly cloudinary: CloudinaryService,

    ) { }

    private uid(userId: string) {
        return new Types.ObjectId(userId);
    }

    async ensureForUser(userId: string) {
        const uid = new Types.ObjectId(userId);
        const exists = await this.model.findOne({ user_id: uid });
        if (exists) return exists;
        return this.model.create({ user_id: uid });
    }

    async findByUserId(userId: string) {
        return this.model.findOne({ user_id: new Types.ObjectId(userId) }).lean();
    }

    async updateCurrentLocation(userId: string, dto: UpdateCurrentLocationDto) {
        const uid = this.uid(userId);
        const now = new Date();

        // lấy current_location cũ để preserve field nếu client không gửi
        const existing = await this.model
            .findOne({ user_id: uid }, { current_location: 1 })
            .lean();

        const prev = existing?.current_location ?? null;

        // address: nếu client không gửi -> reverse
        let address: string | null | undefined;
        if ('address' in dto) {
            address = dto.address ?? null;
        } else {
            try {
                const res = await this.geo.reverse(dto.lat, dto.lng, { size: 1, radius: 100 });
                address = res?.address ?? prev?.address ?? null;
            } catch {
                address = prev?.address ?? null;
            }
        }

        const next: any = {
            type: 'Point',
            coordinates: [dto.lng, dto.lat],
            updated_at: now,
            address,
        };

        // preserve/update các field khác
        if ('delivery_note' in dto) next.delivery_note = dto.delivery_note ?? null;
        else if (prev && 'delivery_note' in prev) next.delivery_note = (prev as any).delivery_note ?? null;

        if ('receiver_name' in dto) next.receiver_name = dto.receiver_name ?? null;
        else if (prev && 'receiver_name' in prev) next.receiver_name = (prev as any).receiver_name ?? null;

        if ('receiver_phone' in dto) next.receiver_phone = dto.receiver_phone ?? null;
        else if (prev && 'receiver_phone' in prev) next.receiver_phone = (prev as any).receiver_phone ?? null;

        return this.model
            .findOneAndUpdate(
                { user_id: uid },
                { $setOnInsert: { user_id: uid }, $set: { current_location: next } },
                { new: true, upsert: true },
            )
            .lean();
    }
    private async getCompletedOrderStats(userId: string) {
        const uid = this.uid(userId);

        const [row] = await this.orderModel.aggregate([
            {
                $match: {
                    customer_id: uid,
                    status: OrderStatus.COMPLETED,
                },
            },
            {
                $group: {
                    _id: null,
                    total_orders: { $sum: 1 },
                    total_spent: { $sum: '$total_amount' },
                },
            },
        ]);

        return {
            total_orders: Number(row?.total_orders ?? 0),
            total_spent: Number(row?.total_spent ?? 0),
        };
    }
    private async buildMyProfilePayload(userId: string) {
        await this.ensureForUser(userId);

        const [user, profile, stats] = await Promise.all([
            this.users.findById(userId),
            this.findByUserId(userId),
            this.getCompletedOrderStats(userId),
        ]);

        if (!user) throw new NotFoundException('User not found');
        if (!profile) throw new NotFoundException('Customer profile not found');

        return {
            id: String(user._id),
            email: user.email ?? null,
            phone: user.phone ?? null,
            full_name: user.full_name ?? null,
            status: user.status ?? null,
            role: user.role ?? null,
            avatar_url: user.avatar_url ?? null,
            gender: user.gender ?? null,
            date_of_birth: user.date_of_birth ?? null,
            language: user.language ?? 'vi',
            notification_enabled: user.notification_enabled ?? true,
            auth_methods: user.auth_methods ?? [],
            oauth_providers: user.oauth_providers ?? [],
            customer_profile: {
                _id: String(profile._id),
                user_id: String(profile.user_id),
                total_orders: stats.total_orders,
                total_spent: stats.total_spent,
                saved_addresses: profile.saved_addresses ?? [],
                current_location: profile.current_location ?? null,
                created_at: profile.created_at ?? null,
                updated_at: profile.updated_at ?? null,
            },
        };
    }
    async getMyProfile(userId: string) {
        return this.buildMyProfilePayload(userId);
    }

    async updateMyUserInfo(userId: string, dto: UpdateCustomerUserInfoDto) {
        const user = await this.users.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        const patch: Record<string, any> = {};

        if (dto.full_name !== undefined) {
            const nextName = dto.full_name?.trim() ?? '';
            if (!nextName) {
                throw new BadRequestException('full_name is required');
            }
            patch.full_name = nextName;
        }

        if (dto.phone !== undefined) {
            const nextPhone = dto.phone?.trim() ?? null;

            if (nextPhone) {
                const existed = await this.users.findByPhone(nextPhone);
                if (existed && String(existed._id) !== String(user._id)) {
                    throw new BadRequestException('Phone already exists');
                }
            }

            patch.phone = nextPhone;
        }

        if (dto.gender !== undefined) {
            patch.gender = dto.gender ?? null;
        }

        if (dto.date_of_birth !== undefined) {
            patch.date_of_birth = dto.date_of_birth
                ? new Date(dto.date_of_birth)
                : null;
        }

        if (!Object.keys(patch).length) {
            return this.buildMyProfilePayload(userId);
        }

        await this.users.update(userId, patch);
        return this.buildMyProfilePayload(userId);
    }

    async uploadMyAvatar(userId: string, file: Express.Multer.File) {
        const user = await this.users.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        if (!file) throw new BadRequestException('Missing file');
        if (!file.mimetype?.startsWith('image/')) {
            throw new UnsupportedMediaTypeException('File must be an image');
        }

        const uploaded = await this.cloudinary.uploadImage(
            file,
            `customers/${userId}/avatar`,
        );

        if (!uploaded?.url || !uploaded?.public_id) {
            throw new BadRequestException('Upload avatar failed');
        }

        const oldPublicId = (user as any).avatar_public_id ?? null;
        if (oldPublicId) {
            try {
                await this.cloudinary.deleteImage(oldPublicId);
            } catch (_) {
                // không chặn flow nếu xóa ảnh cũ lỗi
            }
        }

        await this.users.update(userId, {
            avatar_url: uploaded.url,
            avatar_public_id: uploaded.public_id,
        });

        return this.buildMyProfilePayload(userId);
    }

    async removeMyAvatar(userId: string) {
        const user = await this.users.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        const oldPublicId = (user as any).avatar_public_id ?? null;
        if (oldPublicId) {
            try {
                await this.cloudinary.deleteImage(oldPublicId);
            } catch (_) {
                // không chặn flow nếu xóa ảnh cũ lỗi
            }
        }

        await this.users.update(userId, {
            avatar_url: null!,
            avatar_public_id: null,
        });

        return this.buildMyProfilePayload(userId);
    }

    //  chọn 1 địa chỉ đã lưu -> copy snapshot sang current_location
    async useSavedAddressAsCurrent(userId: string, savedId: string) {
        const uid = this.uid(userId);
        const sid = new Types.ObjectId(savedId);
        const now = new Date();

        const profile = await this.model.findOne({ user_id: uid }).lean();
        if (!profile) throw new NotFoundException('Profile not found');

        const saved = (profile.saved_addresses ?? []).find(
            (x: any) => String(x._id) === String(sid),
        );
        if (!saved) throw new NotFoundException('Saved address not found');

        // nếu saved không có location thì fallback: giữ coordinates hiện tại (không crash)
        const prev = profile.current_location;
        const coords =
            saved.location?.coordinates ??
            prev?.coordinates ??
            null;

        if (!coords) {
            throw new BadRequestException('Saved address has no coordinates');
        }

        const next: any = {
            type: 'Point',
            coordinates: coords,
            address: saved.address,
            delivery_note: saved.delivery_note ?? null,
            receiver_name: saved.receiver_name ?? null,
            receiver_phone: saved.receiver_phone ?? null,
            updated_at: now,
        };

        return this.model
            .findOneAndUpdate(
                { user_id: uid },
                { $set: { current_location: next } },
                { new: true },
            )
            .lean();
    }
    // =========================
    // SAVED ADDRESSES CRUD
    // =========================

    async listSavedAddresses(userId: string) {
        const prof = await this.ensureForUser(userId);
        const lean = await this.model.findById(prof._id).lean();
        return (lean?.saved_addresses ?? []).slice().reverse(); // tuỳ bạn sort
    }

    async createSavedAddress(userId: string, dto: CreateSavedAddressDto) {
        const uid = this.uid(userId);
        const now = new Date();
        const _id = new Types.ObjectId();

        // nếu user gửi lat/lng thì phải đủ cả 2
        if ((dto.lat != null) !== (dto.lng != null)) {
            throw new BadRequestException('lat/lng must be provided together');
        }

        const item: any = {
            _id,
            address: dto.address.trim(),
            receiver_name: dto.receiver_name?.trim() ?? null,
            receiver_phone: dto.receiver_phone?.trim() ?? null,
            delivery_note: dto.delivery_note?.trim() ?? null,
            created_at: now,
            updated_at: now,
        };

        if (dto.lat != null && dto.lng != null) {
            item.location = { type: 'Point', coordinates: [dto.lng, dto.lat] };
        }

        // $push sẽ tự tạo field saved_addresses nếu chưa tồn tại (vì bạn bỏ default)
        await this.model.updateOne(
            { user_id: uid },
            { $setOnInsert: { user_id: uid }, $push: { saved_addresses: item } },
            { upsert: true },
        );

        return item; // trả item mới tạo (FE tiện dùng)
    }

    async updateSavedAddress(userId: string, addressId: string, dto: UpdateSavedAddressDto) {
        const uid = this.uid(userId);
        const aid = this.uid(addressId);
        const now = new Date();

        if ((dto.lat != null) !== (dto.lng != null)) {
            throw new BadRequestException('lat/lng must be provided together');
        }

        const $set: Record<string, any> = {
            'saved_addresses.$[a].updated_at': now,
        };

        if (dto.address != null) $set['saved_addresses.$[a].address'] = dto.address.trim();
        if (dto.receiver_name != null) $set['saved_addresses.$[a].receiver_name'] = dto.receiver_name.trim();
        if (dto.receiver_phone != null) $set['saved_addresses.$[a].receiver_phone'] = dto.receiver_phone.trim();
        if (dto.delivery_note != null) $set['saved_addresses.$[a].delivery_note'] = dto.delivery_note.trim();

        if (dto.lat != null && dto.lng != null) {
            $set['saved_addresses.$[a].location'] = { type: 'Point', coordinates: [dto.lng, dto.lat] };
        }

        const res = await this.model.updateOne(
            { user_id: uid },
            { $set },
            { arrayFilters: [{ 'a._id': aid }] },
        );

        // matchedCount có thể =1 nhưng không sửa nếu không có phần tử -> kiểm tra bằng modified/matched
        if (!res.matchedCount) throw new NotFoundException('Profile not found');

        // kiểm tra thực sự có addressId trong array không:
        const prof = await this.model.findOne({ user_id: uid }, { saved_addresses: 1 }).lean();
        const found = prof?.saved_addresses?.some((x: any) => String(x._id) === String(aid));
        if (!found) throw new NotFoundException('Saved address not found');

        // trả về item mới nhất
        const updated = (prof?.saved_addresses ?? []).find((x: any) => String(x._id) === String(aid));
        return updated ?? { ok: true };
    }

    async deleteSavedAddress(userId: string, addressId: string) {
        const uid = this.uid(userId);
        const aid = this.uid(addressId);

        const res = await this.model.updateOne(
            { user_id: uid },
            { $pull: { saved_addresses: { _id: aid } } },
        );

        if (!res.matchedCount) throw new NotFoundException('Profile not found');
        return { ok: true };
    }
}
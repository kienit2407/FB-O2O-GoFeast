// src/modules/banners/services/carousel-banners.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CarouselBanner, CarouselBannerDocument } from '../schemas/carousel-banner.schema';
import { CloudinaryService } from 'src/common/services/cloudinary.service';


@Injectable()
export class CarouselBannersService {
    constructor(
        @InjectModel(CarouselBanner.name)
        private readonly bannerModel: Model<CarouselBannerDocument>,
        private readonly cloudinary: CloudinaryService,
    ) { }

    private toObjectId(id: string) {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
        return new Types.ObjectId(id);
    }

    async listAdmin(params?: { includeDeleted?: boolean }) {
        const q: any = {};
        if (!params?.includeDeleted) q.deleted_at = null;

        return this.bannerModel
            .find(q)
            .sort({ position: 1, created_at: -1 })
            .lean();
    }

    async listPublic() {
        return this.bannerModel
            .find({ is_active: true, deleted_at: null })
            .sort({ position: 1 })
            .select({ carousel_id: 1, carousel_url: 1, position: 1 })
            .lean();
    }

    async getById(id: string) {
        const _id = this.toObjectId(id);
        const doc = await this.bannerModel.findOne({ _id, deleted_at: null }).lean();
        if (!doc) throw new NotFoundException('Carousel banner not found');
        return doc;
    }

    async createWithUpload(file: Express.Multer.File, opts?: { position?: number; is_active?: boolean }) {
        if (!file) throw new BadRequestException('Missing file');

        // nếu không truyền position -> append cuối
        let pos = opts?.position;
        if (pos === undefined || pos === null) {
            const last = await this.bannerModel
                .findOne({ deleted_at: null })
                .sort({ position: -1 })
                .select({ position: 1 })
                .lean();
            pos = (last?.position ?? -1) + 1;
        }

        const up = await this.cloudinary.uploadImage(file, 'banners/carousel');

        const carousel_url = up.secure_url ?? up.url;
        const carousel_id = up.public_id;

        const created = await this.bannerModel.create({
            carousel_id,
            carousel_url,
            position: pos,
            is_active: opts?.is_active ?? true,
            deleted_at: null,
        });

        return created.toObject();
    }

    async update(id: string, dto: { position?: number; is_active?: boolean }) {
        const _id = this.toObjectId(id);

        const updated = await this.bannerModel.findOneAndUpdate(
            { _id, deleted_at: null },
            { $set: { ...dto } },
            { new: true },
        );

        if (!updated) throw new NotFoundException('Carousel banner not found');
        return updated.toObject();
    }

    async replaceImage(id: string, file: Express.Multer.File, deleteOld = true) {
        if (!file) throw new BadRequestException('Missing file');
        const _id = this.toObjectId(id);

        const doc = await this.bannerModel.findOne({ _id, deleted_at: null });
        if (!doc) throw new NotFoundException('Carousel banner not found');

        const oldPublicId = doc.carousel_id;

        const up = await this.cloudinary.uploadImage(file, 'banners/carousel');
        doc.carousel_id = up.public_id;
        doc.carousel_url = up.secure_url ?? up.url;
        await doc.save();

        if (deleteOld && oldPublicId) {
            // ignore fail delete
            try { await this.cloudinary.deleteByPublicId(oldPublicId); } catch { }
        }

        return doc.toObject();
    }

    async toggleActive(id: string, isActive: boolean) {
        return this.update(id, { is_active: isActive });
    }

    async reorder(items: { id: string; position: number }[]) {
        if (!items?.length) throw new BadRequestException('Missing items');

        // bulkWrite để nhanh
        const ops = items.map((it) => ({
            updateOne: {
                filter: { _id: this.toObjectId(it.id), deleted_at: null },
                update: { $set: { position: it.position } },
            },
        }));

        await this.bannerModel.bulkWrite(ops);
        return { success: true };
    }

    async softDelete(id: string, deleteCloudinary = true) {
        const _id = this.toObjectId(id);

        const doc = await this.bannerModel.findOne({ _id, deleted_at: null });
        if (!doc) throw new NotFoundException('Carousel banner not found');

        const publicId = doc.carousel_id;

        doc.deleted_at = new Date();
        doc.is_active = false;
        await doc.save();

        if (deleteCloudinary && publicId) {
            try { await this.cloudinary.deleteByPublicId(publicId); } catch { }
        }

        return { success: true };
    }
}
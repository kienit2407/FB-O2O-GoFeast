import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class ReviewMediaUploadService {
    private uploadBuffer(
        file: Express.Multer.File,
        options: {
            folder: string;
            resource_type: 'image' | 'video';
        },
    ): Promise<UploadApiResponse> {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: options.folder,
                    resource_type: options.resource_type,
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) return reject(new Error('Upload failed'));
                    resolve(result);
                },
            );

            stream.end(file.buffer);
        });
    }

    async uploadImages(
        files: Express.Multer.File[],
        folder = 'reviews/products/images',
    ) {
        if (!files.length) return [];

        const results = await Promise.all(
            files.map((file) =>
                this.uploadBuffer(file, {
                    folder,
                    resource_type: 'image',
                }),
            ),
        );

        return results.map((r) => ({
            url: r.secure_url,
            public_id: r.public_id,
        }));
    }

    async uploadVideo(
        file?: Express.Multer.File,
        folder = 'reviews/products/videos',
    ) {
        if (!file) return null;

        const result = await this.uploadBuffer(file, {
            folder,
            resource_type: 'video',
        });

        return {
            url: result.secure_url,
            public_id: result.public_id,
        };
    }

    async destroyImages(publicIds: string[]) {
        const ids = publicIds.filter(Boolean);
        if (!ids.length) return;

        await Promise.allSettled(
            ids.map((id) =>
                cloudinary.uploader.destroy(id, {
                    resource_type: 'image',
                    invalidate: true,
                }),
            ),
        );
    }

    async destroyVideo(publicId?: string | null) {
        if (!publicId) return;

        await Promise.allSettled([
            cloudinary.uploader.destroy(publicId, {
                resource_type: 'video',
                invalidate: true,
            }),
        ]);
    }
}
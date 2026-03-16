import { BadRequestException, Injectable } from '@nestjs/common';
import { CloudinaryService } from 'src/common/services/cloudinary.service';



@Injectable()
export class DriverProofUploadService {
    constructor(private readonly cloudinaryService: CloudinaryService) { }

    async uploadMany(files: Express.Multer.File[]) {
        if (!files?.length) {
            throw new BadRequestException('No files uploaded');
        }

        const invalid = files.find(
            (file) => !file.mimetype?.startsWith('image/'),
        );

        if (invalid) {
            throw new BadRequestException('Only image files are allowed');
        }

        const uploaded = await Promise.all(
            files.map((file) =>
                this.cloudinaryService.uploadBuffer(file.buffer, {
                    folder: 'driver/proof-of-delivery',
                    resource_type: 'image',
                    filename_override: file.originalname,
                }),
            ),
        );

        return uploaded.map((item: any) => ({
            url: item.secure_url,
            public_id: item.public_id,
            width: item.width ?? null,
            height: item.height ?? null,
            format: item.format ?? null,
        }));
    }
}
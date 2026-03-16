import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';
import * as streamifier from 'streamifier';
export interface UploadResult {
  url: string;
  public_id: string;
  format: string;
  width?: number;
  height?: number;
  secure_url?: string;
}

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.cloudinaryName,
      api_key: this.configService.cloudinaryApiKey,
      api_secret: this.configService.cloudinaryApiSecret,
    });
  }
  async uploadBuffer(
    buffer: Buffer,
    options?: UploadApiOptions,
  ): Promise<any> {
    try {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          options ?? {},
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );

        streamifier.createReadStream(buffer).pipe(stream);
      });
    } catch (e) {
      throw new InternalServerErrorException('Cloudinary upload failed');
    }
  }
  private async getFileBuffer(file: Express.Multer.File): Promise<Buffer> {
    // If file has buffer (memory storage), use it directly
    if (file.buffer) {
      return file.buffer;
    }
    // If file is saved to disk (diskStorage), read from path
    if (file.path) {
      return fs.promises.readFile(file.path);
    }
    // Fallback: throw error
    throw new Error('File has no buffer or path');
  }
  async deleteByPublicId(publicId: string) {
    // resource_type: 'image' cho ảnh
    return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }

  async uploadMerchantImage(
    file: Express.Multer.File,
    userId: string,
    type: 'avatar' | 'cover',
  ) {
    const folder = `merchants/${userId}/${type}`;

    // bạn có thể dùng upload_stream như hiện tại bạn dùng
    const res = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'image',
    });

    return {
      url: res.secure_url,
      public_id: res.public_id,
    };
  }
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    const fileBuffer = await this.getFileBuffer(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `fab-o2o/${folder}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              width: result.width,
              height: result.height,
              secure_url: result.secure_url,
            });
          }
        },
      );

      uploadStream.end(fileBuffer);
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    return this.uploadImage(file, folder);
  }

  async uploadMerchantDocument(
    file: Express.Multer.File,
    userId: string,
    documentType: string,
  ): Promise<UploadResult> {
    const folder = `merchants/${userId}/${documentType}`;
    return this.uploadImage(file, folder);
  }

  async deleteImage(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  getImageUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      secure: true,
    });
  }
}

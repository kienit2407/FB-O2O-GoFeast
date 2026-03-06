import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DebugKafkaController } from './controllers/debug.controller';
import { CloudinaryService } from './services/cloudinary.service';
import { EmailService } from './services/email.service';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [DebugKafkaController],
  providers: [CloudinaryService, EmailService],
  exports: [CloudinaryService, EmailService, MulterModule],
})
export class CommonModule {}

// src/modules/banners/schemas/carousel-banner.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CarouselBannerDocument = CarouselBanner & Document;

@Schema({
  collection: 'carousel_banners',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class CarouselBanner {
  _id: Types.ObjectId;

  // Cloudinary public_id
  @Prop({ required: true, trim: true, unique: true })
  carousel_id: string;

  // Cloudinary secure_url
  @Prop({ required: true, trim: true })
  carousel_url: string;

  // để reorder (sort asc)
  @Prop({ type: Number, default: 0 })
  position: number;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: Date, default: null })
  deleted_at: Date | null;

  created_at: Date;
  updated_at: Date;
}

export const CarouselBannerSchema = SchemaFactory.createForClass(CarouselBanner);

// Index phục vụ query list nhanh + sort
CarouselBannerSchema.index({ is_active: 1, deleted_at: 1, position: 1 });
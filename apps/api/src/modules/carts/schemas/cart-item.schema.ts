import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class CartSelectedOption {
    @Prop({ type: Types.ObjectId, required: true })
    option_id: Types.ObjectId;

    @Prop({ type: String, required: true })
    option_name: string;

    @Prop({ type: Types.ObjectId, required: true })
    choice_id: Types.ObjectId;

    @Prop({ type: String, required: true })
    choice_name: string;

    @Prop({ type: Number, default: 0 })
    price_modifier: number;
}
export const CartSelectedOptionSchema = SchemaFactory.createForClass(CartSelectedOption);

@Schema({ _id: false })
export class CartSelectedTopping {
    @Prop({ type: Types.ObjectId, required: true })
    topping_id: Types.ObjectId;

    @Prop({ type: String, required: true })
    topping_name: string;

    @Prop({ type: String, default: null })
    topping_image_url: string | null;

    @Prop({ type: Number, default: 0 })
    unit_price: number;

    @Prop({ type: Number, default: 1, min: 1 })
    quantity: number;
}
export const CartSelectedToppingSchema = SchemaFactory.createForClass(CartSelectedTopping);

export type CartItemDocument = CartItem & Document;

@Schema({
    _id: true,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class CartItem {
    _id: Types.ObjectId;

    // dùng để gộp line giống nhau (product + options + toppings)
    @Prop({ type: String, required: true, index: true })
    line_key: string;

    @Prop({ type: String, enum: ['product', 'topping'], required: true, index: true })
    item_type: 'product' | 'topping';

    @Prop({ type: Types.ObjectId, ref: 'Product', required: false, index: true })
    product_id?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Topping', required: false, index: true })
    topping_id?: Types.ObjectId;

    @Prop({ type: Number, required: true, min: 1 })
    quantity: number;

    // snapshot để render nhanh như ảnh
    @Prop({ type: String, required: true, trim: true })
    product_name: string;

    @Prop({ type: String, default: null })
    product_image_url: string | null;

    // giá đang áp dụng (sale/base resolved tại thời điểm add)
    @Prop({ type: Number, required: true, min: 0 })
    unit_price: number;

    // để UI gạch giá nếu có sale
    @Prop({ type: Number, default: null })
    base_price: number | null;

    // selections (lưu để checkout, nhưng UI cart có thể không cần show)
    @Prop({ type: [CartSelectedOptionSchema], default: [] })
    selected_options: CartSelectedOption[];

    @Prop({ type: [CartSelectedToppingSchema], default: [] })
    selected_toppings: CartSelectedTopping[];

    // note theo item (ảnh có “Thêm ghi chú…”)
    @Prop({ type: String, default: '' })
    note: string;

    // tính sẵn để hiển thị tổng nhanh (không phải discount/fee)
    // item_unit_total = unit_price + sum(option modifiers) + sum(topping unit_price*qty)
    @Prop({ type: Number, default: 0 })
    item_unit_total: number;

    @Prop({ type: Number, default: 0 })
    item_total: number;

    created_at: Date;
    updated_at: Date;
}
export const CartItemSchema = SchemaFactory.createForClass(CartItem);
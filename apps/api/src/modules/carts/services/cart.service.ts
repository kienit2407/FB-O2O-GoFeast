import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Cart, CartDocument, CartStatus, OrderType } from '../schemas/cart.schema';
import { AddCartItemDto } from '../dtos/add-cart-item.dto';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto';
import { buildLineKey } from '../utils/cart-key.util';

// models có sẵn
import { Product } from '../../merchants/schemas/product.schema';
import { ProductOption } from '../../merchants/schemas/product-option.schema';
import { Topping } from '../../merchants/schemas/topping.schema';
import { TableSession } from 'src/modules/dinein/schemas';
import { Merchant, MerchantDocument } from 'src/modules/merchants/schemas';

@Injectable()
export class CartService {
    constructor(
        @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
        @InjectModel(Product.name) private readonly productModel: Model<Product>,
        @InjectModel(ProductOption.name) private readonly optionModel: Model<ProductOption>,
        @InjectModel(Topping.name) private readonly toppingModel: Model<Topping>,
        @InjectModel(TableSession.name) private readonly tableSessionModel: Model<TableSession>,
        @InjectModel(Merchant.name) private readonly merchantModel: Model<MerchantDocument>, 
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${name}`);
        return new Types.ObjectId(id);
    }
    async listDeliveryDraftCarts(args: {
        userId: string;
        limit?: number;
        cursor?: string;
    }) {
        if (!args.userId) {
            throw new UnauthorizedException('Login required');
        }

        const uid = this.oid(args.userId, 'userId');
        const limit = Math.min(Math.max(Number(args.limit ?? 10), 1), 20);

        const q: any = {
            user_id: uid,
            order_type: OrderType.DELIVERY,
            status: CartStatus.ACTIVE,
            deleted_at: null,
            'items.0': { $exists: true },
        };

        if (args.cursor) {
            const [lastActiveRaw, idRaw] = String(args.cursor).split('|');
            const lastActiveAt = new Date(lastActiveRaw);

            if (!Number.isNaN(lastActiveAt.getTime()) && Types.ObjectId.isValid(idRaw)) {
                q.$or = [
                    { last_active_at: { $lt: lastActiveAt } },
                    {
                        last_active_at: lastActiveAt,
                        _id: { $lt: new Types.ObjectId(idRaw) },
                    },
                ];
            }
        }

        const rows = await this.cartModel
            .find(q)
            .sort({ last_active_at: -1, _id: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = rows.length > limit;
        const sliced = hasMore ? rows.slice(0, limit) : rows;

        const merchantIds = [
            ...new Set(sliced.map((x: any) => String(x.merchant_id))),
        ].map((id) => new Types.ObjectId(id));

        const merchants = await this.merchantModel
            .find({
                _id: { $in: merchantIds },
                deleted_at: null,
            })
            .select('_id name logo_url address')
            .lean();

        const merchantMap = new Map<string, any>(
            merchants.map((m: any) => [String(m._id), m]),
        );

        const items = sliced.map((cart: any) => {
            const merchant = merchantMap.get(String(cart.merchant_id));
            const cartItems = Array.isArray(cart.items) ? cart.items : [];

            const itemCount = cartItems.reduce(
                (sum: number, it: any) => sum + Number(it.quantity ?? 0),
                0,
            );

            const totalAmount = cartItems.reduce(
                (sum: number, it: any) => sum + Number(it.item_total ?? 0),
                0,
            );

            const itemsPreview = cartItems
                .map((it: any) => String(it.product_name ?? '').trim())
                .filter(Boolean)
                .slice(0, 3);

            const previewImageUrl =
                cartItems.find((it: any) => !!it.product_image_url)?.product_image_url ??
                merchant?.logo_url ??
                null;

            return {
                id: String(cart._id),
                merchant: {
                    id: merchant ? String(merchant._id) : String(cart.merchant_id),
                    name: merchant?.name ?? 'Quán',
                    logo_url: merchant?.logo_url ?? null,
                    address: merchant?.address ?? '',
                },
                preview_image_url: previewImageUrl,
                item_count: itemCount,
                total_amount: totalAmount,
                items_preview: itemsPreview,
                updated_at: cart.last_active_at ?? cart.updated_at ?? cart.created_at,
                service_label: 'Đồ ăn',
            };
        });

        const nextCursor =
            hasMore && sliced.length
                ? `${new Date(sliced[sliced.length - 1].last_active_at).toISOString()}|${String(sliced[sliced.length - 1]._id)}`
                : null;

        return {
            items,
            next_cursor: nextCursor,
            has_more: hasMore,
        };
    }

    async clearAllDeliveryDraftCarts(args: { userId: string }) {
        if (!args.userId) {
            throw new UnauthorizedException('Login required');
        }

        const uid = this.oid(args.userId, 'userId');

        await this.cartModel.updateMany(
            {
                user_id: uid,
                order_type: OrderType.DELIVERY,
                status: CartStatus.ACTIVE,
                deleted_at: null,
                'items.0': { $exists: true },
            },
            {
                $set: {
                    items: [],
                    last_active_at: new Date(),
                },
            },
        );

        return { ok: true };
    }
    async getCartSummaryForMerchantDetail(params: {
        userId: string | null;
        merchantId: string;
    }): Promise<null | { item_count: number; subtotal_estimated: number; total_estimated: number }> {
        const { userId, merchantId } = params;

        if (!userId) return null;

        const uid = this.oid(userId, 'userId');
        const mid = this.oid(merchantId, 'merchantId');

        const cart = await this.cartModel
            .findOne({
                user_id: uid,
                merchant_id: mid,
                order_type: OrderType.DELIVERY,
                status: CartStatus.ACTIVE,
                deleted_at: null,
            })
            .select({ items: 1 })
            .lean();

        if (!cart) {
            return { item_count: 0, subtotal_estimated: 0, total_estimated: 0 };
        }

        const items = Array.isArray((cart as any).items) ? (cart as any).items : [];

        const itemCount = items.reduce((s: number, it: any) => s + Number(it.quantity ?? 0), 0);
        const subtotal = items.reduce((s: number, it: any) => s + Number(it.item_total ?? 0), 0);

        // hiện tại chưa có fee/discount => total = subtotal
        return {
            item_count: itemCount,
            subtotal_estimated: subtotal,
            total_estimated: subtotal,
        };
    }
    async getDeliverySummary(args: { userId: string | null; merchantId: string }) {
        // ✅ để guest không bị 401 thì trả 0
        if (!args.userId) {
            return { cart_id: null, summary: { item_count: 0, total_estimated: 0, discount_estimated: 0 } };
        }

        const uid = this.oid(args.userId, 'userId');
        const mid = this.oid(args.merchantId, 'merchant_id');

        const cart = await this.cartModel
            .findOne({
                user_id: uid,
                merchant_id: mid,
                order_type: OrderType.DELIVERY,
                status: CartStatus.ACTIVE,
                deleted_at: null,
            })
            .select({ items: 1 })
            .lean();

        const items = Array.isArray((cart as any)?.items) ? (cart as any).items : [];

        const itemCount = items.reduce((s: number, it: any) => s + Number(it.quantity ?? 0), 0);
        const totalEstimated = items.reduce((s: number, it: any) => s + Number(it.item_total ?? 0), 0);

        const discountEstimated = items.reduce((s: number, it: any) => {
            const qty = Number(it.quantity ?? 0);
            const base = it.base_price != null ? Number(it.base_price) : null;
            const unit = Number(it.unit_price ?? 0);
            const discUnit = base != null ? Math.max(0, base - unit) : 0;
            return s + discUnit * qty;
        }, 0);

        return {
            cart_id: cart ? String((cart as any)._id) : null,
            summary: { item_count: itemCount, total_estimated: totalEstimated, discount_estimated: discountEstimated },
        };
    }

    // (tuỳ chọn)  NEW: DINE-IN summary
    async getDineInSummary(args: { tableSessionId: string }) {
        const sid = this.oid(args.tableSessionId, 'table_session_id');

        // verify session tồn tại + lấy merchant_id
        const session: any = await this.tableSessionModel.findOne({ _id: sid }).lean();
        if (!session) throw new NotFoundException('TableSession not found');

        const cart = await this.cartModel
            .findOne({
                table_session_id: sid,
                merchant_id: session.merchant_id,
                order_type: OrderType.DINE_IN,
                status: CartStatus.ACTIVE,
                deleted_at: null,
            })
            .select({ items: 1 })
            .lean();

        const items = Array.isArray((cart as any)?.items) ? (cart as any).items : [];

        const itemCount = items.reduce((s: number, it: any) => s + Number(it.quantity ?? 0), 0);
        const totalEstimated = items.reduce((s: number, it: any) => s + Number(it.item_total ?? 0), 0);

        const discountEstimated = items.reduce((s: number, it: any) => {
            const qty = Number(it.quantity ?? 0);
            const base = it.base_price != null ? Number(it.base_price) : null;
            const unit = Number(it.unit_price ?? 0);
            const discUnit = base != null ? Math.max(0, base - unit) : 0;
            return s + discUnit * qty;
        }, 0);

        return {
            cart_id: cart ? String((cart as any)._id) : null,
            summary: {
                item_count: itemCount,
                total_estimated: totalEstimated,
                discount_estimated: discountEstimated,
            },
        };
    }
    // ===== response helper =====
    private summarize(cart: any) {
        const items = Array.isArray(cart.items) ? cart.items : [];

        const itemCount = items.reduce((s, it) => s + Number(it.quantity ?? 0), 0);

        // total sau sale (đang dùng item_total)
        const totalEstimated = items.reduce((s, it) => s + Number(it.item_total ?? 0), 0);

        // discount chỉ tính phần "base product sale"
        // discount/unit = (base_price - unit_price) nếu base_price != null
        const discountEstimated = items.reduce((s, it) => {
            const qty = Number(it.quantity ?? 0);

            const base = it.base_price != null ? Number(it.base_price) : null;
            const unit = Number(it.unit_price ?? 0);

            const discUnit = base != null ? Math.max(0, base - unit) : 0;
            return s + discUnit * qty;
        }, 0);

        return {
            cart: {
                id: String(cart._id),
                user_id: cart.user_id ? String(cart.user_id) : null,
                merchant_id: String(cart.merchant_id),
                order_type: cart.order_type,
                status: cart.status,
                table_id: cart.table_id ? String(cart.table_id) : null,
                table_session_id: cart.table_session_id ? String(cart.table_session_id) : null,
                items: (cart.items ?? []).map((x: any) => ({
                    line_key: x.line_key,
                    item_type: x.item_type,
                    product_id: x.product_id ? String(x.product_id) : null,
                    topping_id: x.topping_id ? String(x.topping_id) : null,
                    quantity: x.quantity,
                    product_name: x.product_name,
                    product_image_url: x.product_image_url ?? null,
                    unit_price: x.unit_price,
                    base_price: x.base_price ?? null,
                    selected_options: x.selected_options ?? [],
                    selected_toppings: x.selected_toppings ?? [],
                    note: x.note ?? '',
                    item_unit_total: x.item_unit_total ?? 0,
                    item_total: x.item_total ?? 0,
                })),
                last_active_at: cart.last_active_at,
            },

            // ✅ 3 field bạn cần
            summary: {
                item_count: itemCount,
                total_estimated: totalEstimated,
                discount_estimated: discountEstimated,
            },
        };
    }

    // =========================
    // DELIVERY
    // =========================

    async getOrCreateDeliveryCart(args: { userId: string; merchantId: string }) {
        if (!args.userId) throw new UnauthorizedException('Login required');
        const uid = this.oid(args.userId, 'userId');
        const mid = this.oid(args.merchantId, 'merchant_id');

        let cart = await this.cartModel
            .findOne({ user_id: uid, merchant_id: mid, order_type: OrderType.DELIVERY, status: CartStatus.ACTIVE, deleted_at: null })
            .exec();

        if (!cart) {
            cart = await this.cartModel.create({
                user_id: uid,
                merchant_id: mid,
                order_type: OrderType.DELIVERY,
                status: CartStatus.ACTIVE,
                table_id: null,
                table_session_id: null,
                items: [],
                expires_at: null,
                last_active_at: new Date(),
                deleted_at: null,
            });
        }

        return this.summarize(cart.toObject());
    }

    async addItemDelivery(args: { userId: string; merchantId: string; dto: AddCartItemDto }) {
        const { cart } = await this._getDeliveryCartDoc(args.userId, args.merchantId);
        await this._mutateAddItem(cart, OrderType.DELIVERY, args.dto);
        await cart.save();
        return this.summarize(cart.toObject());
    }

    async updateItemDelivery(args: { userId: string; merchantId: string; lineKey: string; dto: UpdateCartItemDto }) {
        const { cart } = await this._getDeliveryCartDoc(args.userId, args.merchantId);
        this._mutateUpdateLine(cart, args.lineKey, args.dto);
        await cart.save();
        return this.summarize(cart.toObject());
    }

    async removeItemDelivery(args: { userId: string; merchantId: string; lineKey: string }) {
        const { cart } = await this._getDeliveryCartDoc(args.userId, args.merchantId);
        this._mutateRemoveLine(cart, args.lineKey);
        await cart.save();
        return this.summarize(cart.toObject());
    }

    async clearDelivery(args: { userId: string; merchantId: string }) {
        const { cart } = await this._getDeliveryCartDoc(args.userId, args.merchantId);
        cart.items = [];
        cart.last_active_at = new Date();
        await cart.save();
        return this.summarize(cart.toObject());
    }

    private async _getDeliveryCartDoc(userId: string, merchantId: string) {
        if (!userId) throw new UnauthorizedException('Login required');
        const uid = this.oid(userId, 'userId');
        const mid = this.oid(merchantId, 'merchant_id');

        const cart = await this.cartModel
            .findOne({ user_id: uid, merchant_id: mid, order_type: OrderType.DELIVERY, status: CartStatus.ACTIVE, deleted_at: null })
            .exec();

        if (!cart) {
            // nếu client gọi add/update mà chưa get current => auto create
            const created = await this.cartModel.create({
                user_id: uid,
                merchant_id: mid,
                order_type: OrderType.DELIVERY,
                status: CartStatus.ACTIVE,
                table_id: null,
                table_session_id: null,
                items: [],
                expires_at: null,
                last_active_at: new Date(),
                deleted_at: null,
            });
            return { cart: created };
        }
        return { cart };
    }

    // =========================
    // DINE-IN
    // =========================

    async getOrCreateDineInCart(args: { tableSessionId: string }) {
        const sid = this.oid(args.tableSessionId, 'table_session_id');

        const session: any = await this.tableSessionModel.findOne({ _id: sid }).lean();
        if (!session) throw new NotFoundException('TableSession not found');

        let cart = await this.cartModel
            .findOne({
                table_session_id: sid,
                merchant_id: session.merchant_id,
                order_type: OrderType.DINE_IN,
                status: CartStatus.ACTIVE,
                deleted_at: null,
            })
            .exec();

        if (!cart) {
            cart = await this.cartModel.create({
                user_id: null, // treat as guest luôn
                merchant_id: session.merchant_id,
                order_type: OrderType.DINE_IN,
                status: CartStatus.ACTIVE,
                table_id: session.table_id,
                table_session_id: sid,
                items: [],
                expires_at: null,
                last_active_at: new Date(),
                deleted_at: null,
            });
        }

        return this.summarize(cart.toObject());
    }

    async addItemDineIn(args: { tableSessionId: string; dto: AddCartItemDto }) {
        const cart = await this._getDineInCartDoc(args.tableSessionId);

        // chỉ cho add khi session ACTIVE (nếu sau này có CLOSING thì chặn luôn)
        const session: any = await this.tableSessionModel.findOne({ _id: cart.table_session_id }).lean();
        const st = String(session?.status ?? '');
        if (st !== 'active') throw new BadRequestException('TableSession is not active');

        await this._mutateAddItem(cart, OrderType.DINE_IN, args.dto);
        await cart.save();
        return this.summarize(cart.toObject());
    }

    async updateItemDineIn(args: { tableSessionId: string; lineKey: string; dto: UpdateCartItemDto }) {
        const cart = await this._getDineInCartDoc(args.tableSessionId);
        this._mutateUpdateLine(cart, args.lineKey, args.dto);
        await cart.save();
        return this.summarize(cart.toObject());
    }

    async removeItemDineIn(args: { tableSessionId: string; lineKey: string }) {
        const cart = await this._getDineInCartDoc(args.tableSessionId);
        this._mutateRemoveLine(cart, args.lineKey);
        await cart.save();
        return this.summarize(cart.toObject());
    }

    async clearDineIn(args: { tableSessionId: string }) {
        const cart = await this._getDineInCartDoc(args.tableSessionId);
        cart.items = [];
        cart.last_active_at = new Date();
        await cart.save();
        return this.summarize(cart.toObject());
    }

    async abandonDineInCart(args: { tableSessionId: string }) {
        const sid = this.oid(args.tableSessionId, 'table_session_id');

        const cart = await this.cartModel.findOne({
            table_session_id: sid,
            order_type: OrderType.DINE_IN,
            status: CartStatus.ACTIVE,
            deleted_at: null,
        });

        if (!cart) return { ok: true };

        cart.status = CartStatus.ABANDONED;
        cart.expires_at = new Date(Date.now() + 60 * 60 * 1000); // +1h
        cart.last_active_at = new Date();
        await cart.save();
        return { ok: true };
    }

    private async _getDineInCartDoc(tableSessionId: string) {
        const sid = this.oid(tableSessionId, 'table_session_id');

        const session: any = await this.tableSessionModel.findOne({ _id: sid }).lean();
        if (!session) throw new NotFoundException('TableSession not found');

        let cart = await this.cartModel.findOne({
            table_session_id: sid,
            merchant_id: session.merchant_id,
            order_type: OrderType.DINE_IN,
            status: CartStatus.ACTIVE,
            deleted_at: null,
        });

        if (!cart) {
            cart = await this.cartModel.create({
                user_id: null,
                merchant_id: session.merchant_id,
                order_type: OrderType.DINE_IN,
                status: CartStatus.ACTIVE,
                table_id: session.table_id,
                table_session_id: sid,
                items: [],
                expires_at: null,
                last_active_at: new Date(),
                deleted_at: null,
            });
        }
        return cart;
    }

    // =========================
    // MUTATIONS (shared)
    // =========================

    private async _mutateAddItem(cart: any, orderType: OrderType, dto: AddCartItemDto) {
        // basic sanity
        if (dto.item_type === 'product' && !dto.product_id) {
            throw new BadRequestException('product_id is required');
        }
        if (dto.item_type === 'topping' && !dto.topping_id) {
            throw new BadRequestException('topping_id is required');
        }

        // Resolve snapshot + totals
        const built = dto.item_type === 'product'
            ? await this._buildProductLine(cart.merchant_id, dto)
            : await this._buildToppingLine(cart.merchant_id, dto);

        // Merge by line_key
        const idx = (cart.items ?? []).findIndex((x: any) => x.line_key === built.line_key);
        if (idx >= 0) {
            cart.items[idx].quantity = Number(cart.items[idx].quantity ?? 0) + built.quantity;
            cart.items[idx].item_total = Number(cart.items[idx].item_unit_total ?? 0) * cart.items[idx].quantity;
            cart.items[idx].updated_at = new Date();
        } else {
            cart.items.push(built);
        }

        cart.last_active_at = new Date();
    }

    private _mutateUpdateLine(cart: any, lineKey: string, dto: UpdateCartItemDto) {
        const idx = (cart.items ?? []).findIndex((x: any) => x.line_key === lineKey);
        if (idx < 0) throw new NotFoundException('Cart line not found');

        if (dto.quantity != null) {
            cart.items[idx].quantity = dto.quantity;
            cart.items[idx].item_total = Number(cart.items[idx].item_unit_total ?? 0) * dto.quantity;
        }
        if (dto.note != null) cart.items[idx].note = dto.note;

        cart.items[idx].updated_at = new Date();
        cart.last_active_at = new Date();
    }

    private _mutateRemoveLine(cart: any, lineKey: string) {
        const before = cart.items?.length ?? 0;
        cart.items = (cart.items ?? []).filter((x: any) => x.line_key !== lineKey);
        if ((cart.items?.length ?? 0) === before) throw new NotFoundException('Cart line not found');
        cart.last_active_at = new Date();
    }

    // =========================
    // BUILD LINE SNAPSHOTS
    // =========================

    private async _buildProductLine(merchantId: Types.ObjectId, dto: AddCartItemDto) {
        const pid = this.oid(dto.product_id!, 'product_id');

        const p: any = await this.productModel.findOne({
            _id: pid,
            merchant_id: merchantId,
            deleted_at: null,
            is_active: true,
        }).lean();
        if (!p) throw new NotFoundException('Product not found');

        if (!p.is_available) throw new BadRequestException('Product not available');

        const base = Number(p.base_price ?? 0);
        const sale = Number(p.sale_price ?? 0);
        const unitPrice = sale > 0 && sale < base ? sale : base;
        const basePrice = sale > 0 && sale < base ? base : null;

        // options snapshot (request chỉ gửi id, server tự fill)
        const selectedOptionsInput = dto.selected_options ?? [];
        const selectedOptions = await this._resolveOptions(pid, selectedOptionsInput);

        // toppings snapshot (request chỉ gửi topping_id+qty)
        const selectedToppingsInput = dto.selected_toppings ?? [];
        const selectedToppings = await this._resolveToppings(merchantId, selectedToppingsInput);

        const optSum = selectedOptions.reduce((s, x) => s + Number(x.price_modifier ?? 0), 0);
        const topSum = selectedToppings.reduce((s, x) => s + Number(x.unit_price ?? 0) * Number(x.quantity ?? 0), 0);

        const itemUnitTotal = unitPrice + optSum + topSum;
        const qty = Number(dto.quantity ?? 1);
        const itemTotal = itemUnitTotal * qty;

        const lineKey = buildLineKey({
            productId: String(pid),
            options: selectedOptions.map((x: any) => ({ option_id: String(x.option_id), choice_id: String(x.choice_id) })),
            toppings: selectedToppings.map((x: any) => ({ topping_id: String(x.topping_id), quantity: Number(x.quantity ?? 0) })),
        });

        // snapshot image: lấy ảnh đầu (nếu bạn muốn)
        const img = Array.isArray(p.images) && p.images.length ? (p.images.slice().sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null) : null;

        return {
            line_key: lineKey,
            item_type: 'product',
            product_id: pid,
            topping_id: null,
            quantity: qty,
            product_name: String(p.name ?? ''),
            product_image_url: img,
            unit_price: unitPrice,
            base_price: basePrice,
            selected_options: selectedOptions,
            selected_toppings: selectedToppings,
            note: (dto.note ?? '').toString(),
            item_unit_total: itemUnitTotal,
            item_total: itemTotal,
            created_at: new Date(),
            updated_at: new Date(),
        };
    }

    private async _buildToppingLine(merchantId: Types.ObjectId, dto: AddCartItemDto) {
        const tid = this.oid(dto.topping_id!, 'topping_id');

        const t: any = await this.toppingModel.findOne({
            _id: tid,
            merchant_id: merchantId,
            deleted_at: null,
            is_active: true,
        }).lean();
        if (!t) throw new NotFoundException('Topping not found');

        if (!t.is_available) throw new BadRequestException('Topping not available');

        const maxQ = Number(t.max_quantity ?? 1);
        const qty = Number(dto.quantity ?? 1);
        if (qty > maxQ) throw new BadRequestException(`Topping max_quantity is ${maxQ}`);

        const unitPrice = Number(t.price ?? 0);
        const itemUnitTotal = unitPrice;
        const itemTotal = unitPrice * qty;

        // dùng buildLineKey luôn cho topping line (để update/remove theo line_key)
        const lineKey = buildLineKey({
            productId: `topping:${String(tid)}`,
            options: [],
            toppings: [],
        });

        // nếu topping có image_url thì set vào product_image_url; không có thì null
        const img = (t.image_url ?? null) as string | null;

        return {
            line_key: lineKey,
            item_type: 'topping',
            product_id: null,
            topping_id: tid,
            quantity: qty,
            product_name: String(t.name ?? ''),          // reuse field
            product_image_url: img,                      // reuse field
            unit_price: unitPrice,
            base_price: null,
            selected_options: [],
            selected_toppings: [],
            note: (dto.note ?? '').toString(),
            item_unit_total: itemUnitTotal,
            item_total: itemTotal,
            created_at: new Date(),
            updated_at: new Date(),
        };
    }

    private async _resolveOptions(
        productId: Types.ObjectId,
        input: Array<{ option_id: string; choice_id: string }>,
    ) {
        if (!input.length) return [];

        const optIds = input.map((x) => this.oid(x.option_id, 'option_id'));
        const docs: any[] = await this.optionModel
            .find({ _id: { $in: optIds }, product_id: productId, deleted_at: null })
            .lean();

        const byId = new Map<string, any>(docs.map((d) => [String(d._id), d]));

        return input.map((x) => {
            const opt = byId.get(String(x.option_id));
            if (!opt) throw new BadRequestException('Invalid option_id');

            const choice = (opt.choices ?? []).find((c: any) => String(c._id) === String(x.choice_id));
            if (!choice) throw new BadRequestException('Invalid choice_id');

            if (choice.is_available === false) throw new BadRequestException('Choice not available');

            return {
                option_id: this.oid(x.option_id, 'option_id'),
                option_name: String(opt.name ?? ''),
                choice_id: this.oid(x.choice_id, 'choice_id'),
                choice_name: String(choice.name ?? ''),
                price_modifier: Number(choice.price_modifier ?? 0),
            };
        });
    }

    private async _resolveToppings(
        merchantId: Types.ObjectId,
        input: Array<{ topping_id: string; quantity: number }>,
    ) {
        if (!input.length) return [];

        const ids = input.map((x) => this.oid(x.topping_id, 'topping_id'));
        const docs: any[] = await this.toppingModel
            .find({ _id: { $in: ids }, merchant_id: merchantId, deleted_at: null, is_active: true })
            .lean();

        const byId = new Map<string, any>(docs.map((d) => [String(d._id), d]));

        return input.map((x) => {
            const t = byId.get(String(x.topping_id));
            if (!t) throw new BadRequestException('Invalid topping_id');
            if (!t.is_available) throw new BadRequestException('Topping not available');

            const qty = Number(x.quantity ?? 1);
            const maxQ = Number(t.max_quantity ?? 1);
            if (qty < 1 || qty > maxQ) throw new BadRequestException(`Topping max_quantity is ${maxQ}`);

            return {
                topping_id: this.oid(x.topping_id, 'topping_id'),
                topping_name: String(t.name ?? ''),
                topping_image_url: (t.image_url ?? null) as string | null,
                unit_price: Number(t.price ?? 0),
                quantity: qty,
            };
        });
    }
}
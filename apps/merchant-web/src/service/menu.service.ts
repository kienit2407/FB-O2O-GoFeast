/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from '@/lib/api';
import type { Category, Product, Topping } from '@/types';

// ===== API DTOs =====
type CategoryApi = {
    _id: string;
    name: string;
    description?: string;
    image_url?: string;
    sort_order?: number;
    is_active?: boolean;
};
interface OptionGroup {
    id: string;
    name: string;
    type: 'single' | 'multiple';
    required: boolean;
    options: Option[];
    //  NEW (optional)
    productId?: string;
    minSelect?: number;
    maxSelect?: number;
    order?: number;
}
// ===== Product Options API =====
type ChoiceApi = {
    _id: string;
    name: string;
    price_modifier?: number;
    is_default?: boolean;
    is_available?: boolean;
};

type OptionGroupApi = {
    _id: string;
    product_id: string;
    name: string;
    type: "single" | "multiple";
    is_required: boolean;
    min_select: number;
    max_select: number;
    sort_order: number;
    deleted_at?: string | null;
    choices: ChoiceApi[];
};
interface Option {
    id: string;
    name: string;
    priceAdjustment: number;
    //  NEW (optional để không phá code cũ)
    isDefault?: boolean;
    isAvailable?: boolean;
}
const mapChoice = (c: ChoiceApi): Option => ({
    id: c._id,
    name: c.name,
    priceAdjustment: Number(c.price_modifier ?? 0),
    isDefault: !!c.is_default,
    isAvailable: c.is_available ?? true,
});

const mapOptionGroup = (g: OptionGroupApi): OptionGroup => ({
    id: g._id,
    productId: g.product_id,
    name: g.name,
    type: g.type,
    required: !!g.is_required,
    minSelect: Number(g.min_select ?? 0),
    maxSelect: Number(g.max_select ?? 1),
    order: Number(g.sort_order ?? 0),
    options: (g.choices || []).map(mapChoice),
});
type ProductImageApi = { url: string; public_id: string; position: number };

type ProductApi = {
    _id: string;
    name: string;
    description?: string;
    category_id: string;
    base_price: number;
    sale_price?: number;

    //  NEW (đúng với BE mới)
    images?: ProductImageApi[];
    total_sold?: number;
    average_rating?: number;
    topping_ids: string[];
    is_available: boolean;
    is_active: boolean;
    sort_order?: number;

    // (optional) nếu DB bạn còn data cũ, giữ tạm để fallback
    image_urls?: string[];
};

type ToppingApi = {
    _id: string;
    name: string;
    price: number;
    description?: string;
    image_url?: string | null;
    image_public_id?: string | null;
    is_available: boolean;
    is_active: boolean;

    sort_order?: number;
    max_quantity?: number;
};

// ===== unwrap response =====
function unwrap<T>(res: any): T {
    if (res?.data?.data !== undefined) return res.data.data as T;
    return res?.data as T;
}

// ===== Helpers: FormData =====
function appendIfDefined(fd: FormData, key: string, value: any) {
    if (value === undefined || value === null) return;
    fd.append(key, String(value));
}
function appendArray(fd: FormData, key: string, arr?: any[]) {
    if (!arr || !Array.isArray(arr)) return;
    arr.forEach(v => {
        if (v === undefined || v === null) return;
        fd.append(key, String(v));
    });
}
function appendFiles(fd: FormData, key: string, files?: File[] | File | null) {
    if (!files) return;
    if (Array.isArray(files)) files.forEach(f => fd.append(key, f));
    else fd.append(key, files);
}

// ===== map API -> FE types =====
const mapCategory = (c: CategoryApi): Category => ({
    id: c._id,
    name: c.name,
    description: c.description || '',
    order: c.sort_order ?? 0,
    isActive: c.is_active ?? true,
});

const mapProduct = (p: ProductApi): Product => {
    //  ưu tiên images mới, fallback image_urls cũ nếu còn
    const urls =
        p.images && p.images.length
            ? p.images
                .slice()
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .map(x => x.url)
            : (p.image_urls || []);

    return {
        id: p._id,
        name: p.name,
        description: p.description || '',
        categoryId: p.category_id,
        price: p.base_price,            //  giá gốc
        salePrice: p.sale_price ?? 0,   //  giá giảm
        images: urls,
        optionGroups: [],
        order: p.sort_order ?? 0,
        //  thêm
        //  add
        totalSold: p.total_sold ?? 0,
        averageRating: p.average_rating ?? 0,
        toppings: p.topping_ids || [],
        isAvailable: p.is_available ?? true,
        isActive: p.is_active ?? true,
    };
};

const mapTopping = (t: ToppingApi): Topping => ({
    id: t._id,
    name: t.name,
    price: t.price,
    order: t.sort_order ?? 0,          //  thêm
    isAvailable: t.is_available ?? true,
    imageUrl: t.image_url ?? null,
});

// ===== Endpoints =====
const EP = {
    categories: '/merchant/menu/categories',
    products: '/merchant/menu/products',
    toppings: '/merchant/menu/toppings',
};

export const menuService = {
    // ===================== CATEGORIES =====================
    async listCategories(params?: { includeInactive?: boolean }) {
        const res = await API.get(EP.categories, {
            params: { includeInactive: params?.includeInactive ? 1 : 0 },
        });
        const data = unwrap<CategoryApi[]>(res);
        return (data || []).map(mapCategory).sort((a, b) => a.order - b.order);
    },
    async listProductImages(productId: string) {
        const res = await API.get(`${EP.products}/${productId}/images`);
        const data = unwrap<ProductImageApi[] | { items: ProductImageApi[] }>(res);

        const items = Array.isArray(data) ? data : (data?.items ?? []);
        return (items || [])
            .slice()
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    },

    async uploadProductImages(productId: string, files: File[]) {
        const fd = new FormData();
        files.forEach((f) => fd.append('images', f));
        // POST /merchant/menu/products/:id/images
        await API.post(`${EP.products}/${productId}/images`, fd);
    },
    async listOptionGroupsByProduct(productId: string) {
        const res = await API.get(`/merchant/menu/products/${productId}/options`);
        const data = unwrap<OptionGroupApi[]>(res);
        return (data || [])
            .map(mapOptionGroup)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },

    async createOptionGroup(
        productId: string,
        payload: {
            name: string;
            type?: "single" | "multiple";
            is_required?: boolean;
            min_select?: number;
            max_select?: number;
            sort_order?: number;
        }
    ) {
        const res = await API.post(`/merchant/menu/products/${productId}/options`, payload);
        const data = unwrap<OptionGroupApi>(res);
        return mapOptionGroup(data);
    },

    async updateOptionGroup(
        optionId: string,
        payload: Partial<{
            name: string;
            type: "single" | "multiple";
            is_required: boolean;
            min_select: number;
            max_select: number;
            sort_order: number;
        }>
    ) {
        const res = await API.patch(`/merchant/menu/options/${optionId}`, payload);
        const data = unwrap<OptionGroupApi>(res);
        return mapOptionGroup(data);
    },

    async reorderOptionGroups(productId: string, orderedIds: string[]) {
        const res = await API.put(`/merchant/menu/products/${productId}/options/reorder`, { orderedIds });
        const data = unwrap<OptionGroupApi[]>(res);
        return (data || [])
            .map(mapOptionGroup)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },

    async deleteOptionGroup(optionId: string) {
        await API.delete(`/merchant/menu/options/${optionId}`);
    },

    // ----- choices -----
    async addChoice(
        optionId: string,
        payload: { name: string; price_modifier?: number; is_default?: boolean; is_available?: boolean }
    ) {
        const res = await API.post(`/merchant/menu/options/${optionId}/choices`, payload);
        const data = unwrap<OptionGroupApi>(res);
        return mapOptionGroup(data);
    },

    async updateChoice(
        optionId: string,
        choiceId: string,
        payload: Partial<{ name: string; price_modifier: number; is_default: boolean; is_available: boolean }>
    ) {
        const res = await API.patch(`/merchant/menu/options/${optionId}/choices/${choiceId}`, payload);
        const data = unwrap<OptionGroupApi>(res);
        return mapOptionGroup(data);
    },

    async toggleChoiceAvailable(optionId: string, choiceId: string) {
        const res = await API.patch(`/merchant/menu/options/${optionId}/choices/${choiceId}/toggle-available`);
        const data = unwrap<OptionGroupApi>(res);
        return mapOptionGroup(data);
    },

    async setChoiceDefault(optionId: string, choiceId: string) {
        const res = await API.patch(`/merchant/menu/options/${optionId}/choices/${choiceId}/set-default`);
        const data = unwrap<OptionGroupApi>(res);
        return mapOptionGroup(data);
    },

    async deleteChoice(optionId: string, choiceId: string) {
        const res = await API.delete(`/merchant/menu/options/${optionId}/choices/${choiceId}`);
        const data = unwrap<OptionGroupApi>(res);
        return mapOptionGroup(data);
    },
    async reorderProductImages(productId: string, items: { public_id: string; position: number }[]) {
        const orderedPublicIds = items
            .slice()
            .sort((a, b) => a.position - b.position)
            .map(x => x.public_id);

        await API.patch(`/merchant/menu/products/${productId}/images/reorder`, { orderedPublicIds });
    },
    async reorderToppings(orderedIds: string[]) {
        const res = await API.put(`${EP.toppings}/reorder`, { orderedIds });
        const data = unwrap<ToppingApi[]>(res);
        return (data || []).map(mapTopping).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    async reorderProducts(orderedIds: string[]) {
        const res = await API.put(`${EP.products}/reorder`, { orderedIds });
        const data = unwrap<ProductApi[]>(res);
        return (data || []).map(mapProduct).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },





    async deleteProductImage(productId: string, publicId: string) {
        // DELETE /merchant/menu/products/:id/images/:publicId
        await API.delete(`${EP.products}/${productId}/images/${publicId}`);
    },
    async createCategory(payload: { name: string; description?: string; imageFile?: File | null }) {
        const fd = new FormData();
        appendIfDefined(fd, 'name', payload.name);
        appendIfDefined(fd, 'description', payload.description);
        appendFiles(fd, 'image', payload.imageFile || null);

        const res = await API.post(EP.categories, fd);
        const data = unwrap<CategoryApi>(res);
        return mapCategory(data);
    },

    async updateCategory(id: string, payload: { name?: string; description?: string; imageFile?: File | null }) {
        const fd = new FormData();
        appendIfDefined(fd, 'name', payload.name);
        appendIfDefined(fd, 'description', payload.description);
        appendFiles(fd, 'image', payload.imageFile || null);

        const res = await API.patch(`${EP.categories}/${id}`, fd);
        const data = unwrap<CategoryApi>(res);
        return mapCategory(data);
    },

    async toggleCategoryActive(id: string) {
        const res = await API.patch(`${EP.categories}/${id}/toggle-active`);
        const data = unwrap<CategoryApi>(res);
        return mapCategory(data);
    },

    async reorderCategories(orderedIds: string[]) {
        const res = await API.put(`${EP.categories}/reorder`, { orderedIds });
        const data = unwrap<CategoryApi[]>(res);
        return (data || []).map(mapCategory).sort((a, b) => a.order - b.order);
    },

    async deleteCategory(id: string) {
        await API.delete(`${EP.categories}/${id}`);
    },

    // ===================== PRODUCTS =====================
    async listProducts(params?: { q?: string; categoryId?: string; status?: 'all' | 'available' | 'unavailable' }) {
        const res = await API.get(EP.products, {
            params: {
                q: params?.q,
                categoryId: params?.categoryId,
                status: params?.status || 'all',
            },
        });
        const data = unwrap<ProductApi[]>(res);
        return (data || []).map(mapProduct);
    },

    async createProduct(payload: {
        name: string;
        description?: string;
        price: number;
        categoryId: string;
        salePrice?: number;
        toppingIds: string[];
        isAvailable: boolean;
        isActive: boolean;
        images?: File[] | null;
    }) {
        const fd = new FormData();
        appendIfDefined(fd, 'name', payload.name);
        appendIfDefined(fd, 'description', payload.description);
        appendIfDefined(fd, 'base_price', payload.price);
        appendIfDefined(fd, 'sale_price', payload.salePrice ?? 0);
        appendIfDefined(fd, 'category_id', payload.categoryId);
        appendIfDefined(fd, 'is_available', payload.isAvailable);
        appendIfDefined(fd, "is_active", payload.isActive ?? true); //  NEW
        appendArray(fd, 'topping_ids', payload.toppingIds);
        appendFiles(fd, 'images', payload.images || null);

        const res = await API.post(EP.products, fd);
        const data = unwrap<ProductApi>(res);
        return mapProduct(data);
    },

    async updateProduct(
        id: string,
        payload: Partial<{
            name: string;
            description: string;
            price: number;
            salePrice?: number;
            categoryId: string;
            toppingIds: string[];
            isAvailable: boolean;
            isActive: boolean;

            images: File[] | null;
            replaceImages: boolean;
        }>,
    ) {
        const fd = new FormData();
        appendIfDefined(fd, 'name', payload.name);
        appendIfDefined(fd, 'description', payload.description);
        if (payload.price !== undefined) appendIfDefined(fd, 'base_price', payload.price);
        if (payload.salePrice !== undefined) appendIfDefined(fd, 'sale_price', payload.salePrice); //  THÊM DÒNG NÀY
        if (payload.categoryId !== undefined) appendIfDefined(fd, 'category_id', payload.categoryId);
        if (payload.isAvailable !== undefined) appendIfDefined(fd, 'is_available', payload.isAvailable);
        if (payload.toppingIds !== undefined) appendArray(fd, 'topping_ids', payload.toppingIds);
        if (payload.isActive !== undefined) appendIfDefined(fd, "is_active", payload.isActive); //  NEW
        appendFiles(fd, 'images', payload.images || null);

        const res = await API.patch(`${EP.products}/${id}`, fd, {
            params: { replaceImages: payload.replaceImages ? 1 : 0 },
        });
        const data = unwrap<ProductApi>(res);
        return mapProduct(data);
    },

    async toggleProductAvailable(id: string) {
        const res = await API.patch(`${EP.products}/${id}/toggle-available`);
        const data = unwrap<ProductApi>(res);
        return mapProduct(data);
    },

    async deleteProduct(id: string) {
        await API.delete(`${EP.products}/${id}`);
    },

    // ===================== TOPPINGS =====================
    async listToppings(params?: { includeInactive?: boolean; onlyAvailable?: boolean }) {
        const res = await API.get(EP.toppings, {
            params: {
                includeInactive: params?.includeInactive ? 1 : 0,
                onlyAvailable: params?.onlyAvailable ? 1 : 0,
            },
        });
        const data = unwrap<ToppingApi[]>(res);
        return (data || []).map(mapTopping);
    },

    async createTopping(payload: { name: string; price: number; imageFile?: File | null }) {
        const fd = new FormData();
        appendIfDefined(fd, 'name', payload.name);
        appendIfDefined(fd, 'price', payload.price);
        appendFiles(fd, 'image', payload.imageFile || null);

        const res = await API.post(EP.toppings, fd);
        const data = unwrap<ToppingApi>(res);
        return mapTopping(data);
    },

    async updateTopping(
        id: string,
        payload: { name?: string; price?: number; imageFile?: File | null; removeImage?: boolean }
    ) {
        const fd = new FormData();
        appendIfDefined(fd, 'name', payload.name);
        appendIfDefined(fd, 'price', payload.price);
        appendFiles(fd, 'image', payload.imageFile || null);

        // ✅ optional: xoá ảnh cũ
        if (payload.removeImage) fd.append('remove_image', '1');

        const res = await API.patch(`${EP.toppings}/${id}`, fd);
        const data = unwrap<ToppingApi>(res);
        return mapTopping(data);
    },
    async toggleToppingAvailable(id: string) {
        const res = await API.patch(`${EP.toppings}/${id}/toggle-available`);
        const data = unwrap<ToppingApi>(res);
        return mapTopping(data);
    },

    async deleteTopping(id: string) {
        await API.delete(`${EP.toppings}/${id}`);
    },
};
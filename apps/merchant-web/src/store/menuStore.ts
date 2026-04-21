/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import type { Category, Product, Topping } from '@/types';
import { menuService } from '@/service/menu.service';
import { API } from '@/lib/api';

type MenuLoading = {
    categories: boolean;
    products: boolean;
    toppings: boolean;
};

type MenuState = {
    categories: Category[];
    products: Product[];
    toppings: Topping[];
    loading: MenuLoading;
    error?: string;

    fetchCategories: (opts?: { includeInactive?: boolean }) => Promise<void>;
    createCategory: (payload: { name: string; description?: string; imageFile?: File | null }) => Promise<Category>;
    updateCategory: (id: string, payload: { name?: string; description?: string; imageFile?: File | null }) => Promise<Category>;
    toggleCategoryActive: (id: string) => Promise<Category>;
    reorderCategories: (orderedIds: string[]) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    reorderToppings: (orderedIds: string[]) => Promise<void>;
    reorderProducts: (orderedIds: string[]) => Promise<void>;
    fetchProducts: (opts?: { q?: string; categoryId?: string; status?: 'all' | 'available' | 'unavailable' }) => Promise<void>;
    createProduct: (payload: {
        name: string;
        description?: string;
        price: number;
        categoryId: string;
        toppingIds: string[];
        salePrice?: number;
        isAvailable: boolean;
        isActive: boolean;
        images?: File[] | null;
    }) => Promise<Product>;
    updateProduct: (
        id: string,
        payload: Partial<{
            name: string;
            description: string;
            price: number;
            categoryId: string;
            salePrice?: number;
            toppingIds: string[];
            isAvailable: boolean;
            isActive: boolean;
            images: File[] | null;
            replaceImages: boolean;
        }>,
    ) => Promise<Product>;
    toggleProductAvailable: (id: string) => Promise<Product>;
    deleteProduct: (id: string) => Promise<void>;

    fetchToppings: (opts?: { includeInactive?: boolean; onlyAvailable?: boolean }) => Promise<void>;
    createTopping: (payload: { name: string; price: number; imageFile?: File | null }) => Promise<Topping>;
    updateTopping: (id: string, payload: { name?: string; price?: number; imageFile?: File | null; removeImage?: boolean }) => Promise<Topping>;
    toggleToppingAvailable: (id: string) => Promise<Topping>;
    deleteTopping: (id: string) => Promise<void>;
};

export const useMenuStore = create<MenuState>((set) => ({
    categories: [],
    products: [],
    toppings: [],
    loading: { categories: false, products: false, toppings: false },
    error: undefined,
    reorderToppings: async (orderedIds) => { const data = await menuService.reorderToppings(orderedIds); set({ toppings: data }); },
    reorderProducts: async (orderedIds) => { const data = await menuService.reorderProducts(orderedIds); set({ products: data }); },
    // ===== Categories =====
    fetchCategories: async (opts) => {
        set(s => ({ loading: { ...s.loading, categories: true }, error: undefined }));
        try {
            const data = await menuService.listCategories({ includeInactive: opts?.includeInactive ?? true });
            set({ categories: data });
        } catch (e: any) {
            set({ error: e.message || 'Fetch categories failed' });
            throw e;
        } finally {
            set(s => ({ loading: { ...s.loading, categories: false } }));
        }
    },

    createCategory: async (payload) => {
        const created = await menuService.createCategory(payload);
        set(s => ({ categories: [...s.categories, created].sort((a, b) => a.order - b.order) }));
        return created;
    },

    updateCategory: async (id, payload) => {
        const updated = await menuService.updateCategory(id, payload);
        set(s => ({ categories: s.categories.map(c => (c.id === id ? updated : c)) }));
        return updated;
    },

    toggleCategoryActive: async (id) => {
        const updated = await menuService.toggleCategoryActive(id);
        set(s => ({ categories: s.categories.map(c => (c.id === id ? updated : c)) }));
        return updated;
    },

    reorderCategories: async (orderedIds) => {
        const data = await menuService.reorderCategories(orderedIds);
        set({ categories: data });
    },

    deleteCategory: async (id) => {
        await menuService.deleteCategory(id);
        set(s => ({ categories: s.categories.filter(c => c.id !== id) }));
    },

    // ===== Products =====
    fetchProducts: async (opts) => {
        set(s => ({ loading: { ...s.loading, products: true }, error: undefined }));
        try {
            const data = await menuService.listProducts(opts);
            set({ products: data });
        } catch (e: any) {
            set({ error: e.message || 'Fetch products failed' });
            throw e;
        } finally {
            set(s => ({ loading: { ...s.loading, products: false } }));
        }
    },

    createProduct: async (payload) => {
        const created = await menuService.createProduct(payload);
        set(s => ({ products: [...s.products, created] }));
        return created;
    },

    updateProduct: async (id, payload) => {
        const updated = await menuService.updateProduct(id, payload);
        set(s => ({ products: s.products.map(p => (p.id === id ? updated : p)) }));
        return updated;
    },

    toggleProductAvailable: async (id) => {
        const updated = await menuService.toggleProductAvailable(id);
        set(s => ({ products: s.products.map(p => (p.id === id ? updated : p)) }));
        return updated;
    },

    deleteProduct: async (id) => {
        await menuService.deleteProduct(id);
        set(s => ({ products: s.products.filter(p => p.id !== id) }));
    },

    // ===== Toppings =====
    fetchToppings: async (opts) => {
        set(s => ({ loading: { ...s.loading, toppings: true }, error: undefined }));
        try {
            const data = await menuService.listToppings(opts);
            set({ toppings: data });
        } catch (e: any) {
            set({ error: e.message || 'Fetch toppings failed' });
            throw e;
        } finally {
            set(s => ({ loading: { ...s.loading, toppings: false } }));
        }
    },
    async reorderProductImages(productId: string, items: { public_id: string; position: number }[]) {
        const orderedPublicIds = items
            .slice()
            .sort((a, b) => a.position - b.position)
            .map(x => x.public_id);

        await API.patch(`/merchant/menu/products/${productId}/images/reorder`, { orderedPublicIds });
    },
    createTopping: async (payload) => {
        const created = await menuService.createTopping(payload);
        set(s => ({ toppings: [...s.toppings, created] }));
        return created;
    },

    updateTopping: async (id, payload) => {
        const updated = await menuService.updateTopping(id, payload);
        set(s => ({ toppings: s.toppings.map(t => (t.id === id ? updated : t)) }));
        return updated;
    },

    toggleToppingAvailable: async (id) => {
        const updated = await menuService.toggleToppingAvailable(id);
        set(s => ({ toppings: s.toppings.map(t => (t.id === id ? updated : t)) }));
        return updated;
    },

    deleteTopping: async (id) => {
        await menuService.deleteTopping(id);
        set(s => ({ toppings: s.toppings.filter(t => t.id !== id) }));
    },
}));
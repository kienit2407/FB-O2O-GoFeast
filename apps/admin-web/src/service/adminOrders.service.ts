import { API } from '@/lib/api';

export type AdminOrderType = 'delivery' | 'dine_in';

export type AdminOrderActor = {
  id: string | null;
  full_name: string;
  phone: string | null;
};

export type AdminMerchantActor = {
  id: string | null;
  name: string;
  address?: string | null;
};

export type AdminDriverActor = {
  id: string;
  full_name: string;
  phone: string | null;
} | null;

export type AdminOrderTableInfo = {
  session_id: string | null;
  table_id: string;
  table_number: string;
  table_name?: string | null;
} | null;

export type AdminOrderListItem = {
  id: string;
  order_number: string;
  order_type: AdminOrderType;
  status: string;
  customer: AdminOrderActor;
  merchant: AdminMerchantActor;
  driver: AdminDriverActor;
  table: AdminOrderTableInfo;
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  total_amount: number;
  payment_method: string | null;
  payment_status: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminOrderItem = {
  _id?: string;
  item_type?: 'product' | 'topping';
  product_name?: string;
  topping_name?: string;
  quantity: number;
  unit_price: number;
  item_total: number;
  selected_options?: Array<{
    option_name: string;
    choice_name: string;
    price_modifier: number;
  }>;
  selected_toppings?: Array<{
    topping_name: string;
    quantity: number;
    unit_price: number;
  }>;
  note?: string;
};

export type AdminOrderStatusHistory = {
  status: string;
  changed_at: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  note: string | null;
};

export type AdminOrderDetail = AdminOrderListItem & {
  items: AdminOrderItem[];
  status_history: AdminOrderStatusHistory[];
  delivery_address: {
    address?: string;
    receiver_name?: string;
    receiver_phone?: string;
    note?: string;
    location?: {
      type?: 'Point';
      coordinates?: [number, number];
    };
  } | null;
  order_note: string;
  subtotal_before_discount: number;
  delivery_fee_before_discount: number;
  discounts: {
    food_discount?: number;
    delivery_discount?: number;
    total_discount?: number;
  };
  applied_vouchers: Array<{
    voucher_code?: string;
    scope?: string;
    sponsor?: string;
    discount_amount?: number;
  }>;
  paid_at: string | null;
  cancelled_by: string | null;
  driver_assigned_at: string | null;
  driver_arrived_at: string | null;
  estimated_prep_time: number;
  estimated_delivery_time: string | null;
  proof_of_delivery_images: string[];
};

export type AdminOrdersListResponse = {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  limit: number;
  status_counts: Record<string, number>;
};

export const adminOrdersService = {
  async list(params: {
    order_type: AdminOrderType;
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminOrdersListResponse> {
    const res = await API.get('/admin/orders', {
      params: {
        order_type: params.order_type,
        q: params.q,
        status: params.status,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    });

    return res.data?.data;
  },

  async detail(orderId: string): Promise<AdminOrderDetail> {
    const res = await API.get(`/admin/orders/${orderId}`);
    return res.data?.data;
  },

  async forceCancel(orderId: string, reason?: string): Promise<AdminOrderDetail> {
    const res = await API.patch(`/admin/orders/${orderId}/force-cancel`, { reason });
    return res.data?.data;
  },
};

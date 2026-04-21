import { API } from '@/lib/api';

export type AdminSearchOrderResult = {
  id: string;
  order_number: string;
  order_type: 'delivery' | 'dine_in';
  status: string;
  created_at: string;
};

export type AdminSearchMerchantResult = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  approval_status: string;
};

export type AdminSearchDriverResult = {
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  verification_status: string;
  vehicle_plate: string | null;
};

export type AdminSearchTopResult =
  | ({ type: 'order' } & AdminSearchOrderResult)
  | ({ type: 'merchant' } & AdminSearchMerchantResult)
  | ({ type: 'driver' } & AdminSearchDriverResult)
  | null;

export type AdminGlobalSearchResponse = {
  query: string;
  orders: AdminSearchOrderResult[];
  merchants: AdminSearchMerchantResult[];
  drivers: AdminSearchDriverResult[];
  top_result: AdminSearchTopResult;
};

export const adminSearchService = {
  async searchGlobal(q: string, limit = 5): Promise<AdminGlobalSearchResponse> {
    const res = await API.get('/admin/search/global', {
      params: { q, limit },
    });

    return res.data?.data;
  },
};

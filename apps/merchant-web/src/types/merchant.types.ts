interface MerchantDocuments {
    id_card_front_url?: string;
    id_card_back_url?: string;
    business_license_url?: string;
    store_front_image_url?: string;
}

interface MerchantBusinessHours {
    day: string; // E.g. "Monday", "Tuesday", etc.
    open_time: string; // E.g. "09:00 AM"
    close_time: string; // E.g. "06:00 PM"
}

export interface Merchant {
    id: string;
    owner_user_id: string;
    name: string;
    description: string;
    phone: string;
    email: string;
    category: string;
    address: string;
    is_accepting_orders: boolean;
    min_order_amount: number;
    approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'suspended';
    rejection_reason: string | null;
    rejection_reasons: string[];
    rejection_note: string | null;
    onboarding_step: number;
    location?: MerchantLocation | null;
    average_prep_time_min?: number | null;
    delivery_radius_km?: number | null;
    submitted_at: Date | null;
    rejected_at: Date | null;
    approval_attempts: number;
    suspended_reason: string | null;
    commission_rate: number;
    documents: MerchantDocuments;
    business_hours: MerchantBusinessHours[];
    total_orders: number;
    average_rating: number;
    logo_url?: string | null;
    cover_image_url?: string | null;
    total_reviews: number;
    deleted_at: Date | null;
    created_at: Date;
    updated_at: Date;
}
export interface MerchantLocation {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
}
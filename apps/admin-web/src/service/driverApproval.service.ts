/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from '@/lib/api';

export type DriverVerificationStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type DriverLicenseType = 'A1' | 'A2' | 'B1' | 'B2';

export type UserLite = {
    id: string;
    email?: string | null;
    phone?: string | null;
    full_name?: string | null;
    status?: string | null;
    role?: string | null;
    avatar_url?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

export type DriverProfileLite = {
    _id: string;
    user_id: any; // populated object hoặc string

    __v?: number;

    // flags / metrics
    accept_food_orders?: boolean;
    average_rating?: number;
    total_deliveries?: number;
    total_earnings?: number;

    // banking
    bank_name?: string | null;
    bank_account_name?: string | null;
    bank_account_number?: string | null;

    // location
    current_location?: any | null;
    last_location_update?: string | null;

    // id card
    id_card_number?: string | null;
    id_card_front_url?: string | null;
    id_card_back_url?: string | null;

    // license
    license_type?: DriverLicenseType | null;
    license_number?: string | null;
    license_expiry?: string | null;
    license_image_url?: string | null;

    // vehicle
    vehicle_brand?: string | null;
    vehicle_model?: string | null;
    vehicle_plate?: string | null;
    vehicle_image_url?: string | null;

    // verification
    verification_status: DriverVerificationStatus;
    verification_reasons: string[];
    verification_note?: string | null;
    submitted_at?: string | null;
    verified_at?: string | null;
    verified_by?: string | null;

    // timestamps
    created_at?: string | null;
    updated_at?: string | null;
};

export type AdminDriverRow = {
    user: UserLite;
    driver_profile: DriverProfileLite | null;
    verification_status: DriverVerificationStatus; // dùng filter sidebar
};

export type RejectPayload = {
    reasons: string[];
    note?: string;
};

const mapStatus = (raw: any): DriverVerificationStatus => {
    const s = String(raw ?? '').toLowerCase();
    if (s.includes('pending')) return 'pending';
    if (s.includes('approved')) return 'approved';
    if (s.includes('rejected')) return 'rejected';
    if (s.includes('draft')) return 'draft';
    return 'draft';
};

const mapUser = (u: any): UserLite => ({
    id: u?._id ?? u?.id ?? '',
    email: u?.email ?? null,
    phone: u?.phone ?? null,
    full_name: u?.full_name ?? u?.fullName ?? null,
    status: u?.status ?? null,
    role: u?.role ?? null,
    avatar_url: u?.avatar_url ?? u?.avatarUrl ?? null,
    created_at: u?.created_at ?? null,
    updated_at: u?.updated_at ?? null,
});

const mapProfile = (p: any): DriverProfileLite => ({
    _id: p?._id ?? p?.id ?? '',
    user_id: p?.user_id,

    __v: p?.__v,

    accept_food_orders: p?.accept_food_orders ?? false,
    average_rating: p?.average_rating ?? 0,
    total_deliveries: p?.total_deliveries ?? 0,
    total_earnings: p?.total_earnings ?? 0,

    bank_name: p?.bank_name ?? null,
    bank_account_name: p?.bank_account_name ?? null,
    bank_account_number: p?.bank_account_number ?? null,

    current_location: p?.current_location ?? null,
    last_location_update: p?.last_location_update ?? null,

    id_card_number: p?.id_card_number ?? null,
    id_card_front_url: p?.id_card_front_url ?? null,
    id_card_back_url: p?.id_card_back_url ?? null,

    license_type: p?.license_type ?? null,
    license_number: p?.license_number ?? null,
    license_expiry: p?.license_expiry ?? null,
    license_image_url: p?.license_image_url ?? null,

    vehicle_brand: p?.vehicle_brand ?? null,
    vehicle_model: p?.vehicle_model ?? null,
    vehicle_plate: p?.vehicle_plate ?? null,
    vehicle_image_url: p?.vehicle_image_url ?? null,

    verification_status: mapStatus(p?.verification_status),
    verification_reasons: Array.isArray(p?.verification_reasons) ? p.verification_reasons : [],
    verification_note: p?.verification_note ?? null,
    submitted_at: p?.submitted_at ?? null,
    verified_at: p?.verified_at ?? null,
    verified_by: p?.verified_by ?? null,

    created_at: p?.created_at ?? null,
    updated_at: p?.updated_at ?? null,
});

/**
 * list: raw là DriverProfile (populate user_id)
 * detail: raw là { user, driver_profile, verification_status }
 */
const mapDriverRow = (raw: any): AdminDriverRow => {
    // detail shape
    if (raw?.user || raw?.driver_profile) {
        const profile = raw?.driver_profile ? mapProfile(raw.driver_profile) : null;
        const user = mapUser(raw?.user ?? raw?.driver_profile?.user_id);

        const status = mapStatus(raw?.verification_status ?? profile?.verification_status);
        return { user, driver_profile: profile, verification_status: status };
    }

    // list shape (raw = driver_profile)
    const profile = mapProfile(raw);
    const userObj = raw?.user_id; // populated
    const user = typeof userObj === 'object' ? mapUser(userObj) : mapUser({ _id: userObj });

    const status = mapStatus(profile.verification_status);
    return { user, driver_profile: profile, verification_status: status };
};

export const driverApprovalService = {
    async getDriversList(scope: 'list' | 'all' = 'list'): Promise<AdminDriverRow[]> {
        const res = await API.get('/admin/drivers', { params: { scope } });
        const data = res.data?.data ?? [];
        return Array.isArray(data) ? data.map(mapDriverRow) : [];
    },

    async approve(userId: string): Promise<void> {
        await API.patch(`/admin/drivers/${userId}/verification`, {
            verificationStatus: 'approved',
            verificationReasons: [],
            verificationNote: null,
        });
    },

    async reject(userId: string, payload: RejectPayload): Promise<void> {
        await API.patch(`/admin/drivers/${userId}/verification`, {
            verificationStatus: 'rejected',
            verificationReasons: payload.reasons ?? [],
            verificationNote: payload.note ?? null,
        });
    },
};
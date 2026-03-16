export interface DineInTokenPayload {
    type: 'dine_in';
    role: 'guest';
    merchant_id: string;
    table_id: string;
    table_session_id: string;
}
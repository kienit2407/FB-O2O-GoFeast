import { Socket } from 'socket.io';

export type RealtimeRole = 'customer' | 'driver' | 'merchant' | 'admin';

export interface SocketAuthUser {
    userId: string;
    role: RealtimeRole;
    aud?: string;
    email?: string | null;
}

export type AuthedSocket = Socket & {
    user?: SocketAuthUser;
};
/* eslint-disable @typescript-eslint/no-explicit-any */
import { io, Socket } from 'socket.io-client';

export type AdminSocketEvent =
  | 'socket:ready'
  | 'socket:error'
  | 'admin:order:new'
  | 'admin:order:status';

function resolveSocketBaseUrl() {
  const fallback = 'http://localhost:4000';
  const raw = (import.meta.env.VITE_API_URL as string | undefined) || fallback;

  try {
    return new URL(raw).origin;
  } catch {
    return fallback;
  }
}

class AdminSocketService {
  private socket: Socket | null = null;

  connect(accessToken: string) {
    if (this.socket) {
      this.socket.auth = { token: accessToken };
      if (!this.socket.connected) this.socket.connect();
      return this.socket;
    }

    this.socket = io(`${resolveSocketBaseUrl()}/realtime`, {
      transports: ['websocket'],
      autoConnect: false,
      auth: {
        token: accessToken,
      },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.connect();
    return this.socket;
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket.removeAllListeners();
    this.socket = null;
  }

  getSocket() {
    return this.socket;
  }

  on(event: AdminSocketEvent, cb: (payload: any) => void) {
    this.socket?.on(event, cb);
  }

  off(event: AdminSocketEvent, cb?: (payload: any) => void) {
    if (!this.socket) return;
    if (cb) this.socket.off(event, cb);
    else this.socket.off(event);
  }

  onConnect(cb: () => void) {
    this.socket?.on('connect', cb);
  }

  onDisconnect(cb: () => void) {
    this.socket?.on('disconnect', cb);
  }

  onConnectError(cb: (err: any) => void) {
    this.socket?.on('connect_error', cb);
  }
}

export const adminSocketService = new AdminSocketService();

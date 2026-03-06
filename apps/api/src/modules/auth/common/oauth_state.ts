export type OAuthState = {
  actor: 'customer' | 'driver';
  app: string;       // ClientApp nếu bạn export type
  from?: string;     // optional
  deviceId?: string | null;
};

export function encodeState(s: OAuthState) {
  return Buffer.from(JSON.stringify(s), 'utf8').toString('base64url');
}

export function decodeState(raw?: string) {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    return JSON.parse(json) as OAuthState;
  } catch {
    return null;
  }
}
export function formatIp(ip?: string | null, opts?: { mask?: boolean }) {
    if (!ip) return "—";
    const normalized = ip.startsWith("::ffff:") ? ip.replace("::ffff:", "") : ip;

    const shouldMask = opts?.mask ?? true;

    // ✅ local/dev thì luôn show full
    if (isLocalIp(normalized)) return normalized;

    if (!shouldMask) return normalized;

    const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) return `${ipv4[1]}.${ipv4[2]}.${ipv4[3]}.${ipv4[4]}`; // hoặc `${ipv4[1]}.${ipv4[2]}.*.${ipv4[4]}`

    if (normalized.includes(":")) {
        const parts = normalized.split(":").filter(Boolean);
        if (parts.length >= 3) return `${parts[0]}:${parts[1]}:…:${parts[parts.length - 1]}`;
    }

    return normalized;
}
/** IP local / dev -> màu nhạt hơn */
export function isLocalIp(ip?: string | null) {
    if (!ip) return false;
    const n = ip.startsWith("::ffff:") ? ip.replace("::ffff:", "") : ip;
    return n === "127.0.0.1" || n === "::1" || n.startsWith("192.168.") || n.startsWith("10.");
}
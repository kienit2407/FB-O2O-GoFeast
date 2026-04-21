export type LoginHistoryItem = {
    platform?: string | null; // "web" | "mobile" | ...
    user_agent?: string | null;
};

export function formatDateTime(iso?: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";

    // Lấy ngày, tháng, năm (thêm số 0 ở đầu nếu < 10)
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    // Lấy giờ, phút, giây (thêm số 0 ở đầu nếu < 10)
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    // Nối lại theo định dạng: Ngày - Giờ
    return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
}

function detectBrowser(uaRaw: string) {
    const ua = uaRaw.toLowerCase();

    // iOS browsers
    if (ua.includes("edgios")) return "Edge";
    if (ua.includes("fxios")) return "Firefox";
    if (ua.includes("crios")) return "Chrome";

    // desktop / android
    if (ua.includes("edg")) return "Edge";
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("chrome") && !ua.includes("edg")) return "Chrome";
    if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";

    return "Browser";
}

function detectOS(uaRaw: string) {
    const ua = uaRaw.toLowerCase();

    // ưu tiên iOS trước vì UA iPhone hay có "like mac os x"
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
    if (ua.includes("android")) return "Android";
    if (ua.includes("windows")) return "Windows";
    if (ua.includes("macintosh") || ua.includes("mac os x")) return "macOS";
    if (ua.includes("linux")) return "Linux";

    return "OS";
}

function normalizePlatform(p?: string | null) {
    const s = String(p ?? "").toLowerCase();
    if (s === "web") return "Web";
    if (s === "mobile") return "Mobile";
    if (!s) return "Unknown";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDeviceLine(h?: LoginHistoryItem | null) {
    if (!h) return "-";

    const p = normalizePlatform(h.platform);
    const ua = h.user_agent ?? "";
    if (!ua) return `${p} · Browser · trên OS`;

    const browser = detectBrowser(ua);
    const os = detectOS(ua);

    return `${p} · ${browser} · trên ${os}`;
}
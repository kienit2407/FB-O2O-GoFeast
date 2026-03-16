export function normalizeSearchText(input: string | null | undefined): string {
    if (!input) return '';

    return input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

export function splitSearchTokens(input: string | null | undefined): string[] {
    const normalized = normalizeSearchText(input);
    if (!normalized) return [];
    return normalized.split(' ').filter(Boolean);
}

export function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
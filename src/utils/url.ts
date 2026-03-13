/**
 * URL Security Utilities
 *
 * ensureHttps — converts http:// to https:// for any external URL.
 * Use this everywhere you display or fetch a remote URL to guarantee
 * that all traffic is encrypted and browser APIs (camera, microphone,
 * geolocation) are available (they require a secure context).
 */

/**
 * Convert any http:// URL to https://.
 * - Leaves https:// URLs unchanged.
 * - Leaves local dev URLs (10.0.2.2 / localhost / 192.168.x.x) as http://
 *   because they are served from a local machine, not the internet.
 * - Returns null/undefined as-is.
 */
export const ensureHttps = (url: string | null | undefined): string | null | undefined => {
    if (!url) return url;

    // Already secure — return unchanged
    if (url.startsWith('https://')) return url;

    // Local development hosts — leave as http, they can't have TLS
    const isLocal =
        url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.includes('10.0.2.2') ||
        /http:\/\/192\.168\.\d+\.\d+/.test(url) ||
        /http:\/\/10\.\d+\.\d+\.\d+/.test(url) ||
        /http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/.test(url);

    if (isLocal) return url;

    // Upgrade all other http:// to https://
    if (url.startsWith('http://')) {
        return 'https://' + url.slice('http://'.length);
    }

    return url;
};

/**
 * Apply ensureHttps to every URL in an array.
 * Useful for image galleries, attachments, etc.
 */
export const ensureHttpsArray = (urls: (string | null | undefined)[]): (string | null | undefined)[] =>
    urls.map(ensureHttps);

/**
 * Sanitise a full API base URL.
 * In dev mode we always keep http (local backend).
 * In production we always upgrade to https.
 */
export const sanitiseBaseUrl = (url: string): string => {
    if (__DEV__) return url; // local dev — keep as-is
    return ensureHttps(url) ?? url;
};

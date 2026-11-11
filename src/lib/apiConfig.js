/**
 * Resolves API endpoints from the client environment.
 *
 * VITE_API_URL is empty by default: the SPA talks to its own origin, which Vite
 * proxies in development and Express serves in production. Set it to a full URL
 * (e.g. http://192.168.1.10:4010 or https://api.example.com/api/v1) when the
 * API lives on another origin.
 */

const SAME_ORIGIN = Object.freeze({ origin: '', baseURL: '/api/v1' });

/** Normalises a configured API URL into an origin and a /api/v1 base URL. */
export function normalizeApiUrl(value) {
  const raw = String(value || '')
    .trim()
    .replace(/\/+$/, '');

  if (!raw) return { ...SAME_ORIGIN };

  let url;
  try {
    url = new URL(raw);
  } catch {
    // A malformed value must not break the app; fall back to same-origin.
    return { ...SAME_ORIGIN };
  }

  const pathname = url.pathname.replace(/\/+$/, '');
  const apiPath = pathname.endsWith('/api/v1') ? pathname : `${pathname}/api/v1`;

  return { origin: url.origin, baseURL: `${url.origin}${apiPath}` };
}

const resolved = normalizeApiUrl(import.meta.env.VITE_API_URL);

/** '' when the API shares the page origin, otherwise the API origin. */
export const API_ORIGIN = resolved.origin;

/** Absolute or relative API root, always ending in /api/v1. */
export const API_BASE_URL = resolved.baseURL;

/**
 * Prefixes server-hosted assets (`/uploads/...`) with the API origin.
 *
 * Everything else stays on the page origin: `/logo.png` ships with the SPA, so
 * pointing it at a separate API host would return 404 (and did, on Vercel).
 * Absolute URLs and data URLs are returned unchanged.
 */
export function assetUrl(value) {
  if (!value) return value;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (!value.startsWith('/uploads/')) return value;
  if (!API_ORIGIN) return value;
  return `${API_ORIGIN}${value}`;
}

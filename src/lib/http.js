import axios from 'axios';
import { API_BASE_URL } from './apiConfig.js';

/**
 * The access token lives only in memory. The refresh token is an httpOnly
 * cookie that the browser sends automatically to /api/v1/auth.
 */
let accessToken = null;
let refreshInFlight = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token) => {
    accessToken = token || null;
  },
  clear: () => {
    accessToken = null;
  },
};

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  timeout: 20_000,
});

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * A reload, a second tab, or a service-worker update can fire two refreshes at
 * once. The first rotates the cookie, the second is told to retry while the
 * browser still holds the older cookie. Waiting for the other response to land
 * and retrying once turns that race into a normal login instead of a logout.
 */
const REFRESH_RETRY_DELAY_MS = 500;

function postRefresh() {
  return http.post('/auth/refresh', null, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
}

async function requestRefresh() {
  let response;
  try {
    response = await postRefresh();
  } catch (error) {
    const code = error?.response?.data?.error?.code;
    if (code !== 'SESSION_RACE') throw error;
    await new Promise((resolve) => setTimeout(resolve, REFRESH_RETRY_DELAY_MS));
    response = await postRefresh();
  }
  tokenStore.set(response.data.data.accessToken);
  return response.data.data;
}

export async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = requestRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/');
    const isRefreshCall = original?.url?.includes('/auth/refresh');

    if (!original || original._retried || status !== 401 || isAuthCall) {
      return Promise.reject(error);
    }

    original._retried = true;

    try {
      const data = await refreshAccessToken();
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return http(original);
    } catch (refreshError) {
      tokenStore.clear();
      if (!isRefreshCall) {
        window.dispatchEvent(new CustomEvent('hamatrix:session-expired'));
      }
      return Promise.reject(refreshError);
    }
  },
);

export function apiError(error) {
  const payload = error?.response?.data?.error;
  return {
    code: payload?.code || 'NETWORK_ERROR',
    message:
      payload?.message ||
      (error?.code === 'ERR_NETWORK'
        ? 'تعذر الاتصال بالخادم. تأكد أن الخادم يعمل.'
        : 'حدث خطأ غير متوقع. حاول مرة أخرى.'),
    details: payload?.details || null,
    status: error?.response?.status || 0,
  };
}

export default http;

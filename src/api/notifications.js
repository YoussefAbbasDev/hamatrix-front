import http from '../lib/http.js';

export const notificationsApi = {
  status: () => http.get('/notifications/status').then((r) => r.data.data),
  subscribe: (subscription) =>
    http.post('/notifications/subscribe', { subscription }).then((r) => r.data.data),
  unsubscribe: (endpoint) =>
    http.post('/notifications/unsubscribe', { endpoint }).then((r) => r.data.data),
  test: () => http.post('/notifications/test').then((r) => r.data.data),
  /** Idempotent server pass: sends due session/stock alerts. */
  tick: () => http.post('/notifications/tick').then((r) => r.data.data),
};

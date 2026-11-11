import http from '../lib/http.js';
import { idempotencyKey } from '../lib/idempotency.js';

export const inventoryApi = {
  movements: (params = {}) =>
    http.get('/inventory/movements', { params }).then((r) => r.data.data),
  stockIn: (payload, key = idempotencyKey()) =>
    http
      .post('/inventory/stock-in', payload, { headers: { 'Idempotency-Key': key } })
      .then((r) => r.data.data),
  adjust: (payload) => http.post('/inventory/adjustments', payload).then((r) => r.data.data),
  summary: (params = {}) =>
    http.get('/inventory/summary', { params }).then((r) => r.data.data),
  valuation: () => http.get('/inventory/valuation').then((r) => r.data.data),
};

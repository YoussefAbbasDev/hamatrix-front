import http from '../lib/http.js';
import { idempotencyKey } from '../lib/idempotency.js';

export const visitsApi = {
  list: (params = {}) => http.get('/visits', { params }).then((r) => r.data.data),
  get: (id) => http.get(`/visits/${id}`).then((r) => r.data.data.visit),
  create: (payload = {}) => http.post('/visits', payload).then((r) => r.data.data.visit),
  update: (id, payload) => http.patch(`/visits/${id}`, payload).then((r) => r.data.data.visit),
  remove: (id) => http.delete(`/visits/${id}`),

  addItem: (id, payload) =>
    http.post(`/visits/${id}/items`, payload).then((r) => r.data.data.visit),
  updateItem: (id, itemId, qty) =>
    http.patch(`/visits/${id}/items/${itemId}`, { qty }).then((r) => r.data.data.visit),
  removeItem: (id, itemId) =>
    http.delete(`/visits/${id}/items/${itemId}`).then((r) => r.data.data.visit),

  startSession: (id, payload) =>
    http.post(`/visits/${id}/sessions`, payload).then((r) => r.data.data),

  checkout: (id, payload = {}, key = idempotencyKey()) =>
    http
      .post(`/visits/${id}/checkout`, payload, { headers: { 'Idempotency-Key': key } })
      .then((r) => r.data.data),
};

export const sessionsApi = {
  active: (params = {}) => http.get('/sessions/active', { params }).then((r) => r.data.data),
  get: (id) => http.get(`/sessions/${id}`).then((r) => r.data.data.session),
  start: (payload) => http.post('/sessions', payload).then((r) => r.data.data),
  pause: (id, payload = {}) =>
    http.post(`/sessions/${id}/pause`, payload).then((r) => r.data.data.session),
  resume: (id) => http.post(`/sessions/${id}/resume`).then((r) => r.data.data.session),
  extend: (id, minutes) =>
    http.post(`/sessions/${id}/extend`, { minutes }).then((r) => r.data.data.session),
  end: (id, payload = {}) =>
    http.post(`/sessions/${id}/end`, payload).then((r) => r.data.data),
};

export const salesApi = {
  list: (params = {}) => http.get('/sales', { params }).then((r) => r.data.data),
  create: (payload, key = idempotencyKey()) =>
    http.post('/sales', payload, { headers: { 'Idempotency-Key': key } }).then((r) => r.data.data),
};

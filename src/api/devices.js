import http from '../lib/http.js';

export const devicesApi = {
  list: (params = {}) => http.get('/devices', { params }).then((r) => r.data.data),
  get: (id) => http.get(`/devices/${id}`).then((r) => r.data.data),
  create: (payload) => http.post('/devices', payload).then((r) => r.data.data.device),
  update: (id, payload) =>
    http.patch(`/devices/${id}`, payload).then((r) => r.data.data.device),
  remove: (id) => http.delete(`/devices/${id}`),
  maintenance: (id, payload) =>
    http.post(`/devices/${id}/maintenance`, payload).then((r) => r.data.data.device),
  completeMaintenance: (id) =>
    http.post(`/devices/${id}/maintenance/complete`).then((r) => r.data.data.device),
  stats: (id, params = {}) =>
    http.get(`/devices/${id}/stats`, { params }).then((r) => r.data.data),
  sessions: (id, params = {}) =>
    http.get(`/devices/${id}/sessions`, { params }).then((r) => r.data.data),
};

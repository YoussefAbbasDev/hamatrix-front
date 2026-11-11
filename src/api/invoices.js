import http from '../lib/http.js';

export const invoicesApi = {
  list: (params = {}) => http.get('/invoices', { params }).then((r) => r.data.data),
  get: (id) => http.get(`/invoices/${id}`).then((r) => r.data.data.invoice),
  byVisit: (visitId) =>
    http.get(`/invoices/by-visit/${visitId}`).then((r) => r.data.data.invoice),
  remove: (id, confirmInvoiceNumber) =>
    http.delete(`/invoices/${id}`, { data: { confirmInvoiceNumber } }),
};

import http from '../lib/http.js';

export const expensesApi = {
  list: (params = {}) => http.get('/expenses', { params }).then((r) => r.data.data),
  get: (id) => http.get(`/expenses/${id}`).then((r) => r.data.data.expense),
  create: (payload) => http.post('/expenses', payload).then((r) => r.data.data.expense),
  update: (id, payload) =>
    http.patch(`/expenses/${id}`, payload).then((r) => r.data.data.expense),
  remove: (id) => http.delete(`/expenses/${id}`, { data: { confirm: true } }),

  categories: {
    list: (params = {}) =>
      http.get('/expense-categories', { params }).then((r) => r.data.data.categories),
    create: (payload) =>
      http.post('/expense-categories', payload).then((r) => r.data.data.category),
    update: (id, payload) =>
      http.patch(`/expense-categories/${id}`, payload).then((r) => r.data.data.category),
  },
};

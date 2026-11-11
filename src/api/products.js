import http from '../lib/http.js';

export const productsApi = {
  list: (params = {}) => http.get('/products', { params }).then((r) => r.data.data),
  get: (id) => http.get(`/products/${id}`).then((r) => r.data.data),
  lowStock: () => http.get('/products/low-stock').then((r) => r.data.data.products),
  create: (payload) => http.post('/products', payload).then((r) => r.data.data.product),
  update: (id, payload) =>
    http.patch(`/products/${id}`, payload).then((r) => r.data.data.product),
  remove: (id) => http.delete(`/products/${id}`),

  categories: {
    list: (params = {}) =>
      http.get('/product-categories', { params }).then((r) => r.data.data.categories),
    create: (payload) =>
      http.post('/product-categories', payload).then((r) => r.data.data.category),
    update: (id, payload) =>
      http.patch(`/product-categories/${id}`, payload).then((r) => r.data.data.category),
    remove: (id) => http.delete(`/product-categories/${id}`),
  },
};

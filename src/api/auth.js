import http from '../lib/http.js';

export const authApi = {
  login: (payload) => http.post('/auth/login', payload).then((r) => r.data.data),
  me: () => http.get('/auth/me').then((r) => r.data.data.user),
  logout: () => http.post('/auth/logout'),
  logoutAll: () => http.post('/auth/logout-all'),
  changeCredentials: (payload) => http.patch('/auth/credentials', payload).then((r) => r.data.data),
  socketTicket: () => http.post('/auth/socket-ticket').then((r) => r.data.data),
};

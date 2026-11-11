import http from '../lib/http.js';

export const reportsApi = {
  dashboard: () => http.get('/dashboard').then((r) => r.data.data),
  charts: (days = 14) =>
    http.get('/dashboard/charts', { params: { days } }).then((r) => r.data.data),
  summary: (params = {}) =>
    http.get('/reports/summary', { params }).then((r) => r.data.data),
  records: (params = {}) =>
    http.get('/reports/records', { params }).then((r) => r.data.data),
  revenueDaily: (params = {}) =>
    http.get('/reports/revenue/daily', { params }).then((r) => r.data.data),
  devices: (params = {}) =>
    http.get('/reports/devices', { params }).then((r) => r.data.data),
  products: (params = {}) =>
    http.get('/reports/products', { params }).then((r) => r.data.data),
  inventory: (params = {}) =>
    http.get('/reports/inventory', { params }).then((r) => r.data.data),
};

function filenameFrom(disposition, fallback) {
  if (!disposition) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8) return decodeURIComponent(utf8[1].trim());
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1].trim() : fallback;
}

/** Downloads a report as CSV without leaving the SPA. */
export async function downloadCsv(path, params = {}, fallback = 'report.csv') {
  const response = await http.get(path, {
    params: { ...params, export: 'csv' },
    responseType: 'blob',
  });

  const filename = filenameFrom(response.headers['content-disposition'], fallback);
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}

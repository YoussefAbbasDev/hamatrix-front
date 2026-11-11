import http from '../lib/http.js';

export const settingsApi = {
  public: () => http.get('/settings/public').then((r) => r.data.data.settings),
  get: () => http.get('/settings').then((r) => r.data.data.settings),
  update: (patch) => http.patch('/settings', patch).then((r) => r.data.data.settings),
  uploadLogo: (file) => {
    const form = new FormData();
    form.append('logo', file);
    return http.post('/settings/logo', form).then((r) => r.data.data);
  },
  removeLogo: () => http.delete('/settings/logo').then((r) => r.data.data.settings),
};

export const systemApi = {
  health: () => http.get('/health').then((r) => r.data.data),
  time: () => http.get('/time').then((r) => r.data.data.serverTime),
};

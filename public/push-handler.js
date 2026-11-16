/* eslint-env serviceworker */
/* global self, clients */

/**
 * Web Push handlers for the HAMATRIX service worker.
 *
 * This file is copied as-is into the generated Workbox service worker through
 * `workbox.importScripts` (see vite.config.js), so it must stay a classic
 * script with no imports.
 */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'HAMATRIX', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'HAMATRIX';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'hamatrix',
    data: { url: payload.url || '/' },
    dir: 'rtl',
    lang: 'ar',
    vibrate: [120, 60, 120],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await existing.navigate(target);
        return;
      }

      await clients.openWindow(target);
    })(),
  );
});

import { notificationsApi } from '../api/notifications.js';

/**
 * Web Push helpers. Everything degrades to "unsupported" on browsers without
 * service workers or the Push API (and in Vite dev, where no service worker is
 * registered, `enablePush` reports that the installed app is required).
 */

const SW_READY_TIMEOUT_MS = 15_000;

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function permissionState() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** VAPID keys are base64url; the Push API wants raw bytes. */
export function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

function waitForServiceWorker() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('خدمة الإشعارات لم تجهز بعد. أعد تحميل الصفحة وجرب تاني.')),
      SW_READY_TIMEOUT_MS,
    );
    navigator.serviceWorker.ready.then(
      (registration) => {
        clearTimeout(timer);
        resolve(registration);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** The subscription this browser currently holds, or null. */
export async function currentSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function enablePush() {
  if (!isPushSupported()) {
    throw new Error('المتصفح ده مابيدعمش الإشعارات. استخدم Chrome على أندرويد.');
  }

  const status = await notificationsApi.status();
  if (!status.configured || !status.publicKey) {
    throw new Error('إشعارات الموبايل غير مهيأة على السيرفر (VAPID).');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('لازم تسمح بالإشعارات من إعدادات المتصفح عشان التنبيهات توصل.');
  }

  const registration = await waitForServiceWorker();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(status.publicKey),
    });
  }

  await notificationsApi.subscribe(subscription.toJSON());
  return subscription;
}

export async function disablePush() {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  if (!subscription) return false;

  const { endpoint } = subscription;
  await subscription.unsubscribe().catch(() => null);
  await notificationsApi.unsubscribe(endpoint).catch(() => null);
  return true;
}

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

/** Browsers embedded in other apps (WebViews) cannot register for push. */
export function isInAppBrowser() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
  return /(FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Twitter|Snapchat|MicroMessenger|; wv\))/i.test(ua);
}

const PUSH_SERVICE_HINT =
  'خدمة الإشعارات في المتصفح مش متاحة دلوقتي. اتأكد إنك فاتح الموقع من Chrome نفسه (مش من داخل واتساب أو فيسبوك أو تيليجرام)، وقفل أي VPN أو مانع إعلانات، وحدّث Chrome، وجرب تاني.';

/** Turns the browser's terse push errors into something actionable. */
function describePushError(error) {
  const message = String(error?.message || '');
  if (error?.name === 'NotAllowedError') {
    return 'لازم تسمح بالإشعارات من إعدادات المتصفح عشان التنبيهات توصل.';
  }
  if (/push service/i.test(message)) return PUSH_SERVICE_HINT;
  if (error?.name === 'InvalidStateError') {
    return 'الاشتراك القديم باظ. اقفل الصفحة وافتحها تاني ثم جرب.';
  }
  return message || 'تعذّر تفعيل الإشعارات على المتصفح ده.';
}

/** Chrome sometimes fails the first subscribe with a transient FCM error. */
async function subscribeWithRetry(registration, applicationServerKey) {
  try {
    return await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  } catch (error) {
    if (!/push service/i.test(String(error?.message || ''))) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  }
}

export async function enablePush() {
  if (!isPushSupported()) {
    throw new Error('المتصفح ده مابيدعمش الإشعارات. استخدم Chrome على أندرويد.');
  }
  if (isInAppBrowser()) {
    throw new Error(
      'انت فاتح الموقع من متصفح جوه تطبيق تاني. افتح hamatrix-front.vercel.app من Chrome مباشرة.',
    );
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
    try {
      subscription = await subscribeWithRetry(
        registration,
        urlBase64ToUint8Array(status.publicKey),
      );
    } catch (error) {
      throw new Error(describePushError(error));
    }
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

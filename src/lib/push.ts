// Web Push: na iPhonu funguje jen v aplikaci přidané na plochu (iOS 16.4+).
import { backend } from './backend';
import { unb64 } from './crypto';

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID;
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL });
  } catch (e) {
    console.warn('SW registrace selhala', e);
  }
}

function urlB64ToBytes(s: string) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  return unb64((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
}

// Některé prohlížeče (např. vestavěné v telefonech) na žádost o povolení nikdy neodpoví.
const timeout = <T,>(p: Promise<T>, ms = 15000) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export async function enablePush(): Promise<'ok' | 'denied' | 'unsupported' | 'error'> {
  if (!pushSupported()) return 'unsupported';
  try {
    const perm = await timeout(Notification.requestPermission());
    if (perm !== 'granted') return 'denied';
    const reg = await timeout(navigator.serviceWorker.ready);
    const sub = (await reg.pushManager.getSubscription()) ??
      (await timeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToBytes(VAPID!) })));
    await backend.savePushSubscription(sub.toJSON());
    return 'ok';
  } catch (e) {
    console.warn('push', e);
    return 'error';
  }
}

export async function pushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

// Instalace na plochu (PWA). Android a Chrome na PC nabízejí vlastní dialog, iPhone jen ruční postup.
import { useSyncExternalStore } from 'react';
import { isIOS, isStandalone } from './push';

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIPEvent; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; markInstallSeen(); emit(); });
}

export const canPrompt = () => !!deferred;
export function useCanPrompt() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, canPrompt, () => false);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null; emit();
  return outcome === 'accepted';
}

const SEEN = 'hushki.install-seen';
// „Teď ne“ platí do zavření prohlížeče, při další návštěvě se nabídka ukáže znovu.
export function markInstallSeen() { try { sessionStorage.setItem(SEEN, '1'); } catch { /* */ } }
/** Nabídnout instalaci automaticky? Jednou za návštěvu a jen když aplikace neběží z plochy. */
export function shouldOfferInstall() {
  if (isStandalone()) return false;
  try { return !sessionStorage.getItem(SEEN); } catch { return false; }
}
export const platform = (): 'ios' | 'android' | 'desktop' => (isIOS() ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'desktop');

import { useSyncExternalStore } from 'react';

/** true, když má zařízení připojení k internetu. */
export function useOnline() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('online', cb); window.addEventListener('offline', cb); return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); }; },
    () => navigator.onLine,
    () => true,
  );
}

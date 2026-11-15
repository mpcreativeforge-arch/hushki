// Pozvánka odkazem: párovací kód jede v odkazu za znakem #.
// Část za # prohlížeč nikdy neposílá na server, takže šifrování zůstává stejné jako při ručním zadání kódu.
import { isValidCode, normalizeCode } from './crypto';
import { t } from './i18n';

const KEY = 'hushki.invite';

export const appUrl = () => location.origin + import.meta.env.BASE_URL;
export const inviteLink = (code: string) => `${appUrl()}#join=${code}`;

/** Přečte pozvánku z odkazu (a schová ji pro případ registrace s potvrzením e-mailu). */
export function takeInvite(): string | null {
  const m = location.hash.match(/join=([A-Za-z0-9-]+)/);
  if (m) {
    const code = normalizeCode(m[1]);
    history.replaceState(null, '', location.pathname + location.search);
    if (isValidCode(code)) {
      try { localStorage.setItem(KEY, code); } catch { /* */ }
      return code;
    }
  }
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function clearInvite() {
  try { localStorage.removeItem(KEY); } catch { /* */ }
}

/** Sdílí pozvánku přes systémové sdílení telefonu, jinak ji zkopíruje. */
export async function shareInvite(code: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = inviteLink(code);
  const text = t('Pojď se mnou do Hushki, jen pro nás dva. 🤫 Ťukni na odkaz:', 'Join me on Hushki, just for the two of us. 🤫 Tap the link:');
  try {
    if (navigator.share) { await navigator.share({ title: 'Hushki', text, url }); return 'shared'; }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError' ? 'shared' : 'failed';
  }
}

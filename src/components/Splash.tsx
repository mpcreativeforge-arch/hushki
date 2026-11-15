import { useEffect, useState } from 'react';
import { t } from '../lib/i18n';

const base = import.meta.env.BASE_URL;
/** Při prvním spuštění delší úvod, potom krátký (dá se přeskočit ťuknutím). */
const FIRST_MS = 3400;
const SHORT_MS = 1700;

/** Úvodní obrazovka při spuštění: logo, slogan a načítací lišta (cca 3,5 s). */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [first] = useState(() => { try { return !localStorage.getItem('hushki.seen'); } catch { return true; } });
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    try { localStorage.setItem('hushki.seen', '1'); } catch { /* */ }
    const total = reduce ? 900 : first ? FIRST_MS : SHORT_MS;
    document.documentElement.style.setProperty('--splash-ms', `${total - 500}ms`);
    const a = window.setTimeout(() => setLeaving(true), total - 400);
    const b = window.setTimeout(onDone, total);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [onDone, first]);
  return (
    <div className={'splash' + (leaving ? ' leaving' : '')} role="status" aria-label={t('Načítám Hushki', 'Loading Hushki')} onClick={onDone}>
      <div className="splash-stars" aria-hidden />
      <img className="splash-word" src={`${base}hushki-wordmark.png`} height={84} alt="Hushki" />
      <p className="splash-tag">{t('Něco jen pro vás dva.', 'Just for the two of you.')}</p>
      <div className="splash-bar" aria-hidden><span /></div>
    </div>
  );
}

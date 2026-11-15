import { useEffect, useState } from 'react';
import { t } from '../lib/i18n';

const base = import.meta.env.BASE_URL;
export const SPLASH_MS = 3400;

/** Úvodní obrazovka při spuštění: logo, slogan a načítací lišta (cca 3,5 s). */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const total = reduce ? 1200 : SPLASH_MS;
    const a = window.setTimeout(() => setLeaving(true), total - 400);
    const b = window.setTimeout(onDone, total);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [onDone]);
  return (
    <div className={'splash' + (leaving ? ' leaving' : '')} role="status" aria-label={t('Načítám Hushki', 'Loading Hushki')}>
      <div className="splash-stars" aria-hidden />
      <img className="splash-word" src={`${base}hushki-wordmark.png`} height={84} alt="Hushki" />
      <p className="splash-tag">{t('Něco jen pro vás dva.', 'Just for the two of you.')}</p>
      <div className="splash-bar" aria-hidden><span /></div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { backend } from '../../lib/backend';
import { type LockRef } from '../../lib/payload';
import { pikantId } from '../../data/stickers';
import { legend, legendText } from '../../data/legend';
import { feedback } from '../../lib/feedback';
import { Sheet } from '../../components/Sheet';
import { PinPad } from '../../components/PinPad';
import { t } from '../../lib/i18n';

import { StickerImg } from './Bubble';

/** Zamčená část popisu: písmena se nahradí jinými, aby nešla přečíst ani ze zdrojového kódu stránky. */
function scramble(t: string) {
  const abc = 'aeiounrstlkmdpvjzcbh';
  let x = t.length;
  return t.replace(/\p{L}/gu, () => { x = (x * 31 + 7) % 997; return abc[x % abc.length]; });
}

type Filter = 'all' | 'got' | 'open';

export function LegendSheet({ start, locks, unlocked, onPin, meFemale, partnerFemale, onDice, onClose }: {
  start?: number; locks: Map<number, LockRef[]>; unlocked: number[]; onPin: (pin: string, n: number) => Promise<boolean>;
  meFemale: boolean; partnerFemale: boolean; onDice: (prev?: number) => void; onClose: () => void;
}) {
  const [focus, setFocus] = useState<number | null>(start ?? null);
  const [pinFor, setPinFor] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [howto, setHowto] = useState(() => { try { return !localStorage.getItem('hushki.legend-howto'); } catch { return true; } });
  const closeHowto = () => { setHowto(false); try { localStorage.setItem('hushki.legend-howto', '1'); } catch { /* */ } };
  const gotLocked = [...locks.keys()].filter((n) => !unlocked.includes(n));
  const refs = useRef(new Map<number, HTMLDivElement>());
  useEffect(() => {
    if (focus) refs.current.get(focus)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focus, pinFor]);

  if (pinFor) {
    const tryPin = async (pin: string) => {
      if (!(await onPin(pin, pinFor))) return false;
      feedback('open'); setFocus(pinFor); setPinFor(null);
      return true;
    };
    return (
      <Sheet onClose={onClose}>
        <button className="btn ghost small" onClick={() => setPinFor(null)}>← {t('Zpět do Legendy', 'Back to the Legend')}</button>
        <div className="center" style={{ marginTop: 8 }}>
          <StickerImg id={pikantId(pinFor)} size={84} />
          <h2 style={{ margin: '6px 0 4px' }}>{t('Heslo k číslu', 'Password for number')} {pinFor}</h2>
          <p className="small muted">{t('Heslo ti musí prozradit partner. Platí pro celou místnost, takže odemkne i další čísla.', 'Your partner has to tell you the password. It works for the whole room, so it unlocks other numbers too.')}{backend.mode === 'demo' ? ' (Demo: 1234)' : ''}</p>
        </div>
        <PinPad length={4} onComplete={tryPin} />
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>{t('Legenda', 'Legend')}</h2>
        <button className="chip" onClick={() => onDice(focus ?? undefined)}>🎲 {t('Kostka D20', 'D20 dice')}</button>
      </div>
      {howto && (
        <div className="notice howto">
          <b>{t('Jak to funguje', 'How it works')}</b>
          <ol className="small">
            <li>{t('Partner pošle pikantní samolepku s číslem 1–20.', 'Your partner sends a spicy sticker with a number from 1 to 20.')}</li>
            <li>{t('Tady najdeš, co číslo znamená. Konec popisu je zamčený.', 'Here you find what the number means. The end of the description is locked.')}</li>
            <li>{t('Heslo ti partner prozradí, až bude chtít. Platí pro celou místnost.', 'Your partner tells you the password when they want to. It works for the whole room.')}</li>
          </ol>
          <button className="btn ghost small" onClick={closeHowto}>{t('Rozumím', 'Got it')}</button>
        </div>
      )}
      <div className="chips legend-filter" role="radiogroup" aria-label={t('Zobrazit', 'Show')}>
        {([['all', t('Vše', 'All')], ['got', t('Poslané mi', 'Sent to me') + (gotLocked.length ? ` · 🔒${gotLocked.length}` : '')], ['open', t('Odemčené', 'Unlocked') + ` (${unlocked.length})`]] as [Filter, string][]).map(([k, label]) => (
          <button key={k} role="radio" aria-checked={filter === k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>
      {gotLocked.length > 0 && (
        <button className="btn primary small" style={{ width: '100%', marginBottom: 10 }} onClick={() => setPinFor(gotLocked[0])}>🔒 {t('Zadat heslo od partnera', 'Enter your partner’s password')}</button>
      )}
      <div className="num-grid">
        {legend().map((it) => (
          <button key={it.n} className={'num-chip' + (focus === it.n ? ' on' : '') + (unlocked.includes(it.n) ? ' open' : '') + (locks.has(it.n) ? ' got' : '')} onClick={() => setFocus(it.n)}>{it.n}</button>
        ))}
      </div>
      {legend().filter((it) => filter === 'all' || (filter === 'got' ? locks.has(it.n) : unlocked.includes(it.n))).map((it) => {
        const open = unlocked.includes(it.n);
        const got = locks.has(it.n);
        const text = legendText(it, got ? partnerFemale : meFemale);
        const cut = Math.min(text.length, Math.max(18, text.indexOf(' ', 22)));
        return (
          <div key={it.n} ref={(el) => { if (el) refs.current.set(it.n, el); }} className={'legend-item' + (focus === it.n ? ' focus' : '')}>
            <StickerImg id={pikantId(it.n)} size={56} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <b>{it.n}. {it.title}</b>
              {open ? <p>{text}</p> : (
                <>
                  <p>{text.slice(0, cut)}<span className="blurred" aria-hidden> {scramble(text.slice(cut))}</span></p>
                  {got
                    ? <button className="chip lock" onClick={() => setPinFor(it.n)}>🔒 {t('Zadat heslo', 'Enter password')}</button>
                    : <span className="small muted">🔒 {t('Zamčeno. Odemkne se, až ti tohle číslo někdo pošle.', 'Locked. It unlocks when someone sends you this number.')}</span>}
                </>
              )}
            </div>
          </div>
        );
      })}
    </Sheet>
  );
}

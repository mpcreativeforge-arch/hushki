import { useEffect, useRef, useState } from 'react';
import { backend } from '../../lib/backend';
import { checkLock, type LockRef } from '../../lib/payload';
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

export function LegendSheet({ start, locks, unlocked, onUnlock, meFemale, partnerFemale, onDice, onClose }: {
  start?: number; locks: Map<number, LockRef[]>; unlocked: number[]; onUnlock: (n: number) => void;
  meFemale: boolean; partnerFemale: boolean; onDice: (prev?: number) => void; onClose: () => void;
}) {
  const [focus, setFocus] = useState<number | null>(start ?? null);
  const [pinFor, setPinFor] = useState<number | null>(null);
  const refs = useRef(new Map<number, HTMLDivElement>());
  useEffect(() => {
    if (focus) refs.current.get(focus)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focus, pinFor]);

  if (pinFor) {
    const tryPin = async (pin: string) => {
      for (const l of locks.get(pinFor) ?? []) {
        if (await checkLock(l, pin)) { feedback('open'); onUnlock(pinFor); setFocus(pinFor); setPinFor(null); return true; }
      }
      return false;
    };
    return (
      <Sheet onClose={onClose}>
        <button className="btn ghost small" onClick={() => setPinFor(null)}>← {t('Zpět do Legendy', 'Back to the Legend')}</button>
        <div className="center" style={{ marginTop: 8 }}>
          <StickerImg id={pikantId(pinFor)} size={84} />
          <h2 style={{ margin: '6px 0 4px' }}>{t('Heslo k číslu', 'Password for number')} {pinFor}</h2>
          <p className="small muted">{t('Heslo ti musí prozradit ten, kdo číslo poslal. Klidně si o něj řekni.', 'The password has to come from whoever sent the number. Feel free to ask for it.')}{backend.mode === 'demo' ? ' (Demo: 1234)' : ''}</p>
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
      <p className="small muted">{t('Najdi číslo ze samolepky. Popisy jsou zamčené heslem od toho, kdo číslo poslal.', 'Find the number from the sticker. Descriptions are locked with a password from whoever sent the number.')}</p>
      <div className="num-grid">
        {legend().map((it) => (
          <button key={it.n} className={'num-chip' + (focus === it.n ? ' on' : '') + (unlocked.includes(it.n) ? ' open' : '') + (locks.has(it.n) ? ' got' : '')} onClick={() => setFocus(it.n)}>{it.n}</button>
        ))}
      </div>
      {legend().map((it) => {
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

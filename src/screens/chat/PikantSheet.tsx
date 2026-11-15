import { useState } from 'react';
import { pikantId } from '../../data/stickers';
import { legend, legendText } from '../../data/legend';
import { Sheet } from '../../components/Sheet';
import { PinPad } from '../../components/PinPad';
import { t } from '../../lib/i18n';

import { StickerImg } from './Bubble';

/**
 * Odeslání pikantního čísla. Heslo se volí jednou pro místnost a pak se jen předvyplní;
 * dá se kdykoli změnit (starší čísla zůstanou zamčená svým původním heslem).
 */
export function PikantSheet({ n, dice, busy, roomPin, meFemale, onSend, onReroll, onClose }: {
  n: number; dice?: boolean; busy: boolean; roomPin: string | null; meFemale: boolean;
  onSend: (pin: string) => Promise<boolean>; onReroll: () => void; onClose: () => void;
}) {
  const [change, setChange] = useState(!roomPin);
  const [peek, setPeek] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const item = legend().find((x) => x.n === n);
  return (
    <Sheet onClose={onClose}>
      <div className="center">
        {dice && <p className="small muted" style={{ marginBottom: 4 }}>{t('Kostka rozhodla za vás', 'The dice decided for you')}</p>}
        <div className="pop" style={{ display: 'inline-block' }}><StickerImg id={pikantId(n)} size={120} /></div>
        <h2 style={{ margin: '6px 0 4px' }}>{t('Číslo', 'Number')} {n}{item ? ` · ${item.title}` : ''}</h2>
      </div>
      {item && (
        <div className="peek">
          {peek ? <p className="small" style={{ margin: 0 }}>{legendText(item, meFemale)}</p>
            : <button className="link-btn small" onClick={() => setPeek(true)}>👁 {t('Co partner uvidí po odemčení', 'What your partner sees once unlocked')}</button>}
        </div>
      )}
      {change ? (
        <>
          <p className="small muted center">{roomPin
            ? t('Zvol nové heslo pro tuto místnost. Platí pro všechna další čísla, která pošleš.', 'Choose a new password for this room. It applies to every number you send from now on.')
            : t('Zvol 4místné heslo pro tuto místnost. Platí pro všechna čísla, která pošleš, a partnerovi ho stačí říct jednou.', 'Choose a 4-digit password for this room. It applies to every number you send, so your partner only needs to hear it once.')}</p>
          <PinPad length={4} busy={busy} onComplete={onSend} />
          {roomPin && <button className="btn ghost small" style={{ width: '100%' }} onClick={() => setChange(false)}>{t('Ponechat současné heslo', 'Keep the current password')}</button>}
        </>
      ) : (
        <div className="stack" style={{ marginTop: 10 }}>
          <p className="small muted center" style={{ margin: 0 }}>{t('Zamkneme ho heslem této místnosti', 'It will be locked with this room’s password')} <button className="pin-dots" aria-label={t('Ukázat heslo', 'Show password')} onClick={() => setShowPin((v) => !v)}>{showPin ? roomPin : '••••'}</button></p>
          <button className="btn primary" disabled={busy} onClick={() => onSend(roomPin!)}>{busy ? <span className="spinner" /> : t('Poslat číslo', 'Send the number')} {n}</button>
          <button className="btn ghost small" onClick={() => setChange(true)}>{t('Změnit heslo', 'Change password')}</button>
        </div>
      )}
      <button className="btn ghost small" style={{ width: '100%' }} onClick={onReroll}>🎲 {dice ? t('Hodit znovu', 'Roll again') : t('Hodit kostkou', 'Roll the dice')}</button>
    </Sheet>
  );
}

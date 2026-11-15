import { useState } from 'react';
import { type Pair, type User } from '../../lib/backend';
import { when } from '../format';
import { isEn, t } from '../../lib/i18n';
import { shareInvite } from '../../lib/invite';


import type { Decoded } from './Bubble';

// --- Systémové hlášky ze starší verze (ruční smazání místnosti) ---------------

export function remaining(at: number) {
  const ms = at - Date.now();
  if (ms <= 0) return t('chvíli', 'a moment');
  const h = ms / 3600_000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  return `${Math.round(h)} h`;
}

const verb = (g: string, base: string) => (g === 'zena' ? base + 'a' : g === 'muz' ? base : base + '/a');

export function SystemNote({ m, mine, me, pair, partner }: { m: Decoded; mine: boolean; me: User; pair: Pair; partner: string }) {
  const seconds = m.meta.seconds as number | null;
  const g = mine ? me.gender : pair.partner_gender;
  const who = mine ? '' : partner + ' ';
  const label = seconds && seconds % 86400 === 0 ? `${seconds / 86400} dní` : `${Math.round((seconds ?? 0) / 3600)} h`;
  let text = seconds === null
    ? `${who}${verb(g, mine ? 'Vypnul' : 'vypnul')}${mine ? ' jsi' : ''} automatické smazání místnosti.`
    : `${who}${verb(g, mine ? 'Nastavil' : 'nastavil')}${mine ? ' jsi' : ''} smazání místnosti za ${label}.`;
  if (isEn()) text = seconds === null ? `${mine ? 'You' : partner} turned off automatic room deletion.` : `${mine ? 'You' : partner} set the room to delete in ${seconds % 86400 === 0 ? `${seconds / 86400} days` : `${Math.round(seconds / 3600)} h`}.`;
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return <div className="sys-note">⏳ {text} <span className="sys-time">{when(m.created_at)}</span></div>;
}

/** Pozvánka znovu (prázdná místnost čekající na partnera). */
export function InviteAgain({ getCode }: { getCode: () => Promise<string | null> }) {
  const [note, setNote] = useState('');
  const go = async () => {
    const code = await getCode();
    if (!code) return setNote(t('Kód této místnosti v telefonu není. Najdeš ho tam, kde jsi místnost zakládal/a.', 'This room’s code isn’t on this phone. Look on the device where you created the room.'));
    const r = await shareInvite(code);
    setNote(r === 'copied' ? t('Pozvánka je zkopírovaná.', 'Invite copied.') : r === 'failed' ? t('Sdílení se nepovedlo.', 'Sharing failed.') : '');
  };
  return (
    <div style={{ marginTop: 14 }}>
      <button className="btn primary" style={{ width: 'auto', padding: '12px 22px' }} onClick={go}>💌 {t('Poslat pozvánku znovu', 'Send the invite again')}</button>
      {note && <p className="small muted" style={{ marginTop: 8 }}>{note}</p>}
    </div>
  );
}

/** Kód místnosti: uložený v telefonu zašifrovaně, ukáže se až na klepnutí. */
export function RoomCode({ getCode }: { getCode: () => Promise<string | null> }) {
  const [code, setCode] = useState<string | null | undefined>(undefined);
  const [note, setNote] = useState('');
  const show = async () => setCode(await getCode());
  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setNote(t('Zkopírováno.', 'Copied.')); } catch { setNote(''); }
  };
  if (code === undefined) {
    return (
      <div className="settings-item"><span>{t('Kód místnosti', 'Room code')}</span>
        <button className="chip" onClick={show}>{t('Zobrazit', 'Show')}</button>
      </div>
    );
  }
  return (
    <div className="settings-item" style={{ display: 'block' }}>
      {code ? (
        <>
          <div className="row between"><span>{t('Kód místnosti', 'Room code')}</span>
            <span className="row" style={{ gap: 6 }}><button className="chip" onClick={() => shareInvite(code)}>💌 {t('Pozvat', 'Invite')}</button><button className="chip" onClick={copy}>{note || t('Zkopírovat', 'Copy')}</button></span>
          </div>
          <div className="pair-code" style={{ margin: '12px 0 6px' }}>{code}</div>
          <p className="small muted" style={{ margin: 0 }}>{t('Kód je klíč k vašim vzkazům. Pošli ho jen partnerovi a schovej si ho pro nový telefon.', 'The code is the key to your messages. Send it only to your partner and keep it for a new phone.')}</p>
        </>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>{t('Kód této místnosti v telefonu uložený není, protože místnost vznikla ve starší verzi aplikace. Nové místnosti si ho pamatují.', 'This room’s code is not stored on the phone because the room was created in an older version. New rooms remember it.')}</p>
      )}
    </div>
  );
}

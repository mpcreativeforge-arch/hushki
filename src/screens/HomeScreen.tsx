import { useEffect, useRef, useState } from 'react';
import { Brand } from '../components/Logo';
import { Envelope } from '../components/Envelope';
import { QuickMenu } from '../components/QuickMenu';
import { backend, type Pair, type User } from '../lib/backend';
import { feedback } from '../lib/feedback';
import { when } from './format';
import { LockButton } from '../components/LockButton';
import { plural, t } from '../lib/i18n';
import { heShe } from '../data/stickers';
import { setBadge } from '../lib/badge';
import { lastActivity, sparkLevel, SparkIcon } from '../lib/spark';

interface Props {
  user: User; pairs: Pair[]; keys: Record<string, CryptoKey>;
  onOpen: (p: Pair) => void; onLeave: (pairId: string) => Promise<void>; onAdd: () => void; onSettings: () => void; onLock: () => void; onLogout: () => void;
}

/** Neutrální pozdravy, při každém otevření aplikace náhodně jeden. */
const GREETINGS: [string, string][] = [
  ['Vítej zpět.', 'Welcome back.'], ['Vítej.', 'Welcome.'], ['Tvůj tajný koutek.', 'Your secret corner.'],
  ['Psst… jsi tu.', 'Psst… you’re here.'], ['Rádi tě vidíme.', 'Good to see you.'],
];
const greetIndex = Math.floor(Math.random() * GREETINGS.length);

interface Stat { unread: number; last: string | null }

/** Místnost se jmenuje podle partnera: HE / SHE (víc místností se stejným štítkem dostane pořadí). */
const nameOf = (p: Pair, pairs: Pair[]) => {
  const same = pairs.filter((x) => x.user_b && heShe(x.partner_gender) === heShe(p.partner_gender));
  return heShe(p.partner_gender) + (same.length > 1 ? ' · ' + (same.indexOf(p) + 1) : '');
};

export function HomeScreen({ user, pairs, keys, onOpen, onLeave, onAdd, onSettings, onLock, onLogout }: Props) {
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [menu, setMenu] = useState(false);
  // místnost, u které se ptáme na smazání
  const [del, setDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const remove = async (id: string) => {
    setDeleting(true);
    try { await onLeave(id); setDel(null); } catch { /* zůstane otevřené potvrzení */ } finally { setDeleting(false); }
  };
  const totalRef = useRef<number | null>(null);
  const ids = pairs.map((p) => p.id).join(',');

  useEffect(() => {
    if (!ids) return;
    let alive = true;
    const load = async () => {
      const out: Record<string, Stat> = {};
      for (const id of ids.split(',')) {
        const list = await backend.listMessages(id).catch(() => []);
        out[id] = { unread: list.filter((m) => m.sender_id !== user.id && !m.read_at).length, last: list.find((m) => !m.meta?.sys)?.created_at ?? null };
      }
      if (!alive) return;
      const total = Object.values(out).reduce((a, s) => a + s.unread, 0);
      if (totalRef.current !== null && total > totalRef.current) feedback('receive');
      totalRef.current = total;
      setBadge(total);
      setStats(out);
    };
    load();
    const offs = ids.split(',').map((id) => backend.subscribe(id, load));
    return () => { alive = false; offs.forEach((off) => off()); };
  }, [ids, user.id]);

  // nejdřív místnosti s novými vzkazy, pak podle poslední aktivity
  const sorted = [...pairs].sort((a, b) => {
    const sa = stats[a.id], sb = stats[b.id];
    if ((sb?.unread ?? 0) !== (sa?.unread ?? 0)) return (sb?.unread ?? 0) - (sa?.unread ?? 0);
    return (sb?.last ?? '').localeCompare(sa?.last ?? '');
  });

  return (
    <div className="app">
      <div className="topbar">
        <Brand />
        <div className="row" style={{ gap: 0 }}>
          <LockButton onLock={onLock} />
          <button className="icon-btn" aria-label="Menu" onClick={() => setMenu(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
          </button>
        </div>
      </div>

      <h1>{t(...GREETINGS[greetIndex])}</h1>
      <p className="muted">{pairs.length ? t('Tvoje místnosti. Každá má svůj vlastní klíč.', 'Your rooms. Each has its own key.') : t('Zatím nemáš žádnou místnost.', 'You have no rooms yet.')}</p>

      <div className="rooms">
        {sorted.map((p) => {
          const st = stats[p.id];
          const locked = !keys[p.id];
          const unread = st?.unread ?? 0;
          const spark = user.spark !== false && p.user_b ? sparkLevel(lastActivity(p.last_activity_at, st?.last)) : null;
          const sub = !p.user_b ? t('Čeká na připojení s kódem', 'Waiting for someone to join with the code')
            : locked ? t('Zamčeno na tomto zařízení, klepni a zadej kód', 'Locked on this device, tap and enter the code')
            : unread ? (unread === 1 ? t('Nový vzkaz', 'New message') : `${unread} ${plural(unread, '', 'nové vzkazy', 'nových vzkazů', '', 'new messages')}`)
            : st?.last ? `${t('Naposledy', 'Last')} ${when(st.last)}` : t('Zatím bez vzkazů', 'No messages yet');
          return (
            <div key={p.id} className="room-row">
            <div className="room-line">
            <button className={'room' + (unread ? ' unread' : '')} onClick={() => onOpen(p)}>
              <Envelope size={46} open={!unread} sparks={!!unread} />
              <div className="room-body">
                <div className="room-name">{p.user_b ? nameOf(p, pairs) : t('Nová místnost', 'New room')}{locked ? ' 🔒' : ''} {spark && <SparkIcon level={spark} />}</div>
                <div className="room-sub">{sub}</div>
              </div>
              {unread > 0 && <span className="room-badge">{unread}</span>}
            </button>
            <button className="icon-btn room-del" aria-label={t('Smazat místnost', 'Delete room')} onClick={() => setDel(del === p.id ? null : p.id)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            </button>
            </div>
            {del === p.id && (
              <div className="notice stack room-confirm">
                <span>{t('Smazat tuto místnost? Zmizí i všechny vzkazy v ní, u vás obou. Vrátit to nejde.', 'Delete this room? All its messages disappear too, for both of you. This cannot be undone.')}</span>
                <button className="btn" disabled={deleting} onClick={() => remove(p.id)}>{deleting ? <span className="spinner" /> : t('Ano, smazat', 'Yes, delete')}</button>
                <button className="btn ghost" onClick={() => setDel(null)}>{t('Ne', 'No')}</button>
              </div>
            )}
            </div>
          );
        })}
      </div>

      <div className="grow" />
      <button className="btn primary" style={{ marginTop: 22 }} onClick={onAdd}>+ {t('Nová místnost', 'New room')}</button>

      {menu && <QuickMenu onClose={() => setMenu(false)} onSettings={() => { setMenu(false); onSettings(); }} onLogout={onLogout} />}
    </div>
  );
}

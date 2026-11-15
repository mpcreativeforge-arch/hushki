import { useEffect, useRef, useState } from 'react';
import { Brand } from '../components/Logo';
import { Envelope } from '../components/Envelope';
import { QuickMenu } from '../components/QuickMenu';
import { backend, type Pair, type User } from '../lib/backend';
import { feedback } from '../lib/feedback';
import { when } from './format';
import { LockButton } from '../components/LockButton';
import { plural, t } from '../lib/i18n';

interface Props {
  user: User; pairs: Pair[]; keys: Record<string, CryptoKey>;
  onOpen: (p: Pair) => void; onAdd: () => void; onSettings: () => void; onLock: () => void; onLogout: () => void;
}

interface Stat { unread: number; last: string | null }

const nameOf = (p: Pair) => p.partner_name || (p.partner_gender === 'zena' ? t('Partnerka', 'Partner') : p.partner_gender === 'muz' ? 'Partner' : t('Partner/ka', 'Partner'));

export function HomeScreen({ user, pairs, keys, onOpen, onAdd, onSettings, onLock, onLogout }: Props) {
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [menu, setMenu] = useState(false);
  const totalRef = useRef<number | null>(null);
  const ids = pairs.map((p) => p.id).join(',');

  useEffect(() => {
    if (!ids) return;
    let alive = true;
    const load = async () => {
      const out: Record<string, Stat> = {};
      for (const id of ids.split(',')) {
        const list = await backend.listMessages(id).catch(() => []);
        out[id] = { unread: list.filter((m) => m.sender_id !== user.id && !m.read_at).length, last: list[0]?.created_at ?? null };
      }
      if (!alive) return;
      const total = Object.values(out).reduce((a, s) => a + s.unread, 0);
      if (totalRef.current !== null && total > totalRef.current) feedback('receive');
      totalRef.current = total;
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

      <h1>{t('Ahoj', 'Hi')}, {user.name}.</h1>
      <p className="muted">{pairs.length ? t('Tvoje místnosti. Každá má svůj vlastní klíč.', 'Your rooms. Each has its own key.') : t('Zatím nemáš žádnou místnost.', 'You have no rooms yet.')}</p>

      <div className="rooms">
        {sorted.map((p) => {
          const st = stats[p.id];
          const locked = !keys[p.id];
          const unread = st?.unread ?? 0;
          const sub = !p.user_b ? t('Čeká na připojení s kódem', 'Waiting for someone to join with the code')
            : locked ? t('Zamčeno na tomto zařízení, klepni a zadej kód', 'Locked on this device, tap and enter the code')
            : unread ? (unread === 1 ? t('Nový vzkaz', 'New message') : `${unread} ${plural(unread, '', 'nové vzkazy', 'nových vzkazů', '', 'new messages')}`)
            : st?.last ? `${t('Naposledy', 'Last')} ${when(st.last)}` : t('Zatím bez vzkazů', 'No messages yet');
          return (
            <button key={p.id} className={'room' + (unread ? ' unread' : '')} onClick={() => onOpen(p)}>
              <Envelope size={46} open={!unread} sparks={!!unread} />
              <div className="room-body">
                <div className="room-name">{p.user_b ? nameOf(p) : t('Nová místnost', 'New room')}{locked ? ' 🔒' : ''}</div>
                <div className="room-sub">{sub}</div>
              </div>
              {unread > 0 && <span className="room-badge">{unread}</span>}
            </button>
          );
        })}
      </div>

      <div className="grow" />
      <button className="btn primary" style={{ marginTop: 22 }} onClick={onAdd}>+ {t('Nová místnost', 'New room')}</button>

      {menu && <QuickMenu onClose={() => setMenu(false)} onSettings={() => { setMenu(false); onSettings(); }} onLogout={onLogout} />}
    </div>
  );
}

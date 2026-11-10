import { useEffect, useState } from 'react';
import { backend, type Message, type Pair, type User } from '../lib/backend';
import { Envelope } from '../components/Envelope';
import { enablePush, isIOS, isStandalone, pushEnabled, pushSupported } from '../lib/push';
import { when } from './format';

interface Props {
  user: User; pair: Pair; pairKey: CryptoKey;
  onCompose: () => void; onOpen: (m: Message) => void; onSettings: () => void; onLock: () => void;
}

export function InboxScreen({ user, pair, onCompose, onOpen, onSettings, onLock }: Props) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [push, setPush] = useState<'unknown' | 'on' | 'off' | 'unsupported'>('unknown');
  const partner = pair.partner_name || 'Partner/ka';
  const waiting = !pair.user_b;

  useEffect(() => {
    const load = () => backend.listMessages(pair.id).then(setMessages).catch(() => setMessages([]));
    load();
    return backend.subscribe(pair.id, load);
  }, [pair.id]);

  useEffect(() => {
    if (backend.mode === 'demo') return setPush('unsupported');
    if (!pushSupported()) return setPush('unsupported');
    pushEnabled().then((on) => setPush(on ? 'on' : 'off'));
  }, []);

  const turnOnPush = async () => {
    const r = await enablePush().catch(() => 'denied' as const);
    setPush(r === 'ok' ? 'on' : r === 'unsupported' ? 'unsupported' : 'off');
  };

  const unread = messages?.filter((m) => m.sender_id !== user.id && !m.read_at).length ?? 0;

  return (
    <div className="app">
      <div className="topbar">
        <span className="brand">Hushki</span>
        <div className="row" style={{ gap: 0 }}>
          <button className="icon-btn" aria-label="Zamknout" onClick={onLock}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          </button>
          <button className="icon-btn" aria-label="Nastavení" onClick={onSettings}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
          </button>
        </div>
      </div>

      <h1>{unread > 0 ? <>Máš <em>{unread === 1 ? 'nový vzkaz' : `${unread} nové vzkazy`}</em></> : <>Ahoj{user.name ? `, ${user.name}` : ''}.</>}</h1>
      <p className="muted">{waiting ? 'Čekáme, až se partner/ka připojí s vaším kódem.' : `Spojeno s: ${partner}`}</p>

      {isIOS() && !isStandalone() && (
        <div className="notice" style={{ margin: '6px 0 16px' }}>
          Tip: v Safari klepni na <b>Sdílet</b> a pak <b>Přidat na plochu</b>. Hushki se pak otevírá jako aplikace a může posílat upozornění.
        </div>
      )}
      {push === 'off' && !waiting && (
        <div className="notice row between" style={{ margin: '6px 0 16px' }}>
          <span>Zapni si tichá upozornění na nové vzkazy.</span>
          <button className="btn small" onClick={turnOnPush}>Zapnout</button>
        </div>
      )}

      {messages === null ? (
        <div className="center" style={{ padding: 40 }}><span className="spinner" /></div>
      ) : messages.length === 0 ? (
        <div className="empty">
          <div className="envelope-wrap"><Envelope size={110} className="wobble" /></div>
          <p>Zatím tu nic není.</p>
          <p className="small muted">{waiting ? 'Až se partner/ka připojí, můžete si psát.' : 'Napiš první vzkaz. Uvidí ho jen vy dva.'}</p>
        </div>
      ) : (
        <div className="list" style={{ marginTop: 8 }}>
          {messages.map((m) => {
            const mine = m.sender_id === user.id;
            const isNew = !mine && !m.read_at;
            return (
              <button key={m.id} className={'letter' + (isNew ? ' unread' : '')} onClick={() => onOpen(m)}>
                <Envelope size={44} sparks={isNew} open={!isNew} />
                <div>
                  <div className="who">{mine ? `Pro: ${partner}` : `Od: ${partner}`}</div>
                  <div className="when">{when(m.created_at)}{mine && (m.read_at ? ' · přečteno' : ' · doručeno')}</div>
                </div>
                {isNew && <span className="badge-new">nový</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="fab">
        <button className="btn coral" onClick={onCompose} disabled={waiting}>Napsat vzkaz</button>
      </div>
    </div>
  );
}

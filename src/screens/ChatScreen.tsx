import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { backend, type Message, type Pair, type User } from '../lib/backend';
import { checkLock, decodePayload, encodePayload, makeLock, photoUrl, previewOf, type LockRef, type Payload, type PhotoRef } from '../lib/payload';
import { enablePush, pushEnabled, pushSupported } from '../lib/push';
import {
  FREE_SLOTS, PIKANT_COUNT, SLOT_ICONS, STICKERS, pikantId, pikantNumber, sexOf, slotIndex, slotTexts, stickerSrc, tabTitle, tabsFor, type TabId,
} from '../data/stickers';
import { legend, legendText } from '../data/legend';
import { Envelope } from '../components/Envelope';
import { feedback, haptic } from '../lib/feedback';
import { Sheet } from '../components/Sheet';
import { QuickMenu } from '../components/QuickMenu';
import { PinPad } from '../components/PinPad';
import { loadSlots, loadUnlocked, saveSlots, saveUnlocked } from '../lib/slots';
import { when } from './format';
import { LockButton } from '../components/LockButton';
import { DiceOverlay } from '../components/D20';
import { isEn, plural, t, useLang } from '../lib/i18n';
import { shareInvite } from '../lib/invite';
import { useOnline } from '../lib/online';
import { shouldOfferInstall } from '../lib/install';
import { InstallSheet } from '../components/InstallSheet';

interface Props {
  user: User; pair: Pair; pairKey: CryptoKey; flags: Record<string, boolean>;
  onBack: () => void; onSettings: () => void; onLock: () => void; onLogout: () => void; onLeave: () => void;
  getCode: () => Promise<string | null>;
}

type Decoded = Message & { p: Payload | null; failed?: boolean };

/** Zprávy zmizí 48 hodin po poslední zprávě v místnosti. */
const TTL = 48 * 3600_000;
const SLOT_MAX = 120;

export function ChatScreen({ user, pair, pairKey, flags, onBack, onSettings, onLock, onLogout, onLeave, getCode }: Props) {
  const [items, setItems] = useState<Decoded[] | null>(null);
  const [replyTo, setReplyTo] = useState<Decoded | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | { k: 'legend'; n?: number } | { k: 'pikant'; n: number; dice?: boolean } | { k: 'slot'; id: string } | { k: 'dice'; for: 'send' | 'legend'; prev?: number }>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [push, setPush] = useState<'unknown' | 'on' | 'off' | 'unsupported'>('unknown');
  const [unlocked, setUnlocked] = useState<number[]>(() => loadUnlocked(pair.id));
  const listRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef(new Map<string, Payload | null>());
  const seenRef = useRef<Set<string> | null>(null);
  const liveRef = useRef(new Set<string>());
  const [menu, setMenu] = useState(false);
  const [install, setInstall] = useState(false);
  useLang();
  const online = useOnline();

  const partner = pair.partner_name || (pair.partner_gender === 'zena' ? t('Partnerka', 'Partner') : pair.partner_gender === 'muz' ? 'Partner' : t('Partner/ka', 'Partner'));
  const waiting = !pair.user_b;
  const canReply = flags.replies !== false;
  const meFemale = sexOf(user.gender) === 'zena';
  const partnerFemale = pair.partner_gender === 'zena';

  // Načtení a rozšifrování vzkazů
  useEffect(() => {
    let alive = true;
    const load = async () => {
      let list = await backend.listMessages(pair.id).catch(() => [] as Message[]);
      // 48 h po poslední zprávě je místnost prázdná (server je smaže při nejbližším úklidu).
      if (list[0] && Date.now() - new Date(list[0].created_at).getTime() > TTL) list = [];
      const out: Decoded[] = [];
      for (const m of [...list].reverse()) {
        if (m.meta?.sys) { out.push({ ...m, p: null }); continue; }
        if (!cacheRef.current.has(m.id)) {
          try { cacheRef.current.set(m.id, await decodePayload(pairKey, m.ciphertext, m.iv)); }
          catch { cacheRef.current.set(m.id, null); }
        }
        const p = cacheRef.current.get(m.id) ?? null;
        out.push({ ...m, p, failed: p === null });
      }
      if (!alive) return;
      // Nový příchozí vzkaz → zvuk a vibrace (ne při prvním načtení).
      // Když je chat zrovna otevřený, vzkaz se rovnou ukáže a nemusí se rozlepovat.
      const incoming = out.filter((m) => m.sender_id !== user.id);
      if (seenRef.current) {
        const fresh = incoming.filter((m) => !seenRef.current!.has(m.id));
        if (fresh.length) feedback('receive');
        if (!document.hidden) {
          for (const m of fresh) {
            if (m.read_at) continue;
            liveRef.current.add(m.id);
            backend.markRead(m.id).catch(() => undefined);
          }
        }
      }
      for (const m of out) if (liveRef.current.has(m.id) && !m.read_at) m.read_at = new Date().toISOString();
      seenRef.current = new Set(incoming.map((m) => m.id));
      setItems(out);
    };
    load();
    const off = backend.subscribe(pair.id, load);
    const tick = window.setInterval(load, 60_000);
    return () => { alive = false; off(); clearInterval(tick); };
  }, [pair.id, pairKey, user.id]);

  useEffect(() => {
    if (backend.mode === 'demo' || !pushSupported()) return setPush('unsupported');
    pushEnabled().then((on) => setPush(on ? 'on' : 'off'));
  }, []);

  // Po spárování jednou nabídni přidání na plochu
  useEffect(() => {
    if (waiting || !shouldOfferInstall()) return;
    const tm = setTimeout(() => setInstall(true), 2500);
    return () => clearTimeout(tm);
  }, [waiting]);

  // Posun na konec při nové zprávě
  const count = items?.length ?? 0;
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  // Zámky pikantních čísel, které mi partner poslal
  const locks = useMemo(() => {
    const map = new Map<number, LockRef[]>();
    for (const m of items ?? []) {
      const n = m.p?.t === 'sticker' ? pikantNumber(m.p.sticker ?? '') : null;
      if (!n || !m.p?.lock || m.sender_id === user.id) continue;
      map.set(n, [...(map.get(n) ?? []), m.p.lock]);
    }
    return map;
  }, [items, user.id]);

  const unlock = (n: number) => {
    setUnlocked((cur) => { const next = [...cur, n]; saveUnlocked(pair.id, next); return next; });
  };

  const send = async (p: Omit<Payload, 'v'>) => {
    setBusy(true); setError('');
    try {
      if (replyTo?.p) p.reply = { id: replyTo.id, preview: previewOf(replyTo.p) };
      const { ciphertext, iv } = await encodePayload(pairKey, p);
      const msg = await backend.sendMessage(pair.id, ciphertext, iv);
      backend.notifyPartner(msg.id);
      setReplyTo(null);
      feedback('sticker');
      if (backend.mode === 'demo') demoReply();
      return true;
    } catch {
      haptic('error');
      setError(navigator.onLine ? t('Odeslání se nepovedlo. Zkus to prosím znovu.', 'Sending failed. Please try again.') : t('Jsi bez připojení. Vzkaz odešleš, až budeš zase online.', 'You are offline. You can send it once you are back online.'));
      return false;
    } finally { setBusy(false); }
  };

  const pickSticker = (id: string) => {
    if (busy || waiting) return;
    const n = pikantNumber(id);
    if (n) return setSheet({ k: 'pikant', n });
    if (slotIndex(id) >= 0) return setSheet({ k: 'slot', id });
    send({ t: 'sticker', sticker: id });
  };

  const sendPikant = async (n: number, pin: string) => {
    const ok = await send({ t: 'sticker', sticker: pikantId(n), lock: await makeLock(pin) });
    if (ok) { unlock(n); setSheet(null); }
    return ok;
  };

  // Demo: simulovaný partner odpoví samolepkou (občas pikantní s heslem 1234)
  const demoReply = () => {
    setTimeout(async () => {
      const tabs = tabsFor(pair.partner_gender === 'zena' ? 'zena' : 'muz');
      let p: Omit<Payload, 'v'>;
      if (Math.random() < 0.3) {
        p = { t: 'sticker', sticker: pikantId(1 + Math.floor(Math.random() * PIKANT_COUNT)), lock: await makeLock('1234') };
      } else if (Math.random() < 0.3) {
        const sl = Math.floor(Math.random() * 2);
        const texts = slotTexts(sl);
        p = { t: 'sticker', sticker: SLOT_ICONS[pair.partner_gender === 'zena' ? 'zena' : 'muz'][sl], text: texts[Math.floor(Math.random() * texts.length)] };
      } else {
        const tab = tabs[Math.floor(Math.random() * 4)];
        p = { t: 'sticker', sticker: tab.stickers[Math.floor(Math.random() * tab.stickers.length)].id };
      }
      const { ciphertext, iv } = await encodePayload(pairKey, p);
      await backend.demoPartnerMessage?.(pair.id, ciphertext, iv);
    }, 4500);
  };

  const open = (m: Decoded) => {
    feedback('open');
    if (m.sender_id !== user.id && !m.read_at) backend.markRead(m.id).catch(() => undefined);
  };

  const openAll = () => {
    feedback('open');
    for (const m of items ?? []) if (m.sender_id !== user.id && !m.read_at) backend.markRead(m.id).catch(() => undefined);
  };

  const turnOnPush = async () => {
    const r = await enablePush().catch(() => 'denied' as const);
    setPush(r === 'ok' ? 'on' : r === 'unsupported' ? 'unsupported' : 'off');
  };

  const unread = items?.filter((m) => m.sender_id !== user.id && !m.read_at).length ?? 0;
  const last = items?.length ? items[items.length - 1].created_at : null;
  const status = waiting ? t('Čekáme na připojení partnera', 'Waiting for your partner to join')
    : unread ? `${unread} ${plural(unread, 'nový vzkaz', 'nové vzkazy', 'nových vzkazů', 'new message', 'new messages')}`
      : last ? t('Zprávy zmizí za ', 'Messages disappear in ') + remaining(new Date(last).getTime() + TTL) : t('Šifrováno, uvidíte jen vy dva', 'Encrypted, only the two of you can see it');

  return (
    <div className="chat">
      <header className="chat-top">
        <div className="row" style={{ gap: 4, minWidth: 0 }}>
          <button className="icon-btn" aria-label={t('Zpět na místnosti', 'Back to rooms')} onClick={onBack}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <div style={{ minWidth: 0 }}>
            <div className="room-title">{waiting ? t('Nová místnost', 'New room') : partner}</div>
            <div className="small muted">{status}</div>
          </div>
        </div>
        <div className="row" style={{ gap: 0 }}>
          <button className="icon-btn" aria-label={t('Legenda', 'Legend')} onClick={() => setSheet({ k: 'legend' })}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4.5h10a3 3 0 013 3v12H8a3 3 0 01-3-3z" /><path d="M5 16.5a3 3 0 013-3h10" /><path d="M9 8h5" /></svg>
          </button>
          <LockButton onLock={onLock} />
          <button className="icon-btn" aria-label="Menu" onClick={() => setMenu(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
          </button>
        </div>
      </header>

      {!online && <div className="offline-bar" role="status">{t('Jsi bez připojení. Až se připojíš, vzkazy se načtou samy.', 'You are offline. Messages will load once you reconnect.')}</div>}
      <div className="chat-list" ref={listRef} onClick={() => setSelected(null)}>
        {push === 'off' && !waiting && (
          <div className="notice row between small">
            <span>{t('Zapni si tichá upozornění na nové vzkazy.', 'Turn on silent notifications for new messages.')}</span>
            <button className="btn small" onClick={turnOnPush}>{t('Zapnout', 'Turn on')}</button>
          </div>
        )}

        {items === null ? (
          <div className="center" style={{ padding: 40 }}><span className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div className="envelope-wrap"><Envelope size={110} className="wobble" /></div>
            <p>{t('Zatím tu nic není.', 'Nothing here yet.')}</p>
            <p className="small muted">{waiting ? t('Až se partner/ka připojí s vaším kódem, můžete si posílat vzkazy.', 'Once your partner joins with your code, you can send each other messages.') : t('Vyber dole samolepku a pošli první vzkaz. Zprávy zmizí 48 hodin po té poslední.', 'Pick a sticker below and send the first message. Messages disappear 48 hours after the last one.')}</p>
            {waiting && <InviteAgain getCode={getCode} />}
          </div>
        ) : (
          items.map((m, i) => m.meta?.sys ? (
            <SystemNote key={m.id} m={m} mine={m.sender_id === user.id} me={user} pair={pair} partner={partner} />
          ) : (
            <Bubble
              key={m.id} m={m} live={liveRef.current.has(m.id)} mine={m.sender_id === user.id} partner={partner} pairKey={pairKey}
              showTime={i === 0 || new Date(m.created_at).getTime() - new Date(items[i - 1].created_at).getTime() > 15 * 60_000}
              selected={selected === m.id}
              onSelect={() => setSelected(m.id)}
              onOpen={() => open(m)}
              onReply={canReply ? () => { setReplyTo(m); setSelected(null); } : undefined}
              onPhoto={setViewer}
            />
          ))
        )}
      </div>

      <footer className="composer picker">
        {error && <p className="error small" style={{ margin: '0 0 8px' }}>{error}</p>}
        {replyTo?.p && (
          <div className="reply-bar">
            <div><b>{t('Odpověď na:', 'Reply to:')}</b> {previewOf(replyTo.p)}</div>
            <button className="icon-btn" aria-label={t('Zrušit odpověď', 'Cancel reply')} onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}
        {unread > 1 && (
          <div className="chips" style={{ marginBottom: 8 }}>
            <button className="chip" onClick={openAll}>✉ {t('Otevřít vše', 'Open all')} ({unread})</button>
          </div>
        )}
        <StickerPicker user={user} disabled={waiting || busy || !online} onPick={pickSticker} onDice={() => setSheet({ k: 'dice', for: 'send' })} onLegend={() => setSheet({ k: 'legend' })} />
      </footer>

      {sheet?.k === 'legend' && (
        <LegendSheet
          start={sheet.n} locks={locks} unlocked={unlocked} onUnlock={unlock} meFemale={meFemale} partnerFemale={partnerFemale}
          onDice={(prev) => setSheet({ k: 'dice', for: 'legend', prev })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.k === 'pikant' && <PikantSheet n={sheet.n} dice={sheet.dice} busy={busy} onSend={(pin) => sendPikant(sheet.n, pin)} onReroll={() => setSheet({ k: 'dice', for: 'send', prev: sheet.n })} onClose={() => setSheet(null)} />}
      {sheet?.k === 'dice' && (
        <DiceOverlay
          max={PIKANT_COUNT} prev={sheet.prev}
          actionLabel={sheet.for === 'send' ? t('Poslat toto číslo', 'Send this number') : t('Ukázat v Legendě', 'Show in the Legend')}
          onResult={(n) => setSheet(sheet.for === 'send' ? { k: 'pikant', n, dice: true } : { k: 'legend', n })}
          onClose={() => setSheet(sheet.for === 'legend' ? { k: 'legend', n: sheet.prev } : null)}
        />
      )}
      {sheet?.k === 'slot' && <SlotSheet user={user} id={sheet.id} busy={busy} onSend={async (text) => { if (await send({ t: 'sticker', sticker: sheet.id, text })) setSheet(null); }} onClose={() => setSheet(null)} />}
      {install && !sheet && !menu && <InstallSheet onClose={() => setInstall(false)} />}
      {menu && <QuickMenu extra={<RoomCode getCode={getCode} />} onClose={() => setMenu(false)} onSettings={() => { setMenu(false); onSettings(); }} onLogout={onLogout} onLeave={onLeave} />}
      {viewer && (
        <div className="viewer" onClick={() => setViewer(null)}>
          <img src={viewer} alt={t('Fotka', 'Photo')} />
        </div>
      )}
    </div>
  );
}

/** Zamčená část popisu: písmena se nahradí jinými, aby nešla přečíst ani ze zdrojového kódu stránky. */
function scramble(t: string) {
  const abc = 'aeiounrstlkmdpvjzcbh';
  let x = t.length;
  return t.replace(/\p{L}/gu, () => { x = (x * 31 + 7) % 997; return abc[x % abc.length]; });
}

// ---------------------------------------------------------------------------

function Bubble({ m, live, mine, partner, pairKey, showTime, selected, onSelect, onOpen, onReply, onPhoto }: {
  m: Decoded; live: boolean; mine: boolean; partner: string; pairKey: CryptoKey; showTime: boolean; selected: boolean;
  onSelect: () => void; onOpen: () => void; onReply?: () => void; onPhoto: (url: string) => void;
}) {
  const sealed = !mine && !m.read_at;
  const [revealed, setRevealed] = useState(!sealed);
  const pressRef = useRef<{ t: number; x: number; y: number } | null>(null);

  if (sealed && !revealed) {
    return (
      <div className="msg theirs">
        {showTime && <div className="msg-time">{when(m.created_at)}</div>}
        <button className="sealed" data-haptic="off" onClick={(e) => { e.stopPropagation(); setRevealed(true); onOpen(); }}>
          <Envelope size={52} />
          <div>
            <div className="who">{t('Nový vzkaz od:', 'New message from:')} {partner}</div>
            <div className="small muted">{t('Klepni a otevři', 'Tap to open')}</div>
          </div>
        </button>
      </div>
    );
  }

  const p = m.p;
  const isSticker = p?.t === 'sticker';
  // podržení prstu (jako ve WhatsAppu) nabídne odpověď
  function startPress(e: React.PointerEvent) {
    if (!onReply) return;
    const t = window.setTimeout(() => { pressRef.current = null; haptic('tap'); onSelect(); }, 420);
    pressRef.current = { t, x: e.clientX, y: e.clientY };
  }
  function cancelPress() {
    if (pressRef.current) { clearTimeout(pressRef.current.t); pressRef.current = null; }
  }
  return (
    <div className={'msg ' + (mine ? 'mine' : 'theirs')}>
      {showTime && <div className="msg-time">{when(m.created_at)}</div>}
      <div
        className={'bubble-wrap' + (selected ? ' selected' : '')}
        onPointerDown={startPress} onPointerUp={cancelPress} onPointerLeave={cancelPress} onPointerCancel={cancelPress}
        onPointerMove={(e) => { if (pressRef.current && (Math.abs(e.clientX - pressRef.current.x) > 10 || Math.abs(e.clientY - pressRef.current.y) > 10)) cancelPress(); }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        {p?.reply && <div className="quote">↩ {p.reply.preview}</div>}
        {m.failed || !p ? (
          <div className="bubble"><i>{t('Vzkaz nejde rozšifrovat.', 'This message cannot be decrypted.')}</i></div>
        ) : isSticker ? (
          <div className={'sticker-msg' + ((revealed && sealed) || live ? ' pop' : '')}>
            <StickerImg id={p.sticker!} size={128} />
            {p.text && <div className="bubble sticker-caption">{p.text}</div>}
          </div>
        ) : p.t === 'photo' ? (
          <div className="bubble photo">
            <Photo pairKey={pairKey} photo={p.photo!} onOpen={onPhoto} />
            {p.text && <div className="caption">{p.text}</div>}
          </div>
        ) : (
          <div className={'bubble' + ((revealed && sealed) || live ? ' unfold' : '')}>{p.text}</div>
        )}
      </div>
      {mine && <div className="msg-status">{m.read_at ? t('přečteno', 'read') : t('doručeno', 'delivered')}</div>}
      {selected && onReply && (
        <div className="msg-actions">
          <button className="chip" onClick={(e) => { e.stopPropagation(); onReply(); }}>↩ {t('Odpovědět', 'Reply')}</button>
        </div>
      )}
    </div>
  );
}

function Photo({ pairKey, photo, onOpen }: { pairKey: CryptoKey; photo: PhotoRef; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    photoUrl(pairKey, photo).then(setUrl).catch(() => setFailed(true));
  }, [pairKey, photo]);
  const ratio = photo.h / photo.w;
  return (
    <div className="photo-box" style={{ aspectRatio: `${photo.w} / ${photo.h}`, maxHeight: ratio > 1.3 ? 320 : undefined }}>
      {url ? <img src={url} alt={t('Fotka', 'Photo')} onClick={(e) => { e.stopPropagation(); onOpen(url); }} />
        : failed ? <span className="small muted">{t('Fotku nejde načíst', 'Photo cannot be loaded')}</span> : <span className="spinner" />}
    </div>
  );
}

/** Samolepka. Pikantní má v rohu číslo, podle kterého se hledá v Legendě. */
export function StickerImg({ id, size, onMissing }: { id: string; size: number; onMissing?: () => void }) {
  const [broken, setBroken] = useState(false);
  const st = STICKERS.get(id);
  const n = pikantNumber(id);
  const img = broken || !st
    ? <span className="sticker-fallback" style={{ fontSize: size * 0.62, width: size, height: size }}>{st?.fallback ?? '✨'}</span>
    : <img className="sticker" src={stickerSrc(id)} width={size} height={size} alt={n ? `${t('Číslo', 'Number')} ${n}` : st.label} draggable={false} onError={() => { setBroken(true); onMissing?.(); }} />;
  if (!n) return img;
  return (
    <span className="sticker-num" style={{ width: size, height: size }}>
      {img}
      <b className="num-badge" style={{ fontSize: Math.max(11, size * 0.15) }}>{n}</b>
    </span>
  );
}

function StickerPicker({ user, disabled, onPick, onDice, onLegend }: { user: User; disabled: boolean; onPick: (id: string) => void; onDice: () => void; onLegend: () => void }) {
  const tabs = useMemo(() => tabsFor(user.gender), [user.gender]);
  const [tab, setTab] = useState<TabId>(() => { try { return (sessionStorage.getItem('hushki.tab') as TabId) || 'pokec'; } catch { return 'pokec'; } });
  // samolepky druhé sady, ke kterým zatím chybí obrázek, se v nabídce nezobrazí
  const [missing, setMissing] = useState<Set<string>>(() => new Set());
  const hide = (id: string) => setMissing((m) => new Set(m).add(id));
  const cur = tabs.find((x) => x.id === tab) ?? tabs[0];
  const choose = (id: TabId) => { setTab(id); try { sessionStorage.setItem('hushki.tab', id); } catch { /* */ } };
  return (
    <div className={disabled ? 'picker-off' : ''}>
      <div className="picker-tabs" role="tablist">
        {tabs.map((x) => (
          <button key={x.id} role="tab" aria-selected={cur.id === x.id} className={'chip' + (cur.id === x.id ? ' on' : '')} onClick={() => choose(x.id)}>
            {tabTitle(x.id)}{x.id === 'pikant' ? ' 🌶' : ''}
          </button>
        ))}
      </div>
      <div className="picker-grid">
        {cur.id === 'pikant' && (
          <>
            <button className="sticker-btn dice-btn" aria-label={t('Hod kostkou', 'Roll the dice')} disabled={disabled} onClick={onDice}>
              <span className="dice">🎲</span><span className="small">{t('Kostka', 'Dice')}</span>
            </button>
            <button className="sticker-btn dice-btn" aria-label={t('Otevřít Legendu', 'Open the Legend')} onClick={onLegend}>
              <span className="dice">📖</span><span className="small">{t('Legenda', 'Legend')}</span>
            </button>
          </>
        )}
        {cur.stickers.filter((s) => !missing.has(s.id)).map((s) => (
          <button key={s.id} className="sticker-btn" aria-label={s.label} disabled={disabled} onClick={() => onPick(s.id)}>
            <StickerImg id={s.id} size={64} onMissing={pikantNumber(s.id) ? undefined : () => hide(s.id)} />
            {slotIndex(s.id) >= 0 && <span className="slot-mark" aria-hidden>✎</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function PikantSheet({ n, dice, busy, onSend, onReroll, onClose }: {
  n: number; dice?: boolean; busy: boolean; onSend: (pin: string) => Promise<boolean>; onReroll: () => void; onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <div className="center">
        {dice && <p className="small muted" style={{ marginBottom: 4 }}>{t('Kostka rozhodla za vás', 'The dice decided for you')}</p>}
        <div className="pop" style={{ display: 'inline-block' }}><StickerImg id={pikantId(n)} size={120} /></div>
        <h2 style={{ margin: '6px 0 4px' }}>{t('Číslo', 'Number')} {n}</h2>
        <p className="small muted">{t(
          'Co číslo znamená, si partner najde v Legendě. Popis bude zamčený heslem. Zvol 4 číslice a řekni mu je, až budeš chtít.',
          'Your partner finds what the number means in the Legend. The description will be locked with a password. Choose 4 digits and tell them when you want to.',
        )}</p>
      </div>
      <PinPad length={4} busy={busy} onComplete={onSend} />
      <button className="btn ghost small" style={{ width: '100%' }} onClick={onReroll}>🎲 {dice ? t('Hodit znovu', 'Roll again') : t('Hodit kostkou', 'Roll the dice')}</button>
    </Sheet>
  );
}

function SlotSheet({ user, id, busy, onSend, onClose }: { user: User; id: string; busy: boolean; onSend: (text: string) => void; onClose: () => void }) {
  const idx = slotIndex(id);
  const [slots, setSlots] = useState(() => loadSlots(user.id));
  const [edit, setEdit] = useState<string | null>(null);
  const own = idx < FREE_SLOTS ? slots[idx] ?? '' : '';
  const save = () => {
    const next = [...slots]; while (next.length < FREE_SLOTS) next.push('');
    next[idx] = (edit ?? '').trim();
    saveSlots(user.id, next); setSlots(next); setEdit(null);
  };
  if (edit !== null) {
    return (
      <Sheet onClose={onClose}>
        <div className="stack">
          <button className="btn ghost small" onClick={() => setEdit(null)}>← {t('Zpět', 'Back')}</button>
          <h2 style={{ margin: 0 }}>{t('Vlastní text', 'Your own text')}</h2>
          <p className="small muted" style={{ margin: 0 }}>{t('Partner uvidí text pod ikonou stejně jako ostatní. Nepozná, že je tvůj.', 'Your partner sees the text under the icon like any other. They can’t tell it is yours.')}</p>
          <textarea className="textarea" style={{ minHeight: 100 }} autoFocus value={edit} maxLength={SLOT_MAX} onChange={(e) => setEdit(e.target.value)} placeholder={t('Třeba: Dnes večer jsi jen můj/moje.', 'For example: Tonight you are all mine.')} />
          <div className="small muted" style={{ textAlign: 'right' }}>{edit.length} / {SLOT_MAX}</div>
          <button className="btn primary" onClick={save}>{t('Uložit', 'Save')}</button>
        </div>
      </Sheet>
    );
  }
  const texts = slotTexts(idx);
  return (
    <Sheet onClose={onClose}>
      <div className="row" style={{ marginBottom: 10 }}>
        <StickerImg id={id} size={64} />
        <p className="small muted" style={{ margin: 0 }}>{t('Vyber text, který přijde pod ikonou.', 'Choose the text that goes under the icon.')}</p>
      </div>
      {own && (
        <button className="idea mine" disabled={busy} onClick={() => onSend(own)}>
          <b>{t('Můj text', 'My text')}</b><span>{own}</span>
        </button>
      )}
      {texts.map((t) => (
        <button key={t} className="idea" disabled={busy} onClick={() => onSend(t)}><span>{t}</span></button>
      ))}
      <button className="chip add" style={{ marginTop: 8 }} onClick={() => setEdit(own)}>{own ? '✎ ' + t('Upravit můj text', 'Edit my text') : '+ ' + t('Vlastní text', 'Own text')}</button>
    </Sheet>
  );
}

function LegendSheet({ start, locks, unlocked, onUnlock, meFemale, partnerFemale, onDice, onClose }: {
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

// --- Systémové hlášky ze starší verze (ruční smazání místnosti) ---------------

function remaining(at: number) {
  const ms = at - Date.now();
  if (ms <= 0) return t('chvíli', 'a moment');
  const h = ms / 3600_000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  return `${Math.round(h)} h`;
}

const verb = (g: string, base: string) => (g === 'zena' ? base + 'a' : g === 'muz' ? base : base + '/a');

function SystemNote({ m, mine, me, pair, partner }: { m: Decoded; mine: boolean; me: User; pair: Pair; partner: string }) {
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
function InviteAgain({ getCode }: { getCode: () => Promise<string | null> }) {
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
function RoomCode({ getCode }: { getCode: () => Promise<string | null> }) {
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

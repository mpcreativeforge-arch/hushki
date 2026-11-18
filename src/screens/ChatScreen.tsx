import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { backend, type Message, type Pair, type User } from '../lib/backend';
import { decodePayload, encodePayload, makeLock, previewOf, type LockRef, type Payload } from '../lib/payload';
import { enablePush, pushEnabled, pushSupported } from '../lib/push';
import { DICE_MAX, pikantId, pikantNumber, sexOf, tabsFor } from '../data/stickers';
import { Envelope } from '../components/Envelope';
import { feedback, haptic } from '../lib/feedback';
import { QuickMenu } from '../components/QuickMenu';
import { loadPartnerPin, loadRoomPin, loadUnlocked, savePartnerPin, saveRoomPin, saveUnlocked } from '../lib/slots';
import { checkLock } from '../lib/payload';
import { toast } from '../components/Toast';
import { LegendContext, loadRoomLegend, saveRoomLegend, type LegendEdit, type RoomLegend } from '../lib/roomLegend';
import { useStickerSex } from '../lib/style';
import { LockButton } from '../components/LockButton';
import { DiceOverlay } from '../components/D20';
import { plural, t, useLang } from '../lib/i18n';
import { useOnline } from '../lib/online';
import { shouldOfferInstall } from '../lib/install';
import { InstallSheet } from '../components/InstallSheet';
import { PremiumSheet } from '../components/PremiumSheet';
import { FREE_DICE_MAX, isPremium } from '../lib/premium';

import { Bubble, GroupEnvelope } from './chat/Bubble';
import { loadRecent, pushRecent } from '../lib/recent';
import { StickerPicker } from './chat/StickerPicker';
import { PikantSheet } from './chat/PikantSheet';
import { LegendSheet } from './chat/LegendSheet';
import { remaining, SystemNote, InviteAgain, RoomCode } from './chat/RoomBits';
import type { Decoded } from './chat/Bubble';

interface Props {
  user: User; pair: Pair; pairKey: CryptoKey; flags: Record<string, boolean>;
  onBack: () => void; onSettings: () => void; onLock: () => void; onLogout: () => void; onLeave: () => void;
  getCode: () => Promise<string | null>;
  /** po zakoupení Premium načíst účet znovu */
  onPremiumChange?: () => void;
}


/** Zprávy zmizí 48 hodin po poslední zprávě v místnosti. */
const TTL = 48 * 3600_000;

export function ChatScreen({ user, pair, pairKey, flags, onBack, onSettings, onLock, onLogout, onLeave, getCode, onPremiumChange }: Props) {
  const [items, setItems] = useState<Decoded[] | null>(null);
  const [replyTo, setReplyTo] = useState<Decoded | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | { k: 'legend'; n?: number } | { k: 'pikant'; n: number; dice?: boolean } | { k: 'dice'; for: 'send' | 'legend'; prev?: number }>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [push, setPush] = useState<'unknown' | 'on' | 'off' | 'unsupported'>('unknown');
  const [unlocked, setUnlocked] = useState<number[]>(() => loadUnlocked(pair.id));
  const [roomPin, setRoomPin] = useState<string | null>(() => loadRoomPin(pair.id));
  const [roomLegend, setRoomLegend] = useState<RoomLegend>({});
  const sex = useStickerSex(user.id, user.gender);

  // Vlastní Legenda místnosti (šifrovaná), znovu načtená při každé změně v místnosti
  useEffect(() => {
    let alive = true;
    const load = () => loadRoomLegend(pairKey, pair.id).then((l) => { if (alive) setRoomLegend(l); });
    load();
    const off = backend.subscribe(pair.id, load);
    return () => { alive = false; off(); };
  }, [pair.id, pairKey]);

  const saveEdit = async (n: number, e: LegendEdit | null) => {
    const next = { ...roomLegend };
    if (e) next[n] = e; else delete next[n];
    await saveRoomLegend(pairKey, pair.id, next);
    setRoomLegend(next);
    toast(e ? t('Číslo ', 'Number ') + n + t(' je upravené pro vás oba.', ' is updated for both of you.') : t('Číslo ', 'Number ') + n + t(' má zase původní text.', ' is back to the original.'));
  };
  const listRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef(new Map<string, Payload | null>());
  const seenRef = useRef<Set<string> | null>(null);
  const liveRef = useRef(new Set<string>());
  const [menu, setMenu] = useState(false);
  const [install, setInstall] = useState(false);
  const [premiumOffer, setPremiumOffer] = useState(false);
  const premium = isPremium(user);
  const diceMax = premium ? DICE_MAX : FREE_DICE_MAX;
  const [recent, setRecent] = useState<string[]>(() => loadRecent(user.id));
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const [swipeHint, setSwipeHint] = useState(() => { try { return !localStorage.getItem('hushki.hint.swipe'); } catch { return false; } });
  const hideSwipeHint = () => { setSwipeHint(false); try { localStorage.setItem('hushki.hint.swipe', '1'); } catch { /* */ } };
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

  const unlock = (n: number | number[]) => {
    const add = Array.isArray(n) ? n : [n];
    if (!add.length) return;
    setUnlocked((cur) => { const next = Array.from(new Set([...cur, ...add])); saveUnlocked(pair.id, next); return next; });
  };

  /** Heslo platí pro celou místnost: odemkne všechna čísla zamčená stejným heslem. */
  const unlockWith = async (pin: string, only?: number) => {
    const hit: number[] = [];
    for (const [n, refs] of locks) {
      for (const l of refs) if (await checkLock(l, pin)) { hit.push(n); break; }
    }
    if (only && !hit.includes(only)) return false;
    if (hit.length) {
      savePartnerPin(pair.id, pin);
      const fresh = hit.filter((n) => !unlocked.includes(n));
      unlock(hit);
      if (fresh.length) toast(t('Odemčeno v Legendě: ', 'Unlocked in the Legend: ') + fresh.sort((a, b) => a - b).join(', '));
    }
    return hit.length > 0;
  };

  // Nová čísla od partnera se zkusí odemknout heslem, které už jednou platilo.
  useEffect(() => {
    const pin = loadPartnerPin(pair.id);
    if (!pin || ![...locks.keys()].some((n) => !unlocked.includes(n))) return;
    unlockWith(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locks]);

  const send = async (p: Omit<Payload, 'v'>) => {
    setBusy(true); setError('');
    try {
      if (replyTo?.p) p.reply = { id: replyTo.id, preview: previewOf(replyTo.p) };
      const { ciphertext, iv } = await encodePayload(pairKey, p);
      const msg = await backend.sendMessage(pair.id, ciphertext, iv);
      backend.notifyPartner(msg.id);
      setReplyTo(null);
      if (p.t === 'sticker' && p.sticker) setRecent(pushRecent(user.id, p.sticker));
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
    send({ t: 'sticker', sticker: id });
  };

  const sendPikant = async (n: number, pin: string, dice?: boolean) => {
    const ok = await send({ t: 'sticker', sticker: pikantId(n), lock: await makeLock(pin), ...(dice ? { dice: true } : {}) });
    if (ok) {
      if (pin !== roomPin) toast(roomPin ? t('Nové heslo místnosti je uložené.', 'New room password saved.') : t('Heslo místnosti je uložené. Příště se vyplní samo.', 'Room password saved. Next time it fills in by itself.'));
      unlock(n); saveRoomPin(pair.id, pin); setRoomPin(pin); setSheet(null);
    }
    return ok;
  };

  // Demo: simulovaný partner odpoví samolepkou (občas pikantní s heslem 1234)
  const demoReply = () => {
    setTimeout(async () => {
      const tabs = tabsFor(pair.partner_gender === 'zena' ? 'zena' : 'muz');
      let p: Omit<Payload, 'v'>;
      if (Math.random() < 0.3) {
        p = { t: 'sticker', sticker: pikantId(1 + Math.floor(Math.random() * DICE_MAX)), lock: await makeLock('1234'), dice: true };
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

  // Otevření skupiny obálek: vzkazy se hned ukážou (s animací), na server jde přečteno.
  const openGroup = (ids: string[]) => {
    feedback('open');
    setOpened((cur) => { const next = new Set(cur); ids.forEach((x) => next.add(x)); return next; });
    for (const x of ids) backend.markRead(x).catch(() => undefined);
    // otevřené vzkazy jsou vyšší než obálka, posuň na konec
    requestAnimationFrame(() => { const el = listRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); });
  };

  const remove = async (m: Decoded) => {
    await backend.deleteMessage(m.id);
    setSelected(null);
    if (replyTo?.id === m.id) setReplyTo(null);
    setItems((cur) => cur?.filter((x) => x.id !== m.id) ?? cur);
    toast(t('Vzkaz je smazaný u vás obou.', 'Message deleted for both of you.'));
  };

  const reply = (m: Decoded) => { setReplyTo(m); setSelected(null); if (swipeHint) hideSwipeHint(); };

  const turnOnPush = async () => {
    const r = await enablePush().catch(() => 'denied' as const);
    setPush(r === 'ok' ? 'on' : r === 'unsupported' ? 'unsupported' : 'off');
  };

  const unread = items?.filter((m) => m.sender_id !== user.id && !m.read_at && !opened.has(m.id)).length ?? 0;
  // Legenda: čísla od partnera, která ještě nemám odemčená
  const lockedCount = [...locks.keys()].filter((n) => !unlocked.includes(n)).length;
  const lastMine = items ? [...items].reverse().find((m) => m.sender_id === user.id && !m.meta?.sys)?.id : undefined;
  const hasTheirs = !!items?.some((m) => m.sender_id !== user.id && !m.meta?.sys && (m.read_at || opened.has(m.id)));

  // Několik neotevřených vzkazů za sebou se schová do jedné obálky.
  type Row = { k: 'm'; m: Decoded; i: number } | { k: 'g'; ids: string[]; i: number; at: string };
  const rows: Row[] = [];
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const m = items[i];
      const sealedIn = (x: Decoded) => !x.meta?.sys && x.sender_id !== user.id && !x.read_at && !opened.has(x.id) && !liveRef.current.has(x.id);
      if (sealedIn(m)) {
        let j = i; while (j + 1 < items.length && sealedIn(items[j + 1])) j++;
        if (j > i) { rows.push({ k: 'g', ids: items.slice(i, j + 1).map((x) => x.id), i, at: m.created_at }); i = j; continue; }
      }
      rows.push({ k: 'm', m, i });
    }
  }
  const gap = (i: number) => !items || i === 0 || new Date(items[i].created_at).getTime() - new Date(items[i - 1].created_at).getTime() > 15 * 60_000;
  const last = items?.length ? items[items.length - 1].created_at : null;
  const status = waiting ? t('Čekáme na připojení partnera', 'Waiting for your partner to join')
    : unread ? `${unread} ${plural(unread, 'nový vzkaz', 'nové vzkazy', 'nových vzkazů', 'new message', 'new messages')}`
      : last ? t('Zprávy zmizí za ', 'Messages disappear in ') + remaining(new Date(last).getTime() + TTL) : t('Šifrováno, uvidíte jen vy dva', 'Encrypted, only the two of you can see it');

  return (
    <LegendContext.Provider value={roomLegend}>
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
          rows.map((r) => r.k === 'g' ? (
            <GroupEnvelope key={'g' + r.ids[0]} count={r.ids.length} partner={partner} at={r.at} showTime={gap(r.i)} onOpen={() => openGroup(r.ids)} />
          ) : r.m.meta?.sys ? (
            <SystemNote key={r.m.id} m={r.m} mine={r.m.sender_id === user.id} me={user} pair={pair} partner={partner} />
          ) : (
            <Bubble
              key={r.m.id} m={opened.has(r.m.id) && !r.m.read_at ? { ...r.m, read_at: new Date().toISOString() } : r.m}
              live={liveRef.current.has(r.m.id) || opened.has(r.m.id)} mine={r.m.sender_id === user.id} partner={partner} pairKey={pairKey}
              showTime={gap(r.i)} showStatus={r.m.id === lastMine}
              selected={selected === r.m.id}
              onSelect={() => setSelected(r.m.id)}
              onOpen={() => open(r.m)}
              onReply={canReply ? () => reply(r.m) : undefined}
              onDelete={r.m.sender_id === user.id ? () => remove(r.m) : undefined}
              onPhoto={setViewer}
            />
          ))
        )}
        {swipeHint && canReply && hasTheirs && (
          <div className="notice row between small swipe-hint">
            <span>{t('Tip: přetáhni vzkaz doprava a odpovíš na něj. Podržením svého vzkazu ho smažeš.', 'Tip: swipe a message to the right to reply. Press and hold your own message to delete it.')}</span>
            <button className="icon-btn" aria-label={t('Zavřít tip', 'Close tip')} onClick={(e) => { e.stopPropagation(); hideSwipeHint(); }}>✕</button>
          </div>
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
        <StickerPicker user={user} recent={recent} disabled={waiting || busy || !online} onPick={pickSticker} onDice={() => setSheet({ k: 'dice', for: 'send' })} onLegend={() => setSheet({ k: 'legend' })} lockedCount={lockedCount} premium={premium} onPremium={() => setPremiumOffer(true)} />
      </footer>

      {sheet?.k === 'legend' && (
        <LegendSheet
          start={sheet.n} locks={locks} unlocked={unlocked} onPin={unlockWith} sex={sex} onSaveEdit={saveEdit} meFemale={meFemale} partnerFemale={partnerFemale}
          onDice={(prev) => setSheet({ k: 'dice', for: 'legend', prev })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.k === 'pikant' && <PikantSheet n={sheet.n} dice={sheet.dice} busy={busy} roomPin={roomPin} meFemale={meFemale} onSend={(pin) => sendPikant(sheet.n, pin, sheet.dice)} onReroll={() => setSheet({ k: 'dice', for: 'send', prev: sheet.n })} onClose={() => setSheet(null)} />}
      {sheet?.k === 'dice' && (
        <DiceOverlay
          max={sheet.for === 'send' ? diceMax : DICE_MAX} prev={sheet.prev} secret={sheet.for === 'send'}
          actionLabel={sheet.for === 'send' ? t('Poslat toto číslo', 'Send this number') : t('Ukázat v Legendě', 'Show in the Legend')}
          onResult={(n) => setSheet(sheet.for === 'send' ? { k: 'pikant', n, dice: true } : { k: 'legend', n })}
          onClose={() => setSheet(sheet.for === 'legend' ? { k: 'legend', n: sheet.prev } : null)}
        />
      )}
      {premiumOffer && <PremiumSheet onClose={() => setPremiumOffer(false)} onDemoDone={onPremiumChange} />}
      {install && !sheet && !menu && <InstallSheet onClose={() => setInstall(false)} />}
      {menu && <QuickMenu extra={<RoomCode getCode={getCode} />} onClose={() => setMenu(false)} onSettings={() => { setMenu(false); onSettings(); }} onLogout={onLogout} onLeave={onLeave} />}
      {viewer && (
        <div className="viewer" onClick={() => setViewer(null)}>
          <img src={viewer} alt={t('Fotka', 'Photo')} />
        </div>
      )}
    </div>
    </LegendContext.Provider>
  );
}

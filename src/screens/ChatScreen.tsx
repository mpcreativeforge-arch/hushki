import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { backend, BackendError, templatesFor, type Message, type Pair, type Template, type Tone, type User } from '../lib/backend';
import { decodePayload, encodePayload, photoUrl, previewOf, uploadPhoto, type Payload, type PhotoRef } from '../lib/payload';
import { enablePush, isIOS, isStandalone, pushEnabled, pushSupported } from '../lib/push';
import { packsFor, STICKERS, stickerSrc } from '../data/stickers';
import { Envelope } from '../components/Envelope';
import { feedback, haptic } from '../lib/feedback';
import { Sheet } from '../components/Sheet';
import { QuickMenu } from '../components/QuickMenu';
import { loadMyIdeas, newId, saveMyIdeas, type MyCategory, type MyIdea, type MyIdeas } from '../lib/ideas';
import { when } from './format';
import { LockButton } from '../components/LockButton';

interface Props {
  user: User; pair: Pair; pairKey: CryptoKey; flags: Record<string, boolean>;
  onBack: () => void; onSettings: () => void; onLock: () => void; onLogout: () => void; onLeave: () => void;
}

type Decoded = Message & { p: Payload | null; failed?: boolean };

const MAX = 1000;
const TONES: { id: Tone; label: string }[] = [
  { id: 'elegantni', label: 'Elegantně' },
  { id: 'romanticky', label: 'Romanticky' },
  { id: 'hravy', label: 'Hravě' },
];
const CATEGORIES: Record<string, string> = { romantika: 'Romantika', odvaha: 'Odvaha', hra: 'Hra' };

export function ChatScreen({ user, pair, pairKey, flags, onBack, onSettings, onLock, onLogout, onLeave }: Props) {
  const [items, setItems] = useState<Decoded[] | null>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Decoded | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'stickers' | 'ideas' | 'gentleman'>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [push, setPush] = useState<'unknown' | 'on' | 'off' | 'unsupported'>('unknown');
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cacheRef = useRef(new Map<string, Payload | null>());
  const seenRef = useRef<Set<string> | null>(null);
  const liveRef = useRef(new Set<string>());
  const [menu, setMenu] = useState(false);

  const partner = pair.partner_name || (pair.partner_gender === 'muz' ? 'Partner' : pair.partner_gender === 'zena' ? 'Partnerka' : 'Partner/ka');
  const waiting = !pair.user_b;
  const canReply = flags.replies !== false;
  const canPhoto = flags.photo_notes !== false;
  const canSticker = flags.stickers !== false;

  // Načtení a rozšifrování vzkazů
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const list = await backend.listMessages(pair.id).catch(() => [] as Message[]);
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
    return () => { alive = false; off(); };
  }, [pair.id, pairKey, user.id]);

  useEffect(() => {
    if (backend.mode === 'demo' || !pushSupported()) return setPush('unsupported');
    pushEnabled().then((on) => setPush(on ? 'on' : 'off'));
  }, []);

  // Výška pole podle textu (i po odeslání nebo vložení nápadu)
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [text]);

  // Posun na konec při nové zprávě
  const count = items?.length ?? 0;
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const send = async (p: Omit<Payload, 'v'>) => {
    setBusy(true); setError('');
    try {
      if (replyTo?.p) p.reply = { id: replyTo.id, preview: previewOf(replyTo.p) };
      const { ciphertext, iv } = await encodePayload(pairKey, p);
      const msg = await backend.sendMessage(pair.id, ciphertext, iv);
      backend.notifyPartner(msg.id);
      setReplyTo(null);
      feedback(p.t === 'sticker' ? 'sticker' : 'send');
      if (backend.mode === 'demo') demoReply();
      return true;
    } catch (e) {
      haptic('error');
      setError((e as BackendError).code === 'upload' ? 'Fotku se nepodařilo nahrát.' : 'Odeslání se nepovedlo. Zkontroluj připojení.');
      return false;
    } finally { setBusy(false); }
  };

  const sendText = async () => {
    const body = text.trim();
    if (!body || busy) return;
    if (await send({ t: 'text', text: body })) setText('');
  };

  const sendSticker = async (id: string) => { setSheet(null); await send({ t: 'sticker', sticker: id }); };

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try {
      const photo = await uploadPhoto(pairKey, pair.id, file, backend.mode === 'demo' ? 900 : 1600);
      await send({ t: 'photo', photo, text: text.trim() || undefined });
      setText('');
    } catch {
      setError('Fotku se nepodařilo připravit.');
      setBusy(false);
    }
  };

  // Demo: simulovaný partner odpoví samolepkou nebo nápadem
  const demoReply = () => {
    setTimeout(async () => {
      const partnerPack = packsFor(pair.partner_gender === 'muz' ? 'muz' : 'zena')[0];
      const templates = templatesFor(await backend.templates(), pair.partner_gender === 'zena');
      const useSticker = Math.random() < 0.5;
      const p: Omit<Payload, 'v'> = useSticker
        ? { t: 'sticker', sticker: partnerPack.stickers[Math.floor(Math.random() * partnerPack.stickers.length)].id }
        : { t: 'text', text: templates[Math.floor(Math.random() * templates.length)].body };
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

  return (
    <div className="chat">
      <header className="chat-top">
        <div className="row" style={{ gap: 4, minWidth: 0 }}>
          <button className="icon-btn" aria-label="Zpět na místnosti" onClick={onBack}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <div style={{ minWidth: 0 }}>
            <div className="room-title">{waiting ? 'Nová místnost' : partner}</div>
            <div className="small muted">{waiting ? 'Čekáme na připojení partnera' : unread ? (unread === 1 ? '1 nový vzkaz' : `${unread} nové vzkazy`) : pair.expires_at ? `Smaže se za ${remaining(pair.expires_at)}` : 'Šifrováno, uvidíte jen vy dva'}</div>
          </div>
        </div>
        <div className="row" style={{ gap: 0 }}>
          <LockButton onLock={onLock} />
          <button className="icon-btn" aria-label="Menu" onClick={() => setMenu(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
          </button>
        </div>
      </header>

      <div className="chat-list" ref={listRef} onClick={() => setSelected(null)}>
        {isIOS() && !isStandalone() && (
          <div className="notice small">V Safari klepni na <b>Sdílet</b> → <b>Přidat na plochu</b>. Hushki se pak otevírá jako aplikace a může posílat upozornění.</div>
        )}
        {push === 'off' && !waiting && (
          <div className="notice row between small">
            <span>Zapni si tichá upozornění na nové vzkazy.</span>
            <button className="btn small" onClick={turnOnPush}>Zapnout</button>
          </div>
        )}

        {items === null ? (
          <div className="center" style={{ padding: 40 }}><span className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="empty">
            <div className="envelope-wrap"><Envelope size={110} className="wobble" /></div>
            <p>Zatím tu nic není.</p>
            <p className="small muted">{waiting ? 'Až se partner/ka připojí s vaším kódem, můžete si psát.' : 'Napiš první vzkaz. Uvidí ho jen vy dva.'}</p>
          </div>
        ) : (
          items.map((m, i) => m.meta?.sys ? (
            <SystemNote key={m.id} m={m} mine={m.sender_id === user.id} me={user} pair={pair} partner={partner} />
          ) : (
            <Bubble
              key={m.id} m={m} live={liveRef.current.has(m.id)} onDone={() => setSelected(null)} mine={m.sender_id === user.id} partner={partner} pairKey={pairKey}
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

      <footer className="composer">
        {error && <p className="error small" style={{ margin: '0 0 8px' }}>{error}</p>}
        {replyTo?.p && (
          <div className="reply-bar">
            <div><b>Odpověď na:</b> {previewOf(replyTo.p)}</div>
            <button className="icon-btn" aria-label="Zrušit odpověď" onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}
        {!waiting && !text && (
          <div className="chips" style={{ marginBottom: 8 }}>
            {unread > 1 && <button className="chip" onClick={openAll}>✉ Otevřít vše ({unread})</button>}
            {flags.templates !== false && <button className="chip" onClick={() => setSheet('ideas')}>💡 Nápady</button>}
            {flags.gentleman && <button className="chip" onClick={() => setSheet('gentleman')}>✨ Gentleman</button>}
          </div>
        )}
        {text.length > MAX - 150 && <div className={'small ' + (text.length >= MAX ? 'error' : 'muted')} style={{ textAlign: 'right', margin: '0 4px 4px' }}>{text.length} / {MAX}</div>}
        <div className="composer-row">
          {canPhoto && (
            <button className="icon-btn round" aria-label="Poslat fotku" disabled={waiting || busy} onClick={() => fileRef.current?.click()}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="3" /><circle cx="12" cy="13" r="3.5" /><path d="M8.5 6l1.5-2h4l1.5 2" /></svg>
            </button>
          )}
          {canSticker && (
            <button className="icon-btn round" aria-label="Samolepky" disabled={waiting || busy} onClick={() => setSheet('stickers')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1.8 2 5.2 2 7 0" /><circle cx="9" cy="10" r=".8" fill="currentColor" /><circle cx="15" cy="10" r=".8" fill="currentColor" /></svg>
            </button>
          )}
          <textarea
            className="composer-input" rows={1} value={text} maxLength={MAX} disabled={waiting}
            placeholder={waiting ? 'Čekáme na partnera…' : 'Napiš vzkaz…'}
            ref={inputRef} onChange={(e) => setText(e.target.value)}
          />
          <button className="send-btn" aria-label="Odeslat" disabled={!text.trim() || busy || waiting} onClick={sendText}>
            {busy ? <span className="spinner" /> : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
            )}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
      </footer>

      {sheet === 'stickers' && <StickerSheet user={user} onPick={sendSticker} onClose={() => setSheet(null)} />}
      {sheet === 'ideas' && <IdeasSheet pairKey={pairKey} writerFemale={user.gender === 'zena' || (user.gender === 'neuvedeno' && pair.partner_gender === 'muz')} onPick={(t) => { setText(t); setSheet(null); }} onClose={() => setSheet(null)} />}
      {sheet === 'gentleman' && <GentlemanSheet initial={text} onUse={(t) => { setText(t); setSheet(null); }} onClose={() => setSheet(null)} />}
      {menu && <QuickMenu extra={!waiting && <ExpiryPicker pair={pair} last={pair.expires_at ? ([...(items ?? [])].reverse().find((m) => m.meta?.sys === 'expiry')?.meta.seconds as number | undefined) ?? 'custom' : null} />} onClose={() => setMenu(false)} onSettings={() => { setMenu(false); onSettings(); }} onLogout={onLogout} onLeave={onLeave} />}
      {viewer && (
        <div className="viewer" onClick={() => setViewer(null)}>
          <img src={viewer} alt="Fotka" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Bubble({ m, live, onDone, mine, partner, pairKey, showTime, selected, onSelect, onOpen, onReply, onPhoto }: {
  m: Decoded; live: boolean; onDone: () => void; mine: boolean; partner: string; pairKey: CryptoKey; showTime: boolean; selected: boolean;
  onSelect: () => void; onOpen: () => void; onReply?: () => void; onPhoto: (url: string) => void;
}) {
  const sealed = !mine && !m.read_at;
  const [revealed, setRevealed] = useState(!sealed);
  const pressRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => { setCopied(false); onDone(); }, 900); }).catch(() => undefined);
  };

  if (sealed && !revealed) {
    return (
      <div className="msg theirs">
        {showTime && <div className="msg-time">{when(m.created_at)}</div>}
        <button className="sealed" data-haptic="off" onClick={(e) => { e.stopPropagation(); setRevealed(true); onOpen(); }}>
          <Envelope size={52} />
          <div>
            <div className="who">Nový vzkaz od: {partner}</div>
            <div className="small muted">Klepni a otevři</div>
          </div>
        </button>
      </div>
    );
  }

  const p = m.p;
  const isSticker = p?.t === 'sticker';
  // podržení prstu (jako ve WhatsAppu) nabídne odpověď
  function startPress(e: React.PointerEvent) {
    if (!onReply && !p?.text) return;
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
          <div className="bubble"><i>Vzkaz nejde rozšifrovat.</i></div>
        ) : isSticker ? (
          <StickerImg id={p.sticker!} size={128} />
        ) : p.t === 'photo' ? (
          <div className="bubble photo">
            <Photo pairKey={pairKey} photo={p.photo!} onOpen={onPhoto} />
            {p.text && <div className="caption">{p.text}</div>}
          </div>
        ) : (
          <div className={'bubble' + ((revealed && sealed) || live ? ' unfold' : '')}>{p.text}</div>
        )}
      </div>
      {mine && <div className="msg-status">{m.read_at ? 'přečteno' : 'doručeno'}</div>}
      {selected && (
        <div className="msg-actions">
          {onReply && <button className="chip" onClick={(e) => { e.stopPropagation(); onReply(); }}>↩ Odpovědět</button>}
          {p?.text && (
            <button className="chip" onClick={(e) => { e.stopPropagation(); copy(p.text!); }}>{copied ? '✓ Zkopírováno' : '⧉ Zkopírovat'}</button>
          )}
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
      {url ? <img src={url} alt="Fotka" onClick={(e) => { e.stopPropagation(); onOpen(url); }} />
        : failed ? <span className="small muted">Fotku nejde načíst</span> : <span className="spinner" />}
    </div>
  );
}

export function StickerImg({ id, size }: { id: string; size: number }) {
  const [broken, setBroken] = useState(false);
  const st = STICKERS.get(id);
  if (broken || !st) return <span className="sticker-fallback" style={{ fontSize: size * 0.62, width: size, height: size }}>{st?.fallback ?? '✨'}</span>;
  return <img className="sticker" src={stickerSrc(id)} width={size} height={size} alt={st.label} onError={() => setBroken(true)} />;
}

function StickerSheet({ user, onPick, onClose }: { user: User; onPick: (id: string) => void; onClose: () => void }) {
  const packs = useMemo(() => packsFor(user.gender), [user.gender]);
  const [tab, setTab] = useState(packs[0].id);
  const pack = packs.find((p) => p.id === tab)!;
  return (
    <Sheet onClose={onClose}>
      <div className="chips" style={{ marginBottom: 12 }}>
        {packs.map((p) => <button key={p.id} className={'chip' + (tab === p.id ? ' on' : '')} onClick={() => setTab(p.id)}>{p.title}</button>)}
      </div>
      <div className="sticker-grid">
        {pack.stickers.map((s) => (
          <button key={s.id} className="sticker-btn" aria-label={s.label} onClick={() => onPick(s.id)}>
            <StickerImg id={s.id} size={72} />
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function IdeasSheet({ pairKey, writerFemale, onPick, onClose }: { pairKey: CryptoKey; writerFemale: boolean; onPick: (t: string) => void; onClose: () => void }) {
  const [ideas, setIdeas] = useState<Template[] | null>(null);
  const [mine, setMine] = useState<MyIdeas | null>(null);
  const [cat, setCat] = useState('vse');
  const [edit, setEdit] = useState<MyIdea | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    backend.templates().then((l) => setIdeas(templatesFor(l, writerFemale))).catch(() => setIdeas([]));
    loadMyIdeas(pairKey).then(setMine);
  }, [pairKey, writerFemale]);

  const builtinCats = Array.from(new Set((ideas ?? []).map((t) => t.category)));
  const cats: MyCategory[] = [...builtinCats.map((c) => ({ id: c, name: CATEGORIES[c] ?? c })), ...(mine?.cats ?? [])];
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '';
  const myList = (mine?.ideas ?? []).filter((t) => cat === 'vse' || cat === 'moje' || t.cat === cat);
  const builtList = cat === 'moje' ? [] : (ideas ?? []).filter((t) => cat === 'vse' || t.category === cat);
  const isCustomCat = !!mine?.cats.some((c) => c.id === cat);

  const persist = async (next: MyIdeas) => {
    setMine(next); setError('');
    try { await saveMyIdeas(pairKey, next); } catch { setError('Uložení se nepovedlo. Zkontroluj připojení.'); }
  };

  const save = async (idea: MyIdea, newCat?: string) => {
    if (!mine) return;
    let cats2 = mine.cats;
    if (newCat) { const c = { id: 'c-' + newId(), name: newCat }; cats2 = [...cats2, c]; idea = { ...idea, cat: c.id }; }
    const exists = mine.ideas.some((x) => x.id === idea.id);
    await persist({ ...mine, cats: cats2, ideas: exists ? mine.ideas.map((x) => (x.id === idea.id ? idea : x)) : [idea, ...mine.ideas] });
    setEdit(null);
    setCat(idea.cat || 'moje');
  };

  const remove = async (id: string) => {
    if (!mine) return;
    await persist({ ...mine, ideas: mine.ideas.filter((x) => x.id !== id) });
    setEdit(null);
  };

  const removeCat = async () => {
    if (!mine) return;
    await persist({ ...mine, cats: mine.cats.filter((c) => c.id !== cat), ideas: mine.ideas.map((x) => (x.cat === cat ? { ...x, cat: '' } : x)) });
    setCat('moje');
  };

  if (edit) {
    return (
      <Sheet onClose={onClose}>
        <IdeaEditor
          idea={edit} cats={cats} isNew={!mine?.ideas.some((x) => x.id === edit.id)}
          onSave={save} onDelete={() => remove(edit.id)} onBack={() => setEdit(null)}
        />
        {error && <p className="error small">{error}</p>}
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <h2>Nápady</h2>
      <div className="chips" style={{ marginBottom: 8 }}>
        <button className={'chip' + (cat === 'vse' ? ' on' : '')} onClick={() => setCat('vse')}>Vše</button>
        {!!mine?.ideas.length && <button className={'chip' + (cat === 'moje' ? ' on' : '')} onClick={() => setCat('moje')}>Moje</button>}
        {cats.map((c) => <button key={c.id} className={'chip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}>{c.name}</button>)}
        <button className="chip add" disabled={!mine} onClick={() => setEdit({ id: newId(), cat: cat === 'vse' || cat === 'moje' ? '' : cat, title: '', text: '' })}>+ Vlastní</button>
      </div>
      {error && <p className="error small">{error}</p>}
      {ideas === null || mine === null ? <div className="center"><span className="spinner" /></div> : (
        <>
          {myList.map((t) => (
            <div key={t.id} className="idea-row">
              <button className="idea mine" onClick={() => onPick(t.text)}>
                <b>{t.title || 'Můj nápad'}{t.cat && cat === 'vse' ? <em className="idea-tag">{catName(t.cat)}</em> : null}</b>
                <span>{t.text}</span>
              </button>
              <button className="icon-btn" aria-label="Upravit" onClick={() => setEdit(t)}>✎</button>
            </div>
          ))}
          {builtList.map((t) => (
            <button key={t.id} className="idea" onClick={() => onPick(t.body)}>
              <b>{t.title}</b>
              <span>{t.body}</span>
            </button>
          ))}
          {!myList.length && !builtList.length && (
            <p className="small muted">Tady zatím nic není. Přidej si vlastní nápad tlačítkem + Vlastní u kategorií.</p>
          )}
          {cat === 'moje' && <p className="small muted" style={{ marginTop: 10 }}>Vlastní nápady jsou zašifrované a vidíš je jen ty.</p>}
          {isCustomCat && <button className="btn ghost small" style={{ marginTop: 10 }} onClick={removeCat}>Smazat kategorii {catName(cat)}</button>}
        </>
      )}
    </Sheet>
  );
}

function IdeaEditor({ idea, cats, isNew, onSave, onDelete, onBack }: {
  idea: MyIdea; cats: MyCategory[]; isNew: boolean;
  onSave: (i: MyIdea, newCat?: string) => Promise<void>; onDelete: () => void; onBack: () => void;
}) {
  const [title, setTitle] = useState(idea.title);
  const [body, setBody] = useState(idea.text);
  const [cat, setCat] = useState(idea.cat);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    await onSave({ ...idea, title: title.trim(), text: body.trim(), cat: newCat === null ? cat : '' }, newCat?.trim() || undefined);
    setBusy(false);
  };
  return (
    <div className="stack">
      <div className="row between">
        <button className="btn ghost small" onClick={onBack}>← Zpět</button>
        {!isNew && <button className="btn ghost small" onClick={onDelete}>Smazat</button>}
      </div>
      <h2 style={{ margin: 0 }}>{isNew ? 'Nový nápad' : 'Upravit nápad'}</h2>
      <label className="field"><span>Název (nepovinný)</span>
        <input className="input" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="Třeba: Páteční večer" />
      </label>
      <label className="field"><span>Text vzkazu</span>
        <textarea className="textarea" style={{ minHeight: 120 }} value={body} maxLength={MAX} onChange={(e) => setBody(e.target.value)} placeholder="Napiš si reakci nebo vzkaz dopředu…" />
      </label>
      <div className="field"><span>Kategorie</span>
        <div className="chips">
          <button className={'chip' + (!cat && newCat === null ? ' on' : '')} onClick={() => { setCat(''); setNewCat(null); }}>Bez kategorie</button>
          {cats.map((c) => <button key={c.id} className={'chip' + (cat === c.id && newCat === null ? ' on' : '')} onClick={() => { setCat(c.id); setNewCat(null); }}>{c.name}</button>)}
          <button className={'chip' + (newCat !== null ? ' on' : '')} onClick={() => setNewCat('')}>+ Nová</button>
        </div>
        {newCat !== null && (
          <input className="input" style={{ marginTop: 8 }} autoFocus value={newCat} maxLength={24} onChange={(e) => setNewCat(e.target.value)} placeholder="Název kategorie" />
        )}
      </div>
      <button className="btn primary" disabled={busy || !body.trim() || (newCat !== null && !newCat.trim())} onClick={submit}>
        {busy ? <span className="spinner" /> : 'Uložit'}
      </button>
    </div>
  );
}

function GentlemanSheet({ initial, onUse, onClose }: { initial: string; onUse: (t: string) => void; onClose: () => void }) {
  const [src, setSrc] = useState(initial);
  const [tone, setTone] = useState<Tone>('elegantni');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    setBusy(true); setError('');
    try { setOut(await backend.gentleman(src, tone)); }
    catch (e) {
      const code = (e as BackendError).code;
      setError(code === 'refused' ? 'Tenhle text AI přepsat nechce.' : code === 'rate_limited' ? 'Moc pokusů najednou, zkus to za chvilku.' : 'Gentleman mód teď nefunguje.');
    } finally { setBusy(false); }
  };
  return (
    <Sheet onClose={onClose}>
      <h2>Gentleman mód</h2>
      <textarea className="textarea" style={{ minHeight: 110 }} value={src} maxLength={MAX} onChange={(e) => setSrc(e.target.value)} placeholder="Napiš, co chceš říct, klidně neohrabaně…" />
      <div className="chips" style={{ margin: '10px 0' }}>
        {TONES.map((t) => <button key={t.id} className={'chip' + (tone === t.id ? ' on' : '')} onClick={() => setTone(t.id)}>{t.label}</button>)}
      </div>
      <button className="btn" onClick={run} disabled={busy || !src.trim()}>{busy ? <span className="spinner" /> : out ? 'Zkusit jinak' : 'Učesat text'}</button>
      {error && <p className="error">{error}</p>}
      {out && (
        <div className="stack" style={{ marginTop: 14 }}>
          <div className="paper" style={{ fontSize: 18, animation: 'none', transform: 'none' }}>{out}</div>
          <button className="btn primary" onClick={() => onUse(out)}>Použít</button>
        </div>
      )}
    </Sheet>
  );
}

// --- Automatické smazání místnosti -------------------------------------------

const EXPIRY: { s: number | null; label: string; long: string }[] = [
  { s: null, label: 'Nikdy', long: '' },
  { s: 3600, label: '1 hodina', long: '1 hodinu' },
  { s: 86400, label: '24 hodin', long: '24 hodin' },
  { s: 604800, label: '7 dní', long: '7 dní' },
  { s: 2592000, label: '30 dní', long: '30 dní' },
];

function remaining(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'chvíli';
  const h = ms / 3600_000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} dní`;
}

const verb = (g: string, base: string) => (g === 'zena' ? base + 'a' : g === 'muz' ? base : base + '/a');

function SystemNote({ m, mine, me, pair, partner }: { m: Decoded; mine: boolean; me: User; pair: Pair; partner: string }) {
  const seconds = m.meta.seconds as number | null;
  const g = mine ? me.gender : pair.partner_gender;
  const who = mine ? '' : partner + ' ';
  const label = EXPIRY.find((e) => e.s === seconds)?.long ?? `${Math.round((seconds ?? 0) / 3600)} h`;
  let text = seconds === null
    ? `${who}${verb(g, mine ? 'Vypnul' : 'vypnul')}${mine ? ' jsi' : ''} automatické smazání místnosti.`
    : `${who}${verb(g, mine ? 'Nastavil' : 'nastavil')}${mine ? ' jsi' : ''} smazání místnosti za ${label}.`;
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return <div className="sys-note">⏳ {text} <span className="sys-time">{when(m.created_at)}</span></div>;
}

function ExpiryPicker({ pair, last }: { pair: Pair; last: number | null | 'custom' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [current, setCurrent] = useState<number | null | 'custom'>(last);
  const pick = async (s: number | null) => {
    if (busy || (s === null && current === null)) return;
    setBusy(true); setErr('');
    try { await backend.setRoomExpiry(pair.id, s); setCurrent(s); } catch { setErr('Nastavení se nepovedlo.'); }
    setBusy(false);
  };
  return (
    <div style={{ padding: '6px 0 12px', borderBottom: '1px solid rgba(244, 230, 210, 0.12)' }}>
      <div style={{ marginBottom: 8 }}>Smazat místnost za</div>
      <div className="chips">
        {EXPIRY.map((e) => (
          <button key={e.label} className={'chip' + (current === e.s ? ' on' : '')} disabled={busy} onClick={() => pick(e.s)}>{e.label}</button>
        ))}
      </div>
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        {pair.expires_at && current !== null ? `Teď se smaže za ${remaining(pair.expires_at)}. ` : ''}
        Odpočet běží od nastavení. Pak zmizí místnost i všechny vzkazy u vás obou. Změnu uvidíte oba v chatu.
      </p>
      {err && <p className="error small">{err}</p>}
    </div>
  );
}

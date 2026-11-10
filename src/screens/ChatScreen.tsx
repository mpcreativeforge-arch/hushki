import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Brand } from '../components/Logo';
import { backend, BackendError, type Message, type Pair, type Template, type Tone, type User } from '../lib/backend';
import { decodePayload, encodePayload, photoUrl, previewOf, uploadPhoto, type Payload, type PhotoRef } from '../lib/payload';
import { enablePush, isIOS, isStandalone, pushEnabled, pushSupported } from '../lib/push';
import { packsFor, STICKERS, stickerSrc } from '../data/stickers';
import { Envelope } from '../components/Envelope';
import { feedback, haptic } from '../lib/feedback';
import { Sheet } from '../components/Sheet';
import { when } from './format';

interface Props {
  user: User; pair: Pair; pairKey: CryptoKey; flags: Record<string, boolean>;
  onSettings: () => void; onLock: () => void;
}

type Decoded = Message & { p: Payload | null; failed?: boolean };

const MAX = 1200;
const TONES: { id: Tone; label: string }[] = [
  { id: 'elegantni', label: 'Elegantně' },
  { id: 'romanticky', label: 'Romanticky' },
  { id: 'hravy', label: 'Hravě' },
];
const CATEGORIES: Record<string, string> = { romantika: 'Romantika', odvaha: 'Odvaha', hra: 'Hra' };

export function ChatScreen({ user, pair, pairKey, flags, onSettings, onLock }: Props) {
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
  const cacheRef = useRef(new Map<string, Payload | null>());
  const seenRef = useRef<Set<string> | null>(null);

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
        if (!cacheRef.current.has(m.id)) {
          try { cacheRef.current.set(m.id, await decodePayload(pairKey, m.ciphertext, m.iv)); }
          catch { cacheRef.current.set(m.id, null); }
        }
        const p = cacheRef.current.get(m.id) ?? null;
        out.push({ ...m, p, failed: p === null });
      }
      if (!alive) return;
      // nový příchozí vzkaz → zvuk a vibrace (ne při prvním načtení)
      const incoming = out.filter((m) => m.sender_id !== user.id);
      if (seenRef.current && incoming.some((m) => !seenRef.current!.has(m.id))) feedback('receive');
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
      if (backend.mode === 'demo') demoReply(msg.id, p);
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
  const demoReply = (replyId: string, mine: Omit<Payload, 'v'>) => {
    setTimeout(async () => {
      const partnerPack = packsFor(pair.partner_gender === 'muz' ? 'muz' : 'zena')[0];
      const templates = await backend.templates();
      const useSticker = Math.random() < 0.5;
      const reply = { id: replyId, preview: previewOf({ v: 1, ...mine }) };
      const p: Omit<Payload, 'v'> = useSticker
        ? { t: 'sticker', sticker: partnerPack.stickers[Math.floor(Math.random() * partnerPack.stickers.length)].id, reply }
        : { t: 'text', text: templates[Math.floor(Math.random() * templates.length)].body, reply };
      const { ciphertext, iv } = await encodePayload(pairKey, p);
      await backend.demoPartnerMessage?.(pair.id, ciphertext, iv);
    }, 4500);
  };

  const open = (m: Decoded) => {
    feedback('open');
    if (m.sender_id !== user.id && !m.read_at) backend.markRead(m.id).catch(() => undefined);
  };

  const turnOnPush = async () => {
    const r = await enablePush().catch(() => 'denied' as const);
    setPush(r === 'ok' ? 'on' : r === 'unsupported' ? 'unsupported' : 'off');
  };

  const unread = items?.filter((m) => m.sender_id !== user.id && !m.read_at).length ?? 0;

  return (
    <div className="chat">
      <header className="chat-top">
        <div>
          <Brand />
          <div className="small muted">{waiting ? 'Čekáme na připojení partnera' : unread ? `${partner} · ${unread === 1 ? '1 nový vzkaz' : `${unread} nové vzkazy`}` : partner}</div>
        </div>
        <div className="row" style={{ gap: 0 }}>
          <button className="icon-btn" aria-label="Zamknout" onClick={onLock}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          </button>
          <button className="icon-btn" aria-label="Nastavení" onClick={onSettings}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
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
          items.map((m, i) => (
            <Bubble
              key={m.id} m={m} mine={m.sender_id === user.id} partner={partner} pairKey={pairKey}
              showTime={i === 0 || new Date(m.created_at).getTime() - new Date(items[i - 1].created_at).getTime() > 15 * 60_000}
              selected={selected === m.id}
              onSelect={() => { haptic('tap'); setSelected(selected === m.id ? null : m.id); }}
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
            {flags.templates !== false && <button className="chip" onClick={() => setSheet('ideas')}>💡 Nápady</button>}
            {flags.gentleman && <button className="chip" onClick={() => setSheet('gentleman')}>✨ Gentleman</button>}
          </div>
        )}
        <div className="composer-row">
          {canPhoto && (
            <button className="icon-btn round" aria-label="Poslat fotku" disabled={waiting || busy} onClick={() => { haptic('tap'); fileRef.current?.click(); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="3" /><circle cx="12" cy="13" r="3.5" /><path d="M8.5 6l1.5-2h4l1.5 2" /></svg>
            </button>
          )}
          {canSticker && (
            <button className="icon-btn round" aria-label="Samolepky" disabled={waiting || busy} onClick={() => { haptic('tap'); setSheet('stickers'); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1.8 2 5.2 2 7 0" /><circle cx="9" cy="10" r=".8" fill="currentColor" /><circle cx="15" cy="10" r=".8" fill="currentColor" /></svg>
            </button>
          )}
          <textarea
            className="composer-input" rows={1} value={text} maxLength={MAX} disabled={waiting}
            placeholder={waiting ? 'Čekáme na partnera…' : 'Napiš vzkaz…'}
            onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; }}
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
      {sheet === 'ideas' && <IdeasSheet onPick={(t) => { setText(t); setSheet(null); }} onClose={() => setSheet(null)} />}
      {sheet === 'gentleman' && <GentlemanSheet initial={text} onUse={(t) => { setText(t); setSheet(null); }} onClose={() => setSheet(null)} />}
      {viewer && (
        <div className="viewer" onClick={() => setViewer(null)}>
          <img src={viewer} alt="Fotka" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Bubble({ m, mine, partner, pairKey, showTime, selected, onSelect, onOpen, onReply, onPhoto }: {
  m: Decoded; mine: boolean; partner: string; pairKey: CryptoKey; showTime: boolean; selected: boolean;
  onSelect: () => void; onOpen: () => void; onReply?: () => void; onPhoto: (url: string) => void;
}) {
  const sealed = !mine && !m.read_at;
  const [revealed, setRevealed] = useState(!sealed);

  if (sealed && !revealed) {
    return (
      <div className="msg theirs">
        {showTime && <div className="msg-time">{when(m.created_at)}</div>}
        <button className="sealed" onClick={(e) => { e.stopPropagation(); setRevealed(true); onOpen(); }}>
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
  return (
    <div className={'msg ' + (mine ? 'mine' : 'theirs')}>
      {showTime && <div className="msg-time">{when(m.created_at)}</div>}
      <div className={'bubble-wrap' + (selected ? ' selected' : '')} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
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
          <div className={'bubble' + (revealed && sealed ? ' unfold' : '')}>{p.text}</div>
        )}
      </div>
      {mine && <div className="msg-status">{m.read_at ? 'přečteno' : 'doručeno'}</div>}
      {selected && onReply && (
        <button className="chip reply-chip" onClick={(e) => { e.stopPropagation(); onReply(); }}>↩ Odpovědět</button>
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

function IdeasSheet({ onPick, onClose }: { onPick: (t: string) => void; onClose: () => void }) {
  const [ideas, setIdeas] = useState<Template[] | null>(null);
  const [cat, setCat] = useState('vse');
  useEffect(() => { backend.templates().then(setIdeas).catch(() => setIdeas([])); }, []);
  const cats = Array.from(new Set((ideas ?? []).map((t) => t.category)));
  const shown = (ideas ?? []).filter((t) => cat === 'vse' || t.category === cat);
  return (
    <Sheet onClose={onClose}>
      <h2>Nápady</h2>
      <div className="chips" style={{ marginBottom: 8 }}>
        <button className={'chip' + (cat === 'vse' ? ' on' : '')} onClick={() => setCat('vse')}>Vše</button>
        {cats.map((c) => <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{CATEGORIES[c] ?? c}</button>)}
      </div>
      {ideas === null ? <div className="center"><span className="spinner" /></div> : shown.map((t) => (
        <button key={t.id} className="idea" onClick={() => onPick(t.body)}>
          <b>{t.title}</b>
          <span>{t.body}</span>
        </button>
      ))}
    </Sheet>
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

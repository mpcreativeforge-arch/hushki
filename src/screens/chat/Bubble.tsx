import { useEffect, useRef, useState } from 'react';
import { type Message } from '../../lib/backend';
import { photoUrl, type Payload, type PhotoRef } from '../../lib/payload';
import { STICKERS, pikantNumber, stickerSrc } from '../../data/stickers';
import { Envelope } from '../../components/Envelope';
import { haptic } from '../../lib/feedback';
import { when } from '../format';
import { plural, t } from '../../lib/i18n';
import { useRoomLegend } from '../../lib/roomLegend';


export type Decoded = Message & { p: Payload | null; failed?: boolean };

export function Bubble({ m, live, mine, partner, pairKey, showTime, showStatus, selected, onSelect, onOpen, onReply, onDelete, onPhoto }: {
  m: Decoded; live: boolean; mine: boolean; partner: string; pairKey: CryptoKey; showTime: boolean; showStatus: boolean; selected: boolean;
  onSelect: () => void; onOpen: () => void; onReply?: () => void; onDelete?: () => Promise<void>; onPhoto: (url: string) => void;
}) {
  const sealed = !mine && !m.read_at;
  const [revealed, setRevealed] = useState(!sealed);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dx, setDx] = useState(0);
  const pressRef = useRef<{ t: number; x: number; y: number; swipe: boolean; done: boolean } | null>(null);
  useEffect(() => { if (!selected) setConfirm(false); }, [selected]);

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
  const canSelect = !!onReply || !!onDelete;
  // podržení prstu nabídne odpověď nebo smazání, přetažení doprava rovnou odpoví
  function startPress(e: React.PointerEvent) {
    if (!canSelect) return;
    const tm = window.setTimeout(() => { if (pressRef.current && !pressRef.current.swipe) { pressRef.current.done = true; haptic('tap'); onSelect(); } }, 420);
    pressRef.current = { t: tm, x: e.clientX, y: e.clientY, swipe: false, done: false };
  }
  function endPress() {
    const pr = pressRef.current;
    if (pr) {
      clearTimeout(pr.t);
      if (pr.swipe && dx >= SWIPE && onReply) { haptic('tap'); onReply(); }
    }
    pressRef.current = null; setDx(0);
  }
  function movePress(e: React.PointerEvent) {
    const pr = pressRef.current;
    if (!pr || pr.done) return;
    const mx = e.clientX - pr.x, my = e.clientY - pr.y;
    if (!pr.swipe) {
      if (Math.abs(my) > 10) return endPress();
      if (onReply && mx > 12 && Math.abs(mx) > Math.abs(my) * 1.5) { pr.swipe = true; clearTimeout(pr.t); }
      else if (Math.abs(mx) > 10) return endPress();
    }
    if (pr.swipe) {
      const next = Math.max(0, Math.min(90, mx));
      if (next >= SWIPE && dx < SWIPE) haptic('tap');
      setDx(next);
    }
  }
  const del = async () => {
    if (!onDelete) return;
    if (!confirm) return setConfirm(true);
    setDeleting(true);
    try { await onDelete(); } catch { setDeleting(false); setConfirm(false); }
  };
  return (
    <div className={'msg ' + (mine ? 'mine' : 'theirs')}>
      {showTime && <div className="msg-time">{when(m.created_at)}</div>}
      <div
        className={'bubble-wrap' + (selected ? ' selected' : '') + (dx ? ' dragging' : '')}
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        onPointerDown={startPress} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress} onPointerMove={movePress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        {onReply && <span className={'swipe-cue' + (dx >= SWIPE ? ' ready' : '')} style={{ opacity: Math.min(1, dx / SWIPE) }} aria-hidden>↩</span>}
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
      {mine && showStatus && <div className="msg-status">{m.read_at ? t('přečteno', 'read') : t('doručeno', 'delivered')}</div>}
      {selected && canSelect && (
        <div className="msg-actions">
          {onReply && <button className="chip" onClick={(e) => { e.stopPropagation(); onReply(); }}>↩ {t('Odpovědět', 'Reply')}</button>}
          {onDelete && (
            <button className={'chip' + (confirm ? ' danger' : '')} disabled={deleting} onClick={(e) => { e.stopPropagation(); del(); }}>
              {deleting ? <span className="spinner" /> : confirm ? t('Opravdu smazat u obou?', 'Delete for both of you?') : '🗑 ' + t('Smazat', 'Delete')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const SWIPE = 56;

/** Několik neotevřených vzkazů za sebou = jedna obálka. */
export function GroupEnvelope({ count, partner, showTime, at, onOpen }: { count: number; partner: string; showTime: boolean; at: string; onOpen: () => void }) {
  return (
    <div className="msg theirs">
      {showTime && <div className="msg-time">{when(at)}</div>}
      <button className="sealed group" data-haptic="off" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
        <span className="env-stack"><Envelope size={52} /><b className="env-count">{count}</b></span>
        <div>
          <div className="who">{count} {plural(count, 'nový vzkaz', 'nové vzkazy', 'nových vzkazů', 'new message', 'new messages')} {t('od:', 'from:')} {partner}</div>
          <div className="small muted">{t('Klepni a otevři všechny', 'Tap to open them all')}</div>
        </div>
      </button>
    </div>
  );
}

export function Photo({ pairKey, photo, onOpen }: { pairKey: CryptoKey; photo: PhotoRef; onOpen: (url: string) => void }) {
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
export function StickerImg({ id, size, onMissing, plain }: { id: string; size: number; onMissing?: () => void; plain?: boolean }) {
  const [broken, setBroken] = useState(false);
  const n = pikantNumber(id);
  const edit = useRoomLegend()[n ?? 0];
  // vlastní ikona z Legendy místnosti: emoji nebo jiná samolepka (číslo zůstává)
  if (n && !plain && edit?.emoji) {
    return (
      <span className="sticker-num" style={{ width: size, height: size }}>
        <span className="sticker-fallback" style={{ fontSize: size * 0.62, width: size, height: size }}>{edit.emoji}</span>
        <b className="num-badge" style={{ fontSize: Math.max(12, size * 0.15) }}>{n}</b>
      </span>
    );
  }
  if (n && !plain && edit?.sticker && STICKERS.has(edit.sticker)) {
    return (
      <span className="sticker-num" style={{ width: size, height: size }}>
        <StickerImg id={edit.sticker} size={size} plain />
        <b className="num-badge" style={{ fontSize: Math.max(12, size * 0.15) }}>{n}</b>
      </span>
    );
  }
  const st = STICKERS.get(id);
  const img = broken || !st
    ? <span className="sticker-fallback" style={{ fontSize: size * 0.62, width: size, height: size }}>{st?.fallback ?? '✨'}</span>
    : <img className="sticker" src={stickerSrc(id)} width={size} height={size} alt={n ? `${t('Číslo', 'Number')} ${n}` : st.label} draggable={false} onError={() => { setBroken(true); onMissing?.(); }} />;
  if (!n) return img;
  return (
    <span className="sticker-num" style={{ width: size, height: size }}>
      {img}
      <b className="num-badge" style={{ fontSize: Math.max(12, size * 0.15) }}>{n}</b>
    </span>
  );
}

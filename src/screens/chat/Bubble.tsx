import { useEffect, useRef, useState } from 'react';
import { type Message } from '../../lib/backend';
import { photoUrl, type Payload, type PhotoRef } from '../../lib/payload';
import { STICKERS, pikantNumber, stickerSrc } from '../../data/stickers';
import { Envelope } from '../../components/Envelope';
import { haptic } from '../../lib/feedback';
import { when } from '../format';
import { t } from '../../lib/i18n';


export type Decoded = Message & { p: Payload | null; failed?: boolean };

export function Bubble({ m, live, mine, partner, pairKey, showTime, selected, onSelect, onOpen, onReply, onPhoto }: {
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

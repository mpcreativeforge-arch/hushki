import { useMemo, useState } from 'react';
import { buildIcons, keepFallback, pikantId, tabTitle, tabsFor } from '../../data/stickers';
import { type LegendItem } from '../../data/legend';
import { BODY_MAX, TITLE_MAX, firstGrapheme, type LegendEdit } from '../../lib/roomLegend';
import { Sheet } from '../../components/Sheet';
import { t } from '../../lib/i18n';

import { StickerImg } from './Bubble';

const EMOJI = ['❤️', '🔥', '💋', '🌹', '🍷', '🥂', '🕯️', '🛁', '🛏️', '💆', '🎀', '🖤', '😈', '😏', '🫦', '🍓', '🍫', '🎁', '🌙', '⭐', '🎲', '👑', '💌', '🔒'];

/** Úprava jednoho čísla Legendy: název, popis a ikona (emoji z klávesnice nebo samolepka z archu). */
export function LegendEditor({ item, base, edit, sex, onSave, onClose }: {
  item: LegendItem; base: LegendItem; edit?: LegendEdit; sex: 'muz' | 'zena';
  onSave: (e: LegendEdit | null) => Promise<void>; onClose: () => void;
}) {
  const [title, setTitle] = useState(edit?.title ?? item.title);
  const [body, setBody] = useState(edit?.body ?? item.body);
  const [icon, setIcon] = useState<{ emoji?: string; sticker?: string }>({ emoji: edit?.emoji, sticker: edit?.sticker });
  const [mode, setMode] = useState<'emoji' | 'sticker'>(edit?.sticker ? 'sticker' : 'emoji');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // druhá sada samolepek zatím nemá obrázky, takové se v nabídce nezobrazí
  const [missing, setMissing] = useState<Set<string>>(() => new Set());
  // nahoře ikony pro vlastní přání: každý vidí jen svou sadu (HE / SHE), partner ji nezná
  const tabs = useMemo(() => [
    { id: 'build', title: t('Ikony pro vlastní přání', 'Icons for your own wish'), stickers: buildIcons(sex) },
    ...tabsFor(sex).filter((x) => x.id !== 'pikant').map((x) => ({ ...x, title: tabTitle(x.id) })),
  ], [sex]);

  const save = async (reset?: boolean) => {
    setBusy(true); setError('');
    const next: LegendEdit = {
      title: title.trim() && title.trim() !== base.title ? title.trim() : undefined,
      body: body.trim() && body.trim() !== base.body ? body.trim() : undefined,
      emoji: icon.emoji, sticker: icon.emoji ? undefined : icon.sticker,
    };
    const empty = !next.title && !next.body && !next.emoji && !next.sticker;
    try { await onSave(reset || empty ? null : next); }
    catch { setError(t('Uložení se nepovedlo. Zkontroluj připojení.', 'Saving failed. Check your connection.')); setBusy(false); }
  };
  const pickEmoji = (e: string) => { setIcon({ emoji: e }); setTyped(''); };

  return (
    <Sheet onClose={onClose}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <button className="btn ghost small" onClick={onClose}>← {t('Zpět do Legendy', 'Back to the Legend')}</button>
      </div>
      <div className="row" style={{ gap: 12, marginBottom: 10 }}>
        <div className="legend-edit-preview">
          {icon.emoji ? <span className="sticker-num" style={{ width: 72, height: 72 }}><span className="sticker-fallback" style={{ fontSize: 44, width: 72, height: 72 }}>{icon.emoji}</span><b className="num-badge">{item.n}</b></span>
            : icon.sticker ? <span className="sticker-num" style={{ width: 72, height: 72 }}><StickerImg id={icon.sticker} size={72} plain /><b className="num-badge">{item.n}</b></span>
              : <StickerImg id={pikantId(item.n)} size={72} plain />}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>{t('Upravit číslo', 'Edit number')} {item.n}</h2>
          <p className="small muted" style={{ margin: '2px 0 0' }}>{t('Úpravy uvidíte oba. Popis zůstane zamčený heslem jako dosud.', 'You will both see the changes. The description stays locked with the password as before.')}</p>
        </div>
      </div>

      <label className="field"><span>{t('Název', 'Title')}</span>
        <input className="input" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field" style={{ marginTop: 10 }}><span>{t('Popis', 'Description')}</span>
        <textarea className="textarea" style={{ minHeight: 110 }} value={body} maxLength={BODY_MAX} onChange={(e) => setBody(e.target.value)} />
      </label>
      <div className="small muted" style={{ textAlign: 'right' }}>{body.length} / {BODY_MAX}</div>

      <div className="field" style={{ marginTop: 6 }}>
        <span>{t('Ikona', 'Icon')}</span>
        <div className="chips" role="tablist">
          <button role="tab" aria-selected={mode === 'emoji'} className={'chip' + (mode === 'emoji' ? ' on' : '')} onClick={() => setMode('emoji')}>😊 Emoji</button>
          <button role="tab" aria-selected={mode === 'sticker'} className={'chip' + (mode === 'sticker' ? ' on' : '')} onClick={() => setMode('sticker')}>🐾 {t('Samolepka', 'Sticker')}</button>
          {(icon.emoji || icon.sticker) && <button className="chip" onClick={() => setIcon({})}>↺ {t('Původní', 'Original')}</button>}
        </div>
      </div>
      {mode === 'emoji' ? (
        <>
          <input className="input emoji-input" value={typed} inputMode="text" aria-label={t('Napiš emoji z klávesnice', 'Type an emoji from your keyboard')}
            placeholder={t('Napiš emoji z klávesnice…', 'Type an emoji from your keyboard…')}
            onChange={(e) => { setTyped(e.target.value); const g = firstGrapheme(e.target.value); if (g && /\p{Extended_Pictographic}/u.test(g)) pickEmoji(g); }} />
          <div className="emoji-grid">
            {EMOJI.map((e) => <button key={e} className={'emoji-btn' + (icon.emoji === e ? ' on' : '')} aria-label={e} onClick={() => pickEmoji(e)}>{e}</button>)}
          </div>
        </>
      ) : (
        <div className="legend-stickers">
          {tabs.map((tab) => (
            <div key={tab.id}>
              <div className="small muted" style={{ margin: '8px 0 4px' }}>{tab.title}</div>
              <div className="sticker-mini-grid">
                {tab.stickers.filter((st) => !missing.has(st.id)).map((st) => (
                  <button key={st.id} className={'sticker-btn' + (icon.sticker === st.id && !icon.emoji ? ' on' : '')} aria-label={st.label} onClick={() => setIcon({ sticker: st.id })}>
                    <StickerImg id={st.id} size={48} plain onMissing={keepFallback(st.id) ? undefined : () => setMissing((m) => new Set(m).add(st.id))} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="error small">{error}</p>}
      <div className="stack" style={{ marginTop: 14 }}>
        <button className="btn primary" disabled={busy || !title.trim() || !body.trim()} onClick={() => save()}>{busy ? <span className="spinner" /> : t('Uložit pro oba', 'Save for both of us')}</button>
        <button className="btn ghost small" disabled={busy} onClick={() => save(true)}>{t('Vrátit původní text i ikonu', 'Restore the original text and icon')}</button>
      </div>
    </Sheet>
  );
}

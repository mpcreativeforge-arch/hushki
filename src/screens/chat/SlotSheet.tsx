import { useState } from 'react';
import { type User } from '../../lib/backend';
import { FREE_SLOTS, slotIndex, slotTexts } from '../../data/stickers';
import { Sheet } from '../../components/Sheet';
import { loadSlots, saveSlots } from '../../lib/slots';
import { t } from '../../lib/i18n';


const SLOT_MAX = 120;
import { StickerImg } from './Bubble';

export function SlotSheet({ user, id, busy, onSend, onClose }: { user: User; id: string; busy: boolean; onSend: (text: string) => void; onClose: () => void }) {
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

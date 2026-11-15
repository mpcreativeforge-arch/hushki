import { useState } from 'react';
import { type User } from '../../lib/backend';
import { FREE_SLOTS, SLOT_ICONS, slotIndex, slotTexts } from '../../data/stickers';
import { stickerSex } from '../../lib/style';
import { Sheet } from '../../components/Sheet';
import { loadSlots, saveSlots } from '../../lib/slots';
import { t } from '../../lib/i18n';

import { StickerImg } from './Bubble';

const SLOT_MAX = 120;

export function SlotSheet({ user, id: start, busy, onSend, onClose }: { user: User; id: string; busy: boolean; onSend: (id: string, text: string) => void; onClose: () => void }) {
  const [id, setId] = useState(start);
  const idx = slotIndex(id);
  const icons = SLOT_ICONS[stickerSex(user.id, user.gender)];
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
      <p className="small muted" style={{ margin: '0 0 8px' }}>{t('Vyber ikonu a text, který přijde pod ní.', 'Pick an icon and the text that goes under it.')}</p>
      <div className="row slot-icons" role="radiogroup" aria-label={t('Ikona', 'Icon')} style={{ marginBottom: 10 }}>
        {icons.map((ic) => (
          <button key={ic} role="radio" aria-checked={ic === id} className={'slot-icon' + (ic === id ? ' on' : '')} onClick={() => setId(ic)}>
            <StickerImg id={ic} size={56} />
          </button>
        ))}
      </div>
      {own && (
        <button className="idea mine" disabled={busy} onClick={() => onSend(id, own)}>
          <b>{t('Můj text', 'My text')}</b><span>{own}</span>
        </button>
      )}
      {texts.map((txt) => (
        <button key={txt} className="idea" disabled={busy} onClick={() => onSend(id, txt)}><span>{txt}</span></button>
      ))}
      <button className="chip add" style={{ marginTop: 8 }} onClick={() => setEdit(own)}>{own ? '✎ ' + t('Upravit můj text', 'Edit my text') : '+ ' + t('Vlastní text', 'Own text')}</button>
    </Sheet>
  );
}

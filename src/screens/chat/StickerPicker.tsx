import { useMemo, useState } from 'react';
import { type User } from '../../lib/backend';
import { pikantNumber, slotIndex, tabTitle, tabsFor, type TabId } from '../../data/stickers';
import { t } from '../../lib/i18n';

import { StickerImg } from './Bubble';

export function StickerPicker({ user, disabled, onPick, onDice, onLegend }: { user: User; disabled: boolean; onPick: (id: string) => void; onDice: () => void; onLegend: () => void }) {
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

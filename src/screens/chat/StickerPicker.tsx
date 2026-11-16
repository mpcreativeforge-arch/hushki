import { useMemo, useState } from 'react';
import { type User } from '../../lib/backend';
import { STICKERS, pikantNumber, tabTitle, tabsFor, type TabId } from '../../data/stickers';
import { useStickerSex } from '../../lib/style';
import { t } from '../../lib/i18n';

import { StickerImg } from './Bubble';

type Tab = TabId | 'recent';

export function StickerPicker({ user, recent, disabled, onPick, onDice, onLegend, lockedCount = 0 }: {
  user: User; recent: string[]; disabled: boolean; onPick: (id: string) => void; onDice: () => void; onLegend: () => void; lockedCount?: number;
}) {
  const sex = useStickerSex(user.id, user.gender);
  const tabs = useMemo(() => tabsFor(sex === 'zena' ? 'zena' : 'muz'), [sex]);
  const [tab, setTab] = useState<Tab>(() => { try { return (sessionStorage.getItem('hushki.tab') as Tab) || 'pokec'; } catch { return 'pokec'; } });
  // samolepky druhé sady, ke kterým zatím chybí obrázek, se v nabídce nezobrazí
  const [missing, setMissing] = useState<Set<string>>(() => new Set());
  const hide = (id: string) => setMissing((m) => new Set(m).add(id));
  const recentList = recent.filter((id) => STICKERS.has(id) && !missing.has(id));
  const cur: Tab = tab === 'recent' && !recentList.length ? 'pokec' : (tab === 'recent' || tabs.some((x) => x.id === tab) ? tab : 'pokec');
  const curTab = tabs.find((x) => x.id === cur);
  const choose = (id: Tab) => { setTab(id); try { sessionStorage.setItem('hushki.tab', id); } catch { /* */ } };
  const list = cur === 'recent' ? recentList : (curTab?.stickers.map((s) => s.id) ?? []).filter((id) => !missing.has(id));
  return (
    <div className={disabled ? 'picker-off' : ''}>
      <div className="picker-tabs" role="tablist">
        <button className="chip legend-chip" aria-label={t('Legenda', 'Legend') + (lockedCount ? ` (${lockedCount} ${t('zamčeno', 'locked')})` : '')} onClick={onLegend}>
          📖{lockedCount > 0 && <b className="icon-badge" aria-hidden>{lockedCount}</b>}
        </button>
        {recentList.length > 0 && (
          <button role="tab" aria-selected={cur === 'recent'} aria-label={t('Naposledy použité', 'Recently used')} className={'chip' + (cur === 'recent' ? ' on' : '')} onClick={() => choose('recent')}>🕘</button>
        )}
        {tabs.map((x) => (
          <button key={x.id} role="tab" aria-selected={cur === x.id} className={'chip' + (cur === x.id ? ' on' : '')} onClick={() => choose(x.id)}>
            {tabTitle(x.id)}{x.id === 'pikant' ? ' 🌶' : ''}
          </button>
        ))}
      </div>
      <div className="picker-grid">
        {cur === 'pikant' ? (
          <>
            <button className="sticker-btn dice-btn" aria-label={t('Hod kostkou', 'Roll the dice')} disabled={disabled} onClick={onDice}>
              <span className="dice">🎲</span><span className="small">{t('Kostka', 'Dice')}</span>
            </button>
            <button className="sticker-btn dice-btn" aria-label={t('Otevřít Legendu', 'Open the Legend')} onClick={onLegend}>
              <span className="dice">📖</span><span className="small">{t('Legenda', 'Legend')}</span>
            </button>
          </>
        ) : null}
        {list.map((id) => (
          <button key={id} className="sticker-btn" aria-label={STICKERS.get(id)?.label ?? id} disabled={disabled} onClick={() => onPick(id)}>
            <StickerImg id={id} size={64} onMissing={pikantNumber(id) ? undefined : () => hide(id)} />
          </button>
        ))}
      </div>
    </div>
  );
}

import type { Gender } from '../lib/backend';
import { t } from '../lib/i18n';

/** Identita je jen On / Ona (anglicky HE / SHE). */
const OPTIONS = (): { id: Gender; label: string; sub: string }[] => [
  { id: 'muz', label: t('On', 'HE'), sub: t('muž', 'him') },
  { id: 'zena', label: t('Ona', 'SHE'), sub: t('žena', 'her') },
];

export function GenderPicker({ value, onChange }: { value: Gender | null; onChange: (g: Gender) => void }) {
  return (
    <div className="he-she" role="radiogroup" aria-label={t('Jsem', 'I am')}>
      {OPTIONS().map((o) => (
        <button type="button" key={o.id} role="radio" aria-checked={value === o.id} aria-label={o.label}
          className={'he-she-btn' + (value === o.id ? ' on' : '')} onClick={() => onChange(o.id)}>
          <b>{o.label}</b><span className="small muted">{o.sub}</span>
        </button>
      ))}
    </div>
  );
}

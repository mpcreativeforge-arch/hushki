import type { Gender } from '../lib/backend';
import { t } from '../lib/i18n';

const OPTIONS = (): { id: Gender; label: string }[] => [
  { id: 'muz', label: t('Muž', 'Man') },
  { id: 'zena', label: t('Žena', 'Woman') },
  { id: 'neuvedeno', label: t('Nechci uvést', 'Prefer not to say') },
];

export function GenderPicker({ value, onChange }: { value: Gender | null; onChange: (g: Gender) => void }) {
  return (
    <div className="field">
      <span>{t('Jsem', 'I am')}</span>
      <div className="chips" role="radiogroup">
        {OPTIONS().map((o) => (
          <button type="button" key={o.id} role="radio" aria-checked={value === o.id}
            className={'chip' + (value === o.id ? ' on' : '')} onClick={() => onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

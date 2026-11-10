import type { Gender } from '../lib/backend';

const OPTIONS: { id: Gender; label: string }[] = [
  { id: 'muz', label: 'Muž' },
  { id: 'zena', label: 'Žena' },
  { id: 'neuvedeno', label: 'Nechci uvést' },
];

export function GenderPicker({ value, onChange }: { value: Gender | null; onChange: (g: Gender) => void }) {
  return (
    <div className="field">
      <span>Jsem</span>
      <div className="chips" role="radiogroup">
        {OPTIONS.map((o) => (
          <button type="button" key={o.id} role="radio" aria-checked={value === o.id}
            className={'chip' + (value === o.id ? ' on' : '')} onClick={() => onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

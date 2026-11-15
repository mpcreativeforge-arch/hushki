import { useState } from 'react';
import { backend, type Gender, type User } from '../lib/backend';
import { GenderPicker } from './GenderPicker';
import { t } from '../lib/i18n';

/** Jméno a pohlaví se ptáme až po spárování, aby byla registrace co nejkratší. */
export function ProfileStep({ user, onDone }: { user: User; onDone: (name: string, gender: Gender) => void }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender) return setError(t('Vyber prosím, kdo jsi.', 'Please choose who you are.'));
    setBusy(true); setError('');
    try { await backend.updateProfile(name.trim(), gender); onDone(name.trim(), gender); }
    catch { setError(t('Uložení se nepovedlo. Zkus to prosím znovu.', 'Saving failed. Please try again.')); setBusy(false); }
  };
  return (
    <div className="sheet-backdrop profile-step">
      <form className="sheet stack" onSubmit={save} aria-label={t('Tvůj profil', 'Your profile')}>
        <h2 style={{ margin: 0 }}>{t('Ještě maličkost', 'One more thing')}</h2>
        <p className="small muted" style={{ margin: 0 }}>{t('Jak ti má partner/ka říkat? Podle toho, kdo jsi, ti taky vybereme sadu samolepek (změníš ji v Nastavení).', 'What should your partner call you? Who you are also picks your sticker set (you can change it in Settings).')}</p>
        <label className="field"><span>{t('Jak ti má partner/ka říkat', 'What should your partner call you')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="nickname" autoFocus={!!user} />
        </label>
        <GenderPicker value={gender} onChange={setGender} />
        {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}
        <button className="btn primary" disabled={busy || !name.trim()}>{busy ? <span className="spinner" /> : t('Hotovo', 'Done')}</button>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { backend, type Gender } from '../lib/backend';
import { GenderPicker } from './GenderPicker';
import { heShe } from '../data/stickers';
import { t } from '../lib/i18n';

/** Jediná volba identity: HE nebo SHE. Je trvalá a řídí rozhraní i sadu ikon. */
export function ProfileStep({ onDone }: { onDone: (name: string, gender: Gender) => void }) {
  const [gender, setGender] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender) return setError(t('Vyber prosím HE nebo SHE.', 'Please choose HE or SHE.'));
    setBusy(true); setError('');
    const name = heShe(gender);
    try { await backend.updateProfile(name, gender); onDone(name, gender); }
    catch { setError(t('Uložení se nepovedlo. Zkus to prosím znovu.', 'Saving failed. Please try again.')); setBusy(false); }
  };
  return (
    <div className="sheet-backdrop profile-step">
      <form className="sheet stack" onSubmit={save} aria-label={t('Kdo jsi', 'Who you are')}>
        <h2 style={{ margin: 0 }}>{t('Kdo jsi?', 'Who are you?')}</h2>
        <p className="small muted" style={{ margin: 0 }}>{t('Volba je trvalá. Podle ní dostaneš svou sadu ikon a partner/ka uvidí u tvých vzkazů HE nebo SHE.', 'This choice is permanent. It sets your icon set, and your partner sees HE or SHE on your messages.')}</p>
        <GenderPicker value={gender} onChange={setGender} />
        {error && <p className="error small" style={{ margin: 0 }}>{error}</p>}
        <button className="btn primary" disabled={busy || !gender}>{busy ? <span className="spinner" /> : t('Potvrdit', 'Confirm')}</button>
      </form>
    </div>
  );
}

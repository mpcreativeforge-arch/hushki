import { useState } from 'react';
import { Brand, Logo } from '../components/Logo';
import { PinPad } from '../components/PinPad';
import { t } from '../lib/i18n';

export function SetPinScreen({ length, change, onSet, onCancel }: { length: number; change?: boolean; onSet: (pin: string) => Promise<void>; onCancel?: () => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState('');

  const complete = async (pin: string) => {
    if (!first) { setFirst(pin); setError(''); return; }
    if (pin !== first) { setFirst(null); setError(t('PINy se neshodují, zkus to znovu.', 'The PINs don’t match, try again.')); return false; }
    try { await onSet(pin); } catch { setFirst(null); setError(t('Něco se nepovedlo. Zkus to znovu.', 'Something went wrong. Try again.')); return false; }
  };

  return (
    <div className="app">
      <div className="topbar">{onCancel ? <button className="btn ghost small" onClick={onCancel}>← {t('Zpět', 'Back')}</button> : <Brand />}</div>
      <h1 className="center">{first ? t('Ještě jednou', 'Once more') : change ? <>{t('Nový', 'New')} <em>PIN</em></> : <>{t('Nastav si', 'Set your')} <em>PIN</em></>}</h1>
      <p className="muted center">{length} {t('číslic. Jeden PIN odemyká všechny tvoje místnosti v tomhle telefonu.', 'digits. One PIN unlocks all your rooms on this phone.')}</p>
      {error && <p className="error center">{error}</p>}
      <PinPad key={first ? 'b' : 'a'} length={length} onComplete={complete} />
    </div>
  );
}

export function LockScreen({ length, onUnlock, onForgot }: { length: number; onUnlock: (pin: string) => Promise<boolean>; onForgot: () => void }) {
  const [tries, setTries] = useState(0);
  return (
    <div className="app">
      <div className="topbar"><Brand /></div>
      <div className="envelope-wrap" style={{ marginBottom: 4 }}><Logo size={110} /></div>
      <h1 className="center">{t('Zamčeno', 'Locked')}</h1>
      <p className="muted center">{t('Zadej svůj PIN.', 'Enter your PIN.')}</p>
      <PinPad length={length} onComplete={async (pin) => { const ok = await onUnlock(pin); if (!ok) setTries((t) => t + 1); return ok; }} />
      {tries >= 3 && (
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={onForgot}>{t('Zapomněl/a jsem PIN', 'I forgot my PIN')}</button>
      )}
    </div>
  );
}

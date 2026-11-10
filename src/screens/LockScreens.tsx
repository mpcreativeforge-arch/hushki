import { useState } from 'react';
import { Brand, Logo } from '../components/Logo';
import { PinPad } from '../components/PinPad';

export function SetPinScreen({ length, change, onSet, onCancel }: { length: number; change?: boolean; onSet: (pin: string) => Promise<void>; onCancel?: () => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState('');

  const complete = async (pin: string) => {
    if (!first) { setFirst(pin); setError(''); return; }
    if (pin !== first) { setFirst(null); setError('PINy se neshodují, zkus to znovu.'); return false; }
    try { await onSet(pin); } catch { setFirst(null); setError('Něco se nepovedlo. Zkus to znovu.'); return false; }
  };

  return (
    <div className="app">
      <div className="topbar">{onCancel ? <button className="btn ghost small" onClick={onCancel}>← Zpět</button> : <Brand />}</div>
      <h1 className="center">{first ? 'Ještě jednou' : change ? <>Nový <em>PIN</em></> : <>Nastav si <em>PIN</em></>}</h1>
      <p className="muted center">{length} číslic. Jeden PIN odemyká všechny tvoje místnosti v tomhle telefonu.</p>
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
      <h1 className="center">Zamčeno</h1>
      <p className="muted center">Zadej svůj PIN.</p>
      <PinPad length={length} onComplete={async (pin) => { const ok = await onUnlock(pin); if (!ok) setTries((t) => t + 1); return ok; }} />
      {tries >= 3 && (
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={onForgot}>Zapomněl/a jsem PIN</button>
      )}
    </div>
  );
}

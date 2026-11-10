import { useState } from 'react';
import { haptic } from '../lib/feedback';

interface Props {
  length?: number;
  /** Vrací false při špatném PINu (číselník se zatřese). */
  onComplete: (pin: string) => Promise<boolean | void> | boolean | void;
  busy?: boolean;
}

export function PinPad({ length = 4, onComplete, busy }: Props) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [working, setWorking] = useState(false);
  const locked = busy || working;

  const press = async (d: string) => {
    if (locked || pin.length >= length) return;
    haptic('tap');
    const next = pin + d;
    setPin(next);
    if (next.length < length) return;
    setWorking(true);
    const ok = await onComplete(next);
    setWorking(false);
    if (ok === false) {
      haptic('error');
      setShake(true);
      setTimeout(() => setShake(false), 450);
    }
    setPin('');
  };

  return (
    <div>
      <div className={'pin-dots' + (shake ? ' shake' : '')}>
        {Array.from({ length }, (_, i) => <div key={i} className={'pin-dot' + (i < pin.length ? ' on' : '')} />)}
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} className="key" onClick={() => press(d)}>{d}</button>
        ))}
        <div className="key blank" />
        <button className="key" onClick={() => press('0')}>0</button>
        <button className="key" aria-label="Smazat" onClick={() => !locked && setPin(pin.slice(0, -1))} style={{ fontSize: 18 }}>⌫</button>
      </div>
      <div className="center" style={{ marginTop: 18, minHeight: 22 }}>{locked && <span className="spinner" />}</div>
    </div>
  );
}

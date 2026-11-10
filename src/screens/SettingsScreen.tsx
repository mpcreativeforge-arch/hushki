import { useState } from 'react';
import { backend, type Gender, type Pair, type User } from '../lib/backend';
import { GenderPicker } from '../components/GenderPicker';
import features from '../data/features.json';
import { enablePush, pushSupported } from '../lib/push';

interface Props {
  user: User; pair: Pair; flags: Record<string, boolean>;
  onBack: () => void; onProfile: (name: string, gender: Gender) => void;
  onChangePin: () => void; onLeave: () => void; onLogout: () => void;
}

export function SettingsScreen({ user, flags, onBack, onProfile, onChangePin, onLeave, onLogout }: Props) {
  const [name, setName] = useState(user.name);
  const [gender, setGender] = useState<Gender>(user.gender);
  const [saved, setSaved] = useState(false);
  const [pushMsg, setPushMsg] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);

  const saveName = async () => {
    await backend.updateProfile(name.trim(), gender);
    onProfile(name.trim(), gender);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const push = async () => {
    const r = await enablePush().catch(() => 'denied');
    setPushMsg(r === 'ok' ? 'Upozornění jsou zapnutá.' : r === 'unsupported' ? 'Tento prohlížeč upozornění nepodporuje. Na iPhonu si nejdřív přidej Hushki na plochu.' : 'Upozornění jsou v nastavení telefonu zakázaná.');
  };

  const upcoming = features.filter((f) => !flags[f.key]);

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn ghost small" onClick={onBack}>← Zpět</button>
        <span className="brand">Nastavení</span>
      </div>

      <div className="stack">
        <label className="field"><span>Tvoje jméno pro partnera/partnerku</span>
          <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <GenderPicker value={gender} onChange={setGender} />
        <button className="btn small" onClick={saveName} disabled={!name.trim() || (name === user.name && gender === user.gender)}>{saved ? 'Uloženo' : 'Uložit'}</button>
      </div>

      <div style={{ marginTop: 26 }}>
        <div className="settings-item"><span>Účet</span><span className="small muted">{user.email}</span></div>
        {backend.mode !== 'demo' && pushSupported() && (
          <div className="settings-item"><span>Tichá upozornění</span><button className="btn small" onClick={push}>Zapnout</button></div>
        )}
        {pushMsg && <p className="small muted" style={{ marginTop: 8 }}>{pushMsg}</p>}
        <div className="settings-item"><span>Změnit PIN</span><button className="btn small" onClick={onChangePin}>Změnit</button></div>
        <p className="small muted" style={{ marginTop: 8 }}>Ke změně PINu budeš potřebovat párovací kód.</p>
      </div>

      {upcoming.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <h2>Připravujeme</h2>
          {upcoming.map((f) => (
            <div key={f.key} className="settings-item soon"><span>{f.description}</span><span className="tag">brzy</span></div>
          ))}
        </div>
      )}

      <div className="stack" style={{ marginTop: 30 }}>
        {!confirmLeave ? (
          <button className="btn ghost" onClick={() => setConfirmLeave(true)}>Zrušit spojení</button>
        ) : (
          <div className="notice stack">
            <span>Opravdu? Smažou se všechny vaše vzkazy u obou z vás.</span>
            <button className="btn" onClick={onLeave}>Ano, zrušit spojení</button>
            <button className="btn ghost" onClick={() => setConfirmLeave(false)}>Ne</button>
          </div>
        )}
        <button className="btn ghost" onClick={onLogout}>Odhlásit se</button>
      </div>
    </div>
  );
}

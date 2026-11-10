import { useState } from 'react';
import { backend, type Gender, type User } from '../lib/backend';
import { GenderPicker } from '../components/GenderPicker';
import features from '../data/features.json';
import { enablePush, pushSupported } from '../lib/push';
import { feedback, getPrefs, setPrefs } from '../lib/feedback';
import { PrivacySheetScreen } from '../components/Privacy';

interface Props {
  user: User; flags: Record<string, boolean>;
  onBack: () => void; onProfile: (name: string, gender: Gender) => void;
  onChangePin: () => void; onLogout: () => void; onDeleteAccount: () => Promise<void>;
}

export function SettingsScreen({ user, flags, onBack, onProfile, onChangePin, onLogout, onDeleteAccount }: Props) {
  const [name, setName] = useState(user.name);
  const [gender, setGender] = useState<Gender>(user.gender);
  const [saved, setSaved] = useState(false);
  const [pushMsg, setPushMsg] = useState('');
  const [fx, setFx] = useState(getPrefs());
  const [privacy, setPrivacy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');
  const doDelete = async () => {
    setDeleting(true); setDeleteErr('');
    try { await onDeleteAccount(); } catch { setDeleteErr('Účet se nepodařilo smazat. Zkus to prosím znovu.'); setDeleting(false); }
  };
  const toggle = (k: 'sound' | 'haptics') => { const next = { ...fx, [k]: !fx[k] }; setFx(next); setPrefs(next); if (next[k]) feedback('receive'); };

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
        <div className="settings-item"><span>Zvuky v chatu</span>
          <button className={'chip' + (fx.sound ? ' on' : '')} onClick={() => toggle('sound')}>{fx.sound ? 'Zapnuto' : 'Vypnuto'}</button>
        </div>
        <div className="settings-item"><span>Haptická odezva</span>
          <button className={'chip' + (fx.haptics ? ' on' : '')} onClick={() => toggle('haptics')}>{fx.haptics ? 'Zapnuto' : 'Vypnuto'}</button>
        </div>
        <div className="settings-item"><span>Změnit PIN</span><button className="btn small" onClick={onChangePin}>Změnit</button></div>
        <button className="settings-item menu-link" onClick={() => setPrivacy(true)}><span>Ochrana soukromí (GDPR)</span><span aria-hidden>›</span></button>
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
        <button className="btn ghost" onClick={onLogout}>Odhlásit se</button>
        {!confirmDelete ? (
          <button className="link-btn" onClick={() => setConfirmDelete(true)}>Smazat účet</button>
        ) : (
          <div className="notice stack">
            <span>Smažeme tvůj účet, všechny místnosti, vzkazy, fotky i vlastní nápady. U partnerů zmizí i vaše společné místnosti. Nejde to vrátit.</span>
            {deleteErr && <span className="error small">{deleteErr}</span>}
            <button className="btn" disabled={deleting} onClick={doDelete}>{deleting ? <span className="spinner" /> : 'Ano, smazat vše'}</button>
            <button className="btn ghost" onClick={() => setConfirmDelete(false)}>Ne</button>
          </div>
        )}
      </div>
      {privacy && <PrivacySheetScreen onBack={() => setPrivacy(false)} />}
    </div>
  );
}

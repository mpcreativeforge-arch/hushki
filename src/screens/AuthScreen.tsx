import { useState } from 'react';
import { Wordmark } from '../components/Logo';
import { backend, BackendError, type Gender } from '../lib/backend';
import { GenderPicker } from '../components/GenderPicker';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !gender) { setError('Vyber prosím, kdo jsi.'); return; }
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const { needsConfirm } = await backend.signUp(email.trim(), password, name.trim(), gender!);
        if (needsConfirm) setInfo('Poslali jsme ti e-mail. Potvrď ho a pak se tady přihlas.');
      } else {
        await backend.signIn(email.trim(), password);
      }
    } catch (err) {
      const m = err instanceof BackendError ? err.message : '';
      setError(/invalid login/i.test(m) ? 'Špatný e-mail nebo heslo.' : /registered/i.test(m) ? 'Tento e-mail už má účet, přihlas se.' : 'Něco se nepovedlo. Zkus to prosím znovu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <div className="envelope-wrap" style={{ marginTop: 14 }}><Wordmark height={96} /></div>
      <h1>Něco jen <em>pro vás dva</em>.</h1>
      <p className="muted">Vzkazy, které nikdo jiný neuvidí. Druhému z vás přijde jen nenápadné upozornění a vzkaz si otevře až po zadání svého PINu.</p>

      <form className="stack" onSubmit={submit} style={{ marginTop: 10 }}>
        {mode === 'signup' && (
          <label className="field"><span>Jak ti má partner/ka říkat</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="nickname" />
          </label>
        )}
        {mode === 'signup' && <GenderPicker value={gender} onChange={setGender} />}
        <label className="field"><span>E-mail</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field"><span>Heslo</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
        </label>
        {error && <p className="error">{error}</p>}
        {info && <p className="notice">{info}</p>}
        <button className="btn primary" disabled={busy}>{busy ? <span className="spinner" /> : mode === 'signup' ? 'Vytvořit účet' : 'Přihlásit se'}</button>
        <button type="button" className="btn ghost" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>
          {mode === 'signup' ? 'Už mám účet' : 'Ještě nemám účet'}
        </button>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { Wordmark } from '../components/Logo';
import { PrivacySheetScreen } from '../components/Privacy';
import { backend, BackendError, type Gender } from '../lib/backend';
import { GenderPicker } from '../components/GenderPicker';
import { LangSwitch } from '../components/LangSwitch';
import { t, useLang } from '../lib/i18n';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [privacy, setPrivacy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  useLang();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !gender) { setError(t('Vyber prosím, kdo jsi.', 'Please choose who you are.')); return; }
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const { needsConfirm } = await backend.signUp(email.trim(), password, name.trim(), gender!);
        if (needsConfirm) setInfo(t('Poslali jsme ti e-mail. Potvrď ho a pak se tady přihlas.', 'We sent you an e-mail. Confirm it and then sign in here.'));
      } else {
        await backend.signIn(email.trim(), password);
      }
    } catch (err) {
      const m = err instanceof BackendError ? err.message : '';
      setError(/invalid login/i.test(m) ? t('Špatný e-mail nebo heslo.', 'Wrong e-mail or password.') : /registered/i.test(m) ? t('Tento e-mail už má účet, přihlas se.', 'This e-mail already has an account, please sign in.') : t('Něco se nepovedlo. Zkus to prosím znovu.', 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <div className="row" style={{ justifyContent: 'flex-end' }}><LangSwitch /></div>
      <div className="envelope-wrap" style={{ marginTop: 4 }}><Wordmark height={64} /></div>
      <h1 className="center">{t('Něco jen ', 'Something just ')}<em>{t('pro vás dva', 'for the two of you')}</em>.</h1>
      <p className="muted center">{t('Vzkazy, které nikdo jiný neuvidí. Druhému z vás přijde jen nenápadné upozornění a vzkaz si otevře až po zadání svého PINu.', 'Messages nobody else will see. Your partner gets only a discreet notification and opens the message with their own PIN.')}</p>

      <form className="stack" onSubmit={submit} style={{ marginTop: 10 }}>
        {mode === 'signup' && (
          <label className="field"><span>{t('Jak ti má partner/ka říkat', 'What should your partner call you')}</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="nickname" />
          </label>
        )}
        {mode === 'signup' && <GenderPicker value={gender} onChange={setGender} />}
        <label className="field"><span>E-mail</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field"><span>{t('Heslo', 'Password')}</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
        </label>
        {error && <p className="error">{error}</p>}
        {info && <p className="notice">{info}</p>}
        <button className="btn primary" disabled={busy}>{busy ? <span className="spinner" /> : mode === 'signup' ? t('Vytvořit účet', 'Create account') : t('Přihlásit se', 'Sign in')}</button>
        <button type="button" className="btn ghost" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>
          {mode === 'signup' ? t('Už mám účet', 'I already have an account') : t('Ještě nemám účet', 'I don’t have an account yet')}
        </button>
      </form>
      <p className="center" style={{ marginTop: 14 }}>
        <button type="button" className="link-btn" onClick={() => setPrivacy(true)}>{t('Zásady ochrany osobních údajů', 'Privacy policy')}</button>
      </p>
      {privacy && <PrivacySheetScreen onBack={() => setPrivacy(false)} />}
    </div>
  );
}

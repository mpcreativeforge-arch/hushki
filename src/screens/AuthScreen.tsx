import { useState } from 'react';
import { Wordmark } from '../components/Logo';
import { PrivacySheetScreen } from '../components/Privacy';
import { backend, BackendError } from '../lib/backend';
import { Intro, introSeen } from '../components/Intro';
import { LangSwitch } from '../components/LangSwitch';
import { t, useLang } from '../lib/i18n';

export function AuthScreen({ invited }: { invited?: boolean }) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [privacy, setPrivacy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [intro, setIntro] = useState(() => !invited && !introSeen());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  useLang();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const { needsConfirm } = await backend.signUp(email.trim(), password, '', 'neuvedeno');
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

  if (intro) return <Intro onDone={() => setIntro(false)} />;

  return (
    <div className="app">
      <div className="row" style={{ justifyContent: 'flex-end' }}><LangSwitch /></div>
      <div className="envelope-wrap" style={{ marginTop: 4 }}><Wordmark height={64} /></div>
      <h1 className="center">{t('Něco jen ', 'Something just ')}<em>{t('pro vás dva', 'for the two of you')}</em>.</h1>
      <p className="muted center">{t('Vzkazy, které nikdo jiný neuvidí. Druhému z vás přijde jen nenápadné upozornění a vzkaz si otevře až po zadání svého PINu.', 'Messages nobody else will see. Your partner gets only a discreet notification and opens the message with their own PIN.')}</p>

      {invited && <div className="notice center" style={{ marginTop: 8 }}>💌 {t('Partner tě zve do Hushki. Vytvoř si účet a hned budete spojení.', 'Your partner invited you to Hushki. Create an account and you’ll be connected right away.')}</div>}
      <form className="stack" onSubmit={submit} style={{ marginTop: 10 }}>
        <label className="field"><span>E-mail</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field"><span>{t('Heslo', 'Password')}</span>
          <span className="pw-wrap">
            <input className="input" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            <button type="button" className="pw-eye" aria-label={showPw ? t('Skrýt heslo', 'Hide password') : t('Zobrazit heslo', 'Show password')} aria-pressed={showPw} onClick={() => setShowPw((v) => !v)}>
              {showPw
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.4 10.4 0 0112 5c5.5 0 9 5.5 9 7 0 .7-.8 2.2-2.2 3.6M6.6 6.6C4.3 8 3 10.9 3 12c0 1.5 3.5 7 9 7 1.8 0 3.4-.6 4.7-1.4" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12c0-1.5 3.5-7 9-7s9 5.5 9 7-3.5 7-9 7-9-5.5-9-7z" /><circle cx="12" cy="12" r="3" /></svg>}
            </button>
          </span>
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

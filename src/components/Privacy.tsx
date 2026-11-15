import { useState } from 'react';
import { privacySections, privacySummary, privacyUpdated } from '../data/privacy';
import { t } from '../lib/i18n';

export function PrivacyText() {
  return (
    <div className="privacy">
      <div className="notice stack" style={{ gap: 8 }}>
        {privacySummary().map((t) => <span key={t}>✓ {t}</span>)}
      </div>
      {privacySections().map((s) => (
        <section key={s.title}>
          <h3>{s.title}</h3>
          {s.body.map((p, i) => <p key={i}>{p}</p>)}
        </section>
      ))}
      <p className="small muted">{t('Platné od', 'Effective from')} {privacyUpdated()}.</p>
    </div>
  );
}

/** Okno se souhlasem po registraci (a po změně zásad). */
export function PrivacyConsent({ onAccept, onDecline, updated }: { onAccept: () => Promise<void>; onDecline: () => void; updated?: boolean }) {
  const [adult, setAdult] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const accept = async () => {
    setBusy(true); setErr('');
    try { await onAccept(); } catch { setErr(t('Uložení se nepovedlo. Zkontroluj připojení.', 'Saving failed. Check your connection.')); setBusy(false); }
  };
  return (
    <div className="consent-backdrop">
      <div className="consent">
        <h2 style={{ margin: '0 0 4px' }}>{updated ? t('Aktualizovali jsme zásady', 'We have updated our policy') : t('Tvoje soukromí', 'Your privacy')}</h2>
        <p className="small muted" style={{ marginTop: 0 }}>{t('Než začneš, přečti si prosím, jak s údaji zacházíme. Zásady najdeš kdykoli v Nastavení.', 'Before you start, please read how we handle your data. You can find the policy in Settings at any time.')}</p>
        <div className="consent-scroll"><PrivacyText /></div>
        <label className="check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> <span>{t('Je mi 18 let nebo víc.', 'I am 18 or older.')}</span></label>
        <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>{t('Souhlasím se zásadami ochrany osobních údajů a se zpracováním obsahu vzkazů, který může být intimní povahy.', 'I agree to the privacy policy and to the processing of message content, which may be of an intimate nature.')}</span></label>
        {err && <p className="error small">{err}</p>}
        <button className="btn primary" disabled={!adult || !agree || busy} onClick={accept}>{busy ? <span className="spinner" /> : t('Souhlasím a pokračuji', 'I agree and continue')}</button>
        <button className="btn ghost small" style={{ marginTop: 6 }} onClick={onDecline}>{t('Nesouhlasím, odhlásit', 'I disagree, sign out')}</button>
      </div>
    </div>
  );
}

/** Zásady k přečtení (z přihlášení nebo nastavení). */
export function PrivacySheetScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="consent-backdrop">
      <div className="consent">
        <div className="row between" style={{ marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>{t('Ochrana soukromí', 'Privacy')}</h2>
          <button className="btn ghost small" onClick={onBack}>{t('Zavřít', 'Close')}</button>
        </div>
        <div className="consent-scroll"><PrivacyText /></div>
      </div>
    </div>
  );
}

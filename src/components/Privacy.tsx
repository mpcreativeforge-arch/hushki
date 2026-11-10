import { useState } from 'react';
import { PRIVACY_SECTIONS, PRIVACY_SUMMARY, PRIVACY_UPDATED } from '../data/privacy';

export function PrivacyText() {
  return (
    <div className="privacy">
      <div className="notice stack" style={{ gap: 8 }}>
        {PRIVACY_SUMMARY.map((t) => <span key={t}>✓ {t}</span>)}
      </div>
      {PRIVACY_SECTIONS.map((s) => (
        <section key={s.title}>
          <h3>{s.title}</h3>
          {s.body.map((p, i) => <p key={i}>{p}</p>)}
        </section>
      ))}
      <p className="small muted">Platné od {PRIVACY_UPDATED}.</p>
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
    try { await onAccept(); } catch { setErr('Uložení se nepovedlo. Zkontroluj připojení.'); setBusy(false); }
  };
  return (
    <div className="consent-backdrop">
      <div className="consent">
        <h2 style={{ margin: '0 0 4px' }}>{updated ? 'Aktualizovali jsme zásady' : 'Tvoje soukromí'}</h2>
        <p className="small muted" style={{ marginTop: 0 }}>Než začneš, přečti si prosím, jak s údaji zacházíme. Zásady najdeš kdykoli v Nastavení.</p>
        <div className="consent-scroll"><PrivacyText /></div>
        <label className="check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> <span>Je mi 18 let nebo víc.</span></label>
        <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>Souhlasím se zásadami ochrany osobních údajů a se zpracováním obsahu vzkazů, který může být intimní povahy.</span></label>
        {err && <p className="error small">{err}</p>}
        <button className="btn primary" disabled={!adult || !agree || busy} onClick={accept}>{busy ? <span className="spinner" /> : 'Souhlasím a pokračuji'}</button>
        <button className="btn ghost small" style={{ marginTop: 6 }} onClick={onDecline}>Nesouhlasím, odhlásit</button>
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
          <h2 style={{ margin: 0 }}>Ochrana soukromí</h2>
          <button className="btn ghost small" onClick={onBack}>Zavřít</button>
        </div>
        <div className="consent-scroll"><PrivacyText /></div>
      </div>
    </div>
  );
}

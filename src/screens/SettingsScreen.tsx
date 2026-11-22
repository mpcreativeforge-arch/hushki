import { useEffect, useState } from 'react';
import { backend, type User } from '../lib/backend';
import { heShe } from '../data/stickers';
import features from '../data/features.json';
import { disablePush, enablePush, pushEnabled, pushSupported } from '../lib/push';
import { feedback, getPrefs, setPrefs } from '../lib/feedback';
import { PrivacySheetScreen } from '../components/Privacy';
import { HelpSheet } from '../components/Help';
import { AboutSheet } from '../components/About';
import { LangSwitch } from '../components/LangSwitch';
import { INFO_EMAIL, SUPPORT_EMAIL } from '../data/privacy';
import { exportMyData } from '../lib/export';
import { isPremium } from '../lib/premium';
import { beginPayment } from '../lib/session';
import { PremiumSheet } from '../components/PremiumSheet';
import { isEn, t } from '../lib/i18n';

interface Props {
  user: User; flags: Record<string, boolean>;
  onBack: () => void; onUser: (u: User) => void;
  onChangePin: () => void; onLogout: () => void; onDeleteAccount: () => Promise<void>;
  onPremiumChange?: () => void;
}

export function SettingsScreen({ user, flags, onBack, onUser, onChangePin, onLogout, onDeleteAccount, onPremiumChange }: Props) {
  const [sparkMsg, setSparkMsg] = useState('');
  const [pushMsg, setPushMsg] = useState('');
  const [pushOn, setPushOn] = useState(false);
  useEffect(() => { if (backend.mode !== 'demo') pushEnabled().then(setPushOn).catch(() => undefined); }, []);
  const [fx, setFx] = useState(getPrefs());
  const [privacy, setPrivacy] = useState(false);
  const [help, setHelp] = useState(false);
  const [about, setAbout] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [premiumOffer, setPremiumOffer] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [premiumMsg, setPremiumMsg] = useState('');
  const premium = isPremium(user);
  const openPortal = async () => {
    setPortalBusy(true); setPremiumMsg('');
    try {
      const url = await backend.premiumPortal();
      if (url) { beginPayment(); location.href = url; } else { onPremiumChange?.(); setPortalBusy(false); }
    } catch { setPremiumMsg(t('Správu předplatného se nepodařilo otevřít. Zkus to prosím za chvíli.', 'Could not open subscription management. Please try again shortly.')); setPortalBusy(false); }
  };
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');
  const doDelete = async () => {
    setDeleting(true); setDeleteErr('');
    try { await onDeleteAccount(); } catch { setDeleteErr(t('Účet se nepodařilo smazat. Zkus to prosím znovu.', 'The account could not be deleted. Please try again.')); setDeleting(false); }
  };
  const toggle = (k: 'sound' | 'haptics') => { const next = { ...fx, [k]: !fx[k] }; setFx(next); setPrefs(next); if (next[k]) feedback('receive'); };

  const spark = user.spark !== false;
  const toggleSpark = async () => {
    setSparkMsg('');
    try { await backend.setSpark(!spark); onUser({ ...user, spark: !spark }); }
    catch { setSparkMsg(t('Změna se nepovedla. Zkontroluj připojení.', 'Could not save. Check your connection.')); }
  };

  const push = async () => {
    setPushMsg(t('Zapínám…', 'Turning on…'));
    const r = await enablePush().catch(() => 'error' as const);
    setPushOn(r === 'ok');
    setPushMsg(r === 'ok' ? t('Upozornění jsou zapnutá.', 'Notifications are on.')
      : r === 'unsupported' ? t('Tento prohlížeč upozornění nepodporuje. Na iPhonu si nejdřív přidej Hushki na plochu.', 'This browser does not support notifications. On iPhone, add Hushki to your home screen first.')
        : r === 'denied' ? t('Prohlížeč upozornění zablokoval. Klepni na ikonku vlevo od adresy hushki.cz (nebo ⋮ → ⓘ) → Oprávnění → Oznámení → Povolit a zkus to znovu.', 'Your browser blocked notifications. Tap the icon left of the hushki.cz address (or ⋮ → ⓘ) → Permissions → Notifications → Allow, then try again.')
          : t('Prohlížeč upozornění nezapnul. Zkus to v Google Chrome.', 'The browser did not turn notifications on. Try Google Chrome.'));
  };

  const pushOff = async () => {
    try {
      await disablePush();
      setPushOn(false);
      setPushMsg(t('Upozornění jsou vypnutá.', 'Notifications are off.'));
    } catch { setPushMsg(t('Vypnutí se nepovedlo. Zkontroluj připojení.', 'Could not turn off. Check your connection.')); }
  };

  const download = async () => {
    setExporting(true); setExportMsg('');
    try { await exportMyData(user); setExportMsg(t('Soubor s tvými údaji se stahuje.', 'Your data file is downloading.')); }
    catch { setExportMsg(t('Stažení se nepovedlo. Zkontroluj připojení.', 'Download failed. Check your connection.')); }
    finally { setExporting(false); }
  };

  const upcoming = features.filter((f) => !flags[f.key]);

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn ghost small" onClick={onBack}>← {t('Zpět', 'Back')}</button>
        <span className="brand">{t('Nastavení', 'Settings')}</span>
      </div>

      <section className="settings-group">
        <h2>{t('Profil', 'Profile')}</h2>
        <div className="settings-item"><span>{t('Jsem', 'I am')}<br /><span className="small muted">{t('Volba je trvalá', 'This choice is permanent')}</span></span><b className="he-she-tag">{heShe(user.gender)}</b></div>
        <div className="settings-item"><span>✨ {t('Jiskra', 'Spark')}<br /><span className="small muted">{t('Připomínka po 3 dnech bez zprávy', 'A nudge after 3 days without a message')}</span></span>
          <button className={'chip' + (spark ? ' on' : '')} onClick={toggleSpark}>{spark ? t('Zapnuto', 'On') : t('Vypnuto', 'Off')}</button>
        </div>
        {sparkMsg && <p className="small muted" style={{ marginTop: 8 }}>{sparkMsg}</p>}
      </section>

      <section className="settings-group">
        <h2>Hushki Premium 👑</h2>
        {premium ? (
          <div className="settings-item">
            <span>{t('Aktivní do', 'Active until')} {new Date(user.premiumUntil!).toLocaleDateString(isEn() ? 'en-GB' : 'cs-CZ')}</span>
            <button className="btn small" disabled={portalBusy} onClick={openPortal}>{portalBusy ? <span className="spinner" /> : t('Spravovat', 'Manage')}</button>
          </div>
        ) : (
          <div className="settings-item">
            <span>{t('Prémiové samolepky a pikant 21–35', 'Premium stickers and spicy 21–35')}</span>
            <button className="btn small primary" onClick={() => setPremiumOffer(true)}>{t('Získat', 'Get it')}</button>
          </div>
        )}
        {premiumMsg && <p className="small muted" style={{ marginTop: 8 }}>{premiumMsg}</p>}
      </section>

      <section className="settings-group">
        <h2>{t('Aplikace', 'App')}</h2>
        <div className="settings-item"><span>{t('Jazyk', 'Language')}</span><LangSwitch /></div>
        {backend.mode !== 'demo' && pushSupported() && (
          <div className="settings-item"><span>{t('Tichá upozornění', 'Silent notifications')}</span>{pushOn
            ? <button className="chip on" onClick={pushOff}>{t('Zapnuto', 'On')}</button>
            : <button className="btn small" onClick={push}>{t('Zapnout', 'Turn on')}</button>}</div>
        )}
        {pushMsg && <p className="small muted" style={{ marginTop: 8 }}>{pushMsg}</p>}
        <div className="settings-item"><span>{t('Zvuky v chatu', 'Chat sounds')}</span>
          <button className={'chip' + (fx.sound ? ' on' : '')} onClick={() => toggle('sound')}>{fx.sound ? t('Zapnuto', 'On') : t('Vypnuto', 'Off')}</button>
        </div>
        <div className="settings-item"><span>{t('Haptická odezva', 'Haptics')}</span>
          <button className={'chip' + (fx.haptics ? ' on' : '')} onClick={() => toggle('haptics')}>{fx.haptics ? t('Zapnuto', 'On') : t('Vypnuto', 'Off')}</button>
        </div>
        <button className="settings-item menu-link" onClick={() => setHelp(true)}><span><span className="help-q" aria-hidden>?</span> {t('Nápověda', 'Help')}</span><span aria-hidden>›</span></button>
        <button className="settings-item menu-link" onClick={() => setAbout(true)}><span>{t('O aplikaci', 'About')}</span><span aria-hidden>ⓘ</span></button>
      </section>

      <section className="settings-group">
        <h2>{t('Soukromí a moje údaje', 'Privacy and my data')}</h2>
        <p className="small muted" style={{ marginTop: 0 }}>{t('Tvoje práva podle GDPR můžeš uplatnit přímo tady.', 'You can exercise your GDPR rights right here.')}</p>
        <div className="settings-item"><span>{t('Změnit PIN', 'Change PIN')}</span><button className="btn small" onClick={onChangePin}>{t('Změnit', 'Change')}</button></div>
        <button className="settings-item menu-link" onClick={() => setPrivacy(true)}><span>{t('Zásady ochrany osobních údajů', 'Privacy policy')}</span><span aria-hidden>›</span></button>
        <button className="settings-item menu-link" disabled={exporting} onClick={download}>
          <span>{t('Stáhnout moje údaje', 'Download my data')}<br /><span className="small muted">{t('Kopie účtu a místností (JSON)', 'Copy of your account and rooms (JSON)')}</span></span>
          {exporting ? <span className="spinner" /> : <span aria-hidden>↓</span>}
        </button>
        {exportMsg && <p className="small muted" style={{ margin: '6px 0 0' }}>{exportMsg}</p>}
        <a className="settings-item menu-link" href={`mailto:${INFO_EMAIL}?subject=${encodeURIComponent(isEn() ? 'Hushki – personal data request' : 'Hushki – žádost k osobním údajům')}`}>
          <span>{t('Žádost k osobním údajům', 'Personal data request')}<br /><span className="small muted">{INFO_EMAIL}</span></span><span aria-hidden>✉</span>
        </a>
        <a className="settings-item menu-link" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(isEn() ? 'Hushki – support' : 'Hushki – podpora')}`}>
          <span>{t('Podpora', 'Support')}<br /><span className="small muted">{SUPPORT_EMAIL}</span></span><span aria-hidden>✉</span>
        </a>
      </section>

      {upcoming.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <h2>{t('Připravujeme', 'Coming soon')}</h2>
          {upcoming.map((f) => (
            <div key={f.key} className="settings-item soon"><span>{isEn() ? f.description_en : f.description}</span><span className="tag">{t('brzy', 'soon')}</span></div>
          ))}
        </div>
      )}

      <section className="settings-group">
        <h2>{t('Účet', 'Account')}</h2>
        <div className="settings-item"><span>E-mail</span><span className="small muted">{user.email}</span></div>
      </section>
      <div className="stack" style={{ marginTop: 14 }}>
        <button className="btn ghost" onClick={onLogout}>{t('Odhlásit se', 'Sign out')}</button>
        {!confirmDelete ? (
          <button className="link-btn" onClick={() => setConfirmDelete(true)}>{t('Smazat účet a všechna data', 'Delete account and all data')}</button>
        ) : (
          <div className="notice stack">
            <span>{t(
              'Smažeme tvůj účet, všechny místnosti a vzkazy. U partnerů zmizí i vaše společné místnosti. Tím zároveň odvoláš souhlas se zpracováním. Nejde to vrátit.',
              'We will delete your account, all rooms and messages. Your shared rooms will also disappear for your partners. This also withdraws your consent to processing. It cannot be undone.',
            )}</span>
            {deleteErr && <span className="error small">{deleteErr}</span>}
            <button className="btn" disabled={deleting} onClick={doDelete}>{deleting ? <span className="spinner" /> : t('Ano, smazat vše', 'Yes, delete everything')}</button>
            <button className="btn ghost" onClick={() => setConfirmDelete(false)}>{t('Ne', 'No')}</button>
          </div>
        )}
      </div>
      {privacy && <PrivacySheetScreen onBack={() => setPrivacy(false)} />}
      {premiumOffer && <PremiumSheet onClose={() => setPremiumOffer(false)} onDemoDone={onPremiumChange} />}
      {help && <HelpSheet onClose={() => setHelp(false)} />}
      {about && <AboutSheet onClose={() => setAbout(false)} />}
    </div>
  );
}

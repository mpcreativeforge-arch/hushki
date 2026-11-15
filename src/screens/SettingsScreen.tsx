import { useState } from 'react';
import { backend, type Gender, type User } from '../lib/backend';
import { GenderPicker } from '../components/GenderPicker';
import features from '../data/features.json';
import { enablePush, pushSupported } from '../lib/push';
import { feedback, getPrefs, setPrefs } from '../lib/feedback';
import { PrivacySheetScreen } from '../components/Privacy';
import { HelpSheet } from '../components/Help';
import { AboutSheet } from '../components/About';
import { LangSwitch } from '../components/LangSwitch';
import { INFO_EMAIL, SUPPORT_EMAIL } from '../data/privacy';
import { exportMyData } from '../lib/export';
import { isEn, t } from '../lib/i18n';
import { setStickerSex, useStickerSex } from '../lib/style';

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
  const [help, setHelp] = useState(false);
  const [about, setAbout] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');
  const doDelete = async () => {
    setDeleting(true); setDeleteErr('');
    try { await onDeleteAccount(); } catch { setDeleteErr(t('Účet se nepodařilo smazat. Zkus to prosím znovu.', 'The account could not be deleted. Please try again.')); setDeleting(false); }
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
    setPushMsg(r === 'ok' ? t('Upozornění jsou zapnutá.', 'Notifications are on.')
      : r === 'unsupported' ? t('Tento prohlížeč upozornění nepodporuje. Na iPhonu si nejdřív přidej Hushki na plochu.', 'This browser does not support notifications. On iPhone, add Hushki to your home screen first.')
        : t('Upozornění jsou v nastavení telefonu zakázaná.', 'Notifications are blocked in your phone settings.'));
  };

  const download = async () => {
    setExporting(true); setExportMsg('');
    try { await exportMyData(user); setExportMsg(t('Soubor s tvými údaji se stahuje.', 'Your data file is downloading.')); }
    catch { setExportMsg(t('Stažení se nepovedlo. Zkontroluj připojení.', 'Download failed. Check your connection.')); }
    finally { setExporting(false); }
  };

  const upcoming = features.filter((f) => !flags[f.key]);
  const style = useStickerSex(user.id, user.gender);

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn ghost small" onClick={onBack}>← {t('Zpět', 'Back')}</button>
        <span className="brand">{t('Nastavení', 'Settings')}</span>
      </div>

      <section className="settings-group">
        <h2>{t('Profil', 'Profile')}</h2>
        <div className="stack">
          <label className="field"><span>{t('Tvoje jméno pro partnera/partnerku', 'Your name for your partner')}</span>
            <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <GenderPicker value={gender} onChange={setGender} />
          <button className="btn small" onClick={saveName} disabled={!name.trim() || (name === user.name && gender === user.gender)}>{saved ? t('Uloženo', 'Saved') : t('Uložit', 'Save')}</button>
        </div>
        <div className="settings-item"><span>{t('Styl samolepek', 'Sticker style')}</span>
          <div className="chips" role="radiogroup" aria-label={t('Styl samolepek', 'Sticker style')}>
            <button role="radio" aria-checked={style === 'muz'} className={'chip' + (style === 'muz' ? ' on' : '')} onClick={() => setStickerSex(user.id, 'muz')}>{t('Kluk', 'Guy')}</button>
            <button role="radio" aria-checked={style === 'zena'} className={'chip' + (style === 'zena' ? ' on' : '')} onClick={() => setStickerSex(user.id, 'zena')}>{t('Holka', 'Girl')}</button>
          </div>
        </div>
      </section>

      <section className="settings-group">
        <h2>{t('Aplikace', 'App')}</h2>
        <div className="settings-item"><span>{t('Jazyk', 'Language')}</span><LangSwitch /></div>
        {backend.mode !== 'demo' && pushSupported() && (
          <div className="settings-item"><span>{t('Tichá upozornění', 'Silent notifications')}</span><button className="btn small" onClick={push}>{t('Zapnout', 'Turn on')}</button></div>
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
      {help && <HelpSheet onClose={() => setHelp(false)} />}
      {about && <AboutSheet onClose={() => setAbout(false)} />}
    </div>
  );
}

import { useState } from 'react';
import { Sheet } from './Sheet';
import { feedback, getPrefs, setPrefs } from '../lib/feedback';
import { t } from '../lib/i18n';
import { HelpSheet } from './Help';
import { LangSwitch } from './LangSwitch';
import { InstallSheet } from './InstallSheet';
import { isStandalone } from '../lib/push';

const appUrl = () => location.origin + import.meta.env.BASE_URL;

export async function shareApp(): Promise<'shared' | 'copied' | 'failed'> {
  const data = { title: 'Hushki', text: t('Hushki: vzkazy jen pro nás dva. 🤫', 'Hushki: messages just for the two of us. 🤫'), url: appUrl() };
  try {
    if (navigator.share) { await navigator.share(data); return 'shared'; }
    await navigator.clipboard.writeText(data.url);
    return 'copied';
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError' ? 'shared' : 'failed';
  }
}

export function QuickMenu({ onClose, onSettings, onLogout, onLeave, extra }: {
  extra?: React.ReactNode; onClose: () => void; onSettings?: () => void; onLogout?: () => void; onLeave?: () => void;
}) {
  const [fx, setFx] = useState(getPrefs());
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [note, setNote] = useState('');
  const [help, setHelp] = useState(false);
  const [install, setInstall] = useState(false);
  const toggle = (k: 'sound' | 'haptics') => {
    const next = { ...fx, [k]: !fx[k] };
    setFx(next); setPrefs(next);
    if (next[k]) feedback('receive');
  };
  const share = async () => {
    const r = await shareApp();
    setNote(r === 'copied' ? t('Odkaz je zkopírovaný.', 'Link copied.') : r === 'failed' ? t('Sdílení se nepovedlo. Odkaz: ', 'Sharing failed. Link: ') + appUrl() : '');
  };
  if (help) return <HelpSheet onClose={() => setHelp(false)} />;
  if (install) return <InstallSheet onClose={() => setInstall(false)} />;
  return (
    <Sheet onClose={onClose}>
      <h2>Menu</h2>
      <button className="settings-item menu-link" onClick={() => setHelp(true)}><span><span className="help-q" aria-hidden>?</span> {t('Nápověda: jak na Hushki', 'Help: how Hushki works')}</span><span aria-hidden>›</span></button>
      {extra}
      <div className="settings-item"><span>{t('Jazyk', 'Language')}</span><LangSwitch /></div>
      <div className="settings-item"><span>{t('Zvuky', 'Sounds')}</span>
        <button className={'chip' + (fx.sound ? ' on' : '')} onClick={() => toggle('sound')}>{fx.sound ? t('Zapnuto', 'On') : t('Vypnuto', 'Off')}</button>
      </div>
      <div className="settings-item"><span>{t('Haptická odezva', 'Haptics')}</span>
        <button className={'chip' + (fx.haptics ? ' on' : '')} onClick={() => toggle('haptics')}>{fx.haptics ? t('Zapnuto', 'On') : t('Vypnuto', 'Off')}</button>
      </div>
      {!isStandalone() && <button className="settings-item menu-link" onClick={() => setInstall(true)}><span>{t('Přidat na plochu', 'Add to home screen')}</span><span aria-hidden>⊕</span></button>}
      <button className="settings-item menu-link" onClick={share}><span>{t('Sdílet aplikaci', 'Share the app')}</span><span aria-hidden>↗</span></button>
      {note && <p className="small muted" style={{ margin: '6px 0 0' }}>{note}</p>}
      {onSettings && <button className="settings-item menu-link" onClick={onSettings}><span>{t('Nastavení', 'Settings')}</span><span aria-hidden>›</span></button>}
      {onLeave && (!confirmLeave ? (
        <button className="settings-item menu-link" onClick={() => setConfirmLeave(true)}><span>{t('Zrušit tuto místnost', 'Close this room')}</span><span aria-hidden>✕</span></button>
      ) : (
        <div className="notice stack" style={{ marginTop: 10 }}>
          <span>{t('Opravdu? Místnost i všechny vzkazy v ní se smažou u vás obou.', 'Are you sure? The room and all its messages will be deleted for both of you.')}</span>
          <button className="btn" onClick={onLeave}>{t('Ano, zrušit', 'Yes, close it')}</button>
          <button className="btn ghost" onClick={() => setConfirmLeave(false)}>{t('Ne', 'No')}</button>
        </div>
      ))}
      {onLogout && <button className="settings-item menu-link" onClick={onLogout}><span>{t('Odhlásit se', 'Sign out')}</span><span aria-hidden>→</span></button>}
    </Sheet>
  );
}

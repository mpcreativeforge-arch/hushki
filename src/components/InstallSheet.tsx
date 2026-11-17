import { useState } from 'react';
import { Sheet } from './Sheet';
import { t } from '../lib/i18n';
import { markInstallSeen, platform, promptInstall, useCanPrompt } from '../lib/install';

/** Okno „Přidej si Hushki na plochu“ s návodem podle zařízení. */
export function InstallSheet({ onClose }: { onClose: () => void }) {
  const can = useCanPrompt();
  const [done, setDone] = useState(false);
  const p = platform();
  const close = () => { markInstallSeen(); onClose(); };
  const install = async () => { if (await promptInstall()) { setDone(true); markInstallSeen(); } };
  return (
    <Sheet onClose={close}>
      <div className="center">
        <img src={`${import.meta.env.BASE_URL}app-icons/icon-192.png`} width={72} height={72} alt="" style={{ borderRadius: 18 }} />
        <h2 style={{ margin: '10px 0 4px' }}>{t('Přidej si Hushki na plochu', 'Add Hushki to your home screen')}</h2>
        <p className="small muted" style={{ marginTop: 0 }}>{t('Otevře se jako aplikace, bez adresního řádku, a bude ti chodit nenápadné upozornění na nové vzkazy.', 'It opens like an app, without the address bar, and you’ll get discreet notifications about new messages.')}</p>
      </div>
      {done ? (
        <p className="notice center">{t('Hotovo. Hushki najdeš na ploše.', 'Done. You’ll find Hushki on your home screen.')}</p>
      ) : can ? (
        <button className="btn primary" onClick={install}>{t('Přidat na plochu', 'Add to home screen')}</button>
      ) : p === 'ios' ? (
        <ol className="install-steps">
          {/CriOS/.test(navigator.userAgent)
            ? <li>{t('V Chromu ťukni v adresním řádku na ikonu Sdílet', 'In Chrome, tap the Share icon in the address bar')} <span aria-hidden>⬆︎</span></li>
            : <li>{t('Dole v Safari ťukni na ikonu Sdílet', 'In Safari, tap the Share icon at the bottom')} <span aria-hidden>⬆︎</span></li>}
          <li>{t('Sjeď níž a vyber „Přidat na plochu“', 'Scroll down and choose “Add to Home Screen”')}</li>
          <li>{t('Potvrď „Přidat“ vpravo nahoře', 'Confirm with “Add” in the top right')}</li>
        </ol>
      ) : p === 'android' ? (
        <ol className="install-steps">
          <li>{t('V Chromu ťukni vpravo nahoře na tři tečky', 'In Chrome, tap the three dots in the top right')} <span aria-hidden>⋮</span></li>
          <li>{t('Vyber „Přidat na plochu“ nebo „Instalovat aplikaci“', 'Choose “Add to Home screen” or “Install app”')}</li>
        </ol>
      ) : (
        <ol className="install-steps">
          <li>{t('V adresním řádku Chromu nebo Edge klikni na ikonu instalace', 'In the Chrome or Edge address bar, click the install icon')} <span aria-hidden>⊕</span></li>
          <li>{t('Potvrď „Instalovat“', 'Confirm “Install”')}</li>
        </ol>
      )}
      <button className="btn ghost small" style={{ width: '100%', marginTop: 8 }} onClick={close}>{done ? t('Zavřít', 'Close') : t('Teď ne', 'Not now')}</button>
    </Sheet>
  );
}

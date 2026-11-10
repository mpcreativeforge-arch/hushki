import { useState } from 'react';
import { Sheet } from './Sheet';
import { feedback, getPrefs, setPrefs } from '../lib/feedback';

const appUrl = () => location.origin + import.meta.env.BASE_URL;

export async function shareApp(): Promise<'shared' | 'copied' | 'failed'> {
  const data = { title: 'Hushki', text: 'Hushki: vzkazy jen pro nás dva. 🤫', url: appUrl() };
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
  const toggle = (k: 'sound' | 'haptics') => {
    const next = { ...fx, [k]: !fx[k] };
    setFx(next); setPrefs(next);
    if (next[k]) feedback('receive');
  };
  const share = async () => {
    const r = await shareApp();
    setNote(r === 'copied' ? 'Odkaz je zkopírovaný.' : r === 'failed' ? 'Sdílení se nepovedlo. Odkaz: ' + appUrl() : '');
  };
  return (
    <Sheet onClose={onClose}>
      <h2>Menu</h2>
      {extra}
      <div className="settings-item"><span>Zvuky</span>
        <button className={'chip' + (fx.sound ? ' on' : '')} onClick={() => toggle('sound')}>{fx.sound ? 'Zapnuto' : 'Vypnuto'}</button>
      </div>
      <div className="settings-item"><span>Haptická odezva</span>
        <button className={'chip' + (fx.haptics ? ' on' : '')} onClick={() => toggle('haptics')}>{fx.haptics ? 'Zapnuto' : 'Vypnuto'}</button>
      </div>
      <button className="settings-item menu-link" onClick={share}><span>Sdílet aplikaci</span><span aria-hidden>↗</span></button>
      {note && <p className="small muted" style={{ margin: '6px 0 0' }}>{note}</p>}
      {onSettings && <button className="settings-item menu-link" onClick={onSettings}><span>Nastavení</span><span aria-hidden>›</span></button>}
      {onLeave && (!confirmLeave ? (
        <button className="settings-item menu-link" onClick={() => setConfirmLeave(true)}><span>Zrušit tuto místnost</span><span aria-hidden>✕</span></button>
      ) : (
        <div className="notice stack" style={{ marginTop: 10 }}>
          <span>Opravdu? Místnost i všechny vzkazy v ní se smažou u vás obou.</span>
          <button className="btn" onClick={onLeave}>Ano, zrušit</button>
          <button className="btn ghost" onClick={() => setConfirmLeave(false)}>Ne</button>
        </div>
      ))}
      {onLogout && <button className="settings-item menu-link" onClick={onLogout}><span>Odhlásit se</span><span aria-hidden>→</span></button>}
    </Sheet>
  );
}

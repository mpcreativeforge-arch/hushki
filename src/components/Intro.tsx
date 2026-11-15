import { useState } from 'react';
import { stickerSrc } from '../data/stickers';
import { Envelope } from './Envelope';
import { t } from '../lib/i18n';

const KEY = 'hushki.intro';
export const introSeen = () => { try { return !!localStorage.getItem(KEY); } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(KEY, '1'); } catch { /* */ } };

/** Tři úvodní karty před registrací. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const cards = [
    { art: <div className="intro-art"><img src={stickerSrc('m03')} alt="" width={96} height={96} /><img src={stickerSrc('f05')} alt="" width={96} height={96} /></div>,
      title: t('Jen samolepky, jen vy dva', 'Stickers only, just the two of you'),
      body: t('Žádné psaní ani fotky. Vyberete samolepku a druhý hned ví, co máte na mysli.', 'No typing and no photos. Pick a sticker and your partner knows exactly what you mean.') },
    { art: <div className="intro-art"><Envelope size={96} className="wobble" /></div>,
      title: t('Zalepená obálka a pikantní čísla', 'Sealed envelopes and spicy numbers'),
      body: t('Vzkaz přijde zalepený. Pikantní čísla 1–20 mají v Legendě tajný význam, který odemkne až vaše heslo.', 'Every message arrives sealed. Spicy numbers 1–20 have a secret meaning in the Legend that only your password unlocks.') },
    { art: <div className="intro-art intro-lock" aria-hidden>🔒</div>,
      title: t('Šifrované a za 48 hodin pryč', 'Encrypted and gone in 48 hours'),
      body: t('Vzkazy šifrujeme přímo v telefonu, nepřečteme je ani my. 48 hodin po posledním vzkazu samy zmizí.', 'Messages are encrypted on your phone, not even we can read them. They disappear 48 hours after the last one.') },
  ];
  const done = () => { markSeen(); onDone(); };
  const c = cards[i];
  return (
    <div className="app intro">
      <div className="row" style={{ justifyContent: 'flex-end' }}><button className="link-btn" onClick={done}>{t('Přeskočit', 'Skip')}</button></div>
      <div className="grow intro-card" key={i}>
        {c.art}
        <h1 className="center">{c.title}</h1>
        <p className="muted center">{c.body}</p>
      </div>
      <div className="intro-dots" aria-hidden>{cards.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}</div>
      <button className="btn primary" onClick={() => (i < cards.length - 1 ? setI(i + 1) : done())}>{i < cards.length - 1 ? t('Další', 'Next') : t('Začít', 'Get started')}</button>
    </div>
  );
}

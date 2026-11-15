import { setLang, useLang } from '../lib/i18n';

/** Přepínač jazyka CZ / EN. */
export function LangSwitch() {
  const lang = useLang();
  return (
    <div className="lang-switch" role="radiogroup" aria-label="Jazyk / Language">
      <button role="radio" aria-checked={lang === 'cs'} className={'chip' + (lang === 'cs' ? ' on' : '')} onClick={() => setLang('cs')}>CZ</button>
      <button role="radio" aria-checked={lang === 'en'} className={'chip' + (lang === 'en' ? ' on' : '')} onClick={() => setLang('en')}>EN</button>
    </div>
  );
}

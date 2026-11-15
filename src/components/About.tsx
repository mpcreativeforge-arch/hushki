import { Sheet } from './Sheet';
import { Wordmark } from './Logo';
import { t } from '../lib/i18n';
import { APP_VERSION, COPYRIGHT_YEAR, INFO_EMAIL, OPERATOR, SUPPORT_EMAIL, operatorAddress } from '../data/privacy';

/** Řádek s autorstvím, používá se i v Nápovědě. */
export function CreditLine() {
  return (
    <p className="credit small">
      © {COPYRIGHT_YEAR} {OPERATOR.name}. {t('Všechna práva vyhrazena.', 'All rights reserved.')}<br />
      {t('Autorem návrhu a vlastníkem práv k aplikaci Hushki je', 'Hushki was designed by and is owned by')} {OPERATOR.name}{t(', návrh vznikl ve spolupráci s', ', in collaboration with')} MP Creative Forge Studio.
    </p>
  );
}

export function AboutSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>{t('O aplikaci', 'About')}</h2>
        <button className="btn ghost small" onClick={onClose}>{t('Zavřít', 'Close')}</button>
      </div>
      <div className="about center">
        <Wordmark height={52} />
        <p className="small muted" style={{ margin: '4px 0 0' }}>{t('Verze', 'Version')} {APP_VERSION}</p>
        <p style={{ margin: '12px 0 0' }}>{t('Soukromé vzkazy v samolepkách jen pro vás dva.', 'Private sticker messages just for the two of you.')}</p>
      </div>

      <div className="about-block">
        <span className="small muted">{t('Provozovatel', 'Operator')}</span>
        <b>{OPERATOR.name}</b>
        <span>{t('IČO', 'Company ID (IČO)')} {OPERATOR.id}</span>
        <span>{operatorAddress()}</span>
        <span><a href={`mailto:${INFO_EMAIL}`}>{INFO_EMAIL}</a> · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></span>
      </div>

      <div className="about-block about-studio">
        <span className="small muted">{t('Návrh a vývoj', 'Design and development')}</span>
        <img src={`${import.meta.env.BASE_URL}mp-logo.png`} alt="MP Creative Forge Studio" width={120} height={53} />
        <span>{t('Navrhl', 'Designed by')} <b>{OPERATOR.name}</b> {t('ve spolupráci s', 'in collaboration with')} <b>MP Creative Forge Studio</b>.</span>
        <span className="small muted">{t('Vlastníkem práv k aplikaci, jejímu názvu, maskotovi a samolepkám je', 'The rights to the app, its name, mascot and stickers belong to')} {OPERATOR.name}.</span>
      </div>

      <CreditLine />
    </Sheet>
  );
}

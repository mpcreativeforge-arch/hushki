import { Sheet } from './Sheet';
import { Wordmark } from './Logo';
import { t } from '../lib/i18n';
import { APP_VERSION, COPYRIGHT_YEAR, INFO_EMAIL, OPERATOR, SUPPORT_EMAIL, operatorAddress } from '../data/privacy';

/** © řádek (Nápověda, O aplikaci). Hlavní je autor a vlastník, studio jen nenápadně. */
export function CreditLine({ logo }: { logo?: boolean }) {
  return (
    <div className="credit">
      <p className="small">
        © {COPYRIGHT_YEAR} {OPERATOR.name}. {t('Všechna práva vyhrazena.', 'All rights reserved.')}<br />
        {t('Autor návrhu a vlastník práv:', 'Designer and rights owner:')} {OPERATOR.name}
      </p>
      <p className="credit-studio">
        {t('ve spolupráci s', 'in collaboration with')}
        {logo ? <img src={`${import.meta.env.BASE_URL}mp-logo.png`} alt="MP Creative Forge Studio" width={56} height={25} /> : ' MP Creative Forge Studio'}
      </p>
    </div>
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
        <span className="small muted">{t('Autor, vlastník práv a provozovatel', 'Designer, rights owner and operator')}</span>
        <b className="about-owner">{OPERATOR.name}</b>
        <span className="small muted">{t('Vlastníkem práv k aplikaci, jejímu názvu, maskotovi a samolepkám je', 'The rights to the app, its name, mascot and stickers belong to')} {OPERATOR.name}.</span>
        <span style={{ marginTop: 8 }}>{t('IČO', 'Company ID (IČO)')} {OPERATOR.id}</span>
        <span>{operatorAddress()}</span>
        <span><a href={`mailto:${INFO_EMAIL}`}>{INFO_EMAIL}</a> · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></span>
      </div>

      <a className="about-more" href="https://podpisnamiru.cz" target="_blank" rel="noopener noreferrer">
        <span className="about-more-text">
          <span className="small muted">{t('Další služba autora', 'Another service by the author')}</span>
          <span className="small">{t('Váš podpis je vaše vizitka. Navrhneme vám originální podpis na míru a naučíme vás ho psát s elegancí.', 'Your signature is your calling card. We design an original signature just for you and teach you to write it with elegance.')}</span>
        </span>
        <span className="about-more-link">podpisnamiru.cz <span aria-hidden>↗</span></span>
      </a>

      <CreditLine logo />
    </Sheet>
  );
}

import { useState } from 'react';
import { Sheet } from './Sheet';
import { backend } from '../lib/backend';
import { beginPayment } from '../lib/session';
import { t } from '../lib/i18n';
import { PRICE_MONTH, PRICE_YEAR } from '../lib/premium';
import { StickerImg } from '../screens/chat/Bubble';

/** Nabídka Hushki Premium. Platba proběhne na stránce Stripe, po návratu se Premium odemkne samo. */
export function PremiumSheet({ lead, onClose, onDemoDone }: { lead?: string; onClose: () => void; onDemoDone?: () => void }) {
  const [busy, setBusy] = useState<'' | 'month' | 'year'>('');
  const [err, setErr] = useState('');
  const buy = async (plan: 'month' | 'year') => {
    setBusy(plan); setErr('');
    try {
      const url = await backend.premiumCheckout(plan);
      if (url) { beginPayment(); location.href = url; }
      else { onDemoDone?.(); onClose(); }
    } catch {
      setErr(t('Platbu se nepodařilo otevřít. Zkus to prosím za chvíli.', 'Could not open the payment. Please try again shortly.'));
      setBusy('');
    }
  };
  return (
    <Sheet onClose={onClose}>
      <div className="center">
        <div className="premium-preview" aria-hidden>
          {['o31', 's34', 'g31', 'p21'].map((id) => <StickerImg key={id} id={id} size={56} />)}
        </div>
        <h2 style={{ margin: '10px 0 4px' }}>Hushki Premium 👑</h2>
        {lead && <p style={{ margin: '0 0 6px' }}><b>{lead}</b></p>}
        <p className="small muted" style={{ marginTop: 0 }}>
          {t('Prémiové samolepky v každé záložce, pikantní čísla 21–35, kostka se všemi čísly a úpravy libovolného počtu tajných přání. Jedno předplatné platí pro vás oba ve vašich místnostech. Nové samolepky průběžně přibývají.',
            'Premium stickers in every tab, spicy numbers 21–35, the dice with every number and editing as many secret wishes as you like. One subscription covers both of you in your rooms. New stickers keep coming.')}
        </p>
      </div>
      <button className="btn primary" style={{ width: '100%' }} disabled={!!busy} onClick={() => buy('year')}>
        {busy === 'year' ? <span className="spinner" /> : <>{PRICE_YEAR} {t('ročně', 'a year')} <span className="small">· {t('ušetříš 38 %', 'save 38%')}</span></>}
      </button>
      <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={!!busy} onClick={() => buy('month')}>
        {busy === 'month' ? <span className="spinner" /> : <>{PRICE_MONTH} {t('měsíčně', 'a month')}</>}
      </button>
      {err && <p className="small" role="alert" style={{ color: 'var(--rose, #f3a6b8)' }}>{err}</p>}
      <p className="small muted center" style={{ marginBottom: 4 }}>
        {t('Platba kartou přes Stripe. Předplatné můžeš kdykoli zrušit v Nastavení.', 'Card payment via Stripe. Cancel anytime in Settings.')}
      </p>
      <button className="btn ghost small" style={{ width: '100%' }} onClick={onClose}>{t('Teď ne', 'Not now')}</button>
    </Sheet>
  );
}

import { useState } from 'react';
import { Brand } from '../components/Logo';
import { backend, BackendError, type Pair } from '../lib/backend';
import { t } from '../lib/i18n';
import { clearInvite, shareInvite } from '../lib/invite';
import { derivePairKey, generatePairCode, inviteHash, isValidCode, keyCheck, normalizeCode } from '../lib/crypto';

interface Props {
  mode: 'first' | 'add' | 'restore';
  /** místnost, ke které se obnovuje klíč */
  existing: Pair | null;
  known: Pair[];
  onPaired: (code: string, pair: Pair) => Promise<void> | void;
  onLogout: () => void;
  onBack?: () => void;
  /** kód z pozvánky (odkazu) */
  invite?: string | null;
  onDropInvite?: () => void;
}

const ERRORS = (): Record<string, string> => ({
  invalid_code: t('Tenhle kód neznáme. Zkontroluj ho prosím.', 'We don’t know this code. Please check it.'),
  pair_full: t('K tomuto kódu už je připojený někdo jiný.', 'Someone else is already connected with this code.'),
  too_many_rooms: t('Víc místností už mít nejde (max. 10).', 'You can’t have more rooms (max. 10).'),
  key_mismatch: t('Kód nesedí k této místnosti.', 'The code doesn’t match this room.'),
  demo_join: t('V demo režimu se nejde připojit k cizímu kódu. Zvol „Nová místnost“.', 'In demo mode you can’t join someone else’s code. Choose “Create room”.'),
});

export function PairScreen({ mode, existing, known, onPaired, onLogout, onBack, invite, onDropInvite }: Props) {
  const restore = mode === 'restore' && !invite;
  const [tab, setTab] = useState<'create' | 'join'>(restore || invite ? 'join' : 'create');
  const [shareNote, setShareNote] = useState('');
  const [continuing, setContinuing] = useState(false);
  const [code, setCode] = useState(invite ?? '');
  const [created, setCreated] = useState<{ code: string; pair: Pair } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    setBusy(true); setError('');
    try {
      const c = generatePairCode();
      const key = await derivePairKey(c);
      const pair = await backend.createPair(await inviteHash(c), await keyCheck(key));
      setCreated({ code: c, pair });
    } catch (e) {
      setError(ERRORS()[(e as BackendError).code] ?? t('Místnost se nepodařilo založit.', 'The room could not be created.'));
    } finally { setBusy(false); }
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeCode(code);
    if (!isValidCode(c)) return setError(t('Kód má 16 znaků, např. ABCD-EFGH-JKMN-PQRS.', 'The code has 16 characters, e.g. ABCD-EFGH-JKMN-PQRS.'));
    setBusy(true); setError('');
    try {
      const key = await derivePairKey(c);
      const check = await keyCheck(key);
      if (existing && existing.key_check !== check) throw new BackendError('key_mismatch');
      const pair = await backend.joinPair(await inviteHash(c));
      if (pair.key_check !== check) throw new BackendError('key_mismatch');
      clearInvite();
      await onPaired(c, pair);
    } catch (e) {
      setError(ERRORS()[(e as BackendError).code] ?? t('Připojení se nepovedlo.', 'Joining failed.'));
    } finally { setBusy(false); }
  };

  const share = async () => {
    if (!created) return;
    const r = await shareInvite(created.code);
    setShareNote(r === 'copied' ? t('Pozvánka je zkopírovaná, vlož ji partnerovi do zprávy.', 'Invite copied, paste it into a message to your partner.') : r === 'failed' ? t('Sdílení se nepovedlo. Pošli partnerovi kód níže.', 'Sharing failed. Send your partner the code below.') : '');
  };

  if (created) {
    return (
      <div className="app">
        <div className="topbar"><Brand /></div>
        <h1>{t('Pozvi ', 'Invite ')}<em>{t('partnera', 'your partner')}</em></h1>
        <p className="muted">{t('Pošli mu pozvánku. Ťukne na odkaz, zaregistruje se a budete spojení. Nic nemusí opisovat.', 'Send them the invite. They tap the link, sign up and you’re connected. Nothing to type.')}</p>
        <button className="btn primary" style={{ margin: '14px 0 6px' }} onClick={share}>💌 {t('Poslat pozvánku partnerovi', 'Send the invite to your partner')}</button>
        {shareNote && <p className="small muted center" style={{ margin: '4px 0 0' }}>{shareNote}</p>}
        <p className="small muted" style={{ margin: '18px 0 6px' }}>{t('Nebo mu nadiktuj kód, zadá ho přes „Mám kód“:', 'Or read out the code, they enter it via “I have a code”:')}</p>
        <div className="pair-code" style={{ margin: '0 0 18px' }}>{created.code}</div>
        <div className="notice" style={{ marginBottom: 18 }}>
          {t('Kód si někam bezpečně ulož. Je to zároveň klíč k vašim vzkazům. Bez něj je na novém telefonu neotevřeš a nikdo (ani my) ho neumí obnovit.', 'Store the code somewhere safe. It is also the key to your messages. Without it you can’t open them on a new phone and nobody (not even us) can recover it.')}
        </div>
        <button className="btn" disabled={continuing} onClick={async () => { setContinuing(true); await onPaired(created.code, created.pair); }}>{continuing ? <span className="spinner" /> : t('Pokračovat', 'Continue')}</button>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        {onBack ? <button className="btn ghost small" onClick={onBack}>← {t('Zpět', 'Back')}</button> : <Brand />}
        {!onBack && <button className="btn ghost small" onClick={onLogout}>{t('Odhlásit', 'Sign out')}</button>}
      </div>
      {invite && !existing ? (
        <>
          <h1>{t('Máš ', 'You have an ')}<em>{t('pozvánku', 'invite')}</em></h1>
          <p className="muted">{t('Partner tě zve do vaší společné místnosti. Stačí ťuknout na Připojit se.', 'Your partner invited you to your shared room. Just tap Join.')}</p>
        </>
      ) : restore && existing ? (
        <>
          <h1>{t('Odemkni ', 'Unlock the ')}<em>{t('místnost', 'room')}</em></h1>
          <p className="muted">{t('Na tomto zařízení zatím nemáš klíč k místnosti', 'This device doesn’t have the key to the room')} {existing.partner_name ? <b>{existing.partner_name}</b> : ''}. {t('Zadej její párovací kód.', 'Enter its pairing code.')}</p>
        </>
      ) : restore ? (
        <>
          <h1>{t('Odemkni ', 'Unlock ')}<em>{t('vaše', 'your')}</em>{t(' vzkazy', ' messages')}</h1>
          <p className="muted">{t('Na tomto zařízení zatím nemáš klíče. Zadej párovací kód kterékoli své místnosti', 'This device has no keys yet. Enter the pairing code of any of your rooms')} ({known.length}). {t('Ostatní odemkneš potom v seznamu.', 'You can unlock the others from the list afterwards.')}</p>
        </>
      ) : (
        <>
          <h1>{mode === 'add' ? <>{t('Nová ', 'New ')}<em>{t('místnost', 'room')}</em></> : <>{t('Spojte se ', 'Connect ')}<em>{t('ve dvou', 'as two')}</em></>}</h1>
          <p className="muted">{t('Jeden z vás založí místnost a druhý se připojí kódem. Každá místnost má svůj kód a klíč.', 'One of you creates a room and the other joins with the code. Each room has its own code and key.')}</p>
          <div className="chips" style={{ margin: '8px 0 22px' }}>
            <button className={'chip' + (tab === 'create' ? ' on' : '')} onClick={() => { setTab('create'); setError(''); }}>{t('Založit místnost', 'Create room')}</button>
            <button className={'chip' + (tab === 'join' ? ' on' : '')} onClick={() => { setTab('join'); setError(''); }}>{t('Mám kód', 'I have a code')}</button>
          </div>
        </>
      )}

      {tab === 'create' && !restore && !invite ? (
        <div className="stack">
          <p>{t('Vytvoříme vám tajný kód. Z něj se v telefonu odvodí klíč, kterým se vzkazy šifrují.', 'We’ll create a secret code for you. Your phone derives the key that encrypts your messages from it.')}</p>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" onClick={create} disabled={busy}>{busy ? <span className="spinner" /> : t('Vytvořit kód', 'Create code')}</button>
        </div>
      ) : (
        <form className="stack" onSubmit={join}>
          <label className="field"><span>{t('Párovací kód', 'Pairing code')}</span>
            <input className="input code-input" value={code} onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={19} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" disabled={busy}>{busy ? <span className="spinner" /> : restore ? t('Obnovit klíč', 'Restore key') : t('Připojit se', 'Join')}</button>
          {invite && onDropInvite && <button type="button" className="link-btn" onClick={onDropInvite}>{t('Pozvánku nechci použít', 'Don’t use this invite')}</button>}
        </form>
      )}
    </div>
  );
}

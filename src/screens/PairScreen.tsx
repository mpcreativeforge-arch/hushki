import { useState } from 'react';
import { Brand } from '../components/Logo';
import { backend, BackendError, type Pair } from '../lib/backend';
import { derivePairKey, generatePairCode, inviteHash, isValidCode, keyCheck, normalizeCode } from '../lib/crypto';

interface Props {
  mode: 'first' | 'add' | 'restore';
  /** místnost, ke které se obnovuje klíč */
  existing: Pair | null;
  known: Pair[];
  onPaired: (code: string, pair: Pair) => Promise<void> | void;
  onLogout: () => void;
  onBack?: () => void;
}

const ERRORS: Record<string, string> = {
  invalid_code: 'Tenhle kód neznáme. Zkontroluj ho prosím.',
  pair_full: 'K tomuto kódu už je připojený někdo jiný.',
  too_many_rooms: 'Víc místností už mít nejde (max. 10).',
  key_mismatch: 'Kód nesedí k této místnosti.',
  demo_join: 'V demo režimu se nejde připojit k cizímu kódu. Zvol „Nová místnost“.',
};

export function PairScreen({ mode, existing, known, onPaired, onLogout, onBack }: Props) {
  const restore = mode === 'restore';
  const [tab, setTab] = useState<'create' | 'join'>(restore ? 'join' : 'create');
  const [continuing, setContinuing] = useState(false);
  const [code, setCode] = useState('');
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
      setError(ERRORS[(e as BackendError).code] ?? 'Místnost se nepodařilo založit.');
    } finally { setBusy(false); }
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeCode(code);
    if (!isValidCode(c)) return setError('Kód má 16 znaků, např. ABCD-EFGH-JKMN-PQRS.');
    setBusy(true); setError('');
    try {
      const key = await derivePairKey(c);
      const check = await keyCheck(key);
      if (existing && existing.key_check !== check) throw new BackendError('key_mismatch');
      const pair = await backend.joinPair(await inviteHash(c));
      if (pair.key_check !== check) throw new BackendError('key_mismatch');
      await onPaired(c, pair);
    } catch (e) {
      setError(ERRORS[(e as BackendError).code] ?? 'Připojení se nepovedlo.');
    } finally { setBusy(false); }
  };

  const share = async () => {
    if (!created) return;
    const text = `Pojď se mnou do Hushki. Náš párovací kód: ${created.code}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(created.code);
    } catch { /* zrušeno */ }
  };

  if (created) {
    return (
      <div className="app">
        <div className="topbar"><Brand /></div>
        <h1>Váš <em>tajný</em> kód</h1>
        <p className="muted">Pošli ho partnerovi/partnerce. Zadá ho v Hushki (po registraci, nebo přes ＋ Nová místnost) a budete spojení.</p>
        <div className="pair-code" style={{ margin: '18px 0' }}>{created.code}</div>
        <div className="notice" style={{ marginBottom: 18 }}>
          Kód si někam bezpečně ulož. Je to zároveň klíč k vašim vzkazům. Bez něj je na novém telefonu neotevřeš a nikdo (ani my) ho neumí obnovit.
        </div>
        <div className="stack">
          <button className="btn" onClick={share}>Sdílet kód</button>
          <button className="btn primary" disabled={continuing} onClick={async () => { setContinuing(true); await onPaired(created.code, created.pair); }}>{continuing ? <span className="spinner" /> : 'Pokračovat'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        {onBack ? <button className="btn ghost small" onClick={onBack}>← Zpět</button> : <Brand />}
        {!onBack && <button className="btn ghost small" onClick={onLogout}>Odhlásit</button>}
      </div>
      {restore && existing ? (
        <>
          <h1>Odemkni <em>místnost</em></h1>
          <p className="muted">Na tomto zařízení zatím nemáš klíč k místnosti {existing.partner_name ? <b>{existing.partner_name}</b> : ''}. Zadej její párovací kód.</p>
        </>
      ) : restore ? (
        <>
          <h1>Odemkni <em>vaše</em> vzkazy</h1>
          <p className="muted">Na tomto zařízení zatím nemáš klíče. Zadej párovací kód kterékoli své místnosti ({known.length}). Ostatní odemkneš potom v seznamu.</p>
        </>
      ) : (
        <>
          <h1>{mode === 'add' ? <>Nová <em>místnost</em></> : <>Spojte se <em>ve dvou</em></>}</h1>
          <p className="muted">Jeden z vás založí místnost a druhý se připojí kódem. Každá místnost má svůj kód a klíč.</p>
          <div className="chips" style={{ margin: '8px 0 22px' }}>
            <button className={'chip' + (tab === 'create' ? ' on' : '')} onClick={() => { setTab('create'); setError(''); }}>Založit místnost</button>
            <button className={'chip' + (tab === 'join' ? ' on' : '')} onClick={() => { setTab('join'); setError(''); }}>Mám kód</button>
          </div>
        </>
      )}

      {tab === 'create' && !restore ? (
        <div className="stack">
          <p>Vytvoříme vám tajný kód. Z něj se v telefonu odvodí klíč, kterým se vzkazy šifrují.</p>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" onClick={create} disabled={busy}>{busy ? <span className="spinner" /> : 'Vytvořit kód'}</button>
        </div>
      ) : (
        <form className="stack" onSubmit={join}>
          <label className="field"><span>Párovací kód</span>
            <input className="input code-input" value={code} onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={19} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" disabled={busy}>{busy ? <span className="spinner" /> : restore ? 'Obnovit klíč' : 'Připojit se'}</button>
        </form>
      )}
    </div>
  );
}

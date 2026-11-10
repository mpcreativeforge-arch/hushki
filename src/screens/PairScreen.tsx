import { useState } from 'react';
import { backend, BackendError, type Pair } from '../lib/backend';
import { derivePairKey, generatePairCode, inviteHash, isValidCode, keyCheck, normalizeCode } from '../lib/crypto';

interface Props {
  restore: boolean;
  existing: Pair | null;
  onPaired: (code: string, pair: Pair) => void;
  onLogout: () => void;
}

const ERRORS: Record<string, string> = {
  invalid_code: 'Tenhle kód neznáme. Zkontroluj ho prosím.',
  pair_full: 'K tomuto kódu už je připojený někdo jiný.',
  already_paired: 'Už jsi v jiném páru. Nejdřív ho opusť v nastavení.',
  key_mismatch: 'Kód nesedí k vašemu páru.',
  demo_join: 'V demo režimu se nejde připojit k cizímu kódu. Zvol „Založit pár“.',
};

export function PairScreen({ restore, existing, onPaired, onLogout }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>(restore ? 'join' : 'create');
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
      setError(ERRORS[(e as BackendError).code] ?? 'Pár se nepodařilo založit.');
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
      onPaired(c, pair);
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
        <div className="topbar"><span className="brand">Hushki</span></div>
        <h1>Váš <em>tajný</em> kód</h1>
        <p className="muted">Pošli ho partnerovi/partnerce. Zadá ho po registraci v Hushki a budete spojení.</p>
        <div className="pair-code" style={{ margin: '18px 0' }}>{created.code}</div>
        <div className="notice" style={{ marginBottom: 18 }}>
          Kód si někam bezpečně ulož. Je to zároveň klíč k vašim vzkazům. Bez něj je na novém telefonu neotevřeš a nikdo (ani my) ho neumí obnovit.
        </div>
        <div className="stack">
          <button className="btn" onClick={share}>Sdílet kód</button>
          <button className="btn primary" onClick={() => onPaired(created.code, created.pair)}>Pokračovat</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <span className="brand">Hushki</span>
        <button className="btn ghost small" onClick={onLogout}>Odhlásit</button>
      </div>
      {restore ? (
        <>
          <h1>Odemkni <em>vaše</em> vzkazy</h1>
          <p className="muted">Na tomto zařízení zatím nemáš klíč. Zadej párovací kód, který jste dostali při spojení.</p>
        </>
      ) : (
        <>
          <h1>Spojte se <em>ve dvou</em></h1>
          <p className="muted">Jeden z vás založí pár a druhý se připojí kódem.</p>
          <div className="chips" style={{ margin: '8px 0 22px' }}>
            <button className={'chip' + (tab === 'create' ? ' on' : '')} onClick={() => { setTab('create'); setError(''); }}>Založit pár</button>
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

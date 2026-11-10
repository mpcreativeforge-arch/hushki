import { useEffect, useState } from 'react';
import { backend, BackendError, type Pair, type Template, type Tone, type User } from '../lib/backend';
import { encryptText } from '../lib/crypto';
import { Sheet } from '../components/Sheet';

interface Props { user: User; pair: Pair; pairKey: CryptoKey; flags: Record<string, boolean>; onDone: () => void }

const CATEGORIES: Record<string, string> = { romantika: 'Romantika', odvaha: 'Odvaha', hra: 'Hra' };
const TONES: { id: Tone; label: string }[] = [
  { id: 'elegantni', label: 'Elegantně' },
  { id: 'romanticky', label: 'Romanticky' },
  { id: 'hravy', label: 'Hravě' },
];
const MAX = 1200;

export function ComposeScreen({ pair, pairKey, flags, onDone }: Props) {
  const [text, setText] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Template[] | null>(null);
  const [showIdeas, setShowIdeas] = useState(false);
  const [cat, setCat] = useState<string>('vse');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Gentleman mód (zapíná se přepínačem "gentleman" v tabulce feature_flags)
  const [tone, setTone] = useState<Tone>('elegantni');
  const [gentle, setGentle] = useState<{ before: string; after: string } | null>(null);
  const [polishing, setPolishing] = useState(false);

    const heading = pair.partner_name ? `Vzkaz pro: ${pair.partner_name}` : 'Nový vzkaz';

  useEffect(() => {
    if (flags.templates !== false) backend.templates().then(setIdeas).catch(() => setIdeas([]));
  }, [flags.templates]);

  const polish = async () => {
    if (!text.trim()) return;
    setPolishing(true); setError('');
    try {
      const after = await backend.gentleman(text, tone);
      setGentle({ before: text, after });
      setText(after);
    } catch (e) {
      const code = (e as BackendError).code;
      setError(code === 'refused' ? 'Tenhle text AI přepsat nechce. Zkus ho trochu upravit.' : code === 'rate_limited' ? 'Moc pokusů najednou, zkus to za chvilku.' : 'Gentleman mód teď nefunguje. Zkus to později.');
    } finally { setPolishing(false); }
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true); setError('');
    try {
      const { ciphertext, iv } = await encryptText(pairKey, body);
      const meta: Record<string, unknown> = {};
      if (templateId) meta.template = true;
      if (gentle) meta.gentleman = true;
      const msg = await backend.sendMessage(pair.id, ciphertext, iv, meta);
      backend.notifyPartner(msg.id);
      setSent(true);
      setTimeout(onDone, 1400);
    } catch {
      setError('Vzkaz se nepodařilo odeslat. Zkontroluj připojení.');
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="app">
        <div className="grow center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1>Odesláno <em>potichu</em>.</h1>
          <p className="muted">Uvidí jen upozornění. Obsah si otevře, až bude chtít.</p>
        </div>
      </div>
    );
  }

  const shown = (ideas ?? []).filter((t) => cat === 'vse' || t.category === cat);
  const cats = Array.from(new Set((ideas ?? []).map((t) => t.category)));

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn ghost small" onClick={onDone}>← Zpět</button>
        {flags.templates !== false && (ideas?.length ?? 0) > 0 && (
          <button className="btn small" onClick={() => setShowIdeas(true)}>Nápady</button>
        )}
      </div>

      <h2>{heading}</h2>
      <textarea
        className="textarea" value={text} maxLength={MAX} autoFocus
        placeholder="Napiš, na co dnes večer myslíš…"
        onChange={(e) => { setText(e.target.value); setTemplateId(null); }}
      />
      <div className="row between small muted" style={{ marginTop: 6 }}>
        <span>Šifrováno, uvidíte jen vy dva</span>
        <span>{text.length}/{MAX}</span>
      </div>

      {flags.gentleman && (
        <div className="stack" style={{ marginTop: 18 }}>
          <div className="row between">
            <b style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 18 }}>Gentleman mód</b>
            {gentle && <button className="btn ghost small" onClick={() => { setText(gentle.before); setGentle(null); }}>Vrátit původní</button>}
          </div>
          <div className="chips">
            {TONES.map((t) => (
              <button key={t.id} className={'chip' + (tone === t.id ? ' on' : '')} onClick={() => setTone(t.id)}>{t.label}</button>
            ))}
          </div>
          <button className="btn" onClick={polish} disabled={polishing || !text.trim()}>
            {polishing ? <span className="spinner" /> : gentle ? 'Zkusit jinak' : 'Učesat text'}
          </button>
        </div>
      )}

      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

      <div className="fab">
        <button className="btn coral" onClick={send} disabled={sending || !text.trim()}>
          {sending ? <span className="spinner" /> : 'Odeslat potichu'}
        </button>
      </div>

      {showIdeas && (
        <Sheet onClose={() => setShowIdeas(false)}>
          <h2>Nápady</h2>
          <div className="chips" style={{ marginBottom: 8 }}>
            <button className={'chip' + (cat === 'vse' ? ' on' : '')} onClick={() => setCat('vse')}>Vše</button>
            {cats.map((c) => (
              <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{CATEGORIES[c] ?? c}</button>
            ))}
          </div>
          {shown.map((t) => (
            <button key={t.id} className="idea" onClick={() => { setText(t.body); setTemplateId(t.id); setGentle(null); setShowIdeas(false); }}>
              <b>{t.title}</b>
              <span>{t.body}</span>
            </button>
          ))}
        </Sheet>
      )}
    </div>
  );
}

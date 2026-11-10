import { useEffect, useState } from 'react';
import { backend, type Message, type Pair, type User } from '../lib/backend';
import { decryptText } from '../lib/crypto';
import { Envelope } from '../components/Envelope';
import { when } from './format';

interface Props { user: User; pair: Pair; pairKey: CryptoKey; message: Message; onBack: () => void }

export function ReadScreen({ user, pair, pairKey, message, onBack }: Props) {
  const mine = message.sender_id === user.id;
  const [opened, setOpened] = useState(mine);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    decryptText(pairKey, message.ciphertext, message.iv).then(setText).catch(() => setError(true));
  }, [message, pairKey]);

  const open = () => {
    setOpened(true);
    if (!mine && !message.read_at) backend.markRead(message.id).catch(() => undefined);
  };

  const partner = pair.partner_name || 'Partner/ka';

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn ghost small" onClick={onBack}>← Zpět</button>
        <span className="small muted">{when(message.created_at)}</span>
      </div>

      {!opened ? (
        <div className="grow center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="envelope-wrap"><Envelope size={180} className="wobble" /></div>
          <h2>Vzkaz od: {partner}</h2>
          <p className="muted">Otevři si ho, až budeš mít chvilku jen pro sebe.</p>
          <button className="btn primary" onClick={open} style={{ marginTop: 10 }}>Otevřít</button>
        </div>
      ) : error ? (
        <p className="error">Tenhle vzkaz se nepodařilo rozšifrovat. Byl zašifrovaný jiným klíčem.</p>
      ) : text === null ? (
        <div className="center"><span className="spinner" /></div>
      ) : (
        <div className="paper" style={{ marginTop: 20 }}>
          {text}
          <span className="sig">{mine ? `Pro: ${partner}` : `${partner}`}</span>
        </div>
      )}
    </div>
  );
}

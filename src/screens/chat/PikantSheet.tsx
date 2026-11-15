import { pikantId } from '../../data/stickers';
import { Sheet } from '../../components/Sheet';
import { PinPad } from '../../components/PinPad';
import { t } from '../../lib/i18n';

import { StickerImg } from './Bubble';

export function PikantSheet({ n, dice, busy, onSend, onReroll, onClose }: {
  n: number; dice?: boolean; busy: boolean; onSend: (pin: string) => Promise<boolean>; onReroll: () => void; onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <div className="center">
        {dice && <p className="small muted" style={{ marginBottom: 4 }}>{t('Kostka rozhodla za vás', 'The dice decided for you')}</p>}
        <div className="pop" style={{ display: 'inline-block' }}><StickerImg id={pikantId(n)} size={120} /></div>
        <h2 style={{ margin: '6px 0 4px' }}>{t('Číslo', 'Number')} {n}</h2>
        <p className="small muted">{t(
          'Co číslo znamená, si partner najde v Legendě. Popis bude zamčený heslem. Zvol 4 číslice a řekni mu je, až budeš chtít.',
          'Your partner finds what the number means in the Legend. The description will be locked with a password. Choose 4 digits and tell them when you want to.',
        )}</p>
      </div>
      <PinPad length={4} busy={busy} onComplete={onSend} />
      <button className="btn ghost small" style={{ width: '100%' }} onClick={onReroll}>🎲 {dice ? t('Hodit znovu', 'Roll again') : t('Hodit kostkou', 'Roll the dice')}</button>
    </Sheet>
  );
}

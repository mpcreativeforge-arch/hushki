import { Sheet } from './Sheet';
import { t } from '../lib/i18n';
import { SUPPORT_EMAIL } from '../data/privacy';

const SECTIONS = (): { icon: string; title: string; body: string }[] => [
  {
    icon: '🔑', title: t('Jak začít', 'Getting started'),
    body: t(
      'Jeden z vás založí místnost a pošle druhému tajný kód. Druhý ho zadá v Hushki přes „+ Nová místnost“ → „Mám kód“. Kód si schovejte, je to klíč k vašim vzkazům.',
      'One of you creates a room and sends the secret code to the other. They enter it in Hushki via “+ New room” → “I have a code”. Keep the code safe, it is the key to your messages.',
    ),
  },
  {
    icon: '🐾', title: t('Samolepky a záložky', 'Stickers and tabs'),
    body: t(
      'Píše se jen samolepkami. Dole vybereš záložku (Pokec, Domluva, Ocenění, Dárky, Hushki pikant) a ťuknutím na samolepku ji hned pošleš.',
      'You chat with stickers only. Pick a tab at the bottom (Chat, Plans, Praise, Gifts, Hushki spicy) and tap a sticker to send it right away.',
    ),
  },
  {
    icon: '✎', title: t('Samolepky s textem', 'Stickers with text'),
    body: t(
      'Samolepky s tužkou (✎) v Domluvě pošleš s textem. Vybereš jeden z hotových, nebo si napíšeš vlastní. Partner nepozná, který je tvůj.',
      'Stickers marked with a pencil (✎) in Plans are sent with a caption. Choose a ready-made one or write your own. Your partner can’t tell which one is yours.',
    ),
  },
  {
    icon: '🌶', title: t('Hushki pikant a heslo', 'Hushki spicy and the password'),
    body: t(
      'Pikantní samolepky mají číslo. Při odeslání zvolíš 4místné heslo. Partner si číslo najde v Legendě a popis si přečte, až mu heslo prozradíš.',
      'Spicy stickers carry a number. When sending one you choose a 4-digit password. Your partner looks the number up in the Legend and can read it once you tell them the password.',
    ),
  },
  {
    icon: '🎲', title: t('Kostka D20', 'D20 dice'),
    body: t(
      'Nevíte, co dnes večer? V záložce Hushki pikant ťukni na Kostku a pak na kostku samotnou. Padne číslo 1 až 20 a můžeš ho rovnou poslat.',
      'Can’t decide about tonight? In the Hushki spicy tab tap Dice, then tap the dice itself. It lands on 1 to 20 and you can send that number straight away.',
    ),
  },
  {
    icon: '📖', title: t('Legenda', 'Legend'),
    body: t(
      'Ikona knížky nahoře otevře Legendu všech pikantních čísel. Začátek je vidět vždy, zbytek se odemkne heslem od toho, kdo číslo poslal.',
      'The book icon at the top opens the Legend of all spicy numbers. The start is always visible, the rest unlocks with the password from whoever sent the number.',
    ),
  },
  {
    icon: '⏳', title: t('Zprávy mizí', 'Messages disappear'),
    body: t(
      'Když si 48 hodin nic nepošlete, všechny zprávy v místnosti se smažou. Místnost zůstane a můžete pokračovat.',
      'If nothing is sent for 48 hours, all messages in the room are deleted. The room stays and you can carry on.',
    ),
  },
  {
    icon: '🔒', title: t('PIN a zámek', 'PIN and lock'),
    body: t(
      'Aplikace se zamkne, když ji na 30 sekund opustíš, nebo když ťukneš na zámek. Odemkneš ji svým PINem.',
      'The app locks when you leave it for 30 seconds or tap the lock icon. Unlock it with your PIN.',
    ),
  },
  {
    icon: '🔔', title: t('Upozornění', 'Notifications'),
    body: t(
      'Upozornění je nenápadné a nic neprozradí. Na iPhonu si nejdřív přidej Hushki na plochu (Sdílet → Přidat na plochu).',
      'Notifications are discreet and reveal nothing. On iPhone, add Hushki to your home screen first (Share → Add to Home Screen).',
    ),
  },
];

export function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>{t('Jak používat Hushki', 'How to use Hushki')}</h2>
        <button className="btn ghost small" onClick={onClose}>{t('Zavřít', 'Close')}</button>
      </div>
      <div className="help-list">
        {SECTIONS().map((s) => (
          <div key={s.title} className="help-item">
            <span className="help-icon" aria-hidden>{s.icon}</span>
            <div><b>{s.title}</b><p>{s.body}</p></div>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>
        {t('Něco nefunguje? Napiš nám na ', 'Something not working? Write to ')}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </Sheet>
  );
}

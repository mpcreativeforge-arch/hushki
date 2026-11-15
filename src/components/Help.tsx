import { Sheet } from './Sheet';
import { t } from '../lib/i18n';
import { SUPPORT_EMAIL } from '../data/privacy';

const SECTIONS = (): { icon: string; title: string; body: string }[] => [
  {
    icon: '🔑', title: t('Jak začít', 'Getting started'),
    body: t(
      'Jeden z vás založí místnost a tlačítkem „Poslat pozvánku“ pošle druhému odkaz. Po otevření odkazu se kód vyplní sám. Kód jde zadat i ručně přes „+ Nová místnost“ → „Mám kód“. Kód si schovejte, je to klíč k vašim vzkazům.',
      'One of you creates a room and sends the other an invite link with “Send invite”. Opening the link fills in the code. You can also type the code via “+ New room” → “I have a code”. Keep the code safe, it is the key to your messages.',
    ),
  },
  {
    icon: '🐾', title: t('Samolepky a záložky', 'Stickers and tabs'),
    body: t(
      'Píše se jen samolepkami. Dole vybereš záložku (Pokec, Domluva, Ocenění, Dárky, Hushki pikant) a ťuknutím na samolepku ji hned pošleš. Hodiny 🕘 vlevo ukážou naposledy použité. Přetažením vzkazu doprava na něj odpovíš, podržením svého vzkazu ho smažeš u obou.',
      'You chat with stickers only. Pick a tab at the bottom (Chat, Plans, Praise, Gifts, Hushki spicy) and tap a sticker to send it right away. The clock 🕘 on the left shows recently used ones. Swipe a message to the right to reply, press and hold your own message to delete it for both of you.',
    ),
  },
  {
    icon: '✎', title: t('Samolepky s textem', 'Stickers with text'),
    body: t(
      'První dlaždice „+ text“ v každé záložce pošle samolepku s textem. Vybereš jednu ze dvou ikon a jeden z hotových textů, nebo si napíšeš vlastní. Partner nepozná, který je tvůj.',
      'The first tile “+ text” in each tab sends a sticker with a caption. Pick one of two icons and a ready-made text, or write your own. Your partner can’t tell which one is yours.',
    ),
  },
  {
    icon: '🌶', title: t('Hushki pikant a heslo', 'Hushki spicy and the password'),
    body: t(
      'Pikantní samolepky mají číslo. Při prvním odeslání zvolíš 4místné heslo pro celou místnost, dál se už jen předvyplní (změnit ho můžeš kdykoli). Partner si číslo najde v Legendě a popis si přečte, až mu heslo jednou prozradíš.',
      'Spicy stickers carry a number. The first time you send one you choose a 4-digit password for the whole room; after that it is filled in for you (you can change it any time). Your partner looks the number up in the Legend and can read it once you tell them the password.',
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
      'Ikona knížky nahoře otevře Legendu všech pikantních čísel. Číslo na ikoně ukazuje, kolik čísel od partnera čeká na odemčení. Začátek popisu je vidět vždy, zbytek odemkne heslo od partnera.',
      'The book icon at the top opens the Legend of all spicy numbers. The count on the icon shows how many numbers from your partner are waiting to be unlocked. The start of each description is always visible, the rest unlocks with your partner’s password.',
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

import { useEffect, useRef, useState } from 'react';
import { backend } from '../../lib/backend';
import { type LockRef, type Wish } from '../../lib/payload';
import { pikantId } from '../../data/stickers';
import { legend, type Sex } from '../../data/legend';
import { feedback } from '../../lib/feedback';
import { Sheet } from '../../components/Sheet';
import { PinPad } from '../../components/PinPad';
import { t } from '../../lib/i18n';

import { StickerImg } from './Bubble';
import { LegendEditor } from './LegendEditor';
import { FREE_EDITS, applyEdit, useRoomLegend, type LegendEdit } from '../../lib/roomLegend';

/** Zamčená část popisu: písmena se nahradí jinými, aby nešla přečíst ani ze zdrojového kódu stránky. */
function scramble(t: string) {
  const abc = 'aeiounrstlkmdpvjzcbh';
  let x = t.length;
  return t.replace(/\p{L}/gu, () => { x = (x * 31 + 7) % 997; return abc[x % abc.length]; });
}

type Tab = 'got' | 'mine';
type Filter = 'got' | 'open';

/**
 * Legenda má dvě sady: Přijaté (čísla od partnera, číst jdou jen ta poslaná) a Moje (vlastní sada s úpravami).
 * Partnerovu sadu aplikace nezná, přání bere jen ze vzkazů, takže nikdy nepozná, co je upravené.
 */
export function LegendSheet({ start, locks, wishes, unlocked, onPin, sex, mySex, partnerSex, premium, onPremium, onSaveEdit, onDice, onClose }: {
  start?: number; locks: Map<number, LockRef[]>; wishes: Map<number, Wish>; unlocked: number[]; onPin: (pin: string, n: number) => Promise<boolean>;
  sex: 'muz' | 'zena'; mySex: Sex; partnerSex: Sex; premium: boolean; onPremium: () => void;
  onSaveEdit: (n: number, e: LegendEdit | null) => Promise<void>; onDice: (prev?: number) => void; onClose: () => void;
}) {
  const gotLocked = [...locks.keys()].filter((n) => !unlocked.includes(n));
  const [tab, setTab] = useState<Tab>(() => (start ? (locks.has(start) ? 'got' : 'mine') : locks.size ? 'got' : 'mine'));
  const [focus, setFocus] = useState<number | null>(start ?? null);
  const [pinFor, setPinFor] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('got');
  const [editFor, setEditFor] = useState<number | null>(null);
  const edits = useRoomLegend();
  const editCount = Object.keys(edits).length;
  const [howto, setHowto] = useState(() => { try { return !localStorage.getItem('hushki.legend-howto2'); } catch { return true; } });
  const closeHowto = () => { setHowto(false); try { localStorage.setItem('hushki.legend-howto2', '1'); } catch { /* */ } };
  const refs = useRef(new Map<number, HTMLDivElement>());
  useEffect(() => {
    if (focus) refs.current.get(focus)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focus, pinFor, tab]);

  const mine = legend(mySex);
  const partnerBase = legend(partnerSex);

  // bez Premium jdou upravit 2 přání; už upravené jde měnit dál
  const edit = (n: number) => {
    if (!premium && !edits[n] && editCount >= FREE_EDITS) return onPremium();
    setEditFor(n);
  };

  if (editFor) {
    const base = mine.find((x) => x.n === editFor)!;
    return (
      <LegendEditor item={applyEdit(base, edits[editFor])} base={base} edit={edits[editFor]} sex={sex}
        onSave={async (e) => { await onSaveEdit(editFor, e); setFocus(editFor); setEditFor(null); }}
        onClose={() => { setFocus(editFor); setEditFor(null); }} />
    );
  }

  if (pinFor) {
    const tryPin = async (pin: string) => {
      if (!(await onPin(pin, pinFor))) return false;
      feedback('open'); setFocus(pinFor); setPinFor(null);
      return true;
    };
    return (
      <Sheet onClose={onClose}>
        <button className="btn ghost small" onClick={() => setPinFor(null)}>← {t('Zpět do Legendy', 'Back to the Legend')}</button>
        <div className="center" style={{ marginTop: 8 }}>
          <StickerImg id={pikantId(pinFor)} size={84} icon={wishes.get(pinFor) ?? {}} />
          <h2 style={{ margin: '6px 0 4px' }}>{t('Heslo k číslu', 'Password for number')} {pinFor}</h2>
          <p className="small muted">{t('Heslo ti musí prozradit partner. Platí pro celou místnost, takže odemkne i další čísla.', 'Your partner has to tell you the password. It works for the whole room, so it unlocks other numbers too.')}{backend.mode === 'demo' ? ' (Demo: 1234)' : ''}</p>
        </div>
        <PinPad length={4} onComplete={tryPin} />
      </Sheet>
    );
  }

  const received = [...locks.keys()].sort((a, b) => a - b).filter((n) => filter === 'got' || unlocked.includes(n));

  return (
    <Sheet onClose={onClose}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>{t('Legenda', 'Legend')}</h2>
        <button className="chip" onClick={() => onDice(focus ?? undefined)}>🎲 {t('Kostka', 'Dice')}</button>
      </div>
      {howto && (
        <div className="notice howto">
          <b>{t('Jak to funguje', 'How it works')}</b>
          <ol className="small">
            <li>{t('Každý z vás má vlastní sadu tajných přání 1–35. Tu partnerovu neznáš a on nezná tvoji.', 'Each of you has your own set of secret wishes 1–35. You don’t know your partner’s and they don’t know yours.')}</li>
            <li>{t('V „Přijatých“ si přečteš čísla, která ti partner poslal. Konec popisu odemkne heslo, které ti prozradí.', 'In “Received” you read the numbers your partner sent you. The end of the description unlocks with the password they tell you.')}</li>
            <li>{t('V „Moje“ je tvoje sada. Tužkou ✎ si přání přepíšeš po svém, partner nepozná, že je upravené.', '“Mine” is your own set. With the pencil ✎ you rewrite a wish your own way, and your partner can’t tell it was edited.')}</li>
          </ol>
          <button className="btn ghost small" onClick={closeHowto}>{t('Rozumím', 'Got it')}</button>
        </div>
      )}
      <div className="chips legend-filter" role="tablist" aria-label={t('Sada přání', 'Set of wishes')}>
        <button role="tab" aria-selected={tab === 'got'} className={'chip' + (tab === 'got' ? ' on' : '')} onClick={() => setTab('got')}>
          {t('Přijaté', 'Received')}{gotLocked.length ? ` · 🔒${gotLocked.length}` : ''}
        </button>
        <button role="tab" aria-selected={tab === 'mine'} className={'chip' + (tab === 'mine' ? ' on' : '')} onClick={() => setTab('mine')}>{t('Moje', 'Mine')}</button>
      </div>

      {tab === 'got' ? (
        <>
          <div className="num-grid">
            {partnerBase.map((it) => (
              <button key={it.n} disabled={!locks.has(it.n)} className={'num-chip' + (focus === it.n ? ' on' : '') + (unlocked.includes(it.n) ? ' open' : '') + (locks.has(it.n) ? ' got' : '')} onClick={() => setFocus(it.n)}>{it.n}</button>
            ))}
          </div>
          {locks.size > 0 && (
            <div className="chips legend-filter" role="radiogroup" aria-label={t('Zobrazit', 'Show')}>
              {([['got', t('Poslané mi', 'Sent to me') + (gotLocked.length ? ` · 🔒${gotLocked.length}` : '')], ['open', t('Odemčené', 'Unlocked') + ` (${unlocked.filter((n) => locks.has(n)).length})`]] as [Filter, string][]).map(([k, label]) => (
                <button key={k} role="radio" aria-checked={filter === k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{label}</button>
              ))}
            </div>
          )}
          {gotLocked.length > 0 && (
            <button className="btn primary small" style={{ width: '100%', marginBottom: 10 }} onClick={() => setPinFor(gotLocked[0])}>🔒 {t('Zadat heslo od partnera', 'Enter your partner’s password')}</button>
          )}
          {!locks.size && <p className="small muted center">{t('Partner ti zatím žádné tajné přání neposlal. Zvýrazněná čísla tu uvidíš, až nějaké pošle.', 'Your partner hasn’t sent you a secret wish yet. Numbers light up here once they do.')}</p>}
          {received.map((n) => {
            const w = wishes.get(n) ?? partnerBase.find((x) => x.n === n)!;
            const open = unlocked.includes(n);
            const cut = Math.min(w.body.length, Math.max(18, w.body.indexOf(' ', 22)));
            return (
              <div key={n} ref={(el) => { if (el) refs.current.set(n, el); }} className={'legend-item' + (focus === n ? ' focus' : '')}>
                <StickerImg id={pikantId(n)} size={56} icon={wishes.get(n) ?? {}} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b>{n}. {w.title}</b>
                  {open ? <p>{w.body}</p> : (
                    <>
                      <p>{w.body.slice(0, cut)}<span className="blurred" aria-hidden> {scramble(w.body.slice(cut))}</span></p>
                      <button className="chip lock" onClick={() => setPinFor(n)}>🔒 {t('Zadat heslo', 'Enter password')}</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          <p className="small muted" style={{ marginTop: 0 }}>
            {t('Tvoje sada. Partner z ní uvidí jen to, co mu pošleš.', 'Your own set. Your partner only sees what you send.')}{' '}
            {premium ? t('S Premium upravíš kolik přání chceš.', 'With Premium you can edit as many wishes as you like.')
              : t(`Zdarma můžeš upravit ${FREE_EDITS} přání (zbývá ${Math.max(0, FREE_EDITS - editCount)}).`, `You can edit ${FREE_EDITS} wishes for free (${Math.max(0, FREE_EDITS - editCount)} left).`)}
          </p>
          <div className="num-grid">
            {mine.map((it) => (
              <button key={it.n} className={'num-chip' + (focus === it.n ? ' on' : '')} onClick={() => setFocus(it.n)}>{it.n}</button>
            ))}
          </div>
          {mine.map((x) => applyEdit(x, edits[x.n])).map((it) => (
            <div key={it.n} ref={(el) => { if (el) refs.current.set(it.n, el); }} className={'legend-item' + (focus === it.n ? ' focus' : '')}>
              <StickerImg id={pikantId(it.n)} size={56} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row" style={{ gap: 6, alignItems: 'flex-start' }}>
                  {/* štítek „upraveno“ vidím jen já ve své sadě, partnerovi nikdy */}
                  <b>{it.n}. {it.title}{edits[it.n] ? <span className="small muted"> · {t('upraveno', 'edited')}</span> : null}</b>
                  <button className="chip legend-edit-btn" aria-label={t('Upravit přání', 'Edit wish') + ' ' + it.n} onClick={() => edit(it.n)}>✎</button>
                </div>
                <p>{it.body}</p>
              </div>
            </div>
          ))}
        </>
      )}
    </Sheet>
  );
}

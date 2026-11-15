import { useEffect, useRef, useState } from 'react';
import { haptic } from '../lib/feedback';
import { t } from '../lib/i18n';

// Dvacetistěnná kostka (D20) v samostatném okně. Ťuknutím se roztočí a padne číslo 1–20.

const HEX = [[50, 3], [91, 26.5], [91, 73.5], [50, 97], [9, 73.5], [9, 26.5]] as const;
const IN = [[50, 27], [72, 65], [28, 65]] as const;
const P = (pts: readonly (readonly [number, number])[]) => pts.map((p) => p.join(',')).join(' ');

/** Plošky kostky: střední trojúhelník + okolní stěny v různých odstínech. */
const FACES: { pts: (readonly [number, number])[]; fill: string }[] = [
  { pts: [HEX[0], HEX[1], IN[0]], fill: 'var(--d20-b)' },
  { pts: [HEX[0], IN[0], HEX[5]], fill: 'var(--d20-c)' },
  { pts: [HEX[1], HEX[2], IN[1]], fill: 'var(--d20-c)' },
  { pts: [HEX[1], IN[1], IN[0]], fill: 'var(--d20-b)' },
  { pts: [HEX[2], HEX[3], IN[1]], fill: 'var(--d20-d)' },
  { pts: [HEX[3], IN[2], IN[1]], fill: 'var(--d20-c)' },
  { pts: [HEX[3], HEX[4], IN[2]], fill: 'var(--d20-d)' },
  { pts: [HEX[4], HEX[5], IN[2]], fill: 'var(--d20-c)' },
  { pts: [HEX[5], IN[0], IN[2]], fill: 'var(--d20-b)' },
];

export function D20Svg({ value, size = 200 }: { value: number | string; size?: number }) {
  return (
    <svg className="d20-svg" width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="d20face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--d20-hi)" />
          <stop offset="1" stopColor="var(--d20-a)" />
        </linearGradient>
      </defs>
      {FACES.map((f, i) => <polygon key={i} points={P(f.pts)} fill={f.fill} />)}
      <polygon points={P(IN)} fill="url(#d20face)" />
      <g fill="none" stroke="var(--d20-line)" strokeWidth="1.2" strokeLinejoin="round">
        <polygon points={P(HEX)} strokeWidth="2" />
        <polygon points={P(IN)} />
        {FACES.map((f, i) => <polygon key={i} points={P(f.pts)} />)}
      </g>
      <text x="50" y="56" textAnchor="middle" dominantBaseline="middle" className="d20-num" fontSize={String(value).length > 1 ? 17 : 20}>{value}</text>
    </svg>
  );
}

/**
 * Okno s kostkou. Po ťuknutí se kostka roztočí a vrátí výsledek.
 * onResult se zavolá tlačítkem „Použít číslo“.
 */
export function DiceOverlay({ max = 20, prev, onResult, onClose, actionLabel }: {
  max?: number; prev?: number; onResult: (n: number) => void; onClose: () => void; actionLabel: string;
}) {
  const [face, setFace] = useState<number | string>('?');
  const [state, setState] = useState<'idle' | 'rolling' | 'done'>('idle');
  const timer = useRef<number | undefined>(undefined);
  const result = useRef<number>(0);

  useEffect(() => () => clearInterval(timer.current), []);

  const roll = () => {
    if (state === 'rolling') return;
    let n = 1 + Math.floor(Math.random() * max);
    if (prev && n === prev) n = (n % max) + 1;
    result.current = n;
    setState('rolling');
    haptic('tap');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const started = Date.now();
    const dur = reduce ? 200 : 1500;
    clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      if (Date.now() - started >= dur) {
        clearInterval(timer.current);
        setFace(n); setState('done'); haptic('receive');
        return;
      }
      setFace(1 + Math.floor(Math.random() * max));
    }, 70);
  };

  return (
    <div className="dice-overlay" role="dialog" aria-modal="true" aria-label={t('Kostka D20', 'D20 dice')}>
      <button className="dice-close icon-btn" aria-label={t('Zavřít', 'Close')} onClick={onClose}>✕</button>
      <p className="dice-title">{state === 'done' ? t('Padlo číslo', 'You rolled') : t('Hushki kostka', 'Hushki dice')}</p>
      <button className={'d20 ' + state} onClick={roll} aria-label={t('Hodit kostkou', 'Roll the dice')} disabled={state === 'rolling'}>
        <span className="d20-glow" aria-hidden />
        <D20Svg value={face} size={210} />
      </button>
      <p className="dice-hint" aria-live="polite">
        {state === 'idle' && t('Ťukni na kostku a hoď', 'Tap the dice to roll')}
        {state === 'rolling' && t('Kostka se točí…', 'Rolling…')}
        {state === 'done' && <b className="dice-result">{result.current}</b>}
      </p>
      {state === 'done' && (
        <div className="dice-actions">
          <button className="btn primary" onClick={() => onResult(result.current)}>{actionLabel}</button>
          <button className="btn ghost" onClick={roll}>🎲 {t('Hodit znovu', 'Roll again')}</button>
        </div>
      )}
    </div>
  );
}

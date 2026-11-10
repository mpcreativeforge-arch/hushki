// Zvuky (Web Audio, bez souborů) a haptická odezva.
// iPhone nepodporuje navigator.vibrate. Safari 18+ ale vibruje při přepnutí <input type="checkbox" switch>,
// takový skrytý přepínač tu použijeme.

const PREFS_KEY = 'hushki-feedback';
interface Prefs { sound: boolean; haptics: boolean }

export function getPrefs(): Prefs {
  try { return { sound: true, haptics: true, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }; }
  catch { return { sound: true, haptics: true }; }
}

export function setPrefs(p: Prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* nic */ }
}

// --- Haptika -----------------------------------------------------------------

let switchLabel: HTMLLabelElement | null = null;

function iosSwitch() {
  if (switchLabel) return switchLabel;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.id = 'hushki-haptic';
  input.style.display = 'none';
  const label = document.createElement('label');
  label.htmlFor = input.id;
  label.style.display = 'none';
  document.body.append(input, label);
  switchLabel = label;
  return label;
}

export type HapticKind = 'tap' | 'send' | 'receive' | 'error';
const PATTERNS: Record<HapticKind, number | number[]> = { tap: 8, send: 14, receive: [12, 60, 18], error: [30, 50, 30] };

export function haptic(kind: HapticKind = 'tap') {
  if (!getPrefs().haptics) return;
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[kind]);
    } else {
      const n = Array.isArray(PATTERNS[kind]) ? 2 : 1;
      for (let i = 0; i < n; i++) setTimeout(() => iosSwitch().click(), i * 90);
    }
  } catch { /* nic */ }
}

// --- Zvuky -------------------------------------------------------------------

let ctx: AudioContext | null = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

/** Odemkne zvuk po prvním dotyku (iOS vyžaduje gesto uživatele). */
export function primeAudio() {
  const once = () => { audio(); window.removeEventListener('pointerdown', once); };
  window.addEventListener('pointerdown', once, { passive: true });
}

function tone(c: AudioContext, freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine', slideTo?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

export type SoundKind = 'send' | 'receive' | 'open' | 'sticker';

export function sound(kind: SoundKind) {
  if (!getPrefs().sound) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (kind) {
    case 'send': // krátké "fff-pop" nahoru
      tone(c, 520, t, 0.12, 0.12, 'sine', 880);
      break;
    case 'receive': // dva jemné tóny
      tone(c, 784, t, 0.18, 0.1);
      tone(c, 1046, t + 0.11, 0.26, 0.08);
      break;
    case 'open': // rozlepení obálky
      tone(c, 330, t, 0.22, 0.08, 'triangle', 660);
      tone(c, 990, t + 0.14, 0.2, 0.05);
      break;
    case 'sticker': // hravé "boing"
      tone(c, 300, t, 0.18, 0.12, 'sine', 620);
      tone(c, 620, t + 0.1, 0.12, 0.06, 'sine', 500);
      break;
  }
}

export function feedback(kind: SoundKind) {
  sound(kind);
  haptic(kind === 'receive' ? 'receive' : kind === 'send' || kind === 'sticker' ? 'send' : 'tap');
}

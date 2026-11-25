// Zvuky (nahrané MP3 v public/sounds, záložně syntéza Web Audio) a haptická odezva.
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

/** Jemné ťuknutí u každého tlačítka v aplikaci (kromě prvků s data-haptic="off"). */
export function installGlobalHaptics() {
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as Element | null)?.closest?.('button, a, [data-haptic]');
    if (!el || el.closest('[data-haptic="off"]') || (el as HTMLButtonElement).disabled) return;
    haptic('tap');
  }, { passive: true, capture: true });
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

/** Odemkne zvuk po prvním dotyku (iOS vyžaduje gesto uživatele) a načte zvukové soubory. */
export function primeAudio() {
  const once = () => { const c = audio(); if (c) loadSamples(c); window.removeEventListener('pointerdown', once); };
  window.addEventListener('pointerdown', once, { passive: true });
}

// --- Zvukové soubory ------------------------------------------------------------

const SAMPLE_FILES = ['vzkaz-prichozi', 'vzkaz-odeslany', 'obalka-otevreni', 'kostka-hod', 'kostka-cislo', 'odemceni', 'premium', 'stek', 'vyti-kratke'] as const;
type SampleName = typeof SAMPLE_FILES[number];
const samples = new Map<SampleName, AudioBuffer>();
let loading = false;

function loadSamples(c: AudioContext) {
  if (loading) return;
  loading = true;
  for (const name of SAMPLE_FILES) {
    fetch(`${import.meta.env.BASE_URL}sounds/${name}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => new Promise<AudioBuffer>((res, rej) => c.decodeAudioData(b, res, rej)))
      .then((buf) => { samples.set(name, buf); })
      .catch(() => undefined); // bez souboru se použije syntéza
  }
}

/** Přehraje zvukový soubor. Vrací false, když ještě není načtený. */
function play(c: AudioContext, name: SampleName, vol = 0.7, at = c.currentTime + 0.01) {
  const buf = samples.get(name);
  if (!buf) return false;
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(g).connect(c.destination);
  src.start(at);
  return true;
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

export type SoundKind = 'send' | 'receive' | 'open' | 'sticker' | 'alert' | 'unlock' | 'premium' | 'spark';

const SAMPLE_FOR: Record<SoundKind, [SampleName, number]> = {
  send: ['vzkaz-odeslany', 0.6],
  sticker: ['vzkaz-odeslany', 0.6],
  receive: ['vzkaz-prichozi', 0.7],
  alert: ['stek', 0.55], // nový vzkaz, když je otevřený seznam místností
  open: ['obalka-otevreni', 0.7],
  unlock: ['odemceni', 0.7],
  premium: ['premium', 0.7],
  spark: ['vyti-kratke', 0.5], // připomínka „Kde seš?“
};

export function sound(kind: SoundKind) {
  if (!getPrefs().sound) return;
  const c = audio();
  if (!c) return;
  loadSamples(c);
  const [name, vol] = SAMPLE_FOR[kind];
  if (play(c, name, vol)) return;
  const t = c.currentTime + 0.01;
  switch (kind) {
    case 'send': // krátké "fff-pop" nahoru
      tone(c, 520, t, 0.12, 0.12, 'sine', 880);
      break;
    case 'receive': // dva jemné tóny
    case 'alert':
    case 'spark':
      tone(c, 784, t, 0.18, 0.1);
      tone(c, 1046, t + 0.11, 0.26, 0.08);
      break;
    case 'open': // rozlepení obálky
    case 'unlock':
    case 'premium':
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
  haptic(kind === 'receive' || kind === 'alert' || kind === 'spark' ? 'receive' : kind === 'send' || kind === 'sticker' ? 'send' : 'tap');
}

// --- Kostka ------------------------------------------------------------------

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const len = Math.floor(c.sampleRate * 0.08);
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  return noiseBuf;
}

/** Jedno cvaknutí kostky o stůl (krátký filtrovaný šum + tělo tónu). */
function clack(c: AudioContext, at: number, vol: number, pitch: number) {
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = pitch; bp.Q.value = 2.5;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(at); src.stop(at + 0.09);
  tone(c, pitch / 6, at, 0.05, vol * 0.35, 'triangle');
}

/** Zvuk rotující kostky: cvakání, které se postupně zpomaluje, a nakonec dopad. */
export function diceRollSound(durMs: number) {
  if (!getPrefs().sound) return;
  const c = audio();
  if (!c) return;
  const start = c.currentTime + 0.02;
  const dur = Math.max(0.2, durMs / 1000);
  // nahrané chrastění (1 s) a cinknutí při dopadu
  if (dur >= 1 && samples.has('kostka-hod') && samples.has('kostka-cislo')) {
    play(c, 'kostka-hod', 0.75, start);
    play(c, 'kostka-cislo', 0.6, start + dur);
    return;
  }
  let t = 0;
  let gap = 0.045;
  while (t < dur - 0.08) {
    const k = t / dur; // 0 → 1
    clack(c, start + t, 0.22 * (1 - k * 0.5), 1900 + Math.random() * 1300 - k * 600);
    gap *= 1.09 + Math.random() * 0.05; // zpomaluje se
    t += gap;
  }
  // dopad: hlubší ťuk + krátký dozvuk
  clack(c, start + dur, 0.32, 1100);
  clack(c, start + dur + 0.09, 0.12, 1500);
}

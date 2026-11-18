// Jiskra: ikona „nažhavenosti“ místnosti. Bez zprávy postupně chladne, po 72 h přijde připomínka.
import { type Gender } from './backend';
import { t } from './i18n';

export const SPARK_MS = 72 * 3600_000;
export type SparkLevel = 'hot' | 'warm' | 'cool' | 'cold';

/** Poslední aktivita = novější z času na serveru a poslední zprávy. */
export function lastActivity(...times: (string | null | undefined)[]) {
  return Math.max(0, ...times.map((x) => (x ? new Date(x).getTime() : 0)));
}

export function sparkLevel(last: number, now = Date.now()): SparkLevel | null {
  if (!last) return null;
  const h = (now - last) / 3600_000;
  return h < 24 ? 'hot' : h < 48 ? 'warm' : h < 72 ? 'cool' : 'cold';
}

export const sparkTitle = (l: SparkLevel) => ({
  hot: t('Jiskra: žhavé', 'Spark: hot'), warm: t('Jiskra: hřeje', 'Spark: warm'),
  cool: t('Jiskra: chladne', 'Spark: cooling'), cold: t('Jiskra vychladla', 'Spark has gone cold'),
})[l];

/** Zpráva od Jiskry pro čtenáře (rod podle toho, kdo ji čte). */
export const sparkText = (reader: Gender) =>
  t(`Kde seš? Dlouho jsi nic ${reader === 'zena' ? 'nenapsala' : 'nenapsal'}.`, 'Where are you? You haven’t written in a while.');

export function SparkIcon({ level }: { level: SparkLevel }) {
  return <span className={'spark spark-' + level} role="img" aria-label={sparkTitle(level)} title={sparkTitle(level)}>{level === 'cold' ? '🪵' : '🔥'}</span>;
}

import { isEn } from '../lib/i18n';

export function when(iso: string): string {
  const en = isEn();
  const loc = en ? 'en-GB' : 'cs-CZ';
  const at = en ? ' at ' : ' v ';
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return (en ? 'today' : 'dnes') + at + time;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return (en ? 'yesterday' : 'včera') + at + time;
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'numeric' }) + at + time;
}

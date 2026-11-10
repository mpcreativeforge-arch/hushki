export function when(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `dnes v ${time}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `včera v ${time}`;
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) + ` v ${time}`;
}

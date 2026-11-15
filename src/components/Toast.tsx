import { useEffect, useState } from 'react';

// Krátké potvrzení dole na obrazovce („Vzkaz smazán“). Volá se odkudkoli přes toast().
type Item = { id: number; text: string };
let seq = 0;
const subs = new Set<(i: Item) => void>();

export function toast(text: string) { const i = { id: ++seq, text }; subs.forEach((f) => f(i)); }

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const on = (i: Item) => {
      setItems((cur) => [...cur.slice(-1), i]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== i.id)), 2400);
    };
    subs.add(on);
    return () => { subs.delete(on); };
  }, []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((i) => <div key={i.id} className="toast">{i.text}</div>)}
    </div>
  );
}

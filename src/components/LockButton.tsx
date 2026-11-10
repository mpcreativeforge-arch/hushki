import { useState } from 'react';

/** Zámek v hlavičce: po ťuknutí krátce „cvakne“ a teprve pak aplikaci zamkne. */
export function LockButton({ onLock }: { onLock: () => void }) {
  const [busy, setBusy] = useState(false);
  const click = () => {
    if (busy) return;
    setBusy(true);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(onLock, reduce ? 0 : 280);
  };
  return (
    <button className={'icon-btn lock-btn' + (busy ? ' locking' : '')} aria-label="Zamknout" onClick={click}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="5" y="11" width="14" height="9" rx="2.5" />
        <path className="shackle" d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </button>
  );
}

import { Component, type ReactNode } from 'react';

/** Místo prázdné obrazovky ukáže hlášku s chybou a možnost načíst aplikaci znovu. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const cs = (navigator.language || '').startsWith('cs');
    return (
      <div className="app">
        <div className="grow stack" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <h1>{cs ? 'Něco se pokazilo' : 'Something went wrong'}</h1>
          <p className="muted">{cs ? 'Zkus aplikaci načíst znovu. Pokud se to opakuje, pošli nám text níže.' : 'Try reloading the app. If it keeps happening, send us the text below.'}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.7, textAlign: 'left' }}>{String(error.message || error)}</pre>
          <button className="btn primary" onClick={() => location.reload()}>{cs ? 'Načíst znovu' : 'Reload'}</button>
        </div>
      </div>
    );
  }
}

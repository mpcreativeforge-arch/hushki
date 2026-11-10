const base = import.meta.env.BASE_URL;
const src = `${base}hushki-logo.png`;
const wordmark = `${base}hushki-wordmark.png`;

export function Logo({ size = 120, className = '' }: { size?: number; className?: string }) {
  return <img src={src} width={size} height={size} alt="Hushki" className={'logo ' + className} />;
}

/** Celé logo: pes + nápis Hushki. */
export function Wordmark({ height = 80, className = '' }: { height?: number; className?: string }) {
  return <img src={wordmark} height={height} style={{ width: 'auto', maxWidth: '100%' }} alt="Hushki" className={'logo ' + className} />;
}

export function Brand() {
  return <img src={wordmark} height={32} style={{ width: 'auto' }} alt="Hushki" className="brand-mark" />;
}

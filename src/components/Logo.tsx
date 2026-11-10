const src = `${import.meta.env.BASE_URL}hushki-logo.png`;

export function Logo({ size = 120, className = '' }: { size?: number; className?: string }) {
  return <img src={src} width={size} height={size} alt="Hushki" className={'logo ' + className} />;
}

/** Malé logo + nápis do horní lišty. */
export function Brand() {
  return (
    <span className="brand-row">
      <img src={src} width={30} height={30} alt="" />
      <span className="brand">Hushki</span>
    </span>
  );
}

// Ručně kreslená obálka (stejný styl jako ikona aplikace).
export function Envelope({ size = 120, open = false, sparks = true, className = '' }: { size?: number; open?: boolean; sparks?: boolean; className?: string }) {
  return (
    <svg className={className} width={size} height={size * 0.8} viewBox="0 0 150 120" fill="none" aria-hidden="true">
      <g stroke="var(--cream)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 34 C 13 52, 15 78, 17 98 C 52 96, 96 95, 132 92 C 133 72, 131 48, 129 26 C 92 28, 50 31, 14 34 Z" />
        {open ? (
          <path d="M14 34 C 40 14, 62 4, 73 2 C 88 6, 110 16, 129 26" />
        ) : (
          <path d="M15 36 C 36 50, 56 62, 72 70 C 92 58, 112 42, 128 28" />
        )}
        <path d="M18 96 C 34 82, 48 72, 58 64" />
        <path d="M130 90 C 116 80, 100 70, 88 62" />
        {sparks && (
          <>
            <path d="M138 12 L 132 22" />
            <path d="M146 26 L 136 30" />
            <path d="M146 42 L 137 40" />
          </>
        )}
        <path d="M24 74 l 3 -6 M 27 82 l 3 -6" strokeWidth="2.4" opacity=".8" />
      </g>
      {!open && (
        <path
          d="M72 80 C 60 72, 60 62, 67 61 C 70 60.5, 72 63, 72 65 C 73 62, 76 60, 79 61 C 86 63, 84 73, 72 80 Z"
          fill="var(--coral)"
          stroke="var(--wine-900)"
          strokeWidth="2.5"
        />
      )}
    </svg>
  );
}

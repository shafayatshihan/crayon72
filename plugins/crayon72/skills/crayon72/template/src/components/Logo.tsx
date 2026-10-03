import { useId } from 'react';

/** Four crayons, fanned, in the app's topic tints. Drawn back-to-front so they shingle. */
const CRAYONS = [
  { a: -21, light: '#7cc2ff', dark: '#3a6fd8' }, // sky
  { a: -7, light: '#ffb067', dark: '#c96a1e' }, // peach
  { a: 7, light: '#5fd9a4', dark: '#1d8f62' }, // mint
  { a: 21, light: '#ff9ec4', dark: '#d1456f' }, // rose
];

/** App-icon mark: continuous-corner squircle holding a fanned bundle of crayons. */
export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1c2a4a" />
          <stop offset="1" stopColor="#05060a" />
        </linearGradient>
        {CRAYONS.map((c, i) => (
          // across-the-barrel shading, so each crayon reads as a tube
          <linearGradient key={i} id={`c${i}${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={c.dark} />
            <stop offset="0.38" stopColor={c.light} />
            <stop offset="1" stopColor={c.dark} />
          </linearGradient>
        ))}
      </defs>
      {/* superellipse-ish squircle */}
      <path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill={`url(#bg${id})`} />
      {CRAYONS.map((c, i) => (
        <g key={i} transform={`rotate(${c.a} 32 57)`}>
          <path d="M27 19 L32 9 L37 19 Z" fill={c.dark} />
          <rect x="27" y="18.5" width="10" height="37" rx="2.4" fill={`url(#c${i}${id})`} />
          <rect x="27" y="26" width="10" height="6" fill="#fff" opacity="0.5" />
          <rect x="28.5" y="21" width="2.1" height="32" rx="1.05" fill="#fff" opacity="0.26" />
        </g>
      ))}
    </svg>
  );
}

export function Logo({ className = '', mark = true, size = 22 }: { className?: string; mark?: boolean; size?: number }) {
  return (
    <span className={'inline-flex items-center gap-2 select-none text-ink ' + className}>
      {mark && <LogoMark size={size + 4} />}
      <span className="font-display tracking-[-0.03em]" style={{ fontSize: size, fontWeight: 600, lineHeight: 1 }}>
        Crayon<sup className="ml-[1px] font-rounded" style={{ fontSize: size * 0.48, verticalAlign: 'super' }}>72</sup>
      </span>
    </span>
  );
}

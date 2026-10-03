// Line glyphs (24×24, stroke = currentColor) for topics and lectures. This starter set is mechanical; add your own below.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...rest,
});

/* ---------------- the machine ---------------- */

/** Engine lathe in side view: bed, headstock, job between centres, tool. */
export const Lathe = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <rect x="2" y="8" width="5" height="7" rx="1" />
    <path d="M7 11.5h10" />
    <path d="M17 9.5v4" />
    <path d="M2 18h20" />
    <path d="M4 15v3M19 15v3" opacity=".5" />
    <path d="M12 14.5v2" />
  </svg>
);

/** Lathe bed and guideways, seen along the axis. */
export const Bed = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M2 17h20" />
    <path d="M4 17v-4h16v4" />
    <path d="M7 13v-2M12 13v-2M17 13v-2" opacity=".55" />
  </svg>
);

/** Chuck face: three jaws at 120° closing on the centre. */
export const Chuck = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M12 3.5v3.9M6.1 16.4l3.4-2M17.9 16.4l-3.4-2" />
  </svg>
);

/** Steady / follower rest: a bracket closing on a turning bar. */
export const Rest = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M2 12h20" />
    <path d="M8 5.5a7 7 0 0 0 0 13" />
    <path d="M8 8.5h2.6M8 15.5h2.6" />
    <path d="M14 12h6" opacity=".5" />
  </svg>
);

/** Apron: feed rod and lead screw with the apron box straddling them. */
export const Apron = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M2 8h20" />
    <path d="M2 14h20" />
    <path d="M5 12.6l1.4 2.8M9 12.6l1.4 2.8M13 12.6l1.4 2.8M17 12.6l1.4 2.8" opacity=".55" />
    <rect x="8" y="5.5" width="8" height="5" rx="1" />
  </svg>
);

/** Spindle running in two bearings. */
export const Spindle = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M3 12h18" />
    <rect x="5" y="8.5" width="3.5" height="7" rx="1" />
    <rect x="14" y="8.5" width="3.5" height="7" rx="1" />
    <path d="M21 10v4" opacity=".6" />
  </svg>
);

/* ---------------- drives & speeds ---------------- */

/** Two meshing gears. */
export const GearTrain = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="8.5" cy="12" r="4.6" />
    <circle cx="8.5" cy="12" r="1.3" />
    <path d="M8.5 5.6v1.8M8.5 16.6v1.8M2.4 12h1.7M12.9 12h1.7" />
    <circle cx="17.5" cy="14.5" r="3.1" />
    <path d="M17.5 10.6v1.2M17.5 17.2v1.2M13.6 14.5h1.2M20.2 14.5h1.2" opacity=".7" />
  </svg>
);

/** Belt drive over a stepped cone pulley. */
export const BeltDrive = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="6.5" cy="12" r="3.6" />
    <circle cx="17.5" cy="12" r="5.2" />
    <path d="M6.5 8.4h11" />
    <path d="M6.5 15.6h11" />
  </svg>
);

/** Back gear: a big wheel driven down through a small pinion. */
export const BackGear = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="8" cy="8" r="4.4" />
    <circle cx="8" cy="8" r="1.2" />
    <circle cx="17" cy="16" r="2.9" />
    <circle cx="17" cy="16" r="0.9" />
    <path d="M11.4 10.8l3.2 3" />
    <path d="M8 2.2v1.4M8 12.4v1.4M2.2 8h1.4M12.4 8h1.4" opacity=".6" />
  </svg>
);

/** Speed box: a stack of sliding cluster gears on two shafts. */
export const SpeedBox = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
    <path d="M2.5 9h19M2.5 15h19" opacity=".45" />
    <rect x="6" y="6.3" width="4" height="2.7" rx=".6" />
    <rect x="12" y="12.3" width="5" height="2.7" rx=".6" />
    <rect x="8" y="16.3" width="3" height="2.7" rx=".6" />
  </svg>
);

/** Geometric progression of speeds: bars stepping up by a constant ratio. */
export const Steps = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M3 19h18" />
    <path d="M4.5 19v-2.4M9 19v-4.6M13.5 19v-7.6M18 19v-11.6" />
    <path d="M4 5.5l3 -1.6 3 1.2 3 -1.8 3 1" opacity=".5" />
  </svg>
);

/** A clutch: two discs about to engage. */
export const Clutch = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M2 12h3.5M18.5 12H22" />
    <path d="M9 6.5v11" />
    <path d="M15 6.5v11" />
    <path d="M5.5 9v6M18.5 9v6" opacity=".5" />
    <path d="M10.6 9.5l2.8 0M10.6 14.5l2.8 0" opacity=".7" />
  </svg>
);

/** Flow-chart glyph for the principal-movement chain. */
export const Flow = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <rect x="3" y="3.5" width="7" height="4.5" rx="1" />
    <rect x="14" y="9.75" width="7" height="4.5" rx="1" />
    <rect x="3" y="16" width="7" height="4.5" rx="1" />
    <path d="M10 5.75h2a2 2 0 0 1 2 2v2.2" opacity=".7" />
    <path d="M14 14.25h-2a2 2 0 0 0-2 2v2" opacity=".7" />
  </svg>
);

/* ---------------- feed & threads ---------------- */

/** Norton / feed gear box: a cone of gears with a tumbler arm. */
export const FeedBox = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M3 17h18" />
    <path d="M5 17v-2.2M8.5 17v-4.4M12 17v-6.6M15.5 17v-8.8" />
    <circle cx="18.6" cy="7.4" r="2.1" />
    <path d="M17.1 8.9L13 13" opacity=".7" />
  </svg>
);

/** Screw thread on a shaft. */
export const Thread = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M2 12h20" opacity=".35" />
    <path d="M4 8.5c2 0 2 7 4 7s2-7 4-7 2 7 4 7 2-7 4-7" />
  </svg>
);

/** Half nut: a split nut closing on the lead screw. */
export const HalfNut = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M2 12h20" opacity=".35" />
    <path d="M6 4.5h12v4H6zM6 15.5h12v4H6z" />
    <path d="M9 8.5v1.4M15 8.5v1.4M9 14.1v1.4M15 14.1v1.4" opacity=".6" />
  </svg>
);

/** Change gears hung on a quadrant. */
export const ChangeGears = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="7" cy="7.5" r="3.4" />
    <circle cx="15.5" cy="12" r="4.2" />
    <circle cx="9" cy="17" r="2.6" />
    <path d="M4 20.5a14 14 0 0 1 2-13" opacity=".55" />
  </svg>
);

/* ---------------- taper ---------------- */

/** A tapered workpiece. */
export const Taper = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M3 8.5h16l2 2.2v2.6l-2 2.2H3z" />
    <path d="M3 8.5v7" opacity=".6" />
    <path d="M12 2.5v3M19 2.5v3" opacity=".4" />
  </svg>
);

/** Compound rest swivelled through an angle, with its protractor. */
export const Swivel = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M3 18h18" />
    <path d="M6 18L18 7" />
    <path d="M6 18a9 9 0 0 1 2.6-6.4" opacity=".6" />
    <rect x="14.5" y="4.5" width="5" height="3" rx=".7" transform="rotate(-42 17 6)" />
  </svg>
);

/** Taper attachment: guide bar set at an angle on a bracket. */
export const Attachment = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M2 19h20" />
    <path d="M4 19v-3h16v3" opacity=".5" />
    <path d="M4.5 12.5L19.5 6" />
    <rect x="10" y="7.6" width="4" height="3" rx=".7" transform="rotate(-23 12 9.1)" />
  </svg>
);

/** Swing over bed: the largest diameter a lathe will take. */
export const Swing = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="12" cy="10.5" r="6.5" />
    <path d="M2 19h20" />
    <path d="M12 10.5L17.6 7" opacity=".7" />
    <path d="M5.5 19v-2M18.5 19v-2" opacity=".5" />
  </svg>
);

/* ---------------- other machines (later teachers) ---------------- */

/** Vertical milling machine. */
export const Mill = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M3 20h18" />
    <path d="M4.5 20V5h4v15" />
    <path d="M8.5 6.5h9v3" />
    <path d="M15.5 9.5v3" />
    <path d="M12 16h9" />
    <path d="M13.5 12.5h4v3.5h-4z" />
  </svg>
);

/** Grinding wheel on a workpiece. */
export const Grind = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="12" cy="8.5" r="5.5" />
    <circle cx="12" cy="8.5" r="1.4" />
    <path d="M3 18h18" />
    <path d="M6 14.8l1.4 1.4M9.5 14.2l1 1.8M14.5 14.2l-1 1.8M18 14.8l-1.4 1.4" opacity=".55" />
  </svg>
);

/** Jig / fixture: a part clamped against locators. */
export const Fixture = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M2.5 18h19" />
    <rect x="7" y="9" width="10" height="6" rx="1" />
    <path d="M5 15v3M19 15v3" opacity=".5" />
    <path d="M12 3.5v4" />
    <path d="M9.6 7.5h4.8" />
  </svg>
);

/** CNC / coordinate axes with a cut path. */
export const Cnc = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M7 16.5h4.5V11H16V7" />
    <circle cx="16" cy="7" r="1.5" />
  </svg>
);

/** Fallback: a generic machine-tool block. */
export const Tool = ({ size, ...r }: P) => (
  <svg {...base(size, r)}>
    <rect x="3" y="7" width="18" height="10" rx="2" />
    <path d="M7 7V4.5M17 17v2.5" opacity=".6" />
    <circle cx="12" cy="12" r="2.4" />
  </svg>
);

export const LECTURE_GLYPH: Record<string, (p: P) => JSX.Element> = {
  a1: GearTrain,};

export const TOPIC_GLYPH: Record<string, (p: P) => JSX.Element> = {
  "Levers": Swing,
  "Gear trains": GearTrain,};

/** Dial gauge — used for alignment / acceptance testing. */
export function Gauge({ size, ...r }: P) {
  return (
    <svg {...base(size, r)}>
      <circle cx="12" cy="8.5" r="5.5" />
      <path d="M12 8.5l2.6-2.2" />
      <path d="M12 14v3.5" />
      <path d="M8.5 20.5h7" />
    </svg>
  );
}

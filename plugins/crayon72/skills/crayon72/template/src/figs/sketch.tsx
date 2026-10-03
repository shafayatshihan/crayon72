// Hand-drawn (exam-script style) figure primitives built on rough.js.
import rough from 'roughjs';
import { useMemo, type ReactNode } from 'react';
import type { Options } from 'roughjs/bin/core';

const gen = rough.generator();

type Col = 'pen' | 'red' | 'ink' | 'sub' | 'green';
const COL: Record<Col, string> = {
  pen: 'var(--pen)',
  red: 'var(--pen-2)',
  ink: 'var(--ink)',
  sub: 'var(--sub)',
  green: 'var(--p-ink-mint)',
};

export interface SO {
  c?: Col;
  w?: number;
  fill?: Col | 'soft';
  hachure?: boolean;
  dash?: boolean;
  rough?: number;
}

type Pt = [number, number];

export interface S {
  line(x1: number, y1: number, x2: number, y2: number, o?: SO): ReactNode;
  rect(x: number, y: number, w: number, h: number, o?: SO): ReactNode;
  circle(cx: number, cy: number, d: number, o?: SO): ReactNode;
  ellipse(cx: number, cy: number, w: number, h: number, o?: SO): ReactNode;
  arc(cx: number, cy: number, w: number, h: number, a0: number, a1: number, o?: SO): ReactNode;
  path(d: string, o?: SO): ReactNode;
  curve(pts: Pt[], o?: SO): ReactNode;
  poly(pts: Pt[], o?: SO): ReactNode;
  lines(pts: Pt[], o?: SO): ReactNode;
  arrow(x1: number, y1: number, x2: number, y2: number, o?: SO): ReactNode;
  text(x: number, y: number, t: string, o?: { size?: number; anchor?: 'start' | 'middle' | 'end'; c?: Col; rotate?: number; weight?: number }): ReactNode;
}

function makeS(): S {
  let seed = 7;
  let key = 0;
  const opts = (o: SO = {}): Options => ({
    seed: seed++,
    roughness: o.rough ?? 1.1,
    bowing: 1.2,
    strokeWidth: o.w ?? 1.6,
    stroke: '#111111',
    fill: o.fill ? '#222222' : undefined,
    fillStyle: o.hachure ? 'hachure' : 'solid',
    hachureGap: 5,
    fillWeight: 0.8,
    strokeLineDash: o.dash ? [6, 6] : undefined,
    disableMultiStroke: !!o.dash,
  });
  const draw = (d: ReturnType<typeof gen.line>, o: SO = {}) => {
    const paths = gen.toPaths(d);
    const stroke = COL[o.c ?? 'pen'];
    const fillC = o.fill === 'soft' ? 'var(--action-soft)' : o.fill ? COL[o.fill] : 'none';
    return (
      <g key={key++}>
        {paths.map((p, i) => {
          const isFill = p.stroke === 'none' || !p.stroke;
          const isHach = p.stroke === '#222222';
          return (
            <path
              key={i}
              d={p.d}
              style={{
                stroke: isFill ? 'none' : isHach ? fillC : stroke,
                fill: isFill ? fillC : 'none',
                strokeWidth: isHach ? 0.9 : p.strokeWidth,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                opacity: isFill && o.fill !== 'soft' ? 0.18 : isHach ? 0.55 : 1,
                strokeDasharray: o.dash && !isHach ? '6 6' : undefined,
              }}
            />
          );
        })}
      </g>
    );
  };
  return {
    line: (a, b, c, d, o) => draw(gen.line(a, b, c, d, opts(o)), o),
    rect: (x, y, w, h, o) => draw(gen.rectangle(x, y, w, h, opts(o)), o),
    circle: (x, y, d, o) => draw(gen.circle(x, y, d, opts(o)), o),
    ellipse: (x, y, w, h, o) => draw(gen.ellipse(x, y, w, h, opts(o)), o),
    arc: (x, y, w, h, a0, a1, o) => draw(gen.arc(x, y, w, h, a0, a1, false, opts(o)), o),
    path: (d, o) => draw(gen.path(d, opts(o)), o),
    curve: (pts, o) => draw(gen.curve(pts, opts(o)), o),
    poly: (pts, o) => draw(gen.polygon(pts, opts(o)), o),
    lines: (pts, o) => draw(gen.linearPath(pts, opts(o)), o),
    arrow: (x1, y1, x2, y2, o) => {
      const a = Math.atan2(y2 - y1, x2 - x1);
      const L = 9;
      const h1: Pt = [x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)];
      const h2: Pt = [x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)];
      return (
        <g key={key++}>
          {draw(gen.line(x1, y1, x2, y2, opts(o)), o)}
          {draw(gen.linearPath([h1, [x2, y2], h2], opts({ ...o, rough: 0.5 })), o)}
        </g>
      );
    },
    text: (x, y, t, o = {}) => (
      <text
        key={key++}
        x={x}
        y={y}
        textAnchor={o.anchor ?? 'start'}
        transform={o.rotate ? `rotate(${o.rotate} ${x} ${y})` : undefined}
        style={{ fill: COL[o.c ?? 'pen'], fontSize: o.size ?? 17, fontWeight: o.weight ?? 600 }}
      >
        {t}
      </text>
    ),
  };
}

/** Hand-drawn figure. `draw` is called once (figures are static). */
export function Sketch({ w, h, draw, caption, maxW }: { w: number; h: number; draw: (s: S) => ReactNode[]; caption?: string; maxW?: number }) {
  const nodes = useMemo(() => draw(makeS()), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <figure className="my-3 sketch" style={{ maxWidth: maxW ?? w }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={caption} style={{ overflow: 'visible' }}>
        {nodes}
      </svg>
      {caption && <figcaption className="font-hand text-[17px] pen mt-0.5 text-center">{caption}</figcaption>}
    </figure>
  );
}

/** Clean (description) figure frame */
export function Fig({ children, caption, maxW }: { children: ReactNode; caption?: string; maxW?: number }) {
  return (
    <figure className="my-4 fig-clean rounded-2xl border border-line bg-[var(--surface-2)] p-3 sm:p-4" style={{ maxWidth: maxW }}>
      {children}
      {caption && <figcaption className="text-[13px] text-sub mt-2 text-center">{caption}</figcaption>}
    </figure>
  );
}

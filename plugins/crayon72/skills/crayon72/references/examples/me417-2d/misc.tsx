import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView } from 'framer-motion';
import { AnimFrame, Seg, attrs, useLoop } from './core';

/* ======================================================================
   History timeline — tap a milestone
   ====================================================================== */
const EVENTS = [
  { y: '1858', who: 'J. J. Lenoir', what: 'First marketable engine', d: 'No compression before burning → efficiency below 5%.', key: false },
  { y: '1867', who: 'Otto & Langen', what: 'Atmospheric engine', d: 'Heavy free piston over-expands the gas → efficiency ≈ 11%.', key: false },
  { y: '1872', who: 'George Brayton', what: 'Constant-pressure engine', d: 'Separate pump cylinder, constant-pressure burning.', key: false },
  { y: '1876', who: 'N. A. Otto (Beau de Rochas 1862)', what: 'Four-stroke engine', d: 'In-cylinder compression → engine much smaller & lighter, ≈ 14% efficiency.', key: true },
  { y: '1878', who: 'D. Clerk, J. Robson, K. Benz', what: 'Two-stroke engine', d: 'One power stroke every revolution.', key: true },
  { y: '1880s', who: 'Gottlieb Daimler', what: 'High-speed gasoline engine', d: 'Liquid fuel vaporised in a carburetor.', key: false },
  { y: '1892', who: 'Rudolf Diesel', what: 'Compression-ignition engine', d: 'Compress air only, inject fuel late → high compression without knock.', key: true },
];
export function TimelineAnim() {
  const [sel, setSel] = useState(3);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const e = EVENTS[sel];
  return (
    <AnimFrame title="How the IC engine grew up" hint="Tap a year" caption="Notice the pattern: every big jump in efficiency came from compressing the charge more before burning it.">
      <div ref={ref} className="relative pt-2 pb-1 overflow-x-auto no-scrollbar">
        <div className="relative min-w-[560px] h-[86px]">
          <motion.div className="absolute left-4 right-4 top-[34px] h-[3px] rounded-full origin-left" style={{ background: 'var(--hero-grad)' }} initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}} transition={{ duration: 1.2, ease: [0.25, 0.1, 0.3, 1] }} />
          {EVENTS.map((ev, i) => (
            <motion.button
              key={ev.y}
              type="button"
              data-cursor="link"
              data-sound="select"
              onClick={() => setSel(i)}
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 300, damping: 18 }}
              className="absolute -translate-x-1/2 flex flex-col items-center gap-1"
              style={{ left: `${4 + (i / (EVENTS.length - 1)) * 92}%`, top: 0 }}
            >
              <span className="text-[12px] font-rounded tabular-nums" style={{ color: sel === i ? 'var(--action)' : 'var(--sub)' }}>
                {ev.y}
              </span>
              <motion.span animate={{ scale: sel === i ? 1.35 : 1 }} className="h-4 w-4 rounded-full border-2" style={{ background: ev.key ? 'var(--action)' : 'var(--surface-solid)', borderColor: ev.key ? 'var(--action)' : 'var(--line-strong)', boxShadow: sel === i ? '0 0 0 6px var(--action-soft)' : undefined }} />
              <span className="text-[11px] text-sub max-w-[80px] text-center leading-tight">{ev.what.split(' ').slice(0, 2).join(' ')}</span>
            </motion.button>
          ))}
        </div>
      </div>
      <motion.div key={sel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-2 mt-2 rounded-[16px] bg-[var(--surface-solid)] border border-line p-4">
        <div className="text-[12px] text-sub font-rounded">{e.y}</div>
        <div className="font-display text-[19px] font-semibold tracking-[-0.02em]">{e.what}</div>
        <div className="text-[14px] text-action">{e.who}</div>
        <div className="text-[14.5px] mt-1">{e.d}</div>
      </motion.div>
    </AnimFrame>
  );
}

/* ======================================================================
   Classification builder
   ====================================================================== */
const CLASS = [
  ['Ignition', ['SI', 'CI'], 0],
  ['Cycle', ['4-stroke', '2-stroke'], 0],
  ['Valve location', ['I-head (OHV)', 'L-head'], 0],
  ['Design', ['Reciprocating', 'Rotary (Wankel)'], 0],
  ['Cylinders', ['Single', 'In-line', 'V', 'Opposed', 'W', 'Radial'], 1],
  ['Air intake', ['Natural', 'Supercharged', 'Turbocharged', 'Crankcase'], 0],
  ['Fuel input', ['Carburetor', 'TBI', 'MPFI', 'GDI'], 2],
  ['Fuel', ['Gasoline', 'Diesel', 'CNG', 'LPG', 'Alcohol', 'H₂'], 0],
  ['Cooling', ['Air', 'Liquid'], 1],
  ['Application', ['Car', 'Truck', 'Marine', 'Aircraft', 'Stationary'], 0],
] as const;
export function ClassifyAnim() {
  const [build, setBuild] = useState(false);
  return (
    <AnimFrame
      title="Ten ways to classify an engine"
      controls={
        <button type="button" data-cursor="link" data-sound="success" onClick={() => setBuild((b) => !b)} className="press h-9 px-4 rounded-full bg-[var(--action)] text-white text-[13px] font-medium">
          {build ? 'Clear' : 'Spec a family-car engine'}
        </button>
      }
      caption="For a “use all classification methods” question, pick one option in every box — that’s your specification."
    >
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-1">
        {CLASS.map(([name, opts, pick], i) => (
          <motion.div key={name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className="rounded-[14px] bg-[var(--surface-solid)] border border-line p-2.5">
            <div className="text-[11px] font-semibold text-sub uppercase tracking-wide">{name}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {opts.map((o, k) => (
                <motion.span key={o} animate={build && k === pick ? { scale: [1, 1.15, 1], backgroundColor: 'var(--action)', color: '#fff' } : { scale: 1, backgroundColor: 'var(--fill)', color: 'var(--ink)' }} transition={{ delay: build ? i * 0.08 : 0, duration: 0.35 }} className="text-[11.5px] rounded-full px-2 py-0.5">
                  {o}
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </AnimFrame>
  );
}

/* ======================================================================
   Cylinder layouts with firing pulses
   ====================================================================== */
type Lay = 'i4' | 'i6' | 'v6' | 'v8' | 'flat4' | 'radial';
const LAY: Record<Lay, { n: string; pts: [number, number][]; order: number[]; note: string }> = {
  i4: { n: 'Inline-4', pts: [0, 1, 2, 3].map((i) => [150 + i * 70, 110]), order: [0, 2, 3, 1], note: 'Simple, one head, cheap — most small cars.' },
  i6: { n: 'Inline-6', pts: [0, 1, 2, 3, 4, 5].map((i) => [80 + i * 66, 110]), order: [0, 4, 2, 5, 1, 3], note: 'Naturally balanced and smooth — but long.' },
  v6: { n: 'V6', pts: [0, 1, 2].flatMap((i) => [[190 + i * 70, 76], [225 + i * 70, 146]] as [number, number][]), order: [0, 1, 2, 3, 4, 5], note: 'Half the length of an I-6 — fits sideways in front-wheel-drive cars.' },
  v8: { n: 'V8', pts: [0, 1, 2, 3].flatMap((i) => [[150 + i * 70, 76], [185 + i * 70, 146]] as [number, number][]), order: [0, 7, 3, 2, 5, 4, 6, 1], note: 'More power pulses per revolution → very smooth torque.' },
  flat4: { n: 'Opposed (boxer)', pts: [[200, 70], [270, 70], [200, 150], [270, 150]], order: [0, 3, 1, 2], note: 'Low centre of gravity, good balance.' },
  radial: { n: 'Radial', pts: Array.from({ length: 7 }, (_, i) => [260 + 70 * Math.sin((i * 2 * Math.PI) / 7), 110 - 70 * Math.cos((i * 2 * Math.PI) / 7)] as [number, number]), order: [0, 2, 4, 6, 1, 3, 5], note: 'Star around the crank — aircraft, excellent air cooling.' },
};
export function LayoutsAnim() {
  const [m, setM] = useState<Lay>('v6');
  const box = useRef<HTMLDivElement>(null);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const L = LAY[m];
  useLoop(box, (t) => {
    const k = Math.floor(t * 3) % L.order.length;
    dots.current.forEach((d, i) => {
      if (!d) return;
      const on = L.order[k] === i;
      attrs(d, { fill: on ? '#ff9f0a' : 'var(--fill-2)', r: on ? 25 : 22 });
    });
  });
  return (
    <AnimFrame
      title="Cylinder arrangements (top view)"
      controls={<Seg id="lay" value={m} onChange={setM} options={(Object.keys(LAY) as Lay[]).map((v) => ({ v, label: LAY[v].n }))} />}
      caption={<><b>{L.n}:</b> {L.note} Firing interval (4-stroke) = 720° ÷ {L.pts.length} = <b>{Math.round(720 / L.pts.length)}°</b>.</>}
    >
      <div ref={box}>
        <svg viewBox="0 0 520 220" className="w-full">
          {m === 'radial' && <circle cx={260} cy={110} r={16} fill="var(--ink)" />}
          {m !== 'radial' && <line x1={60} x2={460} y1={110} y2={110} stroke="var(--line-strong)" strokeWidth={6} strokeLinecap="round" />}
          {L.pts.map(([x, y], i) => (
            <motion.circle key={m + i} ref={(el) => (dots.current[i] = el)} initial={{ cx: 260, cy: 110, opacity: 0 }} animate={{ cx: x, cy: y, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 18, delay: i * 0.03 }} r={22} stroke="var(--ink)" strokeWidth={2} />
          ))}
          <text x={260} y={210} fontSize={12} textAnchor="middle" fill="var(--sub)">orange = cylinder firing now</text>
        </svg>
      </div>
    </AnimFrame>
  );
}

/* ======================================================================
   Scavenging flow patterns (SMIL motion along paths)
   ====================================================================== */
type Sc = 'cross' | 'loop' | 'uni';
const SC: Record<Sc, { n: string; path: string; ex: string; note: string }> = {
  cross: { n: 'Cross', path: 'M110 210 C 200 200, 220 120, 290 120', ex: 'M290 200 H360', note: 'Inlet and exhaust ports on opposite sides; a deflector piston throws air up. Simple, but lots of mixing.' },
  loop: { n: 'Loop', path: 'M110 210 C 330 200, 300 30, 160 80 S 120 200, 110 200', ex: 'M110 150 H40', note: 'Both ports on one side; air loops up the far wall and back down. Used in most small two-strokes.' },
  uni: { n: 'Uniflow', path: 'M200 222 C 205 160, 195 100, 200 20', ex: 'M200 22 V-10', note: 'Air enters all round at the bottom, exhaust leaves through a valve at the top: one-way flow, least mixing — best scavenging.' },
};
export function ScavengeAnim() {
  const [m, setM] = useState<Sc>('uni');
  const s = SC[m];
  return (
    <AnimFrame title="Three ways to scavenge" controls={<Seg id="sc" value={m} onChange={setM} options={(Object.keys(SC) as Sc[]).map((v) => ({ v, label: SC[v].n }))} />} caption={<><b>{s.n} scavenging.</b> {s.note}</>}>
      <svg viewBox="0 0 400 240" className="w-full max-w-[420px] mx-auto" key={m}>
        <rect x={120} y={20} width={160} height={200} fill="var(--fill)" stroke="var(--ink)" strokeWidth={3} />
        <rect x={124} y={200} width={152} height={20} fill="var(--fill-2)" />
        {m === 'uni' && (
          <>
            <path d="M184 20 L216 20 L208 10 L192 10 Z" fill="var(--sub)" />
            {[150, 175, 225, 250].map((x) => (
              <rect key={x} x={x - 6} y={210} width={12} height={10} fill="var(--action)" opacity={0.5} />
            ))}
          </>
        )}
        {Array.from({ length: 9 }, (_, i) => (
          <circle key={i} r={5} fill="var(--action)">
            <animateMotion dur="2.4s" repeatCount="indefinite" begin={`-${(i * 0.27).toFixed(2)}s`} path={s.path} />
          </circle>
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <circle key={'e' + i} r={5} fill="var(--faint)">
            <animateMotion dur="1.6s" repeatCount="indefinite" begin={`-${(i * 0.32).toFixed(2)}s`} path={s.ex} />
          </circle>
        ))}
        <text x={200} y={238} fontSize={11} textAnchor="middle" fill="var(--sub)">blue = fresh air · grey = burnt gas leaving</text>
      </svg>
    </AnimFrame>
  );
}

/* ======================================================================
   η_v vs speed: fixed cam vs variable valve timing
   ====================================================================== */
export function VeSpeedAnim() {
  const [vvt, setVvt] = useState(false);
  const early = 'M40 70 C120 34 200 44 380 120';
  const late = 'M40 120 C140 80 250 38 380 56';
  const env = 'M40 70 C120 34 210 32 380 56';
  return (
    <AnimFrame title="Why one cam timing can’t be best at every speed" controls={<Seg id="vvt" value={vvt ? 'y' : 'n'} onChange={(v) => setVvt(v === 'y')} options={[{ v: 'n', label: 'Fixed cams' }, { v: 'y', label: 'With VVT' }]} />} caption={vvt ? 'Variable valve timing shifts the cam with speed, so the engine follows the best curve everywhere.' : 'Early inlet closing suits low speed; late closing (ram effect) suits high speed. A fixed cam is a compromise.'}>
      <svg viewBox="0 0 420 170" className="w-full">
        <line x1={40} y1={150} x2={400} y2={150} stroke="var(--sub)" />
        <line x1={40} y1={150} x2={40} y2={14} stroke="var(--sub)" />
        <text x={400} y={166} fontSize={11} textAnchor="end" fill="var(--sub)">engine speed →</text>
        <text x={46} y={22} fontSize={11} fill="var(--sub)">volumetric efficiency</text>
        <path d={early} stroke="var(--action)" strokeWidth={3} fill="none" opacity={vvt ? 0.25 : 1} />
        <path d={late} stroke="var(--p-ink-rose)" strokeWidth={3} fill="none" opacity={vvt ? 0.25 : 1} />
        <text x={110} y={36} fontSize={11} fill="var(--action)">early IVC</text>
        <text x={320} y={44} fontSize={11} fill="var(--p-ink-rose)">late IVC</text>
        <motion.path d={env} stroke="var(--p-ink-mint)" strokeWidth={5} fill="none" strokeLinecap="round" initial={false} animate={{ pathLength: vvt ? 1 : 0, opacity: vvt ? 1 : 0 }} transition={{ duration: 0.9 }} />
      </svg>
    </AnimFrame>
  );
}

/* ======================================================================
   Scavenging numbers as bars
   ====================================================================== */
function Count({ to, dec = 1 }: { to: number; dec?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.2, onUpdate: (v) => ref.current && (ref.current.textContent = v.toFixed(dec)) });
    return () => c.stop();
  }, [inView, to, dec]);
  return <span ref={ref}>0</span>;
}
export function ScavBarsAnim() {
  const rows = [
    { n: 'Air delivered', v: 130, c: 'var(--action)', d: 'measured' },
    { n: 'Reference (swept vol.)', v: 103.4, c: 'var(--sub)', d: 'ρ·Vd·N' },
    { n: 'Total trapped charge', v: 110.3, c: 'var(--p-ink-lilac)', d: 'ρ·V₁·N' },
    { n: 'Fresh air retained', v: 66.7, c: 'var(--p-ink-mint)', d: 'ṁf ÷ (F/A)' },
  ];
  return (
    <AnimFrame title="What the numbers mean (kg/h)" hint="Visual" caption="Delivery ratio = delivered ÷ reference = 1.26. Scavenging efficiency = retained ÷ trapped = 60%. Trapping efficiency = retained ÷ delivered = 51% — half the air blew straight out.">
      <div className="space-y-2.5 py-2 px-1">
        {rows.map((r, i) => (
          <div key={r.n} className="grid grid-cols-[150px_1fr_56px] items-center gap-3 text-[13px]">
            <div>
              <div className="font-medium">{r.n}</div>
              <div className="text-[11px] text-sub">{r.d}</div>
            </div>
            <div className="h-5 rounded-full bg-[var(--fill)] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: r.c }} initial={{ width: 0 }} whileInView={{ width: `${(r.v / 130) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.9, ease: [0.25, 0.1, 0.3, 1] }} />
            </div>
            <div className="font-rounded tabular-nums text-right">
              <Count to={r.v} />
            </div>
          </div>
        ))}
      </div>
    </AnimFrame>
  );
}

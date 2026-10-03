import { useRef, useState } from 'react';
import { AnimFrame, Slider, attrs, deg, useLoop } from './core';

/* ---------- shared kinematics ---------- */
const R = 40, L = 108, CX = 150, CY = 282;
function slider(th: number) {
  const a = deg(th);
  const pinY = CY - (R * Math.cos(a) + Math.sqrt(L * L - (R * Math.sin(a)) ** 2));
  return { pinY, cpx: CX + R * Math.sin(a), cpy: CY - R * Math.cos(a) };
}
const lift = (a: number, o: number, c: number) => (a < o || a > c ? 0 : Math.sin(Math.PI * ((a - o) / (c - o))) ** 1.3);
const T4 = { IVO: -15, IVC: 225, EVO: 495, EVC: 735 };
const T2 = { EPO: 100, IPO: 115, IPC: 245, EPC: 260 };
const Vr = (th: number, r = 16) => 1 + ((r - 1) / 2) * (1 - Math.cos(deg(th)));

const STROKES = [
  { name: 'Intake', c: 'var(--p-ink-sky)', gas: 'var(--p-sky)', tip: 'Piston moves down, inlet valve open — fresh mixture is sucked in.' },
  { name: 'Compression', c: 'var(--p-ink-lilac)', gas: 'var(--p-lilac)', tip: 'Both valves closed — mixture squeezed into the clearance volume.' },
  { name: 'Power', c: 'var(--p-ink-rose)', gas: 'var(--p-peach)', tip: 'Spark → burning gas pushes the piston down. Only this stroke makes work.' },
  { name: 'Exhaust', c: 'var(--sub)', gas: 'var(--fill-2)', tip: 'Exhaust valve open — piston pushes burnt gas out.' },
];

/* ======================================================================
   Four-stroke engine + synced valve-timing wheel
   ====================================================================== */
export function FourStrokeAnim({ caption }: { caption?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const r = useRef<Record<string, SVGElement | HTMLElement | null>>({});
  const set = (k: string) => (el: SVGElement | HTMLElement | null) => (r.current[k] = el);
  const [playing, setPlaying] = useState(true);
  const [rpm, setRpm] = useState(20);
  const ang4 = useRef(330);
  const bore = 92, top0 = 44, x0 = CX - bore / 2;

  useLoop(
    box,
    (_t, dt) => {
      ang4.current = (ang4.current + dt * rpm * 6) % 720;
      const th = ang4.current;
      const a = th;
      const { pinY, cpx, cpy } = slider(a);
      const pTop = pinY - 22;
      const s = STROKES[Math.floor(a / 180) % 4];
      const iv = Math.max(lift(a, T4.IVO + 720, T4.IVC + 720), lift(a, T4.IVO, T4.IVC));
      const ev = Math.max(lift(a, T4.EVO, T4.EVC), lift(a + 720, T4.EVO, T4.EVC));
      const fire = a > 352 && a < 420 ? 1 - Math.abs(a - 370) / 50 : 0;
      attrs(r.current.gas as SVGElement, { height: Math.max(0, pTop - top0), fill: s.gas });
      attrs(r.current.fire as SVGElement, { height: Math.max(0, pTop - top0), opacity: Math.max(0, fire) });
      attrs(r.current.piston as SVGElement, { transform: `translate(0 ${pTop})` });
      attrs(r.current.rod as SVGElement, { x1: CX, y1: pinY, x2: cpx, y2: cpy });
      attrs(r.current.crank as SVGElement, { x2: cpx, y2: cpy });
      attrs(r.current.iv as SVGElement, { transform: `translate(0 ${iv * 12})` });
      attrs(r.current.ev as SVGElement, { transform: `translate(0 ${ev * 12})` });
      attrs(r.current.ivFlow as SVGElement, { opacity: iv > 0.15 ? iv : 0 });
      attrs(r.current.evFlow as SVGElement, { opacity: ev > 0.15 ? ev : 0 });
      attrs(r.current.spark as SVGElement, { opacity: a > 340 && a < 362 ? 1 : 0 });
      // wheel pointer: one lap per revolution, inner ring = rev 1, outer = rev 2
      attrs(r.current.ptr as SVGElement, { transform: `rotate(${a % 360} 120 120)` });
      attrs(r.current.revDot as SVGElement, { r: a < 360 ? 0 : 5 });
      const L1 = r.current.stroke as HTMLElement, L2 = r.current.tip as HTMLElement, L3 = r.current.deg as HTMLElement;
      if (L1 && L1.textContent !== s.name) {
        L1.textContent = s.name;
        L1.style.color = s.c;
        if (L2) L2.textContent = s.tip;
      }
      if (L3) L3.textContent = `θ = ${Math.round(a)}° · ${a < 360 ? '1st' : '2nd'} revolution · ${iv > 0.05 && ev > 0.05 ? 'VALVE OVERLAP' : iv > 0.05 ? 'inlet open' : ev > 0.05 ? 'exhaust open' : 'valves closed'}`;
    },
    playing,
  );

  // timing wheel arcs (angles clockwise from TDC)
  const arc = (a0: number, a1: number, rad: number) => {
    const p = (a: number) => [120 + rad * Math.sin(deg(a)), 120 - rad * Math.cos(deg(a))];
    const [x0p, y0p] = p(a0), [x1p, y1p] = p(a1);
    return `M${x0p} ${y0p} A${rad} ${rad} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1p} ${y1p}`;
  };

  return (
    <AnimFrame
      title="Four-stroke cycle with real valve timing"
      playing={playing}
      setPlaying={setPlaying}
      controls={<Slider label="Speed" value={rpm} min={4} max={60} onChange={setRpm} />}
      caption={caption}
    >
      <div ref={box} className="grid sm:grid-cols-[1fr_1fr] gap-3 items-center">
        <svg viewBox="0 0 300 360" className="w-full max-w-[300px] mx-auto">
          <defs>
            <linearGradient id="fs-pist" x1="0" x2="1">
              <stop offset="0" stopColor="#8e8e93" />
              <stop offset=".5" stopColor="#f2f2f7" />
              <stop offset="1" stopColor="#636366" />
            </linearGradient>
            <radialGradient id="fs-fire" cx=".5" cy=".15" r=".9">
              <stop offset="0" stopColor="#fff6d6" />
              <stop offset=".4" stopColor="#ffb340" />
              <stop offset="1" stopColor="#ff375f" stopOpacity="0" />
            </radialGradient>
            <marker id="fs-ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="context-stroke" />
            </marker>
          </defs>
          <rect ref={set('gas')} x={x0} y={top0} width={bore} height={100} />
          <rect ref={set('fire')} x={x0} y={top0} width={bore} height={100} fill="url(#fs-fire)" opacity={0} />
          <path d={`M${x0} ${top0} V${CY - 64} M${x0 + bore} ${top0} V${CY - 64}`} stroke="var(--ink)" strokeWidth={3.5} />
          <path d={`M${x0 - 16} ${top0} H${x0 + bore + 16}`} stroke="var(--ink)" strokeWidth={3.5} />
          <path d={`M${x0 + 8} ${top0} L${x0 - 10} ${top0 - 32} M${x0 + 34} ${top0} L${x0 + 22} ${top0 - 32}`} stroke="var(--ink)" strokeWidth={2} />
          <path d={`M${x0 + bore - 8} ${top0} L${x0 + bore + 10} ${top0 - 32} M${x0 + bore - 34} ${top0} L${x0 + bore - 22} ${top0 - 32}`} stroke="var(--ink)" strokeWidth={2} />
          <g ref={set('iv')}>
            <line x1={x0 + 21} y1={top0 - 36} x2={x0 + 21} y2={top0 - 4} stroke="var(--action)" strokeWidth={3} />
            <path d={`M${x0 + 9} ${top0 - 1} L${x0 + 21} ${top0 - 6} L${x0 + 33} ${top0 - 1}Z`} fill="var(--action)" />
          </g>
          <g ref={set('ev')}>
            <line x1={x0 + bore - 21} y1={top0 - 36} x2={x0 + bore - 21} y2={top0 - 4} stroke="var(--sub)" strokeWidth={3} />
            <path d={`M${x0 + bore - 33} ${top0 - 1} L${x0 + bore - 21} ${top0 - 6} L${x0 + bore - 9} ${top0 - 1}Z`} fill="var(--sub)" />
          </g>
          <path ref={set('ivFlow')} d={`M${x0 - 4} ${top0 - 26} l18 26`} stroke="var(--action)" strokeWidth={2.4} markerEnd="url(#fs-ah)" opacity={0} />
          <path ref={set('evFlow')} d={`M${x0 + bore - 18} ${top0 + 2} l18 -26`} stroke="var(--sub)" strokeWidth={2.4} markerEnd="url(#fs-ah)" opacity={0} />
          <text x={x0 - 6} y={top0 - 40} fontSize={11} fill="var(--sub)">Inlet</text>
          <text x={x0 + bore + 6} y={top0 - 40} fontSize={11} fill="var(--sub)" textAnchor="end">Exhaust</text>
          <rect x={CX - 4} y={top0 - 24} width={8} height={20} rx={2} fill="var(--ink)" />
          <g ref={set('spark')} opacity={0}>
            <circle cx={CX} cy={top0 + 8} r={10} fill="#ffd60a" />
            <path d={`M${CX - 8} ${top0 + 18} l6 -7 l-3 -2 l8 -8`} stroke="#fff" strokeWidth={2} fill="none" />
          </g>
          <g ref={set('piston')}>
            <rect x={x0 + 3} y={0} width={bore - 6} height={46} rx={5} fill="url(#fs-pist)" />
            <path d={`M${x0 + 3} 8 H${x0 + bore - 3} M${x0 + 3} 14 H${x0 + bore - 3}`} stroke="#48484a" strokeOpacity=".5" strokeWidth={1.3} />
          </g>
          <line ref={set('rod')} stroke="#8e8e93" strokeWidth={9} strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="var(--line-strong)" strokeDasharray="4 5" />
          <line ref={set('crank')} x1={CX} y1={CY} stroke="var(--action)" strokeWidth={12} strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={6} fill="var(--ink)" />
          <text x={CX + 62} y={CY - 48} fontSize={11} fill="var(--sub)">TDC</text>
          <text x={CX + 62} y={CY + 50} fontSize={11} fill="var(--sub)">BDC</text>
        </svg>
        <div>
          <svg viewBox="0 0 240 240" className="w-full max-w-[230px] mx-auto">
            <circle cx={120} cy={120} r={96} fill="none" stroke="var(--fill-2)" strokeWidth={12} />
            <path d={arc(-15, 225, 96)} stroke="var(--action)" strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.9} />
            <circle cx={120} cy={120} r={74} fill="none" stroke="var(--fill-2)" strokeWidth={12} />
            <path d={arc(135, 375, 74)} stroke="var(--p-ink-rose)" strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.9} />
            <path d={arc(-15, 15, 85)} stroke="#ffd60a" strokeWidth={6} fill="none" />
            <line x1={120} y1={8} x2={120} y2={232} stroke="var(--line-strong)" strokeDasharray="3 4" />
            <g ref={set('ptr')}>
              <line x1={120} y1={120} x2={120} y2={30} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
              <circle cx={120} cy={30} r={6} fill="var(--ink)" />
            </g>
            <circle cx={120} cy={120} r={14} fill="var(--surface-solid)" stroke="var(--ink)" strokeWidth={2} />
            <circle ref={set('revDot')} cx={120} cy={120} r={0} fill="var(--action)" />
            <text x={120} y={6} fontSize={11} textAnchor="middle" fill="var(--sub)">TDC</text>
            <text x={120} y={240} fontSize={11} textAnchor="middle" fill="var(--sub)">BDC</text>
            <text x={8} y={20} fontSize={11} fill="var(--action)">Inlet 15° bTDC → 45° aBDC</text>
            <text x={8} y={226} fontSize={11} fill="var(--p-ink-rose)">Exhaust 45° bBDC → 15° aTDC</text>
          </svg>
          <div ref={set('stroke')} className="mt-1 text-center font-display text-[22px] font-semibold tracking-[-0.02em]" />
          <div ref={set('tip')} className="text-center text-[13px] text-sub min-h-[38px] px-2" />
          <div ref={set('deg')} className="text-center text-[12px] font-rounded tabular-nums text-sub" />
        </div>
      </div>
    </AnimFrame>
  );
}

/* ======================================================================
   Two-stroke crankcase-scavenged engine + synced p & V/Vc plot
   ====================================================================== */
export function TwoStrokeAnim({ caption, uniflow = false }: { caption?: string; uniflow?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const r = useRef<Record<string, SVGElement | HTMLElement | null>>({});
  const set = (k: string) => (el: SVGElement | HTMLElement | null) => (r.current[k] = el);
  const [playing, setPlaying] = useState(true);
  const [rpm, setRpm] = useState(18);
  const ang2 = useRef(0);
  const bore = 92, top0 = 44, x0 = CX - bore / 2;

  const pk = 70;
  const p = (t: number) => {
    if (t <= 12) return 35.6 + (pk - 35.6) * Math.sin((t / 12) * (Math.PI / 2));
    if (t <= T2.EPO) return pk * Math.pow(Vr(12) / Vr(t), 1.3);
    if (t <= 130) {
      const e = pk * Math.pow(Vr(12) / Vr(T2.EPO), 1.3);
      return e - (e - 1.5) * ((t - T2.EPO) / 30);
    }
    if (t <= 250) return 1.5;
    return 1.5 * Math.pow(Vr(250) / Vr(t), 1.35);
  };
  const X = (t: number) => 20 + t * (260 / 360);
  const Yp = (v: number) => 150 - v * 1.85;
  const Yv = (v: number) => 150 - (v / 16) * 120;
  const pPath = Array.from({ length: 73 }, (_, i) => `${i ? 'L' : 'M'}${X(i * 5).toFixed(1)} ${Yp(p(i * 5)).toFixed(1)}`).join(' ');
  const vPath = Array.from({ length: 73 }, (_, i) => `${i ? 'L' : 'M'}${X(i * 5).toFixed(1)} ${Yv(Vr(i * 5)).toFixed(1)}`).join(' ');

  useLoop(
    box,
    (_t, dt) => {
      ang2.current = (ang2.current + dt * rpm * 6) % 360;
      const a = ang2.current;
      const { pinY, cpx, cpy } = slider(a);
      const pTop = pinY - 22;
      const ports = a >= T2.EPO && a <= T2.EPC;
      const scav = a >= T2.IPO && a <= T2.IPC;
      const fire = a < 40 ? 1 - a / 40 : 0;
      attrs(r.current.gas as SVGElement, { height: Math.max(0, pTop - top0), fill: a < T2.EPO ? 'var(--p-peach)' : a < T2.EPC ? 'var(--p-sky)' : 'var(--p-lilac)' });
      attrs(r.current.fire as SVGElement, { height: Math.max(0, pTop - top0), opacity: fire });
      attrs(r.current.piston as SVGElement, { transform: `translate(0 ${pTop})` });
      attrs(r.current.rod as SVGElement, { x1: CX, y1: pinY, x2: cpx, y2: cpy });
      attrs(r.current.crank as SVGElement, { x2: cpx, y2: cpy });
      attrs(r.current.exFlow as SVGElement, { opacity: ports ? 1 : 0 });
      attrs(r.current.scFlow as SVGElement, { opacity: scav ? 1 : 0 });
      attrs(r.current.spark as SVGElement, { opacity: a > 345 || a < 3 ? 1 : 0 });
      attrs(r.current.cursorP as SVGElement, { cx: X(a), cy: Yp(p(a)) });
      attrs(r.current.cursorV as SVGElement, { cx: X(a), cy: Yv(Vr(a)) });
      attrs(r.current.cursorL as SVGElement, { x1: X(a), x2: X(a) });
      const lab = r.current.lab as HTMLElement;
      const txt = a < T2.EPO ? 'Power stroke ↓' : a < T2.IPO ? (uniflow ? 'Exhaust valve opens → blowdown' : 'Exhaust port opens → blowdown') : a < T2.IPC ? 'Scavenging: fresh air pushes burnt gas out' : a < T2.EPC ? (uniflow ? 'Inlet ports covered, exhaust valve still open' : 'Transfer port closed, exhaust still open') : 'Compression ↑';
      if (lab && lab.textContent !== txt) lab.textContent = txt;
      const dg = r.current.dg as HTMLElement;
      if (dg) dg.textContent = `θ = ${Math.round(a)}° aTDC`;
    },
    playing,
  );

  const portY = 196; // ports near BDC
  return (
    <AnimFrame title={uniflow ? 'Uniflow two-stroke: gas exchange' : 'Two-stroke cycle (one revolution)'} playing={playing} setPlaying={setPlaying} controls={<Slider label="Speed" value={rpm} min={4} max={60} onChange={setRpm} />} caption={caption}>
      <div ref={box} className="grid sm:grid-cols-[1fr_1.15fr] gap-3 items-center">
        <svg viewBox="0 0 300 360" className="w-full max-w-[290px] mx-auto">
          <defs>
            <linearGradient id="ts-pist" x1="0" x2="1">
              <stop offset="0" stopColor="#8e8e93" />
              <stop offset=".5" stopColor="#f2f2f7" />
              <stop offset="1" stopColor="#636366" />
            </linearGradient>
            <radialGradient id="ts-fire" cx=".5" cy=".15" r=".9">
              <stop offset="0" stopColor="#fff6d6" />
              <stop offset=".4" stopColor="#ffb340" />
              <stop offset="1" stopColor="#ff375f" stopOpacity="0" />
            </radialGradient>
            <marker id="ts-ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="context-stroke" />
            </marker>
          </defs>
          <rect ref={set('gas')} x={x0} y={top0} width={bore} height={100} />
          <rect ref={set('fire')} x={x0} y={top0} width={bore} height={100} fill="url(#ts-fire)" opacity={0} />
          <path d={`M${x0} ${top0} V${portY - 4} M${x0} ${portY + 30} V${CY - 64} M${x0 + bore} ${top0} V${portY - 4} M${x0 + bore} ${portY + 30} V${CY - 64}`} stroke="var(--ink)" strokeWidth={3.5} />
          <path d={`M${x0 - 16} ${top0} H${x0 + bore + 16}`} stroke="var(--ink)" strokeWidth={3.5} />
          {uniflow ? (
            <>
              <line x1={CX} y1={top0 - 30} x2={CX} y2={top0 - 4} stroke="var(--sub)" strokeWidth={3} />
              <path d={`M${CX - 14} ${top0 - 1} L${CX} ${top0 - 7} L${CX + 14} ${top0 - 1}Z`} fill="var(--sub)" />
              <text x={CX + 18} y={top0 - 18} fontSize={11} fill="var(--sub)">exhaust valve</text>
              <g ref={set('exFlow')} opacity={0}>
                <path d={`M${CX} ${top0 + 40} V${top0 - 26}`} stroke="var(--sub)" strokeWidth={2.4} markerEnd="url(#ts-ah)" />
              </g>
              <g ref={set('scFlow')} opacity={0}>
                {[-28, 0, 28].map((dx) => (
                  <path key={dx} d={`M${CX + dx} ${portY + 20} V${top0 + 50}`} stroke="var(--action)" strokeWidth={2.4} markerEnd="url(#ts-ah)" strokeDasharray="6 6" className="anim-dash" />
                ))}
                <path d={`M${x0 - 34} ${portY + 12} H${x0 + 2}`} stroke="var(--action)" strokeWidth={2.4} markerEnd="url(#ts-ah)" />
                <path d={`M${x0 + bore + 34} ${portY + 12} H${x0 + bore - 2}`} stroke="var(--action)" strokeWidth={2.4} markerEnd="url(#ts-ah)" />
              </g>
              <text x={x0 - 40} y={portY + 46} fontSize={11} fill="var(--sub)">air ports (all round)</text>
            </>
          ) : (
            <>
              <rect x={x0 + bore} y={portY - 4} width={28} height={30} fill="none" stroke="var(--ink)" strokeWidth={2} />
              <text x={x0 + bore + 4} y={portY - 10} fontSize={11} fill="var(--sub)">exhaust port</text>
              <path d={`M${x0} ${portY + 4} H${x0 - 26} V${CY + 24} M${x0} ${portY + 26} H${x0 - 10} V${CY + 24}`} stroke="var(--ink)" strokeWidth={2} fill="none" />
              <text x={x0 - 44} y={portY - 10} fontSize={11} fill="var(--sub)">transfer</text>
              <g ref={set('exFlow')} opacity={0}>
                <path d={`M${x0 + bore - 24} ${portY - 26} L${x0 + bore + 26} ${portY + 10}`} stroke="var(--sub)" strokeWidth={2.4} markerEnd="url(#ts-ah)" />
              </g>
              <g ref={set('scFlow')} opacity={0}>
                <path d={`M${x0 - 18} ${CY + 10} V${portY + 14} L${x0 + 30} ${portY - 40}`} stroke="var(--action)" strokeWidth={2.4} fill="none" markerEnd="url(#ts-ah)" strokeDasharray="6 6" className="anim-dash" />
              </g>
              <path d={`M${x0} ${CY - 64} L${x0 - 36} ${CY - 24} V${CY + 50} H${x0 + bore + 36} V${CY - 24} L${x0 + bore} ${CY - 64}`} stroke="var(--ink)" strokeWidth={2.4} fill="none" />
              <text x={CX} y={CY + 66} fontSize={11} fill="var(--sub)" textAnchor="middle">crankcase = charge pump</text>
            </>
          )}
          <rect x={CX - 4} y={top0 - 24} width={8} height={20} rx={2} fill="var(--ink)" opacity={uniflow ? 0 : 1} />
          {uniflow && <path d={`M${CX + 26} ${top0 - 22} v18`} stroke="var(--p-ink-peach)" strokeWidth={4} />}
          <g ref={set('spark')} opacity={0}>
            <circle cx={CX} cy={top0 + 8} r={10} fill={uniflow ? '#ff9f0a' : '#ffd60a'} />
          </g>
          <g ref={set('piston')}>
            <rect x={x0 + 3} y={0} width={bore - 6} height={46} rx={5} fill="url(#ts-pist)" />
            {!uniflow && <path d={`M${x0 + 10} 0 Q${CX} -10 ${x0 + bore - 10} 0`} fill="url(#ts-pist)" />}
          </g>
          <line ref={set('rod')} stroke="#8e8e93" strokeWidth={9} strokeLinecap="round" />
          <line ref={set('crank')} x1={CX} y1={CY} stroke="var(--action)" strokeWidth={12} strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={6} fill="var(--ink)" />
        </svg>
        <div>
          <svg viewBox="0 0 300 176" className="w-full">
            <rect x={X(T2.EPO)} y={20} width={X(T2.EPC) - X(T2.EPO)} height={130} fill="var(--p-sky)" opacity={0.5} />
            <text x={(X(T2.EPO) + X(T2.EPC)) / 2} y={32} fontSize={10} textAnchor="middle" fill="var(--p-ink-sky)">ports / valve open</text>
            <line x1={20} y1={150} x2={290} y2={150} stroke="var(--sub)" />
            <line x1={20} y1={150} x2={20} y2={14} stroke="var(--sub)" />
            <path d={vPath} stroke="var(--p-ink-rose)" strokeWidth={2.4} fill="none" />
            <path d={pPath} stroke="var(--action)" strokeWidth={2.6} fill="none" />
            {[
              ['EPO', T2.EPO, 0],
              ['IPO', T2.IPO, 1],
              ['IPC', T2.IPC, 1],
              ['EPC', T2.EPC, 0],
            ].map(([n, t, k]) => (
              <g key={String(n)}>
                <line x1={X(+t)} y1={150} x2={X(+t)} y2={k ? 112 : 124} stroke="var(--sub)" />
                <text x={X(+t)} y={k ? 108 : 120} fontSize={9} textAnchor="middle" fill="var(--sub)">
                  {n}
                </text>
              </g>
            ))}
            {[
              ['TC', 0],
              ['BC', 180],
              ['TC', 360],
            ].map(([n, t]) => (
              <text key={String(t)} x={X(+t)} y={166} fontSize={10} textAnchor="middle" fill="var(--sub)">
                {n}
              </text>
            ))}
            <text x={X(14)} y={20} fontSize={11} fill="var(--action)">p</text>
            <text x={X(180)} y={Yv(16) - 6} fontSize={11} fill="var(--p-ink-rose)" textAnchor="middle">
              V/Vc
            </text>
            <line ref={set('cursorL')} y1={14} y2={150} stroke="var(--ink)" strokeOpacity={0.35} />
            <circle ref={set('cursorP')} r={5} fill="var(--action)" stroke="var(--surface-solid)" strokeWidth={2} />
            <circle ref={set('cursorV')} r={5} fill="var(--p-ink-rose)" stroke="var(--surface-solid)" strokeWidth={2} />
          </svg>
          <div ref={set('lab')} className="mt-2 text-center font-display text-[18px] font-semibold tracking-[-0.02em] min-h-[48px] px-2" />
          <div ref={set('dg')} className="text-center text-[12px] font-rounded tabular-nums text-sub" />
        </div>
      </div>
    </AnimFrame>
  );
}

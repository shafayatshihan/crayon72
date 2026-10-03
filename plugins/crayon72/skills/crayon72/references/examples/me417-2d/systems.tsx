import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { AnimFrame, Seg, Slider, attrs, deg, useLoop } from './core';

const Arrow = ({ id }: { id: string }) => (
  <marker id={id} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="context-stroke" />
  </marker>
);

/* ======================================================================
   Supercharger vs turbocharger — with throttle stab to show lag
   ====================================================================== */
export function BoostAnim() {
  const [mode, setMode] = useState<'super' | 'turbo'>('turbo');
  const boost = useMotionValue(0.15);
  const needle = useTransform(boost, [0, 1], [-120, 120]);
  const [spin, setSpin] = useState(2.4);
  const [msg, setMsg] = useState('Press “Floor it” to see how fast boost arrives.');
  useEffect(() => boost.on('change', (v) => setSpin(Math.max(0.25, 2.6 - v * 2.3))), [boost]);
  useEffect(() => {
    boost.set(0.15);
    setMsg('Press “Floor it” to see how fast boost arrives.');
  }, [mode, boost]);
  const floor = () => {
    boost.set(0.15);
    if (mode === 'super') {
      animate(boost, 0.9, { type: 'spring', stiffness: 160, damping: 16 });
      setMsg('Instant boost — the compressor is geared to the crank.');
    } else {
      animate(boost, [0.15, 0.2, 0.9], { duration: 1.8, times: [0, 0.45, 1], ease: [0.5, 0, 0.3, 1] });
      setMsg('Turbo lag — exhaust must first spin the turbine up.');
    }
  };
  const t = mode === 'turbo';
  return (
    <AnimFrame
      title="How boost is made"
      controls={
        <>
          <Seg id="boost" value={mode} onChange={setMode} options={[{ v: 'super', label: 'Supercharger' }, { v: 'turbo', label: 'Turbocharger' }]} />
          <button type="button" data-cursor="link" data-sound="whoosh" onClick={floor} className="press h-9 px-4 rounded-full bg-[var(--action)] text-white text-[13px] font-medium">
            Floor it
          </button>
          <span className="text-[13px] text-sub">{msg}</span>
        </>
      }
      caption="Blue = fresh air (compressed), red = exhaust. Supercharger takes power from the crank through a belt; turbo takes energy from exhaust that would be wasted."
    >
      <svg viewBox="0 0 620 270" className="w-full">
        <defs>
          <Arrow id="b-ah" />
        </defs>
        {/* engine */}
        <rect x={220} y={110} width={190} height={100} rx={16} fill="var(--surface-solid)" stroke="var(--line-strong)" />
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={252 + i * 42} cy={150} r={15} fill="var(--fill)" stroke="var(--line-strong)" />
        ))}
        <text x={315} y={196} fontSize={13} textAnchor="middle" fill="var(--sub)">Engine</text>
        {/* intake */}
        <path d="M20 60 H110" stroke="var(--action)" strokeWidth={14} strokeLinecap="round" opacity={0.18} />
        <path d="M20 60 H96" stroke="var(--action)" strokeWidth={3} strokeDasharray="8 10" className="anim-dash" markerEnd="url(#b-ah)" />
        <text x={20} y={46} fontSize={12} fill="var(--sub)">air in</text>
        <path d="M168 60 H250 V110" stroke="var(--action)" strokeWidth={14} fill="none" opacity={0.28} />
        <path d="M168 60 H250 V104" stroke="var(--action)" strokeWidth={3} fill="none" strokeDasharray="8 10" className="anim-dash" style={{ animationDuration: `${spin * 0.5}s` }} markerEnd="url(#b-ah)" />
        <rect x={190} y={44} width={34} height={32} rx={6} fill="var(--p-teal)" stroke="var(--p-ink-teal)" />
        <text x={207} y={38} fontSize={10} textAnchor="middle" fill="var(--p-ink-teal)">intercooler</text>
        {/* compressor */}
        <g transform="translate(139 60)">
          <circle r={30} fill="var(--surface-solid)" stroke="var(--action)" strokeWidth={2.5} />
          <g className="anim-spin" style={{ animationDuration: `${spin}s` }}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <path key={a} d="M0 0 C 8 -10, 18 -12, 22 -4" stroke="var(--action)" strokeWidth={3} fill="none" transform={`rotate(${a})`} />
            ))}
          </g>
          <text y={48} fontSize={12} textAnchor="middle" fill="var(--action)">compressor</text>
        </g>
        {t ? (
          <>
            {/* turbine + shaft + exhaust */}
            <line x1={169} y1={60} x2={460} y2={60} stroke="var(--ink)" strokeWidth={4} strokeOpacity={0.5} />
            <text x={315} y={52} fontSize={11} textAnchor="middle" fill="var(--sub)">common shaft</text>
            <path d="M380 110 V90 H460" stroke="var(--p-ink-rose)" strokeWidth={14} fill="none" opacity={0.2} />
            <path d="M380 110 V90 H430" stroke="var(--p-ink-rose)" strokeWidth={3} fill="none" strokeDasharray="8 10" className="anim-dash" markerEnd="url(#b-ah)" />
            <g transform="translate(490 60)">
              <circle r={30} fill="var(--surface-solid)" stroke="var(--p-ink-rose)" strokeWidth={2.5} />
              <g className="anim-spin" style={{ animationDuration: `${spin}s` }}>
                {[0, 60, 120, 180, 240, 300].map((a) => (
                  <path key={a} d="M0 0 C 8 -10, 18 -12, 22 -4" stroke="var(--p-ink-rose)" strokeWidth={3} fill="none" transform={`rotate(${a})`} />
                ))}
              </g>
              <text y={48} fontSize={12} textAnchor="middle" fill="var(--p-ink-rose)">turbine</text>
            </g>
            <path d="M520 60 H600" stroke="var(--p-ink-rose)" strokeWidth={3} strokeDasharray="8 10" className="anim-dash" markerEnd="url(#b-ah)" />
            <text x={560} y={46} fontSize={12} textAnchor="middle" fill="var(--sub)">exhaust out</text>
            <rect x={436} y={100} width={56} height={22} rx={6} fill="var(--fill)" />
            <text x={464} y={115} fontSize={10} textAnchor="middle" fill="var(--sub)">wastegate</text>
          </>
        ) : (
          <>
            {/* belt drive from crank */}
            <circle cx={315} cy={238} r={16} fill="var(--surface-solid)" stroke="var(--ink)" strokeWidth={2} />
            <text x={340} y={256} fontSize={11} fill="var(--sub)">crank pulley</text>
            <path d="M126 86 L300 230 M152 86 L330 230" stroke="var(--ink)" strokeWidth={2.5} strokeDasharray="10 6" className="anim-dash" style={{ animationDuration: `${spin * 0.6}s` }} />
            <text x={196} y={176} fontSize={12} fill="var(--sub)" transform="rotate(40 196 176)">belt (takes engine power)</text>
            <path d="M410 160 H560" stroke="var(--p-ink-rose)" strokeWidth={3} strokeDasharray="8 10" className="anim-dash" markerEnd="url(#b-ah)" />
            <text x={485} y={150} fontSize={12} textAnchor="middle" fill="var(--sub)">exhaust (wasted)</text>
          </>
        )}
        {/* boost gauge */}
        <g transform="translate(540 205)">
          <path d="M-46 0 A46 46 0 0 1 46 0" fill="none" stroke="var(--fill-2)" strokeWidth={8} strokeLinecap="round" />
          <path d="M18 -42 A46 46 0 0 1 46 0" fill="none" stroke="var(--p-ink-rose)" strokeWidth={8} strokeLinecap="round" opacity={0.6} />
          <motion.g style={{ rotate: needle }}>
            <line x1={0} y1={0} x2={0} y2={-40} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
          </motion.g>
          <circle r={5} fill="var(--ink)" />
          <text y={22} fontSize={11} textAnchor="middle" fill="var(--sub)">boost</text>
        </g>
      </svg>
    </AnimFrame>
  );
}

/* ======================================================================
   Where the fuel enters: carb / TBI / MPFI / GDI and CI: DI / IDI
   ====================================================================== */
type FM = 'carb' | 'tbi' | 'mpfi' | 'gdi' | 'di' | 'idi';
const FMINFO: Record<FM, { t: string; d: string }> = {
  carb: { t: 'Carburetor', d: 'Venturi suction draws fuel into the air. Simple but inaccurate; fuel film forms on manifold walls.' },
  tbi: { t: 'Throttle-body injection', d: 'One injector at the throttle body (single point). Electronic, but fuel still travels the whole manifold.' },
  mpfi: { t: 'Multipoint port injection', d: 'One injector per cylinder, spraying on the back of the inlet valve. Accurate and quick response.' },
  gdi: { t: 'Gasoline direct injection', d: 'High-pressure injector inside the cylinder. Charge cooling lets you raise compression ratio.' },
  di: { t: 'Direct injection (CI)', d: 'Multi-hole nozzle sprays into a bowl in the piston. Needs very high pressure to atomise and mix.' },
  idi: { t: 'Indirect injection (CI)', d: 'Fuel sprayed into a small swirl pre-chamber; strong swirl does the mixing, so lower pressure works.' },
};
export function FuelEntryAnim({ initial = 'mpfi' as FM, ci = false }) {
  const [m, setM] = useState<FM>(ci ? 'di' : initial);
  const si = m === 'carb' || m === 'tbi' || m === 'mpfi' || m === 'gdi';
  const injX = m === 'carb' ? 90 : m === 'tbi' ? 140 : m === 'mpfi' ? 330 : 470;
  const opts = (ci ? ['di', 'idi'] : ['carb', 'tbi', 'mpfi', 'gdi']) as FM[];
  return (
    <AnimFrame title="Where the fuel enters" controls={<Seg id={'fuel' + ci} value={m} onChange={setM} options={opts.map((v) => ({ v, label: FMINFO[v].t.split(' (')[0] }))} />} caption={<><b>{FMINFO[m].t}.</b> {FMINFO[m].d}</>}>
      <svg viewBox="0 0 620 250" className="w-full">
        <defs>
          <Arrow id="f-ah" />
          <radialGradient id="spray" cx=".5" cy="0" r="1">
            <stop offset="0" stopColor="var(--p-ink-peach)" stopOpacity=".95" />
            <stop offset="1" stopColor="var(--p-ink-peach)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {si ? (
          <>
            <path d="M20 110 H380 L430 80" stroke="var(--ink)" strokeWidth={3} fill="none" />
            <path d="M20 160 H390 L440 140" stroke="var(--ink)" strokeWidth={3} fill="none" />
            <path d="M30 135 H360" stroke="var(--action)" strokeWidth={3} strokeDasharray="8 12" className="anim-dash" markerEnd="url(#f-ah)" />
            <text x={30} y={100} fontSize={12} fill="var(--sub)">air →</text>
            {/* throttle */}
            <line x1={200} y1={118} x2={214} y2={152} stroke="var(--ink)" strokeWidth={4} />
            <text x={196} y={182} fontSize={11} fill="var(--sub)">throttle</text>
            {/* wall film */}
            <motion.rect x={60} y={155} width={0} height={5} rx={2.5} fill="var(--p-ink-peach)" initial={{ width: 0 }} animate={{ width: m === 'carb' || m === 'tbi' ? 320 : m === 'mpfi' ? 40 : 0, opacity: m === 'gdi' ? 0 : 0.8, x: m === 'mpfi' ? 340 : 60 }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
            {(m === 'carb' || m === 'tbi') && <text x={70} y={178} fontSize={11} fill="var(--p-ink-peach)">wall wetting → slow response</text>}
            {/* cylinder */}
            <rect x={440} y={40} width={150} height={190} rx={8} fill="none" stroke="var(--ink)" strokeWidth={3} />
            <rect x={446} y={160} width={138} height={64} rx={6} fill="var(--fill-2)" className="anim-piston" />
            <path d="M432 82 L452 64" stroke="var(--action)" strokeWidth={4} />
            {/* injector / carb */}
            <motion.g animate={{ x: injX, y: m === 'gdi' ? -20 : 0 }} transition={{ type: 'spring', stiffness: 140, damping: 18 }}>
              {m === 'carb' ? (
                <>
                  <path d="M-20 104 Q0 124 20 104" stroke="var(--ink)" strokeWidth={2} fill="none" />
                  <rect x={-14} y={60} width={28} height={30} rx={4} fill="var(--p-peach)" stroke="var(--p-ink-peach)" />
                  <path d="M0 90 V118" stroke="var(--p-ink-peach)" strokeWidth={2} />
                  <text y={52} fontSize={11} textAnchor="middle" fill="var(--p-ink-peach)">float bowl</text>
                </>
              ) : (
                <>
                  <rect x={-8} y={m === 'gdi' ? 60 : 70} width={16} height={34} rx={4} fill="var(--ink)" transform={m === 'gdi' ? 'rotate(35 0 90)' : m === 'mpfi' ? 'rotate(30 0 90)' : undefined} />
                  <path d={m === 'gdi' ? 'M14 104 L40 150 L-6 150 Z' : m === 'mpfi' ? 'M10 108 L46 140 L18 152 Z' : 'M0 108 L-18 150 L18 150 Z'} fill="url(#spray)" className="anim-spray" />
                  <text y={58} fontSize={11} textAnchor="middle" fill="var(--sub)">{m === 'gdi' ? 'injector (50–200 bar)' : 'injector (≈ 3 bar)'}</text>
                </>
              )}
            </motion.g>
          </>
        ) : (
          <>
            <rect x={160} y={30} width={300} height={200} rx={10} fill="none" stroke="var(--ink)" strokeWidth={3} />
            <path d="M170 170 H230 Q310 230 390 170 H450 V222 H170 Z" fill="var(--fill-2)" className="anim-piston" />
            {m === 'di' ? (
              <>
                <rect x={302} y={6} width={16} height={34} rx={4} fill="var(--ink)" />
                {[-55, -25, 25, 55].map((a) => (
                  <g key={a} transform={`translate(310 42) rotate(${a})`}>
                    <path d="M0 0 L-9 90 L9 90 Z" fill="url(#spray)" className="anim-spray" />
                  </g>
                ))}
                <text x={330} y={22} fontSize={12} fill="var(--sub)">multi-hole nozzle · several 100 to &gt; 2000 bar</text>
              </>
            ) : (
              <>
                <circle cx={420} cy={20} r={34} fill="var(--surface-solid)" stroke="var(--ink)" strokeWidth={3} />
                <g className="anim-spin" style={{ transformOrigin: '420px 20px', transformBox: 'view-box', animationDuration: '1.4s' }}>
                  <path d="M420 20 m-22 0 a22 22 0 1 1 22 22" stroke="var(--action)" strokeWidth={2.5} fill="none" markerEnd="url(#f-ah)" />
                </g>
                <rect x={444} y={-20} width={12} height={26} rx={3} fill="var(--ink)" transform="rotate(30 450 -7)" />
                <path d="M398 44 L340 100" stroke="var(--p-ink-rose)" strokeWidth={6} strokeLinecap="round" className="anim-pulse" />
                <text x={470} y={70} fontSize={12} fill="var(--sub)">swirl pre-chamber</text>
                <text x={470} y={86} fontSize={12} fill="var(--sub)">≈ 100–350 bar</text>
              </>
            )}
          </>
        )}
      </svg>
    </AnimFrame>
  );
}

/* ======================================================================
   Cooling: air (fins) vs liquid (loop + thermostat)
   ====================================================================== */
export function CoolingAnim() {
  const [m, setM] = useState<'air' | 'liquid'>('liquid');
  const [temp, setTemp] = useState(70);
  const open = temp >= 88;
  return (
    <AnimFrame
      title="How heat leaves the engine"
      controls={
        <>
          <Seg id="cool" value={m} onChange={setM} options={[{ v: 'air', label: 'Air-cooled' }, { v: 'liquid', label: 'Liquid-cooled' }]} />
          {m === 'liquid' && <Slider label="Coolant temp" value={temp} min={30} max={110} unit="°C" onChange={setTemp} />}
        </>
      }
      caption={m === 'air' ? 'Fins give a large surface area so heat can pass into the air (air has a low heat-transfer coefficient). Motorbikes use ram air; stationary engines need a fan.' : open ? 'Hot: thermostat open (~85–90 °C) — coolant goes through the radiator. Pressurised system lets coolant run above 100 °C without boiling.' : 'Cold engine: thermostat closed — coolant bypasses the radiator so the engine warms up quickly.'}
    >
      <svg viewBox="0 0 620 250" className="w-full">
        <defs>
          <Arrow id="c-ah" />
        </defs>
        {m === 'air' ? (
          <>
            <rect x={250} y={40} width={110} height={180} rx={10} fill="var(--fill-2)" stroke="var(--ink)" strokeWidth={2} />
            {Array.from({ length: 9 }, (_, i) => (
              <g key={i}>
                <rect x={206} y={50 + i * 19} width={44} height={6} rx={3} fill="var(--sub)" />
                <rect x={360} y={50 + i * 19} width={44} height={6} rx={3} fill="var(--sub)" />
              </g>
            ))}
            {Array.from({ length: 6 }, (_, i) => (
              <path key={i} d={`M${i < 3 ? 190 : 420} ${70 + (i % 3) * 55} q${i < 3 ? -14 : 14} -10 ${i < 3 ? -28 : 28} 0 t${i < 3 ? -28 : 28} 0`} stroke="var(--p-ink-rose)" strokeWidth={2.5} fill="none" className="anim-heat" style={{ animationDelay: `${i * 0.25}s` }} />
            ))}
            <g transform="translate(110 130)">
              <circle r={36} fill="none" stroke="var(--line-strong)" />
              <g className="anim-spin" style={{ animationDuration: '0.6s' }}>
                {[0, 90, 180, 270].map((a) => (
                  <ellipse key={a} rx={8} ry={28} transform={`rotate(${a}) translate(0 -14)`} fill="var(--action)" opacity={0.6} />
                ))}
              </g>
              <text y={56} fontSize={12} textAnchor="middle" fill="var(--sub)">fan / ram air</text>
            </g>
            <path d="M150 130 H200" stroke="var(--action)" strokeWidth={3} strokeDasharray="8 10" className="anim-dash" markerEnd="url(#c-ah)" />
          </>
        ) : (
          <>
            <rect x={60} y={50} width={160} height={160} rx={12} fill="var(--p-sky)" stroke="var(--ink)" strokeWidth={2} />
            <rect x={84} y={74} width={112} height={112} rx={8} fill="var(--fill-2)" stroke="var(--ink)" strokeWidth={2} />
            <text x={140} y={135} fontSize={12} textAnchor="middle" fill="var(--sub)">cylinder</text>
            <text x={140} y={44} fontSize={11} textAnchor="middle" fill="var(--p-ink-sky)">water jacket</text>
            <rect x={430} y={40} width={140} height={170} rx={10} fill="var(--surface-solid)" stroke="var(--ink)" strokeWidth={2} opacity={open ? 1 : 0.45} />
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1={440} x2={560} y1={58 + i * 20} y2={58 + i * 20} stroke="var(--line-strong)" />
            ))}
            <text x={500} y={232} fontSize={12} textAnchor="middle" fill="var(--sub)">radiator + fan</text>
            {/* thermostat */}
            <g transform="translate(300 70)">
              <circle r={18} fill="var(--surface-solid)" stroke="var(--ink)" strokeWidth={2} />
              <motion.line x1={-12} y1={0} x2={12} y2={0} stroke={open ? 'var(--p-ink-mint)' : 'var(--p-ink-rose)'} strokeWidth={4} animate={{ rotate: open ? 90 : 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} />
              <text y={-26} fontSize={11} textAnchor="middle" fill="var(--sub)">thermostat {open ? 'open' : 'closed'}</text>
            </g>
            {/* loops */}
            <path d="M220 70 H282" stroke="var(--p-ink-rose)" strokeWidth={4} strokeDasharray="8 10" className="anim-dash" />
            <path d="M318 70 H430" stroke="var(--p-ink-rose)" strokeWidth={4} strokeDasharray="8 10" className={open ? 'anim-dash' : ''} opacity={open ? 1 : 0.15} />
            <path d="M430 190 H330 V190" stroke="var(--action)" strokeWidth={4} strokeDasharray="8 10" className={open ? 'anim-dash' : ''} opacity={open ? 1 : 0.15} />
            <path d="M300 88 V170" stroke="var(--p-ink-peach)" strokeWidth={4} strokeDasharray="8 10" className={open ? '' : 'anim-dash'} opacity={open ? 0.15 : 1} />
            <text x={308} y={135} fontSize={11} fill="var(--p-ink-peach)" opacity={open ? 0.3 : 1}>bypass</text>
            <path d="M330 190 H220" stroke="var(--action)" strokeWidth={4} strokeDasharray="8 10" className="anim-dash" />
            <g transform="translate(300 190)">
              <circle r={16} fill="var(--surface-solid)" stroke="var(--ink)" strokeWidth={2} />
              <g className="anim-spin" style={{ animationDuration: '0.8s' }}>
                <path d="M0 -10 L0 10 M-10 0 L10 0" stroke="var(--action)" strokeWidth={3} />
              </g>
              <text y={32} fontSize={11} textAnchor="middle" fill="var(--sub)">pump</text>
            </g>
          </>
        )}
      </svg>
    </AnimFrame>
  );
}

/* ======================================================================
   Valve train: cam → tappet → push rod → rocker → valve (ref-driven)
   ====================================================================== */
export function ValveTrainAnim() {
  const box = useRef<HTMLDivElement>(null);
  const r = useRef<Record<string, SVGElement | null>>({});
  const set = (k: string) => (el: SVGElement | null) => (r.current[k] = el);
  const [playing, setPlaying] = useState(true);
  const camLift = (a: number) => {
    const x = ((a % 360) + 360) % 360;
    return x > 120 && x < 240 ? Math.sin(Math.PI * ((x - 120) / 120)) ** 1.5 : 0;
  };
  useLoop(
    box,
    (t) => {
      const a = (t * 90) % 360;
      const l = camLift(a) * 18;
      attrs(r.current.cam, { transform: `rotate(${a} 90 300)` });
      attrs(r.current.rod, { transform: `translate(0 ${-l})` });
      const rock = (l / 70) * (180 / Math.PI);
      attrs(r.current.rocker, { transform: `rotate(${-rock} 200 60)` });
      attrs(r.current.valve, { transform: `translate(0 ${l * 1.1})` });
      attrs(r.current.spring, { transform: `translate(0 ${l * 1.1}) scale(1 ${1 - l / 120})`, 'transform-origin': '310 110' });
      attrs(r.current.flow, { opacity: l > 4 ? l / 18 : 0 });
    },
    playing,
  );
  return (
    <AnimFrame title="Valve train in motion" playing={playing} setPlaying={setPlaying} caption="The cam lobe lifts the tappet → push rod pushes the rocker up → the rocker tips over its pivot and pushes the valve down (open). Springs close it again. The camshaft turns at half crank speed.">
      <div ref={box}>
        <svg viewBox="0 0 420 360" className="w-full max-w-[420px] mx-auto">
          <defs>
            <Arrow id="v-ah" />
          </defs>
          {/* cam */}
          <g ref={set('cam')}>
            <path d="M90 270 a30 30 0 1 1 -0.1 0 Z M90 270 Q90 236 90 236" fill="var(--fill-2)" stroke="var(--ink)" strokeWidth={2} />
            <path d="M68 280 Q90 230 112 280" fill="var(--fill-2)" stroke="var(--ink)" strokeWidth={2} transform="rotate(180 90 300)" />
            <circle cx={90} cy={300} r={5} fill="var(--ink)" />
          </g>
          <text x={40} y={350} fontSize={12} fill="var(--sub)">cam (½ crank speed)</text>
          {/* tappet + pushrod */}
          <g ref={set('rod')}>
            <rect x={78} y={246} width={24} height={22} rx={3} fill="var(--surface-solid)" stroke="var(--ink)" strokeWidth={2} />
            <line x1={90} y1={246} x2={90} y2={66} stroke="var(--ink)" strokeWidth={5} strokeLinecap="round" />
          </g>
          <text x={102} y={160} fontSize={12} fill="var(--sub)">push rod</text>
          {/* rocker */}
          <g ref={set('rocker')}>
            <path d="M84 62 L316 58" stroke="var(--action)" strokeWidth={9} strokeLinecap="round" />
          </g>
          <circle cx={200} cy={60} r={9} fill="var(--surface-solid)" stroke="var(--ink)" strokeWidth={2} />
          <text x={186} y={38} fontSize={12} fill="var(--sub)">rocker</text>
          {/* valve */}
          <g ref={set('valve')}>
            <line x1={310} y1={66} x2={310} y2={290} stroke="var(--ink)" strokeWidth={5} />
            <path d="M270 300 L350 300 L322 286 L298 286 Z" fill="var(--p-sky)" stroke="var(--action)" strokeWidth={2} />
            <rect x={296} y={98} width={28} height={6} rx={2} fill="var(--ink)" />
          </g>
          <g ref={set('spring')}>
            {Array.from({ length: 7 }, (_, i) => (
              <ellipse key={i} cx={310} cy={112 + i * 11} rx={22} ry={4} fill="none" stroke="var(--p-ink-peach)" strokeWidth={2} />
            ))}
          </g>
          <rect x={300} y={200} width={20} height={50} fill="var(--fill-2)" />
          <text x={334} y={230} fontSize={12} fill="var(--sub)">guide</text>
          <path d="M240 296 H286 M334 296 H380" stroke="var(--ink)" strokeWidth={4} />
          <text x={372} y={322} fontSize={12} fill="var(--sub)" textAnchor="end">seat</text>
          <path ref={set('flow')} d="M268 270 Q300 320 360 330" stroke="var(--action)" strokeWidth={3} fill="none" markerEnd="url(#v-ah)" opacity={0} />
        </svg>
      </div>
    </AnimFrame>
  );
}

/* ======================================================================
   MBT: drag spark advance, watch pressure trace + torque
   ====================================================================== */
const Vr = (th: number, r = 9.5) => 1 + ((r - 1) / 2) * (1 - Math.cos(deg(th)));
function cycle(adv: number) {
  const pts: [number, number][] = [];
  let work = 0, peak = 0, peakAt = 0;
  const dur = 55;
  for (let th = -80; th <= 120; th += 2) {
    const pm = 1 * Math.pow(Vr(-180) / Vr(th), 1.3);
    const x = (th + adv) / dur;
    const xb = x <= 0 ? 0 : 1 - Math.exp(-5 * Math.pow(Math.min(x, 1.4), 3));
    const p = pm + 34 * xb * Math.pow(Vr(0) / Vr(th), 1.25) * (1 - 0.004 * adv);
    pts.push([th, p]);
    if (th > -80) work += p * (Vr(th) - Vr(th - 2));
    if (p > peak) {
      peak = p;
      peakAt = th;
    }
  }
  return { pts, work, peak, peakAt };
}
export function SparkTimingAnim() {
  const [adv, setAdv] = useState(14);
  const all = useMemo(() => Array.from({ length: 51 }, (_, a) => cycle(a).work), []);
  const best = all.indexOf(Math.max(...all));
  const c = cycle(adv);
  const tq = c.work / all[best];
  const X = (th: number) => 30 + ((th + 80) / 200) * 360;
  const Y = (p: number) => 190 - p * 3.2;
  const d = c.pts.map(([th, p], i) => `${i ? 'L' : 'M'}${X(th).toFixed(1)} ${Y(p).toFixed(1)}`).join(' ');
  const md = cycle(-200).pts.map(([th, p], i) => `${i ? 'L' : 'M'}${X(th).toFixed(1)} ${Y(p).toFixed(1)}`).join(' ');
  const knock = c.peak > 52;
  const label = Math.abs(adv - best) <= 2 ? 'MBT — maximum brake torque' : adv < best ? 'Retarded: burning too late in expansion' : knock ? 'Over-advanced: high peak pressure → knock risk' : 'Over-advanced: pushing against rising piston';
  return (
    <AnimFrame title="Find MBT spark timing yourself" controls={<Slider label="Spark advance" value={adv} min={0} max={50} unit="° bTDC" onChange={setAdv} />} caption={<><b>{label}.</b> Torque {Math.round(tq * 100)}% of best · peak pressure at {c.peakAt}° aTDC. MBT here ≈ {best}° bTDC (real engines: 10–40°, depends on speed & mixture).</>}>
      <svg viewBox="0 0 520 220" className="w-full">
        <line x1={30} y1={190} x2={392} y2={190} stroke="var(--sub)" />
        <line x1={X(0)} y1={20} x2={X(0)} y2={190} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <text x={X(0)} y={206} fontSize={11} textAnchor="middle" fill="var(--sub)">TDC</text>
        <line x1={X(-adv)} y1={150} x2={X(-adv)} y2={190} stroke="#ffd60a" strokeWidth={3} />
        <text x={X(-adv)} y={146} fontSize={11} textAnchor="middle" fill="var(--p-ink-butter)">spark</text>
        <path d={md} stroke="var(--faint)" strokeWidth={2} strokeDasharray="5 4" fill="none" />
        <motion.path d={d} stroke={knock ? 'var(--p-ink-rose)' : 'var(--action)'} strokeWidth={3} fill="none" initial={false} animate={{ d }} transition={{ duration: 0.2 }} />
        <text x={360} y={180} fontSize={11} fill="var(--faint)">motored</text>
        <text x={36} y={30} fontSize={11} fill="var(--sub)">cylinder pressure</text>
        {/* torque bar */}
        <rect x={430} y={30} width={40} height={160} rx={10} fill="var(--fill)" />
        <motion.rect x={430} width={40} rx={10} fill={Math.abs(adv - best) <= 2 ? 'var(--p-ink-mint)' : 'var(--action)'} initial={false} animate={{ y: 190 - 160 * tq, height: 160 * tq }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} />
        <text x={450} y={206} fontSize={11} textAnchor="middle" fill="var(--sub)">torque</text>
      </svg>
    </AnimFrame>
  );
}

/* ======================================================================
   PFI system — fuel flow + ECU pulse width
   ====================================================================== */
export function PfiAnim() {
  const [load, setLoad] = useState(40);
  const pw = 2 + (load / 100) * 12;
  const duty = pw / 20;
  return (
    <AnimFrame title="Port fuel injection system" controls={<Slider label="Engine load" value={load} min={5} max={100} unit="%" onChange={setLoad} />} caption={`ECU opens each injector for ≈ ${pw.toFixed(1)} ms (pulse width). Rail pressure is constant, so more open-time = more fuel. Sensors: air flow/MAP, rpm, throttle, temperatures, O₂.`}>
      <svg viewBox="0 0 620 250" className="w-full">
        <defs>
          <Arrow id="p-ah" />
          <radialGradient id="p-spray" cx=".5" cy="0" r="1">
            <stop offset="0" stopColor="var(--p-ink-peach)" stopOpacity=".95" />
            <stop offset="1" stopColor="var(--p-ink-peach)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[
          ['Tank + pump', 20],
          ['Filter', 150],
        ].map(([n, x]) => (
          <g key={String(n)}>
            <rect x={+x} y={170} width={100} height={46} rx={10} fill="var(--surface-solid)" stroke="var(--line-strong)" />
            <text x={+x + 50} y={198} fontSize={12} textAnchor="middle" fill="var(--ink)">{n}</text>
          </g>
        ))}
        <path d="M120 193 H150 M250 193 H290 V120 H300" stroke="var(--p-ink-peach)" strokeWidth={4} fill="none" strokeDasharray="8 8" className="anim-dash" markerEnd="url(#p-ah)" />
        <rect x={300} y={108} width={260} height={24} rx={8} fill="var(--p-peach)" stroke="var(--p-ink-peach)" />
        <text x={430} y={102} fontSize={12} textAnchor="middle" fill="var(--p-ink-peach)">fuel rail ≈ 3 bar</text>
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(${330 + i * 64} 132)`}>
            <rect x={-7} y={0} width={14} height={30} rx={3} fill="var(--ink)" />
            <path d="M0 32 L-16 72 L16 72 Z" fill="url(#p-spray)" className="anim-spray" style={{ animationDuration: '1.2s', animationDelay: `${i * 0.3}s`, opacity: 0.4 + duty }} />
          </g>
        ))}
        <path d="M560 120 H590 V230 H120" stroke="var(--faint)" strokeWidth={2} strokeDasharray="4 6" fill="none" />
        <text x={470} y={244} fontSize={11} fill="var(--faint)">return to tank (pressure regulator)</text>
        <rect x={300} y={14} width={110} height={44} rx={10} fill="var(--p-sky)" stroke="var(--action)" />
        <text x={355} y={41} fontSize={14} textAnchor="middle" fontWeight={600} fill="var(--action)">ECU</text>
        <path d="M355 58 V104" stroke="var(--action)" strokeWidth={2} markerEnd="url(#p-ah)" />
        {['MAF / MAP', 'rpm', 'throttle', 'O₂'].map((s, i) => (
          <g key={s}>
            <circle cx={36} cy={22 + i * 24} r={5} fill="var(--p-ink-mint)" className="anim-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            <text x={48} y={26 + i * 24} fontSize={12} fill="var(--sub)">{s}</text>
          </g>
        ))}
        <path d="M130 50 H296" stroke="var(--p-ink-mint)" strokeWidth={2} strokeDasharray="4 6" className="anim-dash" markerEnd="url(#p-ah)" />
        {/* pulse waveform */}
        <g transform="translate(440 20)">
          <text x={0} y={-4} fontSize={10} fill="var(--sub)">injector signal</text>
          <path d={`M0 34 ${[0, 1, 2].map((k) => `H${k * 56} V8 H${k * 56 + 56 * duty} V34`).join(' ')} H170`} stroke="var(--action)" strokeWidth={2} fill="none" />
        </g>
      </svg>
    </AnimFrame>
  );
}

/* ======================================================================
   SI (port, during intake) vs CI (in-cylinder, near TDC) injection — synced
   ====================================================================== */
export function InjectionCompareAnim() {
  const box = useRef<HTMLDivElement>(null);
  const r = useRef<Record<string, SVGElement | null>>({});
  const set = (k: string) => (el: SVGElement | null) => (r.current[k] = el);
  useLoop(box, (t) => {
    const a = (t * 140) % 720;
    const y = 40 * (1 - Math.cos(deg(a))) / 2;
    attrs(r.current.p1, { transform: `translate(0 ${y})` });
    attrs(r.current.p2, { transform: `translate(0 ${y})` });
    attrs(r.current.s1, { opacity: a > 20 && a < 160 ? 1 : 0 });
    attrs(r.current.s2, { opacity: a > 340 && a < 380 ? 1 : 0 });
    attrs(r.current.f2, { opacity: a > 352 && a < 440 ? 1 - (a - 352) / 90 : 0 });
    attrs(r.current.f1, { opacity: a > 358 && a < 430 ? 1 - (a - 358) / 72 : 0 });
  });
  const Cyl = ({ x, si }: { x: number; si: boolean }) => (
    <g transform={`translate(${x} 0)`}>
      <rect x={0} y={40} width={120} height={150} fill="none" stroke="var(--ink)" strokeWidth={3} />
      <rect ref={set(si ? 'f1' : 'f2')} x={2} y={42} width={116} height={60} fill="var(--p-peach)" opacity={0} />
      <g ref={set(si ? 'p1' : 'p2')}>
        <rect x={4} y={100} width={112} height={50} rx={5} fill="var(--fill-2)" />
      </g>
      {si ? (
        <>
          <path d="M-60 30 H10 L20 40" stroke="var(--ink)" strokeWidth={2.5} fill="none" />
          <rect x={-30} y={4} width={12} height={22} rx={3} fill="var(--ink)" transform="rotate(30 -24 15)" />
          <path ref={set('s1')} d="M-16 26 L8 44 L-4 48 Z" fill="var(--p-ink-peach)" opacity={0} />
          <text x={60} y={214} fontSize={12} textAnchor="middle" fill="var(--sub)">SI · port, ≈3 bar, during intake</text>
          <circle cx={60} cy={40} r={5} fill="#ffd60a" />
        </>
      ) : (
        <>
          <rect x={54} y={14} width={12} height={26} rx={3} fill="var(--ink)" />
          <path ref={set('s2')} d="M60 42 L30 90 M60 42 L90 90 M60 42 L45 96 M60 42 L75 96" stroke="var(--p-ink-peach)" strokeWidth={3} opacity={0} />
          <text x={60} y={214} fontSize={12} textAnchor="middle" fill="var(--sub)">CI · in-cylinder, 100s–2000+ bar, near TDC</text>
        </>
      )}
    </g>
  );
  return (
    <AnimFrame title="When & where each engine injects" caption="SI: fuel is added early, at low pressure, to make a premixed charge — the throttle controls load. CI: fuel is injected at very high pressure just before TDC — the injection itself starts combustion and the fuel quantity controls load.">
      <div ref={box}>
        <svg viewBox="0 0 520 224" className="w-full">
          <Cyl x={80} si />
          <Cyl x={330} si={false} />
        </svg>
      </div>
    </AnimFrame>
  );
}

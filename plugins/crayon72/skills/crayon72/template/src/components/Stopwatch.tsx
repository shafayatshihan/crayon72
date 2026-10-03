import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Flag, Maximize2, Minimize2, Pause, Play, RotateCcw, Timer, Volume2, VolumeX, X } from 'lucide-react';
import { kvGet, kvSet, useKV } from '@/lib/store';
import { bus } from '@/lib/app';
import { play, watchTick } from '@/lib/sound';
import { Watch3D, webglOK } from './Watch3D';

const GL = typeof window !== 'undefined' && webglOK();

/* ------------------------------------------------------------------ state */
interface SW {
  running: boolean;
  startAt: number; // epoch ms of the current run (when running)
  acc: number; // ms accumulated before the current run
  laps: number[]; // elapsed ms at each lap
}
const SW0: SW = { running: false, startAt: 0, acc: 0, laps: [] };
const today = () => new Date().toISOString().slice(0, 10);
const elapsedOf = (s: SW, now = Date.now()) => s.acc + (s.running ? now - s.startAt : 0);

export function fmt(ms: number, tenths = true) {
  const t = Math.max(0, ms);
  const h = Math.floor(t / 3600000), m = Math.floor((t % 3600000) / 60000), s = Math.floor((t % 60000) / 1000), d = Math.floor((t % 1000) / 100);
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  return (h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`) + (tenths ? `.${d}` : '');
}
export const fmtDur = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

/** Minutes studied today (logged + the run in progress). */
export function useStudiedToday() {
  const [log] = useKV<Record<string, number>>('study-log', {});
  const [sw] = useKV<SW>('stopwatch', SW0);
  const [, force] = useState(0);
  useEffect(() => {
    if (!sw.running) return;
    const id = window.setInterval(() => force((x) => x + 1), 30000);
    return () => window.clearInterval(id);
  }, [sw.running]);
  const live = sw.running && new Date(sw.startAt).toISOString().slice(0, 10) === today() ? Date.now() - sw.startAt : 0;
  return (log[today()] ?? 0) + live;
}

async function logStudy(ms: number) {
  if (ms < 1000) return;
  const log = (await kvGet<Record<string, number>>('study-log')) ?? {};
  kvSet('study-log', { ...log, [today()]: (log[today()] ?? 0) + ms }, 0);
}

/* ------------------------------------------------------------------ dial art (static) */
const CX = 150, CY = 212, R = 118;
const easeBack = (x: number) => {
  const c1 = 2.2, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

function DialStatic() {
  const ticks = useMemo(() => {
    const out: JSX.Element[] = [];
    for (let i = 0; i < 300; i++) {
      const a = (i / 300) * 2 * Math.PI;
      const major = i % 25 === 0, mid = i % 5 === 0;
      const r1 = R - 14, r2 = r1 - (major ? 12 : mid ? 7 : 3.5);
      out.push(
        <line key={i} x1={CX + r1 * Math.sin(a)} y1={CY - r1 * Math.cos(a)} x2={CX + r2 * Math.sin(a)} y2={CY - r2 * Math.cos(a)} stroke={major ? '#1d1d1f' : '#3a3a3c'} strokeWidth={major ? 2.4 : mid ? 1.4 : 0.6} strokeLinecap="round" />,
      );
    }
    return out;
  }, []);
  const nums = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const n = (i + 1) * 5, a = (n / 60) * 2 * Math.PI, r = R - 40;
        return (
          <text key={n} x={CX + r * Math.sin(a)} y={CY - r * Math.cos(a) + 5} textAnchor="middle" fontSize={n % 15 === 0 ? 15 : 12} fontWeight={n % 15 === 0 ? 700 : 600} fill="#1d1d1f" style={{ fontFamily: 'var(--font-display)' }}>
            {n}
          </text>
        );
      }),
    [],
  );
  const sub = (cx: number, cy: number, n: number, label: string) => (
    <g>
      <circle cx={cx} cy={cy} r={25} fill="url(#sw-sub)" stroke="#c9c5ba" strokeWidth={0.8} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 2 * Math.PI, big = i % (n / 6) === 0;
        return <line key={i} x1={cx + 23 * Math.sin(a)} y1={cy - 23 * Math.cos(a)} x2={cx + (big ? 18 : 20.5) * Math.sin(a)} y2={cy - (big ? 18 : 20.5) * Math.cos(a)} stroke="#3a3a3c" strokeWidth={big ? 1.2 : 0.6} />;
      })}
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={6.5} fill="#6e6e73" letterSpacing={0.6} style={{ fontFamily: 'var(--font-body)' }}>
        {label}
      </text>
    </g>
  );
  return (
    <>
      {ticks}
      {nums}
      {sub(CX, CY - 46, 30, 'MIN')}
      {sub(CX, CY + 46, 12, 'HR')}
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize={8} fontWeight={700} letterSpacing={2.4} fill="#1d1d1f" style={{ fontFamily: 'var(--font-display)' }}>
        CRAYON 72
      </text>
      <text x={CX} y={CY + 9} textAnchor="middle" fontSize={5.5} letterSpacing={1.6} fill="#8e8e93" style={{ fontFamily: 'var(--font-body)' }}>
        CHRONOGRAPH · 1/5 s
      </text>
    </>
  );
}

/* ------------------------------------------------------------------ the watch */
function Watch({ sw, onCrown, onReset, onLap, ticking, pressed }: { sw: SW; onCrown: () => void; onReset: () => void; onLap: () => void; ticking: boolean; pressed: string }) {
  const sec = useRef<SVGGElement>(null);
  const min = useRef<SVGGElement>(null);
  const hr = useRef<SVGGElement>(null);
  const swRef = useRef(sw);
  swRef.current = sw;
  const tickRef = useRef(ticking);
  tickRef.current = ticking;
  const reset = useRef<{ from: [number, number, number]; t0: number } | null>(null);
  const shown = useRef<[number, number, number]>([0, 0, 0]);
  const lastBeat = useRef(-1);

  // hands fly back on reset
  const prevAcc = useRef(sw.acc + (sw.running ? 1 : 0));
  useEffect(() => {
    const cur = sw.acc + (sw.running ? 1 : 0);
    if (cur === 0 && prevAcc.current !== 0) reset.current = { from: [...shown.current] as [number, number, number], t0: performance.now() };
    prevAcc.current = cur;
  }, [sw.acc, sw.running]);

  useEffect(() => {
    let raf = 0;
    let idleFrames = 0;
    const loop = () => {
      const s = swRef.current;
      const e = elapsedOf(s);
      let a: [number, number, number];
      const rs = reset.current;
      if (rs) {
        const k = Math.min(1, (performance.now() - rs.t0) / 420);
        const q = 1 - Math.pow(1 - k, 3);
        a = [rs.from[0] * (1 - q), rs.from[1] * (1 - q), rs.from[2] * (1 - q)];
        if (k >= 1) reset.current = null;
      } else {
        // mechanical 5 beats/s with a tiny overshoot on each beat
        const beat = Math.floor(e / 200);
        const frac = (e % 200) / 200;
        const step = s.running ? easeBack(Math.min(1, frac * 7)) : 1;
        const secA = ((beat - 1 + step) * 1.2) % 360;
        a = [s.running || e ? secA : 0, ((e / 60000) % 30) * 12, ((e / 3600000) % 12) * 30];
        if (s.running && beat !== lastBeat.current) {
          if (lastBeat.current >= 0 && tickRef.current) watchTick(beat % 5 === 0);
          lastBeat.current = beat;
        }
      }
      shown.current = a;
      sec.current?.setAttribute('transform', `rotate(${a[0]} ${CX} ${CY})`);
      min.current?.setAttribute('transform', `rotate(${a[1]} ${CX} ${CY - 46})`);
      hr.current?.setAttribute('transform', `rotate(${a[2]} ${CX} ${CY + 46})`);
      // idle (stopped, no reset animation): draw a couple of frames, then sleep until state changes
      idleFrames = s.running || reset.current ? 0 : idleFrames + 1;
      if (idleFrames < 3) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sw.running, sw.acc]);

  return (
    <svg viewBox="0 0 300 340" className="w-full h-auto block select-none" style={{ filter: 'drop-shadow(0 18px 22px rgba(0,0,0,.28)) drop-shadow(0 4px 6px rgba(0,0,0,.18))' }} aria-label="Analog stopwatch">
      <defs>
        <linearGradient id="sw-chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbfbfd" />
          <stop offset=".18" stopColor="#c7c7cc" />
          <stop offset=".36" stopColor="#f2f2f7" />
          <stop offset=".55" stopColor="#8e8e93" />
          <stop offset=".72" stopColor="#e5e5ea" />
          <stop offset="1" stopColor="#636366" />
        </linearGradient>
        <linearGradient id="sw-chrome2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e6e73" />
          <stop offset=".5" stopColor="#f2f2f7" />
          <stop offset="1" stopColor="#8e8e93" />
        </linearGradient>
        <radialGradient id="sw-dial" cx=".42" cy=".38" r=".75">
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset=".7" stopColor="#f3efe4" />
          <stop offset="1" stopColor="#dcd6c7" />
        </radialGradient>
        <radialGradient id="sw-sub" cx=".45" cy=".4" r=".8">
          <stop offset="0" stopColor="#f6f2e8" />
          <stop offset="1" stopColor="#e3ddcf" />
        </radialGradient>
        <radialGradient id="sw-vignette" cx=".5" cy=".5" r=".5">
          <stop offset=".82" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </radialGradient>
        <linearGradient id="sw-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".45" stopColor="#fff" stopOpacity=".05" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sw-knurl" x1="0" x2="1">
          <stop offset="0" stopColor="#636366" />
          <stop offset=".35" stopColor="#f2f2f7" />
          <stop offset=".65" stopColor="#aeaeb2" />
          <stop offset="1" stopColor="#48484a" />
        </linearGradient>
        <pattern id="sw-ridges" width="3" height="10" patternUnits="userSpaceOnUse">
          <rect width="1.4" height="10" fill="#000" opacity=".22" />
        </pattern>
        <radialGradient id="sw-cap" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".5" stopColor="#c7c7cc" />
          <stop offset="1" stopColor="#48484a" />
        </radialGradient>
        <filter id="sw-hand" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1.6" dy="2.6" stdDeviation="1.4" floodColor="#000" floodOpacity=".35" />
        </filter>
      </defs>

      {/* bow ring */}
      <ellipse cx={CX} cy={30} rx={26} ry={22} fill="none" stroke="url(#sw-chrome2)" strokeWidth={9} />
      <ellipse cx={CX} cy={30} rx={26} ry={22} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.2} />
      {/* crown (start / stop) */}
      <g style={{ transform: pressed === 'crown' ? 'translateY(5px)' : 'none', transition: 'transform .09s cubic-bezier(.3,1.6,.5,1)', cursor: 'pointer' }} onClick={onCrown} role="button" aria-label="Crown: start or stop">
        <rect x={CX - 9} y={56} width={18} height={30} fill="url(#sw-chrome2)" />
        <rect x={CX - 19} y={44} width={38} height={20} rx={5} fill="url(#sw-knurl)" />
        <rect x={CX - 19} y={44} width={38} height={20} rx={5} fill="url(#sw-ridges)" />
        <rect x={CX - 19} y={44} width={38} height={4} rx={2} fill="#fff" opacity={0.45} />
      </g>
      {/* pushers */}
      {[
        { a: -42, k: 'reset', fn: onReset, label: 'Pusher: reset' },
        { a: 42, k: 'lap', fn: onLap, label: 'Pusher: lap' },
      ].map((p) => (
        <g key={p.k} transform={`rotate(${p.a} ${CX} ${CY})`} onClick={p.fn} role="button" aria-label={p.label} style={{ cursor: 'pointer' }}>
          <g style={{ transform: pressed === p.k ? 'translateY(4px)' : 'none', transition: 'transform .08s cubic-bezier(.3,1.6,.5,1)' }}>
            <rect x={CX - 7} y={CY - R - 22} width={14} height={20} rx={3} fill="url(#sw-knurl)" />
            <rect x={CX - 10} y={CY - R - 30} width={20} height={11} rx={4} fill="url(#sw-chrome2)" />
          </g>
        </g>
      ))}
      {/* case */}
      <circle cx={CX} cy={CY} r={R + 14} fill="url(#sw-chrome)" />
      <circle cx={CX} cy={CY} r={R + 14} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1} />
      <circle cx={CX} cy={CY} r={R + 5} fill="url(#sw-chrome2)" />
      <circle cx={CX} cy={CY} r={R} fill="url(#sw-dial)" />
      <circle cx={CX} cy={CY} r={R} fill="url(#sw-vignette)" />
      <DialStatic />
      {/* sub-hands */}
      <g ref={min} filter="url(#sw-hand)">
        <path d={`M${CX - 1.6} ${CY - 46 + 4} L${CX} ${CY - 46 - 20} L${CX + 1.6} ${CY - 46 + 4} Z`} fill="#1d1d1f" />
      </g>
      <circle cx={CX} cy={CY - 46} r={2.6} fill="url(#sw-cap)" />
      <g ref={hr} filter="url(#sw-hand)">
        <path d={`M${CX - 1.6} ${CY + 46 + 4} L${CX} ${CY + 46 - 18} L${CX + 1.6} ${CY + 46 + 4} Z`} fill="#1d1d1f" />
      </g>
      <circle cx={CX} cy={CY + 46} r={2.6} fill="url(#sw-cap)" />
      {/* seconds hand */}
      <g ref={sec} filter="url(#sw-hand)">
        <path d={`M${CX - 2.2} ${CY + 26} L${CX - 0.9} ${CY - R + 10} L${CX + 0.9} ${CY - R + 10} L${CX + 2.2} ${CY + 26} Z`} fill="#d70015" />
        <circle cx={CX} cy={CY + 22} r={5} fill="#d70015" />
        <circle cx={CX} cy={CY + 22} r={2} fill="#fffdf8" />
      </g>
      <circle cx={CX} cy={CY} r={6.5} fill="url(#sw-cap)" />
      <circle cx={CX} cy={CY} r={2} fill="#d70015" />
      {/* glass */}
      <circle cx={CX} cy={CY} r={R} fill="url(#sw-glass)" pointerEvents="none" />
      <path d={`M${CX - 92} ${CY - 50} Q${CX - 40} ${CY - 112} ${CX + 52} ${CY - 100}`} stroke="#fff" strokeOpacity={0.55} strokeWidth={6} strokeLinecap="round" fill="none" pointerEvents="none" />
      <path d={`M${CX + 70} ${CY + 70} Q${CX + 96} ${CY + 30} ${CX + 98} ${CY - 6}`} stroke="#fff" strokeOpacity={0.18} strokeWidth={4} strokeLinecap="round" fill="none" pointerEvents="none" />
    </svg>
  );
}

/* ------------------------------------------------------------------ panel */
export function Stopwatch() {
  const [sw, setSw] = useKV<SW>('stopwatch', SW0);
  const [ui, setUi] = useKV<{ open: boolean; mini: boolean; ticking: boolean }>('stopwatch-ui', { open: false, mini: false, ticking: true });
  const studied = useStudiedToday();
  const [pressed, setPressed] = useState('');
  const [, force] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 180, damping: 18 });

  // digital readout refresh
  useEffect(() => {
    if (!sw.running) return;
    const id = window.setInterval(() => force((x) => x + 1), 100);
    return () => window.clearInterval(id);
  }, [sw.running]);

  const press = (k: string, snd: 'crown' | 'pusher' | 'snap') => {
    setPressed(k);
    play(snd);
    window.setTimeout(() => setPressed(''), 120);
  };
  const startStop = () => {
    press('crown', 'crown');
    const now = Date.now();
    setSw((s) => {
      if (s.running) {
        void logStudy(now - s.startAt);
        return { ...s, running: false, acc: s.acc + (now - s.startAt) };
      }
      return { ...s, running: true, startAt: now };
    });
  };
  const resetFn = () => {
    press('reset', 'snap');
    const now = Date.now();
    setSw((s) => {
      if (s.running) void logStudy(now - s.startAt);
      return { ...SW0 };
    });
  };
  const lap = () => {
    if (!sw.running) return resetFn();
    press('lap', 'pusher');
    setSw((s) => ({ ...s, laps: [elapsedOf(s), ...s.laps].slice(0, 50) }));
  };

  // global open / toggle (nav button, deck, Spotlight, W key)
  useEffect(() => {
    const t = () => setUi((u) => ({ ...u, open: !u.open || u.mini, mini: false }));
    const ss = () => startStop();
    bus.addEventListener('stopwatch', t);
    bus.addEventListener('stopwatch-startstop', ss);
    return () => {
      bus.removeEventListener('stopwatch', t);
      bus.removeEventListener('stopwatch-startstop', ss);
    };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const e = elapsedOf(sw);
  const showPill = (ui.open && ui.mini) || (!ui.open && sw.running);

  return (
    <>
      <AnimatePresence>
        {ui.open && !ui.mini && (
          <motion.div
            key="sw-panel"
            drag
            dragListener={false}
            dragControls={drag}
            dragMomentum={false}
            dragElastic={0.12}
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="fixed z-[65] right-4 bottom-24 w-[320px] max-w-[calc(100vw-24px)] glass-strong rounded-[30px] p-4"
            style={{ background: 'var(--mat-thick)' }}
            data-no-print
            data-no-swipe
            role="region"
            aria-label="Stopwatch"
            onPointerMove={(ev) => {
              if (ev.pointerType !== 'mouse' || !box.current) return;
              const r = box.current.getBoundingClientRect();
              mx.set((ev.clientX - r.left) / r.width - 0.5);
              my.set((ev.clientY - r.top) / r.height - 0.5);
            }}
            onPointerLeave={() => {
              mx.set(0);
              my.set(0);
            }}
          >
            <div className="flex items-center justify-between mb-1 cursor-grab active:cursor-grabbing touch-none" onPointerDown={(ev) => { if (!(ev.target as HTMLElement).closest('button')) drag.start(ev); }}>
              <div className="flex items-center gap-1.5 font-display text-[17px] font-semibold tracking-[-0.02em]">
                <Timer size={16} className="text-action" /> Stopwatch
              </div>
              <div className="flex items-center gap-0.5">
                <button type="button" data-cursor="link" data-sound="toggle" aria-label={ui.ticking ? 'Mute ticking' : 'Unmute ticking'} title="Ticking sound" onClick={() => setUi((u) => ({ ...u, ticking: !u.ticking }))} className="press h-8 w-8 grid place-items-center rounded-full hover:bg-[var(--hover-fill)] text-sub">
                  {ui.ticking ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
                <button type="button" data-cursor="link" aria-label="Minimise stopwatch" onClick={() => setUi((u) => ({ ...u, mini: true }))} className="press h-8 w-8 grid place-items-center rounded-full hover:bg-[var(--hover-fill)] text-sub">
                  <Minimize2 size={15} />
                </button>
                <button type="button" data-cursor="link" aria-label="Close stopwatch" onClick={() => setUi((u) => ({ ...u, open: false, mini: false }))} className="press h-8 w-8 grid place-items-center rounded-full bg-[var(--fill)] text-sub">
                  <X size={15} />
                </button>
              </div>
            </div>
            {GL ? (
              <Watch3D sw={sw} ticking={ui.ticking} onCrown={startStop} onReset={resetFn} onLap={lap} />
            ) : (
              <div ref={box} style={{ perspective: 900 }}>
                <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}>
                  <Watch sw={sw} onCrown={startStop} onReset={resetFn} onLap={lap} ticking={ui.ticking} pressed={pressed} />
                </motion.div>
              </div>
            )}
            <div className="text-center font-rounded text-[34px] tabular-nums tracking-tight -mt-1">{fmt(e)}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" data-cursor="link" data-sound="none" onClick={lap} disabled={!sw.running && e === 0} className="press h-11 rounded-full bg-[var(--fill)] text-ink text-[15px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-40">
                {sw.running ? <Flag size={15} /> : <RotateCcw size={15} />} {sw.running ? 'Lap' : 'Reset'}
              </button>
              <button
                type="button"
                data-cursor="link"
                data-sound="none"
                onClick={startStop}
                className="press h-11 rounded-full text-[15px] font-semibold flex items-center justify-center gap-1.5"
                style={sw.running ? { background: 'rgba(255,69,58,.16)', color: '#ff453a' } : { background: 'rgba(48,209,88,.18)', color: 'var(--p-ink-mint)' }}
              >
                {sw.running ? <Pause size={15} /> : <Play size={15} />} {sw.running ? 'Stop' : e ? 'Resume' : 'Start'}
              </button>
            </div>
            {sw.laps.length > 0 && (
              <div className="mt-3 max-h-[104px] scroll-y rounded-[14px] bg-[var(--surface-solid)] border border-line divide-y divide-[var(--line)] text-[13px] tabular-nums">
                {sw.laps.map((l, i) => (
                  <div key={sw.laps.length - i} className="flex justify-between px-3 py-1.5">
                    <span className="text-sub">Lap {sw.laps.length - i}</span>
                    <span>+{fmt(l - (sw.laps[i + 1] ?? 0))}</span>
                    <span className="font-medium">{fmt(l)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-center text-[12.5px] text-sub">
              Studied today: <b className="text-ink">{fmtDur(studied)}</b> · drag to turn it, press the crown
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPill && (
          <motion.div
            key="sw-pill"
            drag
            dragMomentum={false}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="fixed z-[65] right-4 bottom-24 glass-strong rounded-full pl-3 pr-1.5 h-12 flex items-center gap-2 touch-none"
            style={{ background: 'var(--mat-thick)' }}
            data-no-print
            data-no-swipe
          >
            <span className={'h-2.5 w-2.5 rounded-full ' + (sw.running ? 'bg-[#ff453a] anim-pulse' : 'bg-[var(--faint)]')} />
            <span className="font-rounded text-[17px] tabular-nums min-w-[64px]">{fmt(e, false)}</span>
            <button type="button" data-cursor="link" data-sound="none" aria-label={sw.running ? 'Stop' : 'Start'} onClick={startStop} className="press h-9 w-9 grid place-items-center rounded-full bg-[var(--fill)]">
              {sw.running ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button type="button" data-cursor="link" aria-label="Open stopwatch" onClick={() => setUi((u) => ({ ...u, open: true, mini: false }))} className="press h-9 w-9 grid place-items-center rounded-full bg-[var(--fill)]">
              <Maximize2 size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

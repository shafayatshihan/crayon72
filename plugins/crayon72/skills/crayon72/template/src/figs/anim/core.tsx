// Shared plumbing for animated (description) illustrations.
// Loops run on requestAnimationFrame ONLY while the figure is on screen and the tab is visible,
// and update the DOM through refs (no React re-render per frame) so scrolling stays smooth.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, Sparkles } from 'lucide-react';

export function useOnScreen(ref: RefObject<Element>, margin = '120px') {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return v;
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');

/** rAF loop: fn(t seconds since start, dt seconds). Paused when off-screen / hidden / !playing. */
export function useLoop(ref: RefObject<Element>, fn: (t: number, dt: number) => void, playing = true, speed = 1) {
  const on = useOnScreen(ref);
  const t = useRef(0);
  const f = useRef(fn);
  f.current = fn;
  useEffect(() => {
    f.current(t.current, 0);
    if (!on || !playing) return;
    let raf = 0, last = 0;
    const k = reduced() ? 0.35 : 1;
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      if (!document.hidden) {
        t.current += dt * speed * k;
        f.current(t.current, dt * speed * k);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, playing, speed]);
  return t;
}

export function AnimFrame({ title, children, caption, playing, setPlaying, controls, hint = 'Interactive' }: { title: string; children: ReactNode; caption?: ReactNode; playing?: boolean; setPlaying?: (b: boolean) => void; controls?: ReactNode; hint?: string }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.3, 1] }}
      className="my-5 rounded-[22px] border border-line overflow-hidden fig-clean"
      style={{ background: 'var(--surface-2)' }}
      data-no-swipe
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full px-2 h-6 text-[11px] font-semibold bg-[var(--p-lilac)] text-[var(--p-ink-lilac)] shrink-0">
            <Sparkles size={11} /> {hint}
          </span>
          <span className="text-[14px] font-semibold truncate">{title}</span>
        </div>
        {setPlaying && (
          <button type="button" data-cursor="link" data-sound="tick" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)} className="press h-8 w-8 grid place-items-center rounded-full bg-[var(--action)] text-white shrink-0">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}
      </div>
      <div className="px-2 sm:px-4 pt-2">{children}</div>
      {controls && <div className="px-4 pb-1 pt-1 flex flex-wrap items-center gap-3">{controls}</div>}
      {caption && <figcaption className="px-4 pb-4 pt-2 text-[13.5px] text-sub leading-relaxed">{caption}</figcaption>}
      {!caption && <div className="h-3" />}
    </motion.figure>
  );
}

export function Seg<T extends string>({ options, value, onChange, id }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void; id: string }) {
  return (
    <div className="inline-flex flex-wrap rounded-full bg-[var(--fill)] p-[3px]" role="tablist">
      {options.map((o) => (
        <button key={o.v} type="button" role="tab" aria-selected={value === o.v} data-cursor="link" data-sound="select" onClick={() => onChange(o.v)} className={'relative h-8 px-3.5 rounded-full text-[13px] font-medium ' + (value === o.v ? 'text-ink' : 'text-sub')}>
          {value === o.v && <motion.span layoutId={'seg-' + id} className="absolute inset-0 rounded-full bg-[var(--surface-solid)] shadow-sm" transition={{ type: 'spring', stiffness: 520, damping: 36 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, unit = '' }: { label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void; unit?: string }) {
  return (
    <label className="flex items-center gap-3 text-[13px] flex-1 min-w-[220px]">
      <span className="text-sub shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="flex-1 accent-[var(--action)]" data-no-swipe />
      <span className="font-rounded tabular-nums w-14 text-right">
        {value}
        {unit}
      </span>
    </label>
  );
}

/** Small helper: set many attributes on an element quickly. */
export function attrs(el: Element | null, a: Record<string, string | number>) {
  if (!el) return;
  for (const k in a) el.setAttribute(k, String(a[k]));
}

export const deg = (d: number) => (d * Math.PI) / 180;

import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '@/lib/prefs';

/**
 * Crayon 72 "boulder" cursor.
 * - The orb is moved directly in the pointer event (no spring, no React render) → zero lag.
 * - A soft halo trails it with a light lerp (only animates while it is catching up).
 * - Over controls the halo opens into a tinted ring; over text the orb becomes a caret;
 *   clicking throws a little spark burst. A white rim + shadow keeps it visible in both themes.
 */
const INTERACTIVE = 'button, a, [data-cursor="link"], select, input[type=range], [role=tab], [role=switch], [role=radio], label, summary';
const TEXTY = 'p, li, h1, h2, h3, h4, td, th, figcaption, blockquote, input[type=text], input:not([type]), textarea, .katex';

export function Cursor() {
  const { prefs } = usePrefs();
  const [fine] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches && window.matchMedia('(hover: hover)').matches);
  const enabled = fine && prefs.cursor;
  const orb = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add('has-custom-cursor');
    let x = -100, y = -100, hx = -100, hy = -100, raf = 0, mode = '';
    const o = orb.current!, h = halo.current!, L = layer.current!;

    const setMode = (m: string) => {
      if (m === mode) return;
      mode = m;
      o.dataset.mode = m;
      h.dataset.mode = m;
    };
    const step = () => {
      hx += (x - hx) * 0.28;
      hy += (y - hy) * 0.28;
      h.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
      raf = Math.abs(x - hx) + Math.abs(y - hy) > 0.3 ? requestAnimationFrame(step) : 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') {
        L.style.opacity = '0';
        return;
      }
      L.style.opacity = '1';
      x = e.clientX;
      y = e.clientY;
      o.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (!raf) raf = requestAnimationFrame(step);
      const t = e.target as HTMLElement | null;
      if (!t?.closest) return;
      if (t.closest('iframe')) return (L.style.opacity = '0');
      if (t.closest('[data-ann-surface]')) return setMode('draw');
      const link = t.closest(INTERACTIVE) as HTMLButtonElement | null;
      if (link && !link.disabled) return setMode('link');
      if (t.closest(TEXTY)) return setMode('text');
      setMode('idle');
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      o.classList.add('is-down');
      h.classList.add('is-down');
      // spark burst
      const b = document.createElement('div');
      b.className = 'c72-burst';
      b.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      for (let i = 0; i < 7; i++) {
        const s = document.createElement('i');
        s.style.setProperty('--a', `${(i / 7) * 360 + Math.random() * 20}deg`);
        b.appendChild(s);
      }
      L.appendChild(b);
      window.setTimeout(() => b.remove(), 520);
    };
    const up = () => {
      o.classList.remove('is-down');
      h.classList.remove('is-down');
    };
    const leave = () => (L.style.opacity = '0');
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    setMode('idle');
    return () => {
      root.classList.remove('has-custom-cursor');
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div ref={layer} aria-hidden className="c72-cursor pointer-events-none fixed inset-0 z-[9999]" style={{ opacity: 0 }} data-no-print>
      <div ref={halo} className="c72-halo" />
      <div ref={orb} className="c72-orb" />
    </div>
  );
}

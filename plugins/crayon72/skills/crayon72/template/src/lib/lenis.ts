import { useEffect, useRef, type RefObject } from 'react';
import Lenis from 'lenis';

/** Smooth inertial wheel scrolling for a scroll container (touch keeps native physics). */
export function useLenis(ref: RefObject<HTMLElement>, deps: unknown[] = []) {
  const inst = useRef<Lenis | null>(null);
  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper || !wrapper.firstElementChild) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // touch devices: keep 100% native scrolling (runs on the compositor at full refresh rate)
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const lenis = new Lenis({
      wrapper,
      content: wrapper.firstElementChild as HTMLElement,
      smoothWheel: true,
      lerp: 0.12,
      wheelMultiplier: 1,
      syncTouch: false,
      prevent: (node) => !!(node as HTMLElement).closest?.('.katex-display, textarea, [data-no-lenis], .scroll-y .scroll-y'),
    });
    inst.current = lenis;
    let id = 0;
    const raf = (t: number) => {
      lenis.raf(t);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
      inst.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return inst;
}

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { play } from '@/lib/sound';
import { useRef } from 'react';

type Side = 'left' | 'right' | 'bottom' | 'center';

/** open sheets, topmost last — only the top one answers Escape */
const stack: number[] = [];
let seq = 0;
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function useNarrow() {
  const [n, setN] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const f = () => setN(window.innerWidth < 640);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return n;
}

/** Spring sheet with backdrop, Esc and drag-to-dismiss. On phones every sheet becomes a bottom sheet. */
export function Sheet({
  open,
  onClose,
  side = 'center',
  title,
  width = 420,
  children,
  headerRight,
}: {
  open: boolean;
  onClose: () => void;
  side?: Side;
  title?: ReactNode;
  width?: number;
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  const narrow = useNarrow();
  const was = useRef(open);
  useEffect(() => {
    if (open !== was.current) play(open ? 'open' : 'close');
    was.current = open;
  }, [open]);
  const s: Side = narrow && side !== 'center' ? 'bottom' : narrow && side === 'center' ? 'bottom' : side;
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useRef('sheet-title-' + ++seq).current;
  useEffect(() => {
    if (!open) return;
    const me = ++seq;
    stack.push(me);
    const opener = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => panel.current?.focus({ preventScroll: true }), 60);
    const k = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== me) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab' && panel.current) {
        const f = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', k);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', k);
      const i = stack.indexOf(me);
      if (i >= 0) stack.splice(i, 1);
      opener?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  const from = s === 'left' ? { x: '-105%' } : s === 'right' ? { x: '105%' } : s === 'bottom' ? { y: '105%' } : { opacity: 0, scale: 0.94, y: 12 };
  const to = s === 'center' ? { opacity: 1, scale: 1, y: 0 } : { x: 0, y: 0 };
  const drag = s === 'left' || s === 'right' ? 'x' : s === 'bottom' ? 'y' : false;
  const onDragEnd = (_: unknown, i: PanInfo) => {
    if (s === 'left' && (i.offset.x < -90 || i.velocity.x < -500)) onClose();
    if (s === 'right' && (i.offset.x > 90 || i.velocity.x > 500)) onClose();
    if (s === 'bottom' && (i.offset.y > 110 || i.velocity.y > 600)) onClose();
  };
  const pos =
    s === 'left'
      ? 'left-2 top-2 bottom-2 rounded-[26px]'
      : s === 'right'
        ? 'right-2 top-2 bottom-2 rounded-[26px]'
        : s === 'bottom'
          ? 'left-0 right-0 bottom-0 rounded-t-[26px] max-h-[88dvh]'
          : 'rounded-[26px] max-h-[76vh]';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[70] bg-black/30"
            style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            data-no-print
          />
          <div className={s === 'center' ? 'fixed inset-0 z-[71] pointer-events-none flex justify-center items-start pt-[12vh] px-2' : 'contents'}>
            <motion.div
              key="sheet"
              ref={panel}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              initial={from}
              animate={to}
              exit={from}
              transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
              drag={drag}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={s === 'left' ? { left: 0.6, right: 0.05 } : s === 'right' ? { left: 0.05, right: 0.6 } : { top: 0.05, bottom: 0.6 }}
              onDragEnd={onDragEnd}
              className={(s === 'center' ? 'relative ' : 'fixed ') + 'z-[71] flex flex-col overflow-hidden glass-strong pointer-events-auto outline-none ' + pos}
              style={{ width: s === 'bottom' ? undefined : `min(${width}px, calc(100vw - 16px))`, background: 'var(--mat-thick)' }}
              data-no-print
            >
              {s === 'bottom' && <div className="mx-auto mt-2 h-[5px] w-10 rounded-full bg-[var(--fill-2)] shrink-0" />}
              {(title || headerRight) && (
                <div className="h-14 shrink-0 px-5 flex items-center justify-between gap-2">
                  <div id={titleId} className="font-display text-[21px] tracking-[-0.02em] truncate">{title}</div>
                  <div className="flex items-center gap-1">
                    {headerRight}
                    <button type="button" aria-label="Close" data-cursor="link" onClick={onClose} className="press h-8 w-8 grid place-items-center rounded-full bg-[var(--fill)] text-sub hover:text-ink">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0 flex flex-col" onPointerDownCapture={(e) => e.stopPropagation()}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

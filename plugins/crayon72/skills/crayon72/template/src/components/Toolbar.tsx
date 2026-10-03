import { useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { Eraser, Hand, Highlighter, PenLine, Pencil, Redo2, Trash2, Undo2, MousePointer2, ChevronLeft } from 'lucide-react';
import { useAnn, PEN_COLORS, HL_COLORS, type Tool } from './Annotate';
import { useToast } from './Toast';

const TOOLS: { t: Tool; icon: typeof Pencil; label: string; key: string }[] = [
  { t: 'none', icon: MousePointer2, label: 'Pointer', key: '1' },
  { t: 'pen', icon: Pencil, label: 'Pen', key: '2' },
  { t: 'marker', icon: PenLine, label: 'Marker', key: '3' },
  { t: 'highlighter', icon: Highlighter, label: 'Highlighter', key: '4' },
  { t: 'eraser', icon: Eraser, label: 'Eraser', key: '5' },
];

function DockItem({ mouseX, children, active, onClick, label }: { mouseX: MotionValue<number>; children: React.ReactNode; active: boolean; onClick: () => void; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const dist = useTransform(mouseX, (x) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? x - (r.left + r.width / 2) : 999;
  });
  const size = useSpring(useTransform(dist, [-110, 0, 110], [40, 54, 40], { clamp: true }), { stiffness: 420, damping: 26, mass: 0.4 });
  return (
    <motion.button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      data-cursor="link"
      data-sound="tick"
      onClick={onClick}
      whileTap={{ scale: 0.86 }}
      style={{ width: size, height: size }}
      className={'relative shrink-0 grid place-items-center rounded-full transition-colors ' + (active ? 'text-white' : 'text-ink hover:bg-[var(--hover-fill)]')}
    >
      {active && <motion.span layoutId="tool-pill" className="absolute inset-0 rounded-full bg-[var(--action)] shadow-md" transition={{ type: 'spring', stiffness: 520, damping: 34 }} />}
      <span className="relative">{children}</span>
    </motion.button>
  );
}

export function Toolbar({ clearPrefix }: { clearPrefix: string }) {
  const a = useAnn();
  const toast = useToast();
  const [open, setOpen] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const confirmT = useRef(0);
  const mouseX = useMotionValue(Infinity);
  const palette = a.tool === 'highlighter' ? HL_COLORS : PEN_COLORS;
  const cur = a.tool === 'highlighter' ? a.hl : a.color;

  return (
    <motion.div
      layout
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="material-thick rounded-full px-1.5 py-1.5 flex items-end gap-0.5 select-none max-w-[calc(100vw-20px)] overflow-x-auto no-scrollbar border border-line"
      style={{ boxShadow: 'var(--shadow-lift)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      data-no-print
    >
      <button type="button" aria-label="Toggle tools" data-cursor="link" onClick={() => setOpen((o) => !o)} className="h-10 w-7 grid place-items-center rounded-full text-sub hover:text-ink self-center">
        <ChevronLeft size={16} className={'transition-transform duration-300 ' + (open ? '' : 'rotate-180')} />
      </button>
      {TOOLS.map(({ t, icon: I, label, key }) => (
        <DockItem key={t} mouseX={mouseX} active={a.tool === t} onClick={() => a.setTool(t)} label={`${label} (${key})`}>
          <I size={19} />
        </DockItem>
      ))}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="more" initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }} className="flex items-center gap-0.5 overflow-hidden self-center">
            <span className="mx-1 h-6 w-px bg-[var(--line-strong)]" />
            {a.tool !== 'eraser' &&
              Object.entries(palette).map(([k, c]) => (
                <motion.button key={k} type="button" aria-label={'Colour ' + k} data-cursor="link" whileTap={{ scale: 0.8 }} onClick={() => (a.tool === 'highlighter' ? a.setHl(k) : a.setColor(k))} className="h-10 w-8 grid place-items-center">
                  <motion.span
                    animate={{ scale: cur === k ? 1.15 : 1 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    className="block rounded-full"
                    style={{ background: c, width: 20, height: 20, boxShadow: cur === k ? '0 0 0 2px var(--surface-solid), 0 0 0 4px var(--action)' : 'inset 0 0 0 1px var(--line-strong)' }}
                  />
                </motion.button>
              ))}
            <div className="flex items-center rounded-full bg-[var(--fill)] p-[3px] mx-1">
              {[0.6, 1, 1.6].map((s) => (
                <button key={s} type="button" data-cursor="link" aria-label={`Size ${s}`} onClick={() => a.setSize(s)} className={'h-8 w-8 rounded-full grid place-items-center ' + (a.size === s ? 'bg-[var(--surface-solid)] shadow-sm' : '')}>
                  <span className="rounded-full bg-[var(--ink)]" style={{ width: 3 + s * 4, height: 3 + s * 4 }} />
                </button>
              ))}
            </div>
            <span className="mx-1 h-6 w-px bg-[var(--line-strong)]" />
            <button type="button" title="Undo (Ctrl+Z)" aria-label="Undo" data-cursor="link" disabled={!a.canUndo} onClick={a.undo} className="press h-10 w-10 grid place-items-center rounded-full hover:bg-[var(--hover-fill)] disabled:opacity-30">
              <Undo2 size={18} />
            </button>
            <button type="button" title="Redo" aria-label="Redo" data-cursor="link" disabled={!a.canRedo} onClick={a.redo} className="press h-10 w-10 grid place-items-center rounded-full hover:bg-[var(--hover-fill)] disabled:opacity-30">
              <Redo2 size={18} />
            </button>
            <button
              type="button"
              title={a.finger ? 'Finger draws (tap: finger scrolls)' : 'Finger scrolls, stylus draws (tap: finger draws)'}
              aria-label="Finger drawing"
              aria-pressed={a.finger}
              data-cursor="link"
              onClick={() => {
                a.setFinger(!a.finger);
                toast(!a.finger ? 'Finger now draws' : 'Finger now scrolls · stylus draws', { icon: <Hand size={18} /> });
              }}
              className={'press h-10 w-10 grid place-items-center rounded-full ' + (a.finger ? 'bg-[var(--p-peach)] text-[var(--p-ink-peach)]' : 'hover:bg-[var(--hover-fill)] text-sub')}
            >
              <Hand size={18} />
            </button>
            <button
              type="button"
              title="Clear this page’s ink"
              data-sound={confirm ? 'trash' : 'tap'}
              aria-label="Clear page ink"
              data-cursor="link"
              onClick={() => {
                if (confirm) {
                  window.clearTimeout(confirmT.current);
                  a.clearPrefix(clearPrefix);
                  setConfirm(false);
                  toast('Ink cleared', { icon: <Trash2 size={18} />, action: { label: 'Undo', run: a.undo } });
                } else {
                  setConfirm(true);
                  window.clearTimeout(confirmT.current);
                  confirmT.current = window.setTimeout(() => setConfirm(false), 2500);
                }
              }}
              className={'press h-10 px-3 rounded-full flex items-center gap-1 text-[12.5px] font-medium ' + (confirm ? 'bg-[var(--p-rose)] text-[var(--p-ink-rose)]' : 'hover:bg-[var(--hover-fill)] text-sub')}
            >
              <Trash2 size={17} /> {confirm ? 'Clear?' : ''}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

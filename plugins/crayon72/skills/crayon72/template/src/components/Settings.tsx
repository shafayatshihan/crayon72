import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Hand, MousePointer2, Percent, Sparkles, Type, Volume2, PenLine } from 'lucide-react';
import { Sheet } from './Sheet';
import { ThemePicker } from './Theme';
import { usePrefs } from '@/lib/prefs';
import { useAnn } from './Annotate';

function Switch({ on, onChange, label }: { on: boolean; onChange: (b: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-cursor="link"
      data-sound="toggle"
      onClick={() => onChange(!on)}
      className="relative h-[31px] w-[51px] rounded-full transition-colors shrink-0"
      style={{ background: on ? '#34c759' : 'var(--fill-2)' }}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 700, damping: 34 }} className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow" style={{ left: on ? 22 : 2 }} />
    </button>
  );
}

function Row({ icon, label, hint, children }: { icon: ReactNode; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="h-8 w-8 rounded-[9px] grid place-items-center bg-[var(--fill)] text-ink shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px]">{label}</div>
        {hint && <div className="text-[12.5px] text-sub leading-snug">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, set } = usePrefs();
  const ann = useAnn();
  const sizes = [0.9, 1, 1.12, 1.25];
  return (
    <Sheet open={open} onClose={onClose} side="right" title="Settings" width={400}>
      <div className="scroll-y flex-1 px-4 pb-6">
        <div className="t-eyebrow px-1 mt-1 mb-2">Appearance</div>
        <ThemePicker />
        <div className="t-eyebrow px-1 mt-6 mb-2">Reading</div>
        <div className="rounded-[18px] bg-[var(--surface-solid)] border border-line divide-y divide-[var(--line)]">
          <Row icon={<Type size={16} />} label="Text size" hint="Solutions & descriptions">
            <div className="flex items-center rounded-full bg-[var(--fill)] p-[3px]">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-cursor="link"
                  onClick={() => set({ textScale: s })}
                  className={'h-7 w-8 rounded-full font-display transition-colors ' + (prefs.textScale === s ? 'bg-[var(--surface-solid)] shadow-sm text-ink' : 'text-sub')}
                  style={{ fontSize: 10 + s * 5 }}
                  aria-label={`Text size ${s}`}
                >
                  A
                </button>
              ))}
            </div>
          </Row>
          <Row icon={<Percent size={16} />} label="Repeat probability" hint="Show % badges on pages">
            <Switch on={prefs.showProb} onChange={(b) => set({ showProb: b })} label="Show probability" />
          </Row>
        </div>
        <div className="t-eyebrow px-1 mt-6 mb-2">Interaction</div>
        <div className="rounded-[18px] bg-[var(--surface-solid)] border border-line divide-y divide-[var(--line)]">
          <Row icon={<Volume2 size={16} />} label="Sounds" hint="Soft clicks, different for each action">
            <Switch on={prefs.sound} onChange={(b) => set({ sound: b })} label="Sounds" />
          </Row>
          {prefs.sound && (
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-[13px] text-sub w-16">Volume</span>
              <input type="range" min={0.1} max={1} step={0.05} value={prefs.volume} onChange={(e) => set({ volume: +e.target.value })} className="flex-1 accent-[var(--action)]" aria-label="Volume" />
            </div>
          )}
          <Row icon={<Sparkles size={16} />} label="Reduce motion" hint="Fewer animations and springs">
            <Switch on={prefs.reduceMotion} onChange={(b) => set({ reduceMotion: b })} label="Reduce motion" />
          </Row>
          <Row icon={<MousePointer2 size={16} />} label="Adaptive pointer" hint="Apple-style cursor on desktop">
            <Switch on={prefs.cursor} onChange={(b) => set({ cursor: b })} label="Adaptive pointer" />
          </Row>
          <Row icon={<PenLine size={16} />} label="Ink tools" hint="Pen, marker & highlighter in decks">
            <Switch on={prefs.ink} onChange={(b) => set({ ink: b })} label="Ink tools" />
          </Row>
          <Row icon={<Hand size={16} />} label="Finger draws" hint="Off: stylus draws, finger scrolls">
            <Switch on={ann.finger} onChange={(b) => ann.setFinger(b)} label="Finger draws" />
          </Row>
        </div>
        <p className="text-[12px] text-sub mt-6 px-1 leading-relaxed">
          Your ink, marks and notes are saved automatically in this browser on this device. Keep this file at the same location so they stay connected.
        </p>
      </div>
    </Sheet>
  );
}

const KEYS: [string, string][] = [
  ['⌘ K  /  Ctrl K  /  /', 'Search everything'],
  ['← →', 'Previous / next page'],
  ['S', 'Show solution'],
  ['D', 'Show description'],
  ['1 – 5', 'Pointer, pen, marker, highlighter, eraser'],
  ['⌘ Z  /  ⌘ ⇧ Z', 'Undo / redo ink'],
  ['F', 'Focus mode'],
  ['T', 'Cycle appearance: Light → Gray → Dark'],
  ['I', 'Ink tools on / off'],
  ['P', 'Print this page'],
  ['⇧P', 'Export PDF print book (A4, 2 columns)'],
  ['M', 'Mark page done / not done'],
  ['W  /  ⇧ W', 'Show stopwatch / start-stop it'],
  ['Esc', 'Close sheet · back to pointer'],
  ['?', 'This list'],
];

export function Shortcuts({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} side="center" title="Keyboard shortcuts" width={460}>
      <div className="scroll-y px-5 pb-5">
        <div className="rounded-[18px] bg-[var(--surface-solid)] border border-line divide-y divide-[var(--line)]">
          {KEYS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="text-[14.5px]">{d}</span>
              <kbd className="font-mono text-[12px] px-2 h-7 inline-flex items-center rounded-lg bg-[var(--fill)] text-ink whitespace-nowrap">{k}</kbd>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

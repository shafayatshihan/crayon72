import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookOpen, Command, CornerDownLeft, Keyboard, Moon, Search, Settings2, Sun, Timer } from 'lucide-react';
import { LECTURES } from '@/data/lectures';
import { TEACHERS, teacherById } from '@/data/course';
import { nodeText, norm, score } from '@/lib/text';
import { probability } from '@/lib/prob';
import { useApp, emit } from '@/lib/app';
import { useTheme } from './Theme';
import { TOPIC_GLYPH } from '@/icons/glyphs';

interface Item {
  key: string;
  kind: 'page' | 'cmd';
  title: string;
  sub: string;
  run: () => void;
  icon: JSX.Element;
  fields: { text: string; w: number }[];
  pct?: number;
}

export function Spotlight({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp();
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const index = useMemo<Item[]>(() => {
    const pages: Item[] = LECTURES.flatMap((l) =>
      l.pages.map((p) => {
        const G = TOPIC_GLYPH[p.topic] ?? BookOpen;
        const vt = p.variants.map((v) => `${v.year} ${v.ref} ${nodeText(v.text)}`).join(' ');
        return {
          key: p.id,
          kind: 'page' as const,
          title: p.title,
          sub: `${teacherById(l.teacher).short} · Lecture ${l.n} · ${p.topic} · ${p.variants.map((v) => v.year).join(', ')}`,
          icon: <G size={18} />,
          pct: probability(p).pct,
          run: () => app.nav({ v: 'deck', key: l.key, page: p.id }),
          fields: [
            { text: norm(p.title), w: 6 },
            { text: norm(p.topic), w: 4 },
            { text: norm(vt), w: 3 },
            { text: norm(nodeText(p.solution)), w: 1 },
          ],
        };
      }),
    );
    const cmds: Item[] = [
      ...TEACHERS.map<Item>((t) => ({ key: 'c-t-' + t.id, kind: 'cmd', title: `Go to ${t.short}’s lectures`, sub: `Section ${t.section} · ${t.name}`, icon: <BookOpen size={18} />, run: () => app.nav({ v: 'lectures', teacher: t.id }), fields: [{ text: norm(`go to lectures ${t.short} ${t.name} section ${t.section}`), w: 2 }] })),
      ...LECTURES.filter((l) => !l.locked).map<Item>((l) => {
        const t = teacherById(l.teacher);
        return { key: 'c-l' + l.key, kind: 'cmd', title: `Open ${t.short} · Lecture ${l.n}`, sub: l.title, icon: <ArrowRight size={18} />, run: () => app.nav({ v: 'deck', key: l.key }), fields: [{ text: norm(`open lecture ${l.n} ${t.short} ${l.title}`), w: 2 }] };
      }),
      { key: 'c-theme', kind: 'cmd', title: `Appearance: ${theme === 'light' ? 'switch to Gray' : theme === 'gray' ? 'switch to Dark' : 'switch to Light'}`, sub: 'Light → Gray → Dark · T', icon: theme === 'light' ? <Moon size={18} /> : <Sun size={18} />, run: toggle, fields: [{ text: 'theme dark light gray grey dim appearance mode', w: 2 }] },
      { key: 'c-timer', kind: 'cmd', title: 'Stopwatch', sub: 'Track study time · W', icon: <Timer size={18} />, run: () => emit('stopwatch'), fields: [{ text: 'stopwatch timer time study clock', w: 2 }] },
      { key: 'c-settings', kind: 'cmd', title: 'Settings', sub: 'Text size, motion, cursor', icon: <Settings2 size={18} />, run: app.openSettings, fields: [{ text: 'settings preferences text size motion cursor', w: 2 }] },
      { key: 'c-export', kind: 'cmd', title: 'Export PDF (print book)', sub: 'A4 · 2 columns · solutions only', icon: <BookOpen size={18} />, run: () => app.openExport(), fields: [{ text: 'export pdf print book a4 download save solutions', w: 2 }] },
      { key: 'c-keys', kind: 'cmd', title: 'Keyboard shortcuts', sub: 'Command · ?', icon: <Keyboard size={18} />, run: app.openShortcuts, fields: [{ text: 'keyboard shortcuts keys help', w: 2 }] },
    ];
    return [...pages, ...cmds];
  }, [app, theme, toggle]);

  const results = useMemo(() => {
    if (!q.trim()) return index.filter((i) => i.kind === 'page').sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).slice(0, 6).concat(index.filter((i) => i.kind === 'cmd').slice(0, 3));
    return index
      .map((i) => ({ i, s: score(q, i.fields) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.i);
  }, [q, index]);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    list.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const pick = (i?: Item) => {
    if (!i) return;
    onClose();
    setTimeout(i.run, 60);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="s-scrim" className="fixed inset-0 z-[80] bg-black/25" style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <div className="fixed inset-0 z-[81] flex justify-center items-start pt-[14vh] px-3 pointer-events-none">
            <motion.div
              key="s-box"
              initial={{ opacity: 0, scale: 0.94, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ type: 'spring', stiffness: 520, damping: 36 }}
              className="pointer-events-auto w-[min(640px,100%)] glass-strong rounded-[22px] overflow-hidden"
              style={{ background: 'var(--mat-thick)' }}
              role="dialog"
              aria-modal="true"
              aria-label="Search"
            >
              <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
                <Search size={20} className="text-sub" />
                <input
                  ref={input}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSel((s) => Math.min(results.length - 1, s + 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSel((s) => Math.max(0, s - 1));
                    } else if (e.key === 'Enter') pick(results[sel]);
                    else if (e.key === 'Escape') onClose();
                  }}
                  placeholder="Search questions, topics, years…"
                  className="flex-1 bg-transparent outline-none text-[19px] font-display placeholder:text-faint"
                  aria-label="Search"
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[11px] text-sub border border-line rounded-md px-1.5 h-6">esc</kbd>
              </div>
              <div ref={list} className="max-h-[52vh] scroll-y p-2">
                {!results.length && <div className="px-4 py-10 text-center text-sub">No results for “{q}”.</div>}
                {results.map((r, i) => (
                  <button
                    key={r.key}
                    data-i={i}
                    type="button"
                    data-cursor="link"
                    onMouseMove={() => setSel(i)}
                    onClick={() => pick(r)}
                    className={'w-full text-left flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors ' + (i === sel ? 'bg-[var(--action)] text-white' : '')}
                  >
                    <span className={'h-9 w-9 shrink-0 rounded-[10px] grid place-items-center ' + (i === sel ? 'bg-white/20' : 'bg-[var(--fill)] text-ink')}>{r.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium truncate">{r.title}</span>
                      <span className={'block text-[12.5px] truncate ' + (i === sel ? 'text-white/80' : 'text-sub')}>{r.sub}</span>
                    </span>
                    {r.pct != null && <span className={'font-rounded text-[12px] tabular-nums ' + (i === sel ? 'text-white/90' : 'text-sub')}>{r.pct}%</span>}
                    {i === sel && <CornerDownLeft size={15} className="opacity-80" />}
                  </button>
                ))}
              </div>
              <div className="h-10 px-4 flex items-center gap-4 text-[11.5px] text-sub border-t border-line">
                <span className="inline-flex items-center gap-1"><Command size={12} />K to open</span>
                <span>↑↓ to move</span>
                <span>↵ to open</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

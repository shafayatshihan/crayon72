import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ChevronRight, Lock, BookOpen, Flame } from 'lucide-react';
import { lecturesOf, slidesOf } from '@/data/lectures';
import type { Lecture } from '@/data/types';
import { probability } from '@/lib/prob';
import { useKV } from '@/lib/store';
import { useApp } from '@/lib/app';
import { GlobalNav } from './GlobalNav';
import { COURSE, TEACHERS, teacherById, type TeacherId } from '@/data/course';
import { LECTURE_GLYPH } from '@/icons/glyphs';

export interface Mark {
  done?: boolean;
  revise?: boolean;
  star?: boolean;
}
export const useMarks = () => useKV<Record<string, Mark>>('marks', {});

export function Ring({ v, size = 54, stroke = 5 }: { v: number; size?: number; stroke?: number }) {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--action)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - v) }}
        transition={{ duration: 1.1, ease: [0.25, 0.1, 0.3, 1] }}
      />
    </svg>
  );
}

function TiltTile({ l, i, onOpen }: { l: Lecture; i: number; onOpen: () => void }) {
  const [marks] = useMarks();
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 260, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 260, damping: 20 });
  const G = LECTURE_GLYPH[l.key];
  const total = l.pages.length;
  const done = l.pages.filter((p) => marks[p.id]?.done).length;
  const top = [...l.pages].sort((a, b) => probability(b).pct - probability(a).pct)[0];
  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={l.locked}
      onClick={onOpen}
      data-cursor="link"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * i, duration: 0.6, ease: [0.25, 0.1, 0.3, 1] }}
      onPointerMove={(e) => {
        if (l.locked || e.pointerType !== 'mouse') return;
        const r = ref.current!.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      whileTap={l.locked ? undefined : { scale: 0.975 }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={'text-left tile p-6 sm:p-7 relative overflow-hidden min-h-[230px] flex flex-col ' + (l.locked ? 'opacity-60' : '')}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="h-12 w-12 rounded-[14px] grid place-items-center" style={{ background: l.locked ? 'var(--fill)' : 'var(--p-sky)', color: l.locked ? 'var(--sub)' : 'var(--p-ink-sky)' }}>
          {G ? <G size={26} /> : <BookOpen size={22} />}
        </span>
        {l.locked ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-sub rounded-full px-2.5 h-7 bg-[var(--fill)]">
            <Lock size={12} /> Coming soon
          </span>
        ) : (
          <div className="relative shrink-0">
            <Ring v={total ? done / total : 0} />
            <div className="absolute inset-0 grid place-items-center text-[12px] font-rounded tabular-nums">
              {done}/{total}
            </div>
          </div>
        )}
      </div>
      <div className="t-eyebrow mt-5">Lecture {l.n}</div>
      <div className="font-display text-[26px] leading-[1.1] tracking-[-0.02em] mt-1">{l.title}</div>
      <p className="text-sub text-[15px] mt-2">{l.subtitle}</p>
      <div className="mt-auto pt-5 flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 h-7 bg-[var(--fill)] text-sub">
          <BookOpen size={13} /> {l.slideRange ? `Slides ${l.slideRange[0]}–${l.slideRange[1]}` : `${slidesOf(l.teacher).filter((id) => id.startsWith(`${l.key}:`)).length || '—'} slides`}
        </span>
        {top && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 h-7 bg-[var(--p-rose)] text-[var(--p-ink-rose)] font-medium">
            <Flame size={13} /> Top {probability(top).pct}%
          </span>
        )}
        {!l.locked && (
          <span className="ml-auto link-chev !text-[15px]">
            Open <ChevronRight size={16} />
          </span>
        )}
      </div>
    </motion.button>
  );
}

/** Segmented switch between the course's teachers (sections). */
export function TeacherSwitch({ teacher, onPick }: { teacher: TeacherId; onPick: (t: TeacherId) => void }) {
  return (
    <div className="inline-flex rounded-full bg-[var(--fill)] p-[3px]" role="tablist" aria-label="Teacher">
      {TEACHERS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={teacher === t.id}
          data-cursor="link"
          onClick={() => onPick(t.id)}
          className={'relative z-10 h-9 px-4 sm:px-5 rounded-full text-[14px] font-medium transition-colors ' + (teacher === t.id ? 'text-ink' : 'text-sub hover:text-ink')}
        >
          {teacher === t.id && <motion.span layoutId="teacher-switch" className="absolute inset-0 -z-10 rounded-full bg-[var(--surface-solid)] shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          {t.short}
          {t.section && <span className="text-faint font-normal"> · Sec {t.section}</span>}
        </button>
      ))}
    </div>
  );
}

export function Lectures({ teacher }: { teacher: TeacherId }) {
  const app = useApp();
  const T = teacherById(teacher);
  const [filter, setFilter] = useState<'all' | 'ready' | 'soon'>('all');
  const all = lecturesOf(teacher);
  const list = all.filter((l) => (filter === 'all' ? true : filter === 'ready' ? !l.locked : l.locked));
  const open = (key: string) => app.nav({ v: 'deck', key, page: app.cont?.key === key ? app.cont.page : undefined });
  const pick = (t: TeacherId) => {
    if (t === teacher) return;
    try {
      history.replaceState({ v: 'lectures', teacher: t }, '');
    } catch {
      /* file:// may block */
    }
    app.nav({ v: 'lectures', teacher: t });
  };

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <GlobalNav active={teacher} />
      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-24">
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="font-display text-[48px] sm:text-[80px] leading-[1] tracking-[-0.035em] font-semibold">
          {T.short}
        </motion.h1>
        <p className="text-sub text-[19px] mt-3 max-w-[640px]">{T.name} · {COURSE.code} Section {T.section}. Every past final question, ranked by how likely it is to return.</p>
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <TeacherSwitch teacher={teacher} onPick={pick} />
          <button type="button" data-cursor="link" onClick={() => app.openExport()} className="press ml-auto inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-[14px] bg-[var(--fill)] hover:bg-[var(--hover-fill)]">
            Export PDF
          </button>
        </div>

        {/* chiclet nav */}
        <div className="mt-9 flex gap-6 overflow-x-auto no-scrollbar pb-3 -mx-4 px-4">
          {all.map((l, i) => {
            const G = LECTURE_GLYPH[l.key] ?? BookOpen;
            return (
              <motion.button
                key={l.key}
                type="button"
                data-cursor="link"
                disabled={l.locked}
                onClick={() => open(l.key)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * i }}
                whileHover={l.locked ? undefined : { y: -3 }}
                className={'shrink-0 w-[78px] flex flex-col items-center text-center gap-1.5 ' + (l.locked ? 'opacity-45' : '')}
              >
                <span className="h-12 w-12 grid place-items-center text-ink">
                  <G size={38} />
                </span>
                <span className="text-[12px] leading-tight">Lecture {l.n}</span>
                {!l.locked ? <span className="text-[11px] font-semibold" style={{ color: 'var(--p-ink-peach)' }}>New</span> : <span className="text-[11px] text-faint">Soon</span>}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-10 flex items-end justify-between gap-4 flex-wrap">
          <h2 className="t-headline">Explore the decks.</h2>
          <div className="flex gap-1 p-1 rounded-full" role="tablist">
            {(
              [
                ['all', 'All lectures'],
                ['ready', 'Ready'],
                ['soon', 'Coming soon'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={filter === k}
                data-cursor="link"
                onClick={() => setFilter(k)}
                className={'relative h-9 px-4 rounded-full text-[14px] transition-colors ' + (filter === k ? 'text-[var(--canvas)]' : 'text-ink hover:bg-[var(--hover-fill)]')}
              >
                {filter === k && <motion.span layoutId="lec-filter" className="absolute inset-0 rounded-full bg-[var(--ink)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <motion.div layout className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((l, i) => (
            <TiltTile key={l.key} l={l} i={i} onOpen={() => open(l.key)} />
          ))}
        </motion.div>
      </main>
    </div>
  );
}

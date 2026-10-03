import { Children, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Clapperboard, Info, Link2, RotateCcw, Star, PenTool, GraduationCap, Printer, StickyNote, Eye, EyeOff, ChevronDown, Table2 as TableIcon } from 'lucide-react';
import type { QPage, Tint, Variant } from '@/data/types';
import type { Prob } from '@/lib/prob';
import { probTone } from '@/lib/prob';
import { Surface } from './Annotate';
import { Ring, type Mark } from './Lectures';
import { useToast } from './Toast';
import { usePrefs } from '@/lib/prefs';
import { bus } from '@/lib/app';
import { useKV } from '@/lib/store';
import { TOPIC_GLYPH } from '@/icons/glyphs';
import { COURSE, otherTeacher, teacherOfKey } from '@/data/course';
import { lectureOf, slideChip } from '@/data/lectures';
import type { SlideId } from '@/data/types';

const tintVars = (t: Tint) => ({ background: `var(--p-${t})`, color: `var(--p-ink-${t})` });

function DoneCheck({ on }: { on: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <motion.path d="M4 12.5l5 5L20 6.5" initial={false} animate={{ pathLength: on ? [0, 1] : 1 }} transition={{ duration: 0.45, ease: [0.25, 0.1, 0.3, 1] }} />
    </svg>
  );
}

/** Splits a fragment solution into top-level blocks for step-by-step reveal. */
function blocksOf(n: ReactNode): ReactNode[] {
  if (isValidElement(n) && typeof (n as ReactElement).type === 'symbol') return Children.toArray((n as ReactElement<{ children: ReactNode }>).props.children);
  return Children.toArray(n);
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[18px] border border-line bg-[var(--surface-solid)] overflow-hidden">
      <button type="button" data-cursor="link" data-sound={open ? 'close' : 'open'} onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-4 h-12 text-left text-[14.5px] font-medium">
        <span className="h-7 w-7 rounded-full grid place-items-center bg-[var(--p-teal)] text-[var(--p-ink-teal)]">
          <TableIcon size={14} />
        </span>
        {title}
        <ChevronDown size={16} className={'ml-auto text-sub transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} className="overflow-hidden">
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnswerCard({ id, v, ans, same, selfTest, multi }: { id: string; v: Variant; ans: ReactNode; same?: string; selfTest: boolean; multi: boolean }) {
  const blocks = blocksOf(ans);
  const [revealed, setRevealed] = useState(1);
  const [showSame, setShowSame] = useState(false);
  useEffect(() => setRevealed(1), [selfTest]);
  return (
    <div>
      {multi && (
        <div className="mb-2 flex items-start gap-2">
          <span className="rounded-full px-2.5 h-6 inline-flex items-center font-rounded text-[12px] bg-[var(--ink)] text-[var(--canvas)] tabular-nums shrink-0">{v.year}</span>
          <div className="text-[13.5px] text-sub leading-snug">
            <span className="font-medium text-ink">{v.ref}{v.marks ? ` · ${v.marks} marks` : ""} — </span>
            {v.text}
          </div>
        </div>
      )}
      {same && !showSame ? (
        <button type="button" data-cursor="link" data-sound="open" onClick={() => setShowSame(true)} className="press w-full rounded-[18px] border border-dashed border-line px-4 py-3 text-left text-[14px] text-sub">
          Same wording as the {same} question — the same answer earns full marks. <span className="text-link">Show it again ›</span>
        </button>
      ) : (
        <Surface id={id}>
          <div className="paper" onClick={() => selfTest && revealed < blocks.length && setRevealed((r) => r + 1)}>
            <div className="font-hand text-[20px] pen -mt-1 mb-1">Ans.{multi ? ` (${v.year})` : ''}</div>
            <div className="prose-study">
              {selfTest ? (
                <>
                  {blocks.slice(0, revealed).map((b, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                      {b}
                    </motion.div>
                  ))}
                  {revealed < blocks.length && (
                    <button
                      type="button"
                      data-cursor="link"
                      data-sound="tick"
                      className="press mt-3 inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-[14px] font-medium bg-[var(--action)] text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRevealed((r) => r + 1);
                      }}
                    >
                      Reveal next · {revealed}/{blocks.length}
                    </button>
                  )}
                </>
              ) : (
                ans
              )}
            </div>
          </div>
        </Surface>
      )}
    </div>
  );
}

function Notes({ id }: { id: string }) {
  const [txt, setTxt, loaded] = useKV<string>('note:' + id, '');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (loaded && txt) setOpen(true);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mt-8" data-no-print={!txt ? true : undefined}>
      <button type="button" data-cursor="link" onClick={() => setOpen((o) => !o)} className="press inline-flex items-center gap-2 text-[15px] font-medium text-ink">
        <span className="h-8 w-8 rounded-full grid place-items-center bg-[var(--p-butter)] text-[var(--p-ink-butter)]">
          <StickyNote size={16} />
        </span>
        My notes {txt && <span className="text-sub font-normal">· saved</span>}
        <ChevronDown size={16} className={'text-sub transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} className="overflow-hidden">
            <textarea
              value={txt}
              onChange={(e) => setTxt(e.target.value)}
              placeholder="Type your own notes, mnemonics, doubts…"
              rows={4}
              className="mt-3 w-full resize-y rounded-[18px] bg-[var(--surface-solid)] border border-line px-4 py-3 text-[16px] leading-relaxed outline-none focus:border-[var(--action)] transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function QuestionPage({
  page,
  tint,
  idx,
  total,
  prob,
  mark,
  setMark,
  onSlides,
  onVideo,
  onGo,
}: {
  page: QPage;
  tint: Tint;
  idx: number;
  total: number;
  prob: Prob;
  mark: Mark;
  setMark: (m: Mark) => void;
  onSlides: (p: SlideId) => void;
  onVideo: () => void;
  onGo: (id: string) => void;
}) {
  const [tab, setTab] = useState<'none' | 'solution' | 'description'>('none');
  const [showWhy, setShowWhy] = useState(false);
  const [selfTest, setSelfTest] = useState(false);
  const toast = useToast();
  const { prefs } = usePrefs();
  const tone = probTone(prob.pct);
  const G = TOPIC_GLYPH[page.topic];

  useEffect(() => {
    const s = () => setTab('solution');
    const d = () => setTab('description');
    bus.addEventListener('show-solution', s);
    bus.addEventListener('show-description', d);
    return () => {
      bus.removeEventListener('show-solution', s);
      bus.removeEventListener('show-description', d);
    };
  }, []);

  const toggleMark = (k: keyof Mark) => {
    const on = !mark[k];
    const prev = mark;
    setMark({ ...mark, [k]: on });
    if (on) toast(k === 'done' ? 'Marked as done' : k === 'revise' ? 'Added to revise list' : 'Marked important', { action: { label: 'Undo', run: () => setMark(prev) } });
  };

  return (
    <article className="max-w-[780px] mx-auto px-4 sm:px-6 pt-7 pb-6">
      {/* meta row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 h-7 font-medium" style={tintVars(tint)}>
          {G && <G size={15} />} {page.topic}
        </span>
        <span className="text-sub tabular-nums">
          Lecture {lectureOf(page)?.n ?? page.lecture} · {idx + 1} of {total}
        </span>
        {page.kind === 'example' && <span className="rounded-full px-2.5 h-7 inline-flex items-center bg-[var(--p-lilac)] text-[var(--p-ink-lilac)]">Lecture example</span>}
        {page.otherSection && (
          <span className="rounded-full px-2.5 h-7 inline-flex items-center bg-[var(--fill)] text-sub" title={`Set in Section ${otherTeacher(teacherOfKey(page.lecture).id).section} of the paper, but ${teacherOfKey(page.lecture).short}’s slides cover it`}>
            Sec {otherTeacher(teacherOfKey(page.lecture).id).section} topic · in slides
          </span>
        )}
      </motion.div>

      <motion.h2 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.04 }} className="font-display text-[34px] sm:text-[48px] leading-[1.05] tracking-[-0.03em] font-semibold mt-3">
        {page.title}
      </motion.h2>

      {/* probability + marks */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {prefs.showProb && (
          <div className="relative">
            <button type="button" data-cursor="link" onClick={() => setShowWhy((s) => !s)} className="press inline-flex items-center gap-2.5 rounded-full pl-1 pr-3.5 h-11 text-[13.5px] font-medium" style={{ background: tone.bg, color: tone.fg }}>
              <span className="relative h-9 w-9">
                <Ring v={prob.pct / 100} size={36} stroke={3.5} />
                <span className="absolute inset-0 grid place-items-center font-rounded text-[11px] tabular-nums">{prob.pct}</span>
              </span>
              {prob.asked ? `Asked ${prob.asked}/${prob.of} · last ${prob.last}` : 'Estimate'}
              <Info size={14} />
            </button>
            <AnimatePresence>
              {showWhy && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  className="absolute z-30 left-0 top-[52px] w-[min(380px,86vw)] glass-strong rounded-[20px] p-4 text-[14px] leading-relaxed origin-top-left"
                >
                  <div className="font-display text-[17px] font-semibold mb-1">
                    {prob.pct}% chance to repeat · {tone.label}
                  </div>
                  <ul className="list-disc pl-4 text-sub space-y-1">
                    {prob.why.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                  <div className="text-[12px] text-faint mt-2">From my analysis of {COURSE.papers.length} papers — a study guide, not a promise.</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <div className="flex items-center gap-1.5 ml-auto" data-no-print>
          {(
            [
              ['done', null, 'Done', 'mint'],
              ['revise', RotateCcw, 'Revise', 'peach'],
              ['star', Star, 'Important', 'butter'],
            ] as const
          ).map(([k, I, label, t]) => {
            const on = !!mark[k];
            return (
              <motion.button
                key={k}
                type="button"
                data-cursor="link"
                whileTap={{ scale: 0.88 }}
                data-sound={on ? 'off' : k === 'done' ? 'success' : 'on'}
                onClick={() => toggleMark(k)}
                aria-pressed={on}
                aria-label={label}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-[13.5px] font-medium transition-colors"
                style={on ? tintVars(t) : { background: 'var(--fill)', color: 'var(--sub)' }}
              >
                {I ? <I size={14} fill={k === 'star' && on ? 'currentColor' : 'none'} /> : <DoneCheck on={on} />} <span className="hidden sm:inline">{label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* question block */}
      <Surface id={`${page.id}:q`} className="mt-6">
        <div className="tile p-6 sm:p-7">
          {page.variants.map((v, i) => (
            <div key={v.year + v.ref} className={i ? 'mt-5 pt-5 border-t border-line' : ''}>
              <div className="flex flex-wrap items-center gap-2 text-[12.5px] mb-2">
                <span className="rounded-full px-2.5 h-6 inline-flex items-center font-rounded bg-[var(--ink)] text-[var(--canvas)] tabular-nums">{v.year}</span>
                <span className="text-sub">{v.ref}</span>
                {v.marks > 0 && <span className="text-sub">· {v.marks} marks</span>}
                {v.same && <span className="rounded-full px-2 h-6 inline-flex items-center bg-[var(--fill)] text-sub">same as {v.same}</span>}
              </div>
              <div className={i ? 'text-[16px] leading-relaxed text-sub' : 'text-[19px] leading-[1.5] tracking-[-0.02em]'}>{v.text}</div>
              {v.figure && (
                <figure className="mt-3">
                  {v.figure.src ? <img src={v.figure.src} alt={v.figure.title} className="max-w-full rounded-[12px] border border-line bg-white" /> : v.figure.node}
                  <figcaption className="text-[12px] text-sub mt-1">{v.figure.title}</figcaption>
                </figure>
              )}
            </div>
          ))}
        </div>
      </Surface>

      {page.links && (
        <div className="mt-3 flex flex-wrap gap-2" data-no-print>
          {page.links.map((l) => (
            <button key={l.to} type="button" data-cursor="link" onClick={() => onGo(l.to)} className="press inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[12.5px] bg-[var(--fill)] text-sub hover:text-ink">
              <Link2 size={13} /> {l.label}
            </button>
          ))}
        </div>
      )}

      {/* resources */}
      <div className="mt-6 flex flex-wrap items-center gap-2" data-no-print>
        <span className="t-eyebrow mr-1">Slides</span>
        {page.slides.map((p) => (
          <button key={p} type="button" data-cursor="link" onClick={() => onSlides(p)} className="press inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-[13.5px] font-medium bg-[var(--p-sky)] text-[var(--p-ink-sky)] hover:brightness-110 transition">
            <BookOpen size={14} /> {slideChip(p)}
          </button>
        ))}
        <button type="button" data-cursor="link" onClick={onVideo} className="press inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-[13.5px] font-medium bg-[var(--p-rose)] text-[var(--p-ink-rose)] hover:brightness-110 transition">
          <Clapperboard size={14} /> Videos
        </button>
        <button type="button" data-cursor="link" onClick={() => window.print()} title="Print / save as PDF (P)" className="press ml-auto inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-[13.5px] font-medium bg-[var(--fill)] text-sub hover:text-ink">
          <Printer size={14} /> Print
        </button>
      </div>

      {/* Apple pill tab row */}
      <div className="mt-9 flex justify-center" data-no-print>
        <div className="relative inline-flex gap-1 rounded-full p-1 bg-[var(--fill)]" role="tablist">
          {(
            [
              ['solution', PenTool, 'Solution', 'S'],
              ['description', GraduationCap, 'Description', 'D'],
            ] as const
          ).map(([k, I, label, key]) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={tab === k}
              title={`${label} (${key})`}
              data-cursor="link"
              data-sound="select"
              onClick={() => setTab((t) => (t === k ? 'none' : k))}
              className={'relative z-10 inline-flex items-center gap-2 px-6 sm:px-8 h-11 rounded-full text-[15px] font-medium transition-colors ' + (tab === k ? 'text-[var(--canvas)]' : 'text-ink')}
            >
              {tab === k && <motion.span layoutId={'qtab-' + page.id} className="absolute inset-0 -z-10 rounded-full bg-[var(--ink)] shadow" transition={{ type: 'spring', stiffness: 480, damping: 36 }} />}
              <I size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === 'solution' && (
          <motion.section key="sol" initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }} transition={{ duration: 0.36, ease: [0.25, 0.1, 0.3, 1] }} className="mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-2" data-no-print>
              <span className="text-[13px] text-sub">
                {page.variants.length > 1 ? `${page.variants.length} questions · each answered separately` : 'Answer as you would write it in the script'}
              </span>
              <button
                type="button"
                data-cursor="link"
                data-sound="toggle"
                onClick={() => setSelfTest((v) => !v)}
                className={'press ml-auto inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[13px] font-medium ' + (selfTest ? 'bg-[var(--p-lilac)] text-[var(--p-ink-lilac)]' : 'bg-[var(--fill)] text-sub hover:text-ink')}
                title="Reveal each answer one point at a time"
              >
                {selfTest ? <EyeOff size={14} /> : <Eye size={14} />} Self-test
              </button>
            </div>
            {page.attachments && page.attachments.length > 0 && (
              <div className="mb-4 space-y-2">
                {page.attachments.map((at) => (
                  <Collapsible key={at.title} title={at.title}>
                    {at.src ? <img src={at.src} alt={at.title} className="w-full rounded-[12px] border border-line bg-white" /> : at.node}
                    {at.caption && <div className="text-[12.5px] text-sub mt-2">{at.caption}</div>}
                  </Collapsible>
                ))}
              </div>
            )}
            <div className="space-y-6">
              {page.variants.map((v, i) => {
                const src = v.same ? page.variants.find((x) => x.year === v.same) : undefined;
                const ans = v.answer ?? src?.answer ?? page.solution;
                return <AnswerCard key={v.year + v.ref} id={`${page.id}:sol:${i === 0 ? 'main' : page.variants.slice(0, i).some((x) => x.year === v.year) ? `${v.year}-${i}` : v.year}`} v={v} ans={ans} same={v.same} selfTest={selfTest} multi={page.variants.length > 1} />;
              })}
            </div>
          </motion.section>
        )}
        {tab === 'description' && (
          <motion.section key="desc" initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }} transition={{ duration: 0.36, ease: [0.25, 0.1, 0.3, 1] }} className="mt-6">
            <Surface id={`${page.id}:desc`}>
              <div className="tile p-6 sm:p-8 prose-study">{page.description}</div>
            </Surface>
          </motion.section>
        )}
      </AnimatePresence>
      {tab === 'none' && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sub text-[15px] mt-5" data-no-print>
          Try it yourself first — then open the solution. <span className="text-faint">(S / D)</span>
        </motion.p>
      )}

      <Notes id={page.id} />
    </article>
  );
}

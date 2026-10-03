import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useScroll } from 'framer-motion';
import { BookOpen, ChevronRight, Clapperboard, Flame, GraduationCap, PenTool, Highlighter, Search, Sparkles } from 'lucide-react';
import { GlobalNav } from './GlobalNav';
import { HeroScene } from './HeroScene';
import { LogoMark } from './Logo';
import { useApp, emit } from '@/lib/app';
import { useStudiedToday, fmtDur } from './Stopwatch';
import { COURSE, TEACHERS, teacherById } from '@/data/course';
import { LECTURES, VIDEOS, SLIDES, pageById, lecturesOf, lectureOf } from '@/data/lectures';
import { probability } from '@/lib/prob';
import { useKV } from '@/lib/store';
import { useMarks } from './Lectures';
import { LECTURE_GLYPH, TOPIC_GLYPH } from '@/icons/glyphs';

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 34, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.4, ease: [0.25, 0.1, 0.3, 1], onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{v}</span>;
}

const QUOTE = 'At the heart of all beauty lies something inhuman.';
// Headline is derived from the course, so a new course needs no edit here.
// The code reads plain, the course name gets the gradient.
const CODE_WORDS = COURSE.code.split(' ');
const WORDS = [...CODE_WORDS, ...COURSE.name.split(' ')];

export function Home() {
  const app = useApp();
  const [marks] = useMarks();
  const [recent] = useKV<string[]>('recent', []);
  const hero = useRef<HTMLDivElement>(null);
  const studied = useStudiedToday();
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] });
  const live = LECTURES.filter((l) => !l.locked);
  const totalPages = live.reduce((s, l) => s + l.pages.length, 0);
  const totalVideos = Object.values(VIDEOS).reduce((s, v) => s + v.length, 0);
  const goCont = () => (app.cont ? app.nav({ v: 'deck', key: app.cont.key, page: app.cont.page }) : app.nav({ v: 'lectures' }));

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <GlobalNav active="home" />

      {/* ---------- Hero ---------- */}
      <section ref={hero} className="relative overflow-hidden" style={{ background: 'var(--canvas-2)' }}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[620px] hero-aurora" />
        <div className="max-w-[1100px] mx-auto px-5 pt-12 sm:pt-16 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="inline-flex items-center gap-2 t-eyebrow">
            <LogoMark size={18} /> {QUOTE}
          </motion.div>
          <h1 className="t-hero mt-4 max-w-[980px] mx-auto">
            {WORDS.map((w, i) => (
              <motion.span
                key={i}
                className={'inline-block mr-[0.24em] ' + (i >= CODE_WORDS.length ? 'text-gradient' : '')}
                initial={{ opacity: 0, y: 28, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.9, ease: [0.25, 0.1, 0.3, 1] }}
              >
                {w}
              </motion.span>
            ))}
          </h1>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.7 }} className="mt-8 flex items-center justify-center gap-6 flex-wrap">
            <button type="button" data-cursor="link" onClick={() => app.nav({ v: 'lectures' })} className="btn-primary press">
              Start Studying
            </button>
            <button type="button" data-cursor="link" onClick={goCont} className="link-chev">
              {app.cont ? 'Continue where you left off' : 'Browse lectures'} <ChevronRight size={18} />
            </button>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }} className="mt-6 text-[13px] text-sub">
            Created by <span className="text-ink font-medium">{COURSE.creator.name}</span> · {COURSE.creator.tag}
          </motion.p>
          <motion.button type="button" data-cursor="link" onClick={() => emit('stopwatch')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35 }} className="press mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[13px] bg-[var(--fill)] text-sub hover:text-ink">
            ⏱ {studied > 0 ? `Studied today · ${fmtDur(studied)}` : 'Start the study stopwatch'}
          </motion.button>
        </div>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1.2, ease: [0.25, 0.1, 0.3, 1] }} className="px-3 sm:px-8 mt-4 sm:mt-6 pb-6 max-w-[860px] mx-auto">
          <HeroScene scroll={scrollYProgress} />
        </motion.div>
      </section>

      {/* ---------- Lecture tiles ---------- */}
      {TEACHERS.map((T) => {
        // only the 2 most recently studied decks of this teacher (else the first 2 built ones); the rest are on the Lectures page
        const all = live.filter((l) => l.teacher === T.id);
        const used = Array.from(new Set(recent.map((id) => pageById(id)?.lecture).filter(Boolean) as string[]));
        const mine = [...all].sort((a, b) => (used.indexOf(a.key) + 1 || 999) - (used.indexOf(b.key) + 1 || 999)).slice(0, 2);
        return (
      <section key={T.id} className="max-w-[1180px] mx-auto px-3 sm:px-5 pt-3 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2 flex items-end justify-between gap-3 px-2 pt-10 pb-2">
          <div>
            <div className="t-eyebrow">Section {T.section} · {used.length ? 'Recent decks' : 'Start here'}</div>
            <h2 className="t-headline">{T.short}</h2>
          </div>
          <button type="button" data-cursor="link" onClick={() => app.nav({ v: 'lectures', teacher: T.id })} className="link-chev !text-[15px] shrink-0">
            All {lecturesOf(T.id).length} lectures <ChevronRight size={16} />
          </button>
        </div>
        {mine.length === 0 && (
          <div className="md:col-span-2 tile px-6 py-10 text-center text-sub text-[17px]">{T.short}’s decks are on the way.</div>
        )}
        {mine.map((l, i) => {
          const G = LECTURE_GLYPH[l.key] ?? BookOpen;
          const done = l.pages.filter((p) => marks[p.id]?.done).length;
          const top = [...l.pages].sort((a, b) => probability(b).pct - probability(a).pct)[0];
          return (
            <Reveal key={l.key} delay={i * 0.08}>
              <div className={'tile relative overflow-hidden text-center px-6 pt-12 pb-10 min-h-[520px] flex flex-col items-center ' + (i % 2 ? 'force-dark' : '')} style={{ background: i % 2 ? '#0b0b0d' : 'var(--surface-solid)', color: 'var(--ink)' }}>
                <div className="t-eyebrow" style={{ color: 'var(--p-ink-peach)' }}>Lecture {l.n}</div>
                <h2 className="t-title mt-1">{l.title}</h2>
                <p className="text-[19px] text-sub mt-2 max-w-[420px]">{l.subtitle}</p>
                <div className="mt-5 flex items-center gap-4">
                  <button type="button" data-cursor="link" onClick={() => app.nav({ v: 'deck', key: l.key, page: app.cont?.key === l.key ? app.cont.page : undefined })} className="btn-primary press !text-[15px] !py-2 !px-5">
                    Open deck
                  </button>
                  <button type="button" data-cursor="link" onClick={() => app.nav({ v: 'deck', key: l.key, page: top?.id })} className="link-chev !text-[15px]">
                    Highest-yield <ChevronRight size={16} />
                  </button>
                </div>
                <motion.div
                  className="mt-auto relative grid place-items-center"
                  whileHover={{ scale: 1.04, rotate: -2 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                >
                  <div className="h-56 w-56 rounded-full grid place-items-center" style={{ background: `radial-gradient(circle at 35% 30%, var(--p-sky), transparent 70%), radial-gradient(circle at 70% 70%, var(--p-rose), transparent 65%)` }}>
                    <div className="h-36 w-36 rounded-[38px] grid place-items-center material-thin" style={{ boxShadow: 'var(--shadow-lift)' }}>
                      <G size={72} />
                    </div>
                  </div>
                </motion.div>
                <div className="mt-6 text-[13px] text-sub flex items-center gap-3 flex-wrap justify-center">
                  <span>{l.pages.length} question types</span>·<span>{done} done</span>·<span>{T.short}</span>
                </div>
              </div>
            </Reveal>
          );
        })}
      </section>
        );
      })}

      {/* ---------- Recently viewed ---------- */}
      {recent.length > 0 && (
        <section className="max-w-[1180px] mx-auto px-5 pt-20">
          <Reveal>
            <h2 className="t-headline">Pick up where you left off.</h2>
          </Reveal>
          <div className="mt-6 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-5 px-5">
            {recent
              .map((id) => pageById(id))
              .filter(Boolean)
              .slice(0, 8)
              .map((p) => {
                const G = TOPIC_GLYPH[p!.topic] ?? BookOpen;
                return (
                  <motion.button
                    key={p!.id}
                    type="button"
                    data-cursor="link"
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => app.nav({ v: 'deck', key: String(p!.lecture), page: p!.id })}
                    className="snap-start shrink-0 w-[260px] tile p-5 text-left"
                  >
                    <span className="h-10 w-10 rounded-[12px] grid place-items-center bg-[var(--p-sky)] text-[var(--p-ink-sky)]">
                      <G size={20} />
                    </span>
                    <div className="t-eyebrow mt-4">{teacherById(lectureOf(p!).teacher).short} · Lecture {lectureOf(p!).n}</div>
                    <div className="text-[17px] font-semibold leading-snug mt-1 line-clamp-2">{p!.title}</div>
                  </motion.button>
                );
              })}
          </div>
        </section>
      )}

      {/* ---------- Features ---------- */}
      <section className="max-w-[1180px] mx-auto px-5 pt-24">
        <Reveal>
          <h2 className="t-headline max-w-[760px]">
            Built for the exam. <span className="text-sub">Every past question, explained like a friend would.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { I: PenTool, t: 'Exam-script solutions', d: 'Short, precise answers with the figures you’re expected to draw by hand.', c: 'sky' },
            { I: GraduationCap, t: 'Step-by-step descriptions', d: 'Basics first, then each step. Theory already covered links back instead of repeating.', c: 'lilac' },
            { I: BookOpen, t: 'Slides, side by side', d: 'Open the professor’s exact slide next to the question. Drag the divider to resize.', c: 'mint' },
            { I: Clapperboard, t: 'Videos that matter', d: `${totalVideos} hand-picked, verified videos — split-screen, right next to your page.`, c: 'rose' },
            { I: Highlighter, t: 'Ink that stays', d: 'Pen, marker and highlighter with palm rejection. Saved automatically.', c: 'butter' },
            { I: Flame, t: 'Repeat probability', d: 'Recency-weighted odds for every question type — with the reasoning shown.', c: 'peach' },
          ].map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 0.06}>
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="tile p-7 h-full">
                <span className="h-12 w-12 rounded-[14px] grid place-items-center" style={{ background: `var(--p-${f.c})`, color: `var(--p-ink-${f.c})` }}>
                  <f.I size={24} />
                </span>
                <h3 className="font-display text-[24px] mt-5 tracking-[-0.02em]">{f.t}</h3>
                <p className="text-sub text-[16px] mt-2 leading-relaxed">{f.d}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="max-w-[1180px] mx-auto px-5 pt-24">
        <div className="tile px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            [COURSE.papers.length, `past ${COURSE.code} papers`],
            [totalPages, 'question types'],
            [Object.keys(SLIDES).length, 'slides embedded'],
            [totalVideos, 'verified videos'],
          ].map(([n, t]) => (
            <div key={String(t)}>
              <div className="font-display text-[56px] leading-none tracking-[-0.03em] text-gradient tabular-nums">
                <CountUp to={Number(n)} />
              </div>
              <div className="text-sub text-[15px] mt-2">{t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Search CTA ---------- */}
      <section className="max-w-[1180px] mx-auto px-5 pt-24 text-center">
        <Reveal>
          <Sparkles className="mx-auto text-sub" size={28} />
          <h2 className="t-headline mt-3">Find any question in a keystroke.</h2>
          <button type="button" data-cursor="link" onClick={app.openSpotlight} className="mt-6 mx-auto w-[min(520px,100%)] h-12 rounded-full material-thin border border-line flex items-center gap-3 px-5 text-sub text-[16px] press">
            <Search size={18} /> Search questions, topics, years…
            <kbd className="ml-auto font-mono text-[12px] px-2 h-6 inline-flex items-center rounded-md bg-[var(--fill)]">⌘K</kbd>
          </button>
        </Reveal>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="mt-24 border-t border-line" style={{ background: 'var(--surface-2)' }}>
        <div className="max-w-[1024px] mx-auto px-5 py-8 text-[12px] text-sub leading-relaxed">
          <div className="flex items-center gap-2 text-ink">
            <LogoMark size={20} /> <span className="font-display text-[15px] font-semibold">Crayon 72</span>
          </div>
          <p className="mt-3 text-ink">Created by <b>{COURSE.creator.name}</b> · {COURSE.creator.tag}</p>
          <p className="mt-2">Built for {COURSE.institution} {COURSE.code} ({TEACHERS.map((t) => t.name).join(' & ')}). Questions from {COURSE.examLabel} {COURSE.papers[0]} to {COURSE.papers[COURSE.papers.length - 1]}. Repeat probabilities are estimates from past papers — study everything.</p>
          <p className="mt-2">Slides © their authors. Videos open from YouTube. Works offline except videos.</p>
          <div className="mt-4 pt-4 border-t border-line flex flex-wrap gap-x-5 gap-y-1">
            <button type="button" data-cursor="link" onClick={app.openShortcuts} className="hover:underline">Keyboard shortcuts</button>
            <button type="button" data-cursor="link" onClick={app.openSettings} className="hover:underline">Settings</button>
            <button type="button" data-cursor="link" onClick={() => app.openExport()} className="hover:underline">Export PDF (print book)</button>
            <button type="button" data-cursor="link" onClick={() => app.nav({ v: 'lectures' })} className="hover:underline">All lectures</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

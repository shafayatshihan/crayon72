import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useDragControls, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, ListTree, Check, RotateCcw, Star, Search, Settings2, Minimize2, Focus, Timer, PenLine } from 'lucide-react';
import type { Lecture, QPage, Tint } from '@/data/types';
import { pageById, slideTeacher } from '@/data/lectures';
import type { SlideId } from '@/data/types';
import { teacherById } from '@/data/course';
import { probability, probTone } from '@/lib/prob';
import { kvGet, kvSet, useKV } from '@/lib/store';
import { useLenis } from '@/lib/lenis';
import { useApp, emit } from '@/lib/app';
import { DeckCtx } from './content';
import { QuestionPage } from './QuestionPage';
import { PaneTabs, SlidesPane, VideoPane, type PaneState } from './Panes';
import { Toolbar } from './Toolbar';
import { ThemeToggle } from './Theme';
import { useMarks } from './Lectures';
import { useAnn, type Tool } from './Annotate';
import { Sheet } from './Sheet';
import { LogoMark } from './Logo';
import { TOPIC_GLYPH } from '@/icons/glyphs';
import { FullscreenButton } from './Fullscreen';
import { usePrefs } from '@/lib/prefs';
import { useToast } from './Toast';
import { play } from '@/lib/sound';

function useStacked() {
  const q = () => window.innerWidth < 768 || (window.innerWidth < 1000 && window.innerHeight > window.innerWidth * 1.15);
  const [s, setS] = useState(q);
  useEffect(() => {
    const f = () => setS(q());
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return s;
}

/** Vertical scroller with Lenis + per-page scroll memory. */
function PageScroller({ children, id }: { children: React.ReactNode; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const lenis = useLenis(ref, [id]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t = 0;
    kvGet<number>('scroll:' + id).then((v) => {
      if (v && el) {
        requestAnimationFrame(() => {
          el.scrollTop = v;
          lenis.current?.resize();
          lenis.current?.scrollTo(v, { immediate: true, force: true });
        });
      }
    });
    let last = -1;
    const onScroll = () => {
      last = el.scrollTop;
      window.clearTimeout(t);
      t = window.setTimeout(() => kvSet('scroll:' + id, last, 0), 300);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.clearTimeout(t);
      if (last >= 0) kvSet('scroll:' + id, last, 0);
    };
  }, [id, lenis]);
  return (
    <div ref={ref} className="scroll-y absolute inset-0 print-root" data-print-flat>
      <div>{children}</div>
    </div>
  );
}

type Filter = 'all' | 'todo' | 'revise' | 'star' | 'done';

export function Deck({ lecture, startId, nonce, onBack }: { lecture: Lecture; startId?: string; nonce?: number; onBack: () => void }) {
  const app = useApp();
  const [hy, setHy] = useKV('hy-mode', false);
  const [marks, setMarks] = useMarks();
  const [, setRecent] = useKV<string[]>('recent', []);
  const ann = useAnn();
  const { prefs, set: setPrefs } = usePrefs();
  const toast = useToast();
  const toggleInk = () => {
    const on = !prefs.ink;
    setPrefs({ ink: on });
    if (!on) ann.setTool('none');
    toast(on ? 'Ink tools on — pen, marker & highlighter below' : 'Ink tools hidden', { icon: <PenLine size={18} /> });
  };
  const toggleInkRef = useRef(toggleInk);
  const stacked = useStacked();
  toggleInkRef.current = toggleInk;
  const bump = useAnimationControls();
  const dragControls = useDragControls();

  const tintOf = useMemo(() => {
    const m: Record<string, Tint> = {};
    lecture.topics.forEach((t) => (m[t.name] = t.tint));
    return m;
  }, [lecture]);
  const probs = useMemo(() => {
    const m: Record<string, ReturnType<typeof probability>> = {};
    lecture.pages.forEach((p) => (m[p.id] = probability(p)));
    return m;
  }, [lecture]);

  const order: QPage[] = useMemo(() => {
    const byP = (a: QPage, b: QPage) => (a.kind === b.kind ? probs[b.id].pct - probs[a.id].pct : a.kind === 'past' ? -1 : 1);
    if (hy) return [...lecture.pages].sort((a, b) => probs[b.id].pct - probs[a.id].pct);
    return lecture.topics.flatMap((t) => lecture.pages.filter((p) => p.topic === t.name).sort(byP));
  }, [lecture, hy, probs]);

  const [curId, setCurId] = useState<string>(() => (startId && order.some((p) => p.id === startId) ? startId : order[0]?.id));
  const idx = Math.max(0, order.findIndex((p) => p.id === curId));
  const page = order[idx];
  const [dir, setDir] = useState(1);
  const [drawer, setDrawer] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [pane, setPane] = useState<PaneState | null>(null);
  const [split, setSplit] = useState(50);
  const splitBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!page) return;
    kvSet('continue', { key: lecture.key, page: page.id });
    setRecent((r) => [page.id, ...r.filter((x) => x !== page.id)].slice(0, 12));
  }, [page?.id, lecture.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback(
    (i: number) => {
      if (i < 0 || i >= order.length) {
        bump.start({ x: [0, i < 0 ? 26 : -26, 0], transition: { duration: 0.45, ease: [0.25, 0.1, 0.3, 1] } });
        play('bump');
        return;
      }
      if (i === idx) return;
      setDir(i > idx ? 1 : -1);
      setCurId(order[i].id);
      play('page');
    },
    [order, idx, bump],
  );
  const goId = useCallback(
    (id: string) => {
      const i = order.findIndex((p) => p.id === id);
      if (i >= 0) return go(i);
      // page lives in another lecture / teacher's deck → open that deck at the page
      const other = pageById(id);
      if (other) app.nav({ v: 'deck', key: String(other.lecture), page: id });
    },
    [order, go, app],
  );

  // Spotlight / Continue into the lecture that is already open: jump to the requested page
  const firstNonce = useRef(nonce);
  useEffect(() => {
    if (nonce === firstNonce.current || !startId) return;
    goId(startId);
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const openSlides = useCallback((p: SlideId) => setPane((s) => ({ tab: 'slides', slide: p, nonce: (s?.nonce ?? 0) + 1, video: s?.video })), []);
  const openVideo = useCallback(() => setPane((s) => ({ tab: 'video', slide: s?.slide ?? page.slides[0], nonce: s?.nonce ?? 0, video: undefined })), [page]);

  // deck shortcuts
  useEffect(() => {
    const tools: Tool[] = ['none', 'pen', 'marker', 'highlighter', 'eraser'];
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, select, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[role=dialog][aria-modal=true]')) return;
      if (e.key === 'ArrowRight') go(idx + 1);
      else if (e.key === 'ArrowLeft') go(idx - 1);
      else if (e.key === 's' || e.key === 'S') emit('show-solution');
      else if (e.key === 'd' || e.key === 'D') emit('show-description');
      else if (e.key === 'P') app.openExport(lecture.key);
      else if (e.key === 'p') window.print();
      else if (e.key === 'f' || e.key === 'F') app.setFocus(!app.focus);
      else if (e.key >= '1' && e.key <= '5') {
        if (prefs.ink) ann.setTool(tools[+e.key - 1]);
      } else if (e.key === 'i' || e.key === 'I') toggleInkRef.current();
      else if (e.key === 'm' || e.key === 'M') {
        const id = order[idx].id;
        setMarks((all) => ({ ...all, [id]: { ...(all[id] ?? {}), done: !all[id]?.done } }));
        play(marks[id]?.done ? 'off' : 'success');
      }
      else if (e.key === 'Escape' && app.focus) app.setFocus(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [go, idx, ann, app, order, marks, setMarks, prefs.ink]);

  // trackpad horizontal swipe
  const area = useRef<HTMLDivElement>(null);
  const goRef = useRef({ go, idx });
  goRef.current = { go, idx };
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    let acc = 0, cool = 0, lastT = 0;
    const wh = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.5) return;
      if ((e.target as HTMLElement).closest?.('.katex-display, table, [data-no-swipe], .scroll-x')) return;
      const now = Date.now();
      // inertia keeps sending events after a flip: stay in cooldown until the gesture is quiet for 250 ms
      if (now < cool) {
        cool = Math.max(cool, now + 250);
        return;
      }
      if (now - lastT > 400) acc = 0;
      lastT = now;
      acc += e.deltaX;
      if (Math.abs(acc) > 160) {
        const { go: g, idx: i } = goRef.current;
        g(i + (acc > 0 ? 1 : -1));
        acc = 0;
        cool = now + 700;
      }
    };
    el.addEventListener('wheel', wh, { passive: true });
    return () => el.removeEventListener('wheel', wh);
  }, []);


  // live finger drag (touch only, never stylus / ink-with-finger)
  const startDrag = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    if (ann.tool !== 'none' && ann.finger) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-no-swipe], .katex-display, table, input, textarea, [role=slider]')) return;
    dragControls.start(e);
  };
  const endDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -90 || info.velocity.x < -520) go(idx + 1);
    else if (info.offset.x > 90 || info.velocity.x > 520) go(idx - 1);
  };

  const dragDivider = (e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const box = splitBox.current!.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const v = stacked ? ((ev.clientY - box.top) / box.height) * 100 : ((ev.clientX - box.left) / box.width) * 100;
      setSplit(Math.min(78, Math.max(22, v)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      target.removeEventListener('lostpointercapture', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    target.addEventListener('lostpointercapture', up);
  };

  if (!page) return null;
  const ctx = { openSlides, goTo: goId, pageTitle: (id: string) => pageById(id)?.title };
  const mark = marks[page.id] ?? {};
  const pass = (p: QPage) => {
    const m = marks[p.id] ?? {};
    return filter === 'all' ? true : filter === 'todo' ? !m.done : filter === 'done' ? !!m.done : filter === 'revise' ? !!m.revise : !!m.star;
  };
  const doneCount = order.filter((p) => marks[p.id]?.done).length;

  return (
    <DeckCtx.Provider value={ctx}>
      <div className={'h-[100dvh] flex flex-col bg-canvas text-ink overflow-hidden ' + (app.focus ? 'focus-mode' : '')} data-print-flat>
        {/* Apple local nav */}
        <header className="material-regular hairline-b z-30 shrink-0" data-chrome>
          <div className="h-[52px] px-2 sm:px-4 flex items-center gap-1 sm:gap-2 max-w-[1440px] mx-auto">
            <button type="button" onClick={onBack} data-cursor="link" className="press h-10 pl-1.5 pr-2 rounded-full flex items-center gap-1.5 hover:bg-[var(--hover-fill)]" aria-label="Back to lectures">
              <ChevronLeft size={20} className="text-action" />
              <LogoMark size={24} />
            </button>
            <div className="min-w-[78px] flex-1 pl-1">
              <div className="font-display text-[19px] sm:text-[21px] font-semibold leading-none truncate tracking-[-0.02em]">Lecture {lecture.n}<span className="text-sub font-medium text-[14px] hidden sm:inline"> · {teacherById(lecture.teacher).short}</span></div>
              <div className="text-[12px] text-sub truncate mt-0.5 hidden sm:block">
                {lecture.title} · {doneCount}/{order.length} done
              </div>
            </div>
            <div className="hidden sm:flex rounded-full bg-[var(--fill)] p-[3px]" role="tablist" aria-label="Order">
              {(
                [
                  [false, 'Topics'],
                  [true, 'High-yield'],
                ] as const
              ).map(([v, label]) => (
                <button key={label} type="button" role="tab" aria-selected={hy === v} data-cursor="link" onClick={() => setHy(v)} className={'relative h-8 px-3.5 rounded-full text-[13px] font-medium ' + (hy === v ? 'text-ink' : 'text-sub')}>
                  {hy === v && <motion.span layoutId="hy-pill" className="absolute inset-0 rounded-full bg-[var(--surface-solid)] shadow-sm" transition={{ type: 'spring', stiffness: 520, damping: 36 }} />}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setHy(!hy)} aria-label="Toggle high-yield order" data-cursor="link" className={'sm:hidden press h-9 px-3 rounded-full text-[12.5px] font-medium ' + (hy ? 'bg-[var(--p-rose)] text-[var(--p-ink-rose)]' : 'bg-[var(--fill)] text-sub')}>
              {hy ? 'High-yield' : 'Topics'}
            </button>
            <button type="button" data-cursor="link" onClick={app.openSpotlight} className="press hidden sm:grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--hover-fill)]" aria-label="Search (⌘K)" title="Search (⌘K)">
              <Search size={17} />
            </button>
            <button type="button" data-cursor="link" onClick={() => emit('stopwatch')} className="press hidden sm:grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--hover-fill)]" aria-label="Stopwatch (W)" title="Stopwatch (W)">
              <Timer size={17} />
            </button>
            <button type="button" data-cursor="link" onClick={() => setDrawer(true)} className="press h-9 w-9 grid place-items-center rounded-full hover:bg-[var(--hover-fill)]" aria-label="Contents" title="Contents">
              <ListTree size={17} />
            </button>
            <button type="button" data-cursor="link" onClick={() => app.setFocus(true)} className="press hidden md:grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--hover-fill)]" aria-label="Focus mode (F)" title="Focus mode (F)">
              <Focus size={17} />
            </button>
            <button type="button" data-cursor="link" onClick={toggleInk} aria-pressed={prefs.ink} className={'press h-9 px-2.5 rounded-full flex items-center gap-1 text-[12.5px] font-medium transition-colors ' + (prefs.ink ? 'bg-[var(--action-soft)] text-action' : 'hover:bg-[var(--hover-fill)] text-sub')} aria-label="Ink tools (I)" title="Ink tools on / off (I)">
              <PenLine size={16} /> <span className="hidden md:inline">Ink</span>
            </button>
            <FullscreenButton />
            <button type="button" data-cursor="link" onClick={app.openSettings} className="press hidden sm:grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--hover-fill)]" aria-label="Settings">
              <Settings2 size={17} />
            </button>
            <ThemeToggle />
          </div>
          <div className="flex gap-[3px] px-3 pb-2 max-w-[1440px] mx-auto">
            {order.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={p.title}
                title={p.title}
                data-cursor="link"
                onClick={() => go(i)}
                className="h-[4px] flex-1 min-w-[8px] rounded-full transition-all duration-300"
                style={{ background: i === idx ? 'var(--action)' : marks[p.id]?.done ? 'var(--p-ink-mint)' : 'var(--fill-2)', transform: i === idx ? 'scaleY(1.5)' : undefined }}
              />
            ))}
          </div>
        </header>

        {/* split container */}
        <div ref={splitBox} className={'relative flex-1 min-h-0 flex ' + (stacked ? 'flex-col' : 'flex-row')} data-print-flat>
          <AnimatePresence initial={false}>
            {pane && (
              <motion.aside
                key="pane"
                initial={stacked ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
                animate={stacked ? { height: `${split}%`, opacity: 1 } : { width: `${split}%`, opacity: 1 }}
                exit={stacked ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 32 }}
                className="relative shrink-0 min-w-0 min-h-0 flex flex-col overflow-hidden"
                style={{ background: 'var(--surface-2)' }}
                data-no-swipe
              >
                <PaneTabs pane={pane} setPane={setPane} onClose={() => setPane(null)} />
                <div className="flex-1 min-h-0">
                  {pane.tab === 'slides' ? <SlidesPane key={slideTeacher(pane.slide)} teacher={slideTeacher(pane.slide)} target={pane.slide} nonce={pane.nonce} /> : <VideoPane topics={page.videoTopics} video={pane.video} onPick={(v) => setPane({ ...pane, video: v })} />}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
          {pane && (
            <div
              onPointerDown={dragDivider}
              data-cursor="link"
              className={'group relative z-20 shrink-0 flex items-center justify-center ' + (stacked ? 'h-3 w-full cursor-row-resize' : 'w-3 h-full cursor-col-resize')}
              style={{ touchAction: 'none', background: 'var(--surface-2)', boxShadow: stacked ? 'inset 0 1px 0 var(--line), inset 0 -1px 0 var(--line)' : 'inset 1px 0 0 var(--line), inset -1px 0 0 var(--line)' }}
              role="separator"
              aria-label="Resize split"
            >
              <span className={'rounded-full transition-all group-hover:bg-[var(--action)] ' + (stacked ? 'h-[5px] w-10 group-hover:w-14' : 'w-[5px] h-10 group-hover:h-14')} style={{ background: 'var(--fill-2)' }} />
            </div>
          )}

          {/* pages */}
          <div ref={area} className="relative flex-1 min-w-0 min-h-0 overflow-hidden" onPointerDown={startDrag} data-print-flat>
            <motion.div animate={bump} className="absolute inset-0" data-print-flat>
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.div
                  key={page.id}
                  custom={dir}
                  variants={{
                    enter: (d: number) => ({ x: d > 0 ? '38%' : '-38%', opacity: 0, scale: 0.97 }),
                    center: { x: 0, opacity: 1, scale: 1 },
                    exit: (d: number) => ({ x: d > 0 ? '-28%' : '28%', opacity: 0, scale: 0.97, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 250, damping: 30, mass: 0.9 }}
                  className="absolute inset-0"
                  data-print-flat
                >
                  <motion.div
                    className="absolute inset-0"
                    drag="x"
                    dragListener={false}
                    dragControls={dragControls}
                    dragDirectionLock
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: idx === order.length - 1 ? 0.12 : 0.55, right: idx === 0 ? 0.12 : 0.55 }}
                    dragTransition={{ bounceStiffness: 420, bounceDamping: 32 }}
                    onDragEnd={endDrag}
                    style={{ touchAction: 'pan-y', willChange: 'transform' }}
                    data-print-flat
                  >
                    <PageScroller id={page.id}>
                      <QuestionPage
                        page={page}
                        tint={tintOf[page.topic] ?? 'sky'}
                        idx={idx}
                        total={order.length}
                        prob={probs[page.id]}
                        mark={mark}
                        setMark={(m) => setMarks((all) => ({ ...all, [page.id]: m }))}
                        onSlides={openSlides}
                        onVideo={openVideo}
                        onGo={goId}
                      />
                      <div className="max-w-[780px] mx-auto px-4 sm:px-6 pt-8 flex justify-center" data-no-print>
                        <motion.button
                          type="button"
                          data-cursor="link"
                          data-sound="success"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setMarks((all) => ({ ...all, [page.id]: { ...(all[page.id] ?? {}), done: true } }));
                            if (idx < order.length - 1) go(idx + 1);
                          }}
                          className="btn-primary press"
                        >
                          <Check size={17} /> {mark.done ? 'Done' : 'Mark done'}{idx < order.length - 1 ? ' & next' : ''}
                        </motion.button>
                      </div>
                      <div className="max-w-[780px] mx-auto px-4 sm:px-6 pt-6 pb-36 grid grid-cols-2 gap-3" data-no-print>
                        {idx > 0 ? (
                          <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} type="button" data-cursor="link" onClick={() => go(idx - 1)} className="tile p-5 text-left">
                            <div className="text-[12px] text-sub flex items-center gap-1">
                              <ChevronLeft size={14} /> Previous
                            </div>
                            <div className="text-[15px] font-semibold mt-1.5 line-clamp-2 tracking-[-0.01em]">{order[idx - 1].title}</div>
                          </motion.button>
                        ) : (
                          <span />
                        )}
                        {idx < order.length - 1 ? (
                          <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} type="button" data-cursor="link" onClick={() => go(idx + 1)} className="tile p-5 text-right">
                            <div className="text-[12px] text-sub flex items-center gap-1 justify-end">
                              Next <ChevronRight size={14} />
                            </div>
                            <div className="text-[15px] font-semibold mt-1.5 line-clamp-2 tracking-[-0.01em]">{order[idx + 1].title}</div>
                          </motion.button>
                        ) : (
                          <span />
                        )}
                      </div>
                    </PageScroller>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* side paddles (desktop) */}
            {(['prev', 'next'] as const).map((k) => {
              const dis = k === 'prev' ? idx === 0 : idx === order.length - 1;
              return (
                <motion.button
                  key={k}
                  type="button"
                  aria-label={k === 'prev' ? 'Previous page' : 'Next page'}
                  data-cursor="link"
                  disabled={dis}
                  onClick={() => go(idx + (k === 'prev' ? -1 : 1))}
                  whileTap={{ scale: 0.9 }}
                  className={'hidden lg:grid absolute top-1/2 z-20 h-11 w-11 place-items-center rounded-full material-thick border border-line disabled:opacity-0 transition-opacity ' + (k === 'prev' ? 'left-4' : 'right-4')}
                  style={{ boxShadow: 'var(--shadow)', y: '-50%' }}
                  data-chrome
                >
                  {k === 'prev' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </motion.button>
              );
            })}

            <AnimatePresence>
              {prefs.ink && (
                <motion.div
                  key="ink-bar"
                  initial={{ opacity: 0, y: 30, x: '-50%' }}
                  animate={{ opacity: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, y: 30, x: '-50%' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute z-30 left-1/2"
                  style={{ bottom: 'max(14px, env(safe-area-inset-bottom))' }}
                  data-no-swipe
                  data-chrome
                >
                  <Toolbar clearPrefix={page.id + ':'} />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {app.focus && (
                <motion.button
                  key="exit-focus"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  type="button"
                  data-cursor="link"
                  onClick={() => app.setFocus(false)}
                  className="absolute top-3 right-3 z-30 press h-9 px-3.5 rounded-full material-thick border border-line text-[13px] font-medium flex items-center gap-1.5"
                  data-no-print
                >
                  <Minimize2 size={15} /> Exit focus
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* contents sheet */}
        <Sheet open={drawer} onClose={() => setDrawer(false)} side="left" title={hy ? 'High-yield order' : 'Contents'} width={420}>
          <div className="px-4 pb-2">
            <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-full bg-[var(--fill)] p-[3px]">
              {(
                [
                  ['all', 'All'],
                  ['todo', 'To do'],
                  ['revise', 'Revise'],
                  ['star', 'Important'],
                  ['done', 'Done'],
                ] as const
              ).map(([k, label]) => (
                <button key={k} type="button" data-cursor="link" onClick={() => setFilter(k)} className={'relative shrink-0 flex-1 h-8 px-3 rounded-full text-[13px] font-medium ' + (filter === k ? 'text-ink' : 'text-sub')}>
                  {filter === k && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-[var(--surface-solid)] shadow-sm" transition={{ type: 'spring', stiffness: 520, damping: 36 }} />}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="scroll-y flex-1 px-3 pb-6">
            {(hy ? [{ name: 'All pages by probability', tint: 'rose' as Tint, list: order }] : lecture.topics.map((t) => ({ ...t, list: order.filter((p) => p.topic === t.name) })))
              .map((g) => ({ ...g, list: g.list.filter(pass) }))
              .filter((g) => g.list.length)
              .map((g) => {
                const G = TOPIC_GLYPH[g.name];
                return (
                  <div key={g.name} className="mb-4">
                    <div className="flex items-center gap-1.5 px-2 mb-1.5 t-eyebrow" style={{ color: `var(--p-ink-${g.tint})` }}>
                      {G && <G size={14} />} {g.name}
                    </div>
                    {g.list.map((p, k) => {
                      const i = order.indexOf(p);
                      const m = marks[p.id] ?? {};
                      const pr = probs[p.id];
                      const tone = probTone(pr.pct);
                      return (
                        <motion.button
                          key={p.id}
                          type="button"
                          data-cursor="link"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.015 * k }}
                          onClick={() => {
                            go(i);
                            setDrawer(false);
                          }}
                          className={'w-full text-left flex items-center gap-3 rounded-[14px] px-2.5 py-2.5 transition-colors ' + (i === idx ? 'bg-[var(--action-soft)]' : 'hover:bg-[var(--hover-fill)]')}
                        >
                          <span className="w-12 shrink-0 text-center rounded-full font-rounded text-[12px] py-1 tabular-nums" style={{ background: tone.bg, color: tone.fg }}>
                            {pr.pct}%
                          </span>
                          <span className="flex-1 min-w-0 text-[14.5px] leading-snug">{p.title}</span>
                          <span className="flex gap-1 shrink-0">
                            {m.done && <Check size={14} className="text-[var(--p-ink-mint)]" />}
                            {m.revise && <RotateCcw size={14} className="text-[var(--p-ink-peach)]" />}
                            {m.star && <Star size={14} fill="currentColor" className="text-[var(--p-ink-butter)]" />}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                );
              })}
            {!order.some(pass) && <div className="text-center text-sub py-12 text-[15px]">Nothing here yet.</div>}
          </div>
        </Sheet>
      </div>
    </DeckCtx.Provider>
  );
}

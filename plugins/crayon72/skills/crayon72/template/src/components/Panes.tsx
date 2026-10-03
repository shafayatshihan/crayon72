import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, LayoutGrid, Play, X, ZoomIn, ZoomOut } from 'lucide-react';
import { SLIDES, VIDEOS, VIDEO_TOPIC_NAMES, slideInfo, slidesOf, lecturesOf, slideAspect, type Video } from '@/data/lectures';
import type { SlideId } from '@/data/types';
import { COURSE, teacherById, type TeacherId } from '@/data/course';
import { Surface } from './Annotate';
import { useLenis } from '@/lib/lenis';
import { IS_LOCAL as LOCAL, openYouTube as rawOpen, platform, type YtVideo } from '@/lib/youtube';
import { useToast } from './Toast';

/** Optional tiny hosted relay (e.g. GitHub Pages, see references/setup.md) that embeds YouTube from a real https origin,
 *  so videos play inside the offline app on Android / iPadOS (file:// pages get Error 153). Set `relayUrl` in course.json. */
const RELAY = COURSE.relayUrl;
const MOBILE = platform() !== 'desktop';

export type PaneState = { tab: 'slides' | 'video'; slide: SlideId; nonce: number; video?: Video };

export function PaneTabs({ pane, setPane, onClose }: { pane: PaneState; setPane: (p: PaneState) => void; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 hairline-b material-regular">
      <div className="relative flex rounded-full bg-[var(--fill)] p-[3px]" role="tablist">
        {(['slides', 'video'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={pane.tab === t}
            data-cursor="link"
            onClick={() => setPane({ ...pane, tab: t })}
            className={'relative z-10 px-4 h-8 rounded-full text-[13px] font-medium transition-colors ' + (pane.tab === t ? 'text-ink' : 'text-sub')}
          >
            {pane.tab === t && <motion.span layoutId="pane-tab" className="absolute inset-0 -z-10 rounded-full bg-[var(--surface-solid)] shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            {t === 'slides' ? 'Slides' : 'Video'}
          </button>
        ))}
      </div>
      <button type="button" aria-label="Close split view" data-cursor="link" onClick={onClose} className="press h-8 w-8 grid place-items-center rounded-full bg-[var(--fill)] text-sub hover:text-ink">
        <X size={16} />
      </button>
    </div>
  );
}

export function SlidesPane({ teacher, target: rawTarget, nonce }: { teacher: TeacherId; target: SlideId; nonce: number }) {
  const scroller = useRef<HTMLDivElement>(null);
  const target = String(rawTarget);
  const [zoom, setZoom] = useState(1);
  const [cur, setCur] = useState(target);
  const pageNo = (id: string) => slideInfo(id).page;
  const [jump, setJump] = useState(String(pageNo(target)));
  const [thumbs, setThumbs] = useState(false);
  const pages = slidesOf(teacher);
  const multi = pages.some((p) => p.includes(':')); // one PDF per lecture: page numbers restart, jump within the current lecture
  const lenis = useLenis(scroller);

  const scrollTo = (p: string, flash = true, delay = 0) => {
    const run = () => {
      const sc = scroller.current;
      const el = sc?.querySelector<HTMLElement>(`[data-slide="${p}"]`);
      if (!el || !sc) return;
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 12;
      if (lenis.current) {
        lenis.current.resize();
        lenis.current.scrollTo(top, { duration: 0.9, force: true });
      } else sc.scrollTo({ top, behavior: 'smooth' });
      if (flash) {
        el.classList.remove('flash-target');
        void el.offsetWidth;
        el.classList.add('flash-target');
      }
    };
    return window.setTimeout(run, delay);
  };

  // wait for the split-pane spring to settle so layout is final, then correct: on first open the pane width
  // (and so every slide's height) is still animating when the first jump is measured.
  useEffect(() => {
    const ids = [scrollTo(target, true, 420)];
    for (const t of [950, 1500]) {
      ids.push(
        window.setTimeout(() => {
          const sc = scroller.current;
          const el = sc?.querySelector<HTMLElement>(`[data-slide="${target}"]`);
          if (!el || !sc) return;
          const off = el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12;
          if (Math.abs(off) < 24) return;
          const top = sc.scrollTop + off;
          if (lenis.current) {
            lenis.current.resize();
            lenis.current.scrollTo(top, { immediate: true, force: true });
          } else sc.scrollTop = top;
        }, t),
      );
    }
    return () => ids.forEach((i) => window.clearTimeout(i));
  }, [target, nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // track the slide in view
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const io = new IntersectionObserver(
      (es) => {
        const vis = es.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) {
          const p = (vis.target as HTMLElement).dataset.slide!;
          setCur(p);
          if (document.activeElement?.getAttribute('aria-label') !== 'Go to slide') setJump(String(pageNo(p)));
        }
      },
      { root: sc, threshold: [0.5, 0.75] },
    );
    sc.querySelectorAll('[data-slide]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [zoom]);

  const step = (d: number) => {
    const i = pages.indexOf(cur);
    const p = pages[Math.max(0, Math.min(pages.length - 1, i + d))];
    scrollTo(p, false);
  };

  let lastLec = -1;
  const lecTitle = (n: number) => lecturesOf(teacher).find((l) => l.n === n)?.title;
  return (
    <div className="relative h-full flex flex-col">
      <div ref={scroller} className="scroll-y flex-1 px-3 sm:px-4 py-3">
        <div className="mx-auto pb-24" style={{ width: `${zoom * 100}%`, maxWidth: zoom > 1 ? 'none' : 1100 }}>
          {pages.map((p) => {
            const lec = slideInfo(p).lec;
            const head = lec !== lastLec;
            lastLec = lec;
            return (
              <div key={p}>
                {head && <div className="t-eyebrow mt-2 mb-2 px-1">Lecture {lec}{lecTitle(lec) ? ` · ${lecTitle(lec)}` : ''}</div>}
                <div data-slide={p} className="mb-3 rounded-[14px] overflow-hidden border border-line bg-white" style={{ boxShadow: 'var(--shadow)' }}>
                  <Surface id={`slide:${p}`}>
                    <img src={SLIDES[p]} alt={`Slide ${p}`} loading="lazy" decoding="async" draggable={false} className="block w-full h-auto select-none" style={{ aspectRatio: slideAspect(p) }} />
                  </Surface>
                </div>
                <div className="text-[11px] text-faint text-right -mt-2 mb-2 pr-1 tabular-nums">{multi ? `L${lec} · ` : ''}p. {pageNo(p)}</div>
              </div>
            );
          })}
          <div className="text-center text-[13px] text-sub py-6">{teacherById(teacher).short}’s slides · {pages.length} pages.</div>
        </div>
      </div>
      <AnimatePresence>
        {thumbs && (
          <motion.div
            key="thumbs"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="absolute left-3 right-3 bottom-[62px] material-thick border border-line rounded-[18px] p-2 flex gap-2 overflow-x-auto no-scrollbar"
            style={{ boxShadow: 'var(--shadow-lift)' }}
          >
            {pages.map((p) => (
              <button key={p} type="button" data-cursor="link" onClick={() => scrollTo(p)} className={'shrink-0 w-24 rounded-[8px] overflow-hidden border-2 transition-colors ' + (p === cur ? 'border-[var(--action)]' : 'border-transparent')}>
                <img src={SLIDES[p]} alt="" loading="lazy" className="block w-full object-contain bg-white" style={{ aspectRatio: "16/9" }} />
                <div className="text-[10px] text-sub py-0.5 tabular-nums">{multi ? `${slideInfo(p).lec}·` : ''}{pageNo(p)}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex items-center gap-0.5 material-thick border border-line rounded-full p-1" style={{ boxShadow: 'var(--shadow)' }}>
        <button type="button" aria-label="Thumbnails" data-cursor="link" onClick={() => setThumbs((t) => !t)} className={'press h-8 w-8 grid place-items-center rounded-full ' + (thumbs ? 'bg-[var(--action)] text-white' : 'hover:bg-[var(--hover-fill)]')}>
          <LayoutGrid size={15} />
        </button>
        <button type="button" aria-label="Previous slide" data-cursor="link" onClick={() => step(-1)} className="press h-8 w-8 grid place-items-center rounded-full hover:bg-[var(--hover-fill)]">
          <ChevronUp size={16} />
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseInt(jump, 10);
            const id = multi ? `m${slideInfo(cur).lec}:${n}` : String(n);
            if (SLIDES[id]) scrollTo(id);
            else setJump(String(pageNo(cur)));
          }}
          className="flex items-center text-[13px] tabular-nums"
        >
          <input aria-label="Go to slide" value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))} className="w-9 h-7 text-center rounded-md bg-[var(--fill)] outline-none focus:ring-2 ring-[var(--action)]" inputMode="numeric" />
          <span className="text-sub px-1">/ {multi ? pages.filter((p) => slideInfo(p).lec === slideInfo(cur).lec).length : pages[pages.length - 1]}</span>
        </form>
        <button type="button" aria-label="Next slide" data-cursor="link" onClick={() => step(1)} className="press h-8 w-8 grid place-items-center rounded-full hover:bg-[var(--hover-fill)]">
          <ChevronDown size={16} />
        </button>
        <span className="mx-0.5 h-5 w-px bg-[var(--line-strong)]" />
        <button type="button" aria-label="Zoom out" data-cursor="link" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} className="press h-8 w-8 grid place-items-center rounded-full hover:bg-[var(--hover-fill)]">
          <ZoomOut size={15} />
        </button>
        <button type="button" aria-label="Zoom in" data-cursor="link" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))} className="press h-8 w-8 grid place-items-center rounded-full hover:bg-[var(--hover-fill)]">
          <ZoomIn size={15} />
        </button>
      </div>
    </div>
  );
}

export function VideoPane({ topics, video, onPick }: { topics: string[]; video?: Video; onPick: (v: Video) => void }) {
  const toast = useToast();
  const openYouTube = (v: YtVideo) => {
    if (rawOpen(v) === 'duplicate') toast('Already playing in your video window', { icon: <Play size={18} /> });
  };
  const list = topics.flatMap((t) => (VIDEOS[t] ?? []).map((v) => ({ ...v, topic: t })));
  const cur = video ?? list[0];
  return (
    <div className="h-full flex flex-col">
      {cur ? (
        <div className="p-3">
          {LOCAL && MOBILE && RELAY ? (
            <div className="relative w-full overflow-hidden rounded-[16px] bg-black" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                key={cur.id}
                className="absolute inset-0 w-full h-full"
                src={`${RELAY}?v=${cur.id}&t=${cur.start || 0}`}
                title={cur.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
            </div>
          ) : LOCAL ? (
            <button
              type="button"
              data-cursor="link"
              data-sound="whoosh"
              onClick={() => openYouTube(cur)}
              className="group relative block w-full overflow-hidden rounded-[16px] bg-black text-left"
              style={{ aspectRatio: '16 / 9', boxShadow: 'var(--shadow-lift)' }}
            >
              <img src={`https://i.ytimg.com/vi/${cur.id}/hqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-95 transition-opacity" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <motion.span whileHover={{ scale: 1.08 }} className="absolute left-1/2 top-1/2 h-16 w-16 rounded-full grid place-items-center material-thin text-white" style={{ background: "rgba(255,255,255,.22)", x: "-50%", y: "-50%" }}>
                <Play size={28} fill="currentColor" />
              </motion.span>
              <span className="absolute left-3 right-3 bottom-3 text-white text-[12.5px] leading-snug">
                {platform() === 'desktop' ? 'Offline file: YouTube plays in one window docked on the left half of your screen. Tap to play.' : 'Tap to play in the YouTube app.'}
              </span>
            </button>
          ) : (
            <div className="relative w-full overflow-hidden rounded-[16px] bg-black" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                key={cur.id}
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${cur.id}?start=${cur.start || 0}&autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={cur.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}
          <div className="mt-2 flex items-start justify-between gap-2">
            <div>
              <div className="text-[15px] font-medium leading-snug">{cur.title}</div>
              <div className="text-[13px] text-sub">{cur.channel}</div>
            </div>
            <button
              type="button"
              onClick={() => openYouTube(cur)}
              data-cursor="link"
              data-sound="whoosh"
              className="press shrink-0 inline-flex items-center gap-1 rounded-full px-3 h-8 text-[12.5px] bg-[var(--fill)] hover:brightness-110"
              title="Open on YouTube (one window / YouTube app)"
            >
              <ExternalLink size={14} /> {MOBILE ? 'YouTube app' : 'YouTube'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 text-sub">No videos for this topic.</div>
      )}
      <div className="scroll-y flex-1 px-3 pb-4">
        {topics.map((t) => (
          <div key={t} className="mt-2">
            <div className="text-[12px] uppercase tracking-[0.12em] text-sub px-1 mb-1.5">{VIDEO_TOPIC_NAMES[t] ?? t}</div>
            {(VIDEOS[t] ?? []).map((v) => (
              <button
                key={v.id}
                type="button"
                data-cursor="link"
                onClick={() => {
                  onPick(v);
                  if (LOCAL && !MOBILE) openYouTube(v);
                }}
                className={'w-full text-left flex gap-3 items-center rounded-xl p-2 mb-1 transition-colors ' + (cur?.id === v.id ? 'bg-[var(--action-soft)]' : 'hover:bg-[var(--hover-fill)]')}
              >
                <div className="relative w-28 shrink-0 rounded-lg overflow-hidden bg-[var(--line)]" style={{ aspectRatio: '16/9' }}>
                  <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                  <Play size={16} className="absolute inset-0 m-auto text-white drop-shadow" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium leading-snug line-clamp-2">{v.title}</div>
                  <div className="text-[12px] text-sub truncate">{v.channel} · {v.why}</div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

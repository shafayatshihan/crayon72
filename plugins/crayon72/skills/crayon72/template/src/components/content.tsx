import { createContext, useContext, type ReactNode } from 'react';
import type { SlideId } from '@/data/types';
import { slideLabel } from '@/data/slideid';
import { BookOpen, CornerDownRight, Lightbulb, Sparkles } from 'lucide-react';

export interface DeckApi {
  openSlides: (page: SlideId) => void;
  goTo: (pageId: string) => void;
  pageTitle: (pageId: string) => string | undefined;
}
export const DeckCtx = createContext<DeckApi>({ openSlides: () => {}, goTo: () => {}, pageTitle: () => undefined });

/** Inline button that opens the professor's slide at a page (split view). */
export function SlideRef({ p, children }: { p: SlideId; children?: ReactNode }) {
  const d = useContext(DeckCtx);
  return (
    <button
      type="button"
      data-cursor="link"
      onClick={() => d.openSlides(p)}
      className="press inline-flex items-center gap-1 align-baseline rounded-full px-2.5 py-[2px] text-[12.5px] font-medium bg-[var(--p-sky)] text-[var(--p-ink-sky)] hover:brightness-110 transition"
    >
      <BookOpen size={12} />
      {children ?? slideLabel(p)}
    </button>
  );
}

/** "Already explained on page X" link, used to avoid re-explaining theory. */
export function Recall({ to, children }: { to: string; children: ReactNode }) {
  const d = useContext(DeckCtx);
  const t = d.pageTitle(to);
  return (
    <div className="my-3 flex items-start gap-2.5 rounded-[16px] bg-[var(--fill)] px-4 py-3 text-[14.5px] text-sub">
      <CornerDownRight size={16} className="mt-0.5 shrink-0" />
      <div>
        {children}{' '}
        {t && (
          <button type="button" data-cursor="link" className="font-medium text-link hover:underline" onClick={() => d.goTo(to)}>
            {t} ›
          </button>
        )}
      </div>
    </div>
  );
}

export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="relative pl-11 my-6">
      <div className="absolute left-0 top-0 h-8 w-8 rounded-full grid place-items-center text-[14px] font-rounded bg-[var(--action)] text-white shadow-sm">{n}</div>
      <h4 className="!mt-0.5 font-display text-[19px] font-semibold tracking-[-0.02em]">{title}</h4>
      <div>{children}</div>
    </section>
  );
}

export function Basics({ children, title = 'Basics first' }: { children: ReactNode; title?: string }) {
  return (
    <div className="my-4 rounded-[20px] px-5 py-4 bg-[var(--p-mint)]">
      <div className="flex items-center gap-1.5 t-eyebrow !text-[var(--p-ink-mint)]">
        <Lightbulb size={14} /> {title}
      </div>
      <div className="mt-1.5 text-[calc(16px*var(--study-scale))]">{children}</div>
    </div>
  );
}

export function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 rounded-[20px] px-5 py-4 bg-[var(--p-butter)] text-[calc(15.5px*var(--study-scale))] flex gap-2.5">
      <Sparkles size={17} className="mt-[3px] shrink-0 text-[var(--p-ink-butter)]" />
      <div>
        <span className="font-semibold text-[var(--p-ink-butter)]">Exam tip · </span>
        {children}
      </div>
    </div>
  );
}

/** Underlined heading as students write in scripts */
export function H({ children }: { children: ReactNode }) {
  return <p className="!mt-1 font-semibold underline decoration-[var(--pen)]/40 underline-offset-4">{children}</p>;
}

export function Q({ children }: { children: ReactNode }) {
  return <span>{children}</span>;
}

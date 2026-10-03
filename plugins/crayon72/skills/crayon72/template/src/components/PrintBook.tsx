import { Fragment, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileDown, Printer } from 'lucide-react';
import { LECTURES } from '@/data/lectures';
import { TEACHERS, teacherById, type TeacherId } from '@/data/course';
import type { Lecture, QPage, Variant } from '@/data/types';
import { probability } from '@/lib/prob';
import { slideChip } from '@/data/slideid';
import { useApp } from '@/lib/app';
import { Sheet } from './Sheet';

/** What the print book contains. teacher/key unset = whole course. */
export interface PrintScope {
  teacher?: TeacherId;
  key?: string;
  examples: boolean;
  attach: boolean;
}

/** Deck order: topics in lecture order; inside a topic past finals by probability, then examples. */
function ordered(l: Lecture): QPage[] {
  const pct = (p: QPage) => probability(p).pct;
  const byP = (a: QPage, b: QPage) => (a.kind === b.kind ? pct(b) - pct(a) : a.kind === 'past' ? -1 : 1);
  return l.topics.flatMap((t) => l.pages.filter((p) => p.topic === t.name).sort(byP));
}

export function bookLectures(s: PrintScope): Lecture[] {
  return LECTURES.filter((l) => !l.locked && (s.key ? l.key === s.key : s.teacher ? l.teacher === s.teacher : true));
}

function VariantBlock({ page, v }: { page: QPage; v: Variant }) {
  const ans = v.answer ?? page.solution;
  return (
    <div className="pb-var">
      <div className="pb-q">
        <b>
          {v.year === 'Example' ? 'Example' : v.year} {v.ref}
          {v.marks ? ` · ${v.marks}` : ''}
        </b>{' '}
        — {v.text}
      </div>
      {v.figure?.src && <img className="pb-img" src={v.figure.src} alt={v.figure.title} />}
      {v.same ? <div className="pb-same">→ Same answer as {v.same}.</div> : <div className="pb-ans">{ans}</div>}
    </div>
  );
}

function PageBlock({ page, attach }: { page: QPage; attach: boolean }) {
  const pr = probability(page);
  return (
    <section className="pb-page">
      <h3 className="pb-title">{page.title}</h3>
      <div className="pb-meta">
        {page.topic}
        {page.kind === 'past' ? ` · asked ${pr.asked}/${pr.of} · ${pr.pct}%` : ' · lecture example'}
        {page.slides.length ? ` · ${page.slides.slice(0, 3).map(slideChip).join(', ')}` : ''}
      </div>
      {attach && page.attachments?.map((a) => (a.src ? <img key={a.title} className="pb-img" src={a.src} alt={a.title} /> : null))}
      {page.variants.map((v, i) => (
        <VariantBlock key={v.year + v.ref + i} page={page} v={v} />
      ))}
    </section>
  );
}

/** Shrink display equations / tables / wide blocks that are wider than their column (no clipping, no overflow into the gutter). */
function fitWide() {
  document.querySelectorAll<HTMLElement>('.pb .katex-display, .pb table, .pb pre').forEach((el) => {
    el.style.zoom = '';
    const box = el.parentElement?.clientWidth ?? 0;
    const w = el.scrollWidth;
    if (box && w > box + 1) el.style.zoom = String(Math.max(0.5, box / w));
  });
}

/** The print-only book: A4, two columns, solutions only (no descriptions). Opens the print dialog when ready. */
export function PrintBook({ scope }: { scope: PrintScope }) {
  const lecs = useMemo(() => bookLectures(scope), [scope]);
  const pages = lecs.reduce((n, l) => n + l.pages.filter((p) => scope.examples || p.kind === 'past').length, 0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.dataset.theme;
    root.dataset.theme = 'light';
    root.classList.add('printing-book');
    let alive = true;
    document.fonts.ready.then(() =>
      window.setTimeout(() => {
        if (!alive) return;
        fitWide();
        setReady(true);
        window.print();
      }, 700),
    );
    return () => {
      alive = false;
      root.classList.remove('printing-book');
      if (prev) root.dataset.theme = prev;
    };
  }, []);

  const label = scope.key
    ? `${teacherById(lecs[0]?.teacher ?? TEACHERS[0].id).short} · Lecture ${lecs[0]?.n}`
    : scope.teacher
      ? teacherById(scope.teacher).short
      : 'Whole course';

  return (
    <div className="pb-screen">
      <div className="pb-bar" data-no-print>
        <button type="button" data-cursor="link" onClick={() => history.back()} className="press inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 bg-[var(--fill)] text-[14px]">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="text-[14px] text-sub">
          Print book · {label} · {pages} question types {ready ? '' : '· preparing…'}
        </div>
        <button type="button" data-cursor="link" onClick={() => window.print()} className="press btn-primary !py-2 !px-4 !text-[14px] inline-flex items-center gap-1.5">
          <Printer size={15} /> Print / Save as PDF
        </button>
      </div>
      <div className="pb-sheet">
        <article className="pb">
          <header className="pb-cover">
            <b>Crayon 72</b> · {label} · solutions only · {new Date().toLocaleDateString()}
          </header>
          {lecs.map((l) => (
            <Fragment key={l.key}>
              <h2 className="pb-lec">
                {teacherById(l.teacher).short} · Lecture {l.n} — {l.title}
              </h2>
              {ordered(l)
                .filter((p) => scope.examples || p.kind === 'past')
                .map((p) => (
                  <PageBlock key={p.id} page={p} attach={scope.attach} />
                ))}
            </Fragment>
          ))}
        </article>
      </div>
    </div>
  );
}

/** Export dialog: pick the scope, then open the print book. */
export function ExportSheet({ open, onClose, preKey }: { open: boolean; onClose: () => void; preKey?: string }) {
  const app = useApp();
  const [mode, setMode] = useState<'all' | 'teacher' | 'lecture'>('all');
  const [teacher, setTeacher] = useState<TeacherId>(TEACHERS[0].id);
  const [key, setKey] = useState<string>('');
  const [examples, setExamples] = useState(true);
  const [attach, setAttach] = useState(true);
  const live = LECTURES.filter((l) => !l.locked);
  useEffect(() => {
    if (open && preKey) {
      setMode('lecture');
      setKey(preKey);
    }
  }, [open, preKey]);
  const scope: PrintScope = { examples, attach, ...(mode === 'teacher' ? { teacher } : mode === 'lecture' ? { key: key || live[0]?.key } : {}) };
  const n = bookLectures(scope).reduce((s, l) => s + l.pages.filter((p) => examples || p.kind === 'past').length, 0);
  const sel = 'h-9 rounded-[10px] bg-[var(--fill)] px-2 text-[14px] outline-none max-w-[220px]';
  return (
    <Sheet open={open} onClose={onClose} title="Export PDF" width={440}>
      <div className="p-4 space-y-4 text-[14.5px]">
        <p className="text-sub text-[13.5px] leading-snug">A4 · two columns · small print · every question with its exam-script solutions (no descriptions). In the print dialog choose “Save as PDF”, margins “Default”.</p>
        <div className="flex gap-1 p-1 rounded-full bg-[var(--fill)]" role="tablist">
          {(
            [
              ['all', 'Whole course'],
              ['teacher', 'One teacher'],
              ['lecture', 'One lecture'],
            ] as const
          ).map(([k, t]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} data-cursor="link" onClick={() => setMode(k)} className={'flex-1 h-8 rounded-full text-[13.5px] ' + (mode === k ? 'bg-[var(--surface-solid)] shadow-sm font-medium' : 'text-sub')}>
              {t}
            </button>
          ))}
        </div>
        {mode === 'teacher' && (
          <select aria-label="Teacher" className={sel} value={teacher} onChange={(e) => setTeacher(e.target.value as TeacherId)}>
            {TEACHERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.short}
              </option>
            ))}
          </select>
        )}
        {mode === 'lecture' && (
          <select aria-label="Lecture" className={sel} value={key || live[0]?.key} onChange={(e) => setKey(e.target.value)}>
            {live.map((l) => (
              <option key={l.key} value={l.key}>
                {teacherById(l.teacher).short} · L{l.n} {l.title}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={examples} onChange={(e) => setExamples(e.target.checked)} /> Include lecture examples
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} /> Include paper tables / charts
        </label>
        <button
          type="button"
          data-cursor="link"
          onClick={() => {
            onClose();
            app.nav({ v: 'print', scope });
          }}
          className="press btn-primary w-full !py-2.5 inline-flex items-center justify-center gap-2"
        >
          <FileDown size={16} /> Export {n} question types
        </button>
      </div>
    </Sheet>
  );
}

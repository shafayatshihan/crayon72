import type { QPage, Year } from '@/data/types';

import { COURSE, otherTeacher, teacherOfKey } from '@/data/course';

/** All papers we have, oldest → newest, with recency weight (1, 1.25, 1.5, …). */
export const YEARS: { y: Year; w: number }[] = COURSE.papers.map((y, i) => ({ y, w: 1 + 0.25 * i }));
export const LATEST: Year = COURSE.papers[COURSE.papers.length - 1];
const TOTAL_W = YEARS.reduce((s, x) => s + x.w, 0);

export interface Prob {
  pct: number;
  asked: number;
  of: number;
  last: Year | null;
  why: string[];
}

export function probability(p: QPage): Prob {
  if (p.kind === 'example') {
    return { pct: 12, asked: 0, of: YEARS.length, last: null, why: ['Lecture example: not asked in any final yet.', 'Estimate only — practise it after the past-final pages.'] };
  }
  const years = Array.from(new Set(p.variants.map((v) => v.year)));
  const wsum = YEARS.filter((x) => years.includes(x.y)).reduce((s, x) => s + x.w, 0);
  const wf = wsum / TOTAL_W;
  let pct = 12 + 83 * Math.pow(wf, 0.8);
  const why: string[] = [];
  why.push(`Asked in ${years.length} of ${YEARS.length} ${COURSE.code} papers (${years.join(', ')}).`);
  why.push(`Recency-weighted frequency = ${(wf * 100).toFixed(0)}% (${LATEST} counts ${YEARS[YEARS.length - 1].w}×, ${YEARS[0].y} counts 1×).`);
  const last = YEARS.filter((x) => years.includes(x.y)).slice(-1)[0]?.y ?? null;
  if (years.includes(LATEST)) {
    pct *= 0.92;
    why.push('Appeared in the latest paper → small cool-down (topics often rest a year).');
  }
  if (p.boost) {
    pct += p.boost.by;
    why.push(p.boost.why);
  }
  if (p.otherSection) {
    pct *= 0.9;
    const t = teacherOfKey(p.lecture);
    why.push(`Usually set in Section ${otherTeacher(t.id).section} (${otherTeacher(t.id).short}) → slightly lower for ${t.short}’s part.`);
  }
  pct = Math.max(5, Math.min(95, Math.round(pct)));
  return { pct, asked: years.length, of: YEARS.length, last, why };
}

export function probTone(pct: number) {
  if (pct >= 60) return { bg: 'var(--p-rose)', fg: 'var(--p-ink-rose)', label: 'High' };
  if (pct >= 40) return { bg: 'var(--p-peach)', fg: 'var(--p-ink-peach)', label: 'Medium' };
  if (pct >= 25) return { bg: 'var(--p-butter)', fg: 'var(--p-ink-butter)', label: 'Fair' };
  return { bg: 'var(--p-sky)', fg: 'var(--p-ink-sky)', label: 'Low' };
}

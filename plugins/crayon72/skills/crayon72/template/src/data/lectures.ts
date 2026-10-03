import type { Lecture, QPage, SlideId } from './types';
import type { TeacherId } from './course';
import { L1_PAGES, L1_TOPICS } from './l1';
import videosJson from './videos.json';
import { slideTeacher, monjurSlide, isPerLecture } from './slideid';
import { TEACHERS, teacherById } from './course';

export interface Video {
  id: string;
  title: string;
  channel: string;
  start: number;
  why: string;
}
export const VIDEOS = videosJson as Record<string, Video[]>;

export const VIDEO_TOPIC_NAMES: Record<string, string> = {};

type Def = Omit<Lecture, 'key' | 'teacher' | 'pages'> & { pages: QPage[] };
const soon = { subtitle: 'Coming soon', locked: true, topics: [], pages: [] };
/** Stamp teacher + key on a lecture and normalise its pages' `lecture` to that key. */
function build(teacher: TeacherId, prefix: string, defs: Def[]): Lecture[] {
  return defs.map((d) => {
    const key = prefix + d.n;
    const sec = teacherById(teacher).section;
    const own = `Sec ${sec}`;
    // other-section flag is derived: a page is "other section" only if none of its variants was printed in this teacher's section
    const other = (p: QPage) => (sec && p.kind === 'past' && p.variants.some((v) => /Sec [A-Z]/.test(v.ref)) ? !p.variants.some((v) => v.ref.includes(own)) : p.otherSection);
    return { ...d, key, teacher, pages: d.pages.map((p) => ({ ...p, lecture: key, otherSection: other(p) })) };
  });
}



/** Cross-deck copies: a page from one teacher's deck shown again in the other's (same answers, own id → own ink & marks).
 *  `from` = existing page id, `to` = lecture key, `slides` = the other teacher's slide ids. */
const DUPS: { from: string; to: string; slides?: SlideId[]; topic?: string; note?: string }[] = [];

/** Extra cross-links between sibling sub-parts that live in different lectures (added one way; label = what the target is). */
const LINKS: { from: string; to: string; label: string }[] = [];

function applyDups(lectures: Lecture[]) {
  const all = lectures.flatMap((l) => l.pages);
  for (const k of LINKS) {
    const src = all.find((p) => p.id === k.from);
    if (src && all.some((p) => p.id === k.to) && !src.links?.some((x) => x.to === k.to)) src.links = [...(src.links ?? []), { label: k.label, to: k.to }];
  }
  for (const d of DUPS) {
    const src = all.find((p) => p.id === d.from);
    const dst = lectures.find((l) => l.key === d.to);
    if (!src || !dst) continue;
    const srcLec = lectures.find((l) => l.key === src.lecture)!;
    const id = `${d.to}-${src.id.replace(/^[a-z]+\d+-/, '')}`;
    // a question printed in the destination teacher's own section is that teacher's own
    const dSec = teacherById(dst.teacher).section;
    const ownSec = `Sec ${dSec}`;
    const copy: QPage = {
      ...src,
      id,
      lecture: d.to,
      topic: d.topic ?? src.topic,
      note: d.note ?? src.note,
      slides: d.slides ?? [],
      otherSection: dSec ? !src.variants.some((v) => v.ref.includes(ownSec)) : src.otherSection,
      links: [...(src.links ?? []), { label: `Also in ${teacherById(srcLec.teacher).short} · Lecture ${srcLec.n}`, to: src.id }],
    };
    src.links = [...(src.links ?? []), { label: `Also in ${teacherById(dst.teacher).short} · Lecture ${dst.n}`, to: id }];
    dst.pages.push(copy);
    if (!dst.topics.some((t) => t.name === copy.topic)) dst.topics.push(srcLec.topics.find((t) => t.name === copy.topic) ?? { name: copy.topic, tint: 'sky' });
  }
  return lectures;
}


















const L_demo: Def[] = [
  { n: 1, title: "Gears & Levers", subtitle: "Ratios and moments of force", topics: L1_TOPICS, pages: L1_PAGES },
  { n: 2, title: 'Your next lecture goes here', ...soon },
];

const DEFS: Record<string, Def[]> = { demo: L_demo };
export const LECTURES: Lecture[] = applyDups(TEACHERS.flatMap((t) => build(t.id, t.keyPrefix, DEFS[t.id] ?? [])));
export const lecturesOf = (t: TeacherId) => LECTURES.filter((l) => l.teacher === t);
export const lectureByKey = (key: string) => LECTURES.find((l) => l.key === key);
/** The lecture a page belongs to (pages carry the lecture key after build). */
export const lectureOf = (p: QPage) => lectureByKey(String(p.lecture))!;

export const ALL_PAGES = LECTURES.flatMap((l) => l.pages);
export const pageById = (id: string) => ALL_PAGES.find((p) => p.id === id);

/* Slide images. First teacher: pNNN.webp → id NNN (combined PDF page). Other teachers: <key>LL-NNN.webp → id '<key>L:N'. */
const slideMods = import.meta.glob('../assets/slides/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const SLIDES: Record<string, string> = {};
for (const [k, v] of Object.entries(slideMods)) {
  let m = k.match(/\/p(\d+)\.webp$/);
  if (m) SLIDES[String(+m[1])] = v;
  m = k.match(/\/([a-z]+)(\d+)-(\d+)\.webp$/);
  if (m) SLIDES[`${m[1]}${+m[2]}:${+m[3]}`] = v;
}
const slideSortKey = (id: string) => (isPerLecture(id) ? [monjurSlide(id).lec, monjurSlide(id).page] : [0, +id]);
/** Slide ids of a teacher in reading order. */
export function slidesOf(t: TeacherId): string[] {
  return Object.keys(SLIDES)
    .filter((id) => slideTeacher(id) === t)
    .sort((a, b) => {
      const [a1, a2] = slideSortKey(a), [b1, b2] = slideSortKey(b);
      return a1 - b1 || a2 - b2;
    });
}
/** Lecture number a slide belongs to, and its page number inside that PDF. */
export function slideInfo(id: SlideId): { lec: number; page: number } {
  if (isPerLecture(id)) return monjurSlide(id);
  const p = +id;
  return { lec: LECTURES.find((l) => l.teacher === TEACHERS[0].id && l.slideRange && p >= l.slideRange[0] && p <= l.slideRange[1])?.n ?? 0, page: p };
}
export { slideTeacher, slideLabel, slideChip } from './slideid';
/** CSS aspect-ratio of a slide image (per-lecture PDFs may mix 4:3 and 16:9). */
export function slideAspect(id: SlideId) {
  if (!isPerLecture(id)) return LECTURES.find((l) => l.teacher === TEACHERS[0].id && l.aspect)?.aspect ?? '16 / 9';
  return LECTURES.find((l) => l.key === String(id).split(':')[0])?.aspect ?? '16 / 9';
}

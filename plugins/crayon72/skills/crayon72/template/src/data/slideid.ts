import type { SlideId } from './types';
import { TEACHERS, type TeacherId } from './course';

/* Pure helpers for slide ids (no lecture imports, so content.tsx can use them without an import cycle).
   Number → first teacher's combined PDF page. '<keyPrefix><lecture>:<page>' → that teacher's per-lecture PDF. */
const PER = /^([a-z]+)(\d+):(\d+)$/;
export const slideTeacher = (id: SlideId): TeacherId => {
  const m = typeof id === 'string' ? id.match(PER) : null;
  return (m && TEACHERS.find((t) => t.keyPrefix === m[1])?.id) || TEACHERS[0].id;
};
export const isPerLecture = (id: SlideId) => typeof id === 'string' && PER.test(id);
/** 'm2:15' → { lec: 2, page: 15 }. */
export const monjurSlide = (id: SlideId) => {
  const m = String(id).match(PER);
  return m ? { lec: +m[2], page: +m[3] } : { lec: 0, page: +id };
};
export const slideLabel = (id: SlideId) => (isPerLecture(id) ? `L${monjurSlide(id).lec} · Slide ${monjurSlide(id).page}` : `Slide ${id}`);
/** Compact chip text: combined PDF 'p.32', per-lecture 'L2 p.15'. */
export const slideChip = (id: SlideId) => (isPerLecture(id) ? `L${monjurSlide(id).lec} p.${monjurSlide(id).page}` : `p.${id}`);

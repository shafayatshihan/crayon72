import type { ReactNode } from 'react';

export type { Year, TeacherId } from './course';
import type { Year, TeacherId } from './course';

/** A slide: The first teacher's combined PDF page as a number (e.g. 32), or '<key><lecture>:<page>' for per-lecture PDFs (e.g. 'm2:15'). */
export type SlideId = number | string;

/** A figure / chart / table that comes with the question paper (cropped image or rebuilt node). */
export interface Attach {
  title: string;
  src?: string;
  node?: ReactNode;
  caption?: string;
}

export interface Variant {
  /** paper session, or 'Example' for lecture / maths-sheet worked examples (kind: 'example') */
  year: Year | 'Example';
  /** e.g. "Q5(a) · Sec B" */
  ref: string;
  marks: number;
  text: ReactNode;
  /** This year's own answer (exam-script style). Falls back to page.solution. */
  answer?: ReactNode;
  /** Wording identical to another year's question → reuse that answer. */
  same?: Year;
  /** Figure printed with the question. */
  figure?: Attach;
}

export interface QPage {
  id: string;
  /** authoring: lecture number; normalised to the lecture key ('a3', 'm2') when LECTURES is built */
  lecture: number | string;
  topic: string;
  title: string;
  kind: 'past' | 'example';
  variants: Variant[];
  /** slide ids (see SlideId) */
  slides: SlideId[];
  videoTopics: string[];
  /** default answer (used by variants without their own `answer`) */
  solution: ReactNode;
  description: ReactNode;
  /** charts / tables attached to the paper that the solution needs (shown collapsible) */
  attachments?: Attach[];
  links?: { label: string; to: string }[];
  note?: string;
  otherSection?: boolean;
  boost?: { by: number; why: string };
}

export interface Lecture {
  /** unique key: 'a1'…'a10' (Anup Sir), 'm1'…'m11' (Monjur Sir) */
  key: string;
  teacher: TeacherId;
  n: number;
  title: string;
  subtitle: string;
  /** Anup Sir: page range in the combined PDF. Monjur Sir: unused (slides are 'm<n>:<page>'). */
  slideRange?: [number, number];
  locked?: boolean;
  /** slide aspect ratio of this lecture's PDF (default '16 / 9') */
  aspect?: string;
  topics: { name: string; tint: Tint }[];
  pages: QPage[];
}

export type Tint = 'rose' | 'peach' | 'butter' | 'mint' | 'sky' | 'lilac';

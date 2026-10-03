// ONE place for everything course-specific. A new course = python scripts/new-course.py course.json, then lecture data files.
export const COURSE = {
  code: 'DEMO 101',
  name: 'Simple Machines',
  teacher: 'Dr. Demo Teacher',
  teacherShort: 'Demo Sir',
  institution: 'Demo University',
  examLabel: 'Final exam',
  creator: { name: '', tag: '' },
  /** optional https page that relays YouTube embeds for file:// use on phones/iPads ('' = none) */
  relayUrl: '',
  /** every paper (session) that contains this course, oldest → newest */
  papers: ['2022', '2023'] as const,
};
export type Year = (typeof COURSE.papers)[number];

/** Teachers of the course. Each one is a section of the app with its own lecture decks and slides. */
export const TEACHERS = [
  // keyPrefix: lecture keys (a1, a2…) and per-lecture slide ids ('m2:15'); filePrefix: page files src/data/<filePrefix><n>.tsx.
  // The FIRST teacher may use one combined slides PDF (numeric slide ids = PDF page); the others use one PDF per lecture.
  // section: the paper section this teacher sets ('' if the paper has no sections).
  { id: 'demo', name: 'Dr. Demo Teacher', short: 'Demo Sir', section: '', keyPrefix: 'a', filePrefix: 'l' },
] as const;
export type TeacherId = (typeof TEACHERS)[number]['id'];
export const teacherById = (id: TeacherId) => TEACHERS.find((t) => t.id === id)!;
/** Teacher of a lecture key ('a3' → first teacher, 'm2' → another). */
export const teacherOfKey = (key: string | number) => {
  const p = String(key).match(/^[a-z]+/)?.[0];
  return TEACHERS.find((t) => t.keyPrefix === p) ?? TEACHERS[0];
};
/** The other teacher (whose section a cross-listed question normally belongs to). */
export const otherTeacher = (id: TeacherId) => TEACHERS.find((t) => t.id !== id)!;

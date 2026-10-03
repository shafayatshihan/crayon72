// Usage: node scripts/find-lectures.mjs "<slides.pdf>"
// Prints every page whose text looks like a lecture title, plus the total page count.
import { execFileSync } from 'child_process';

const pdf = process.argv[2];
if (!pdf) throw new Error('usage: node scripts/find-lectures.mjs "<slides.pdf>"');
const pages = +execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/)[1];
console.log('pages', pages);
for (let p = 1; p <= pages; p++) {
  let t = '';
  try {
    t = execFileSync('pdftotext', ['-f', String(p), '-l', String(p), '-layout', pdf, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    continue;
  }
  const m = t.split('\n').find((l) => /\b(lecture|lec\.?)\s*[-:#]?\s*\d+/i.test(l) || /^\s*LECTURE\b/.test(l));
  if (m) console.log(String(p).padStart(4), '|', m.trim().slice(0, 100));
}

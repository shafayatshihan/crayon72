// Usage: node scripts/render-slides.mjs "<slides.pdf>" [from] [to] [--prefix p] [--width 1280] [--q 72]
// Renders PDF pages to src/assets/slides/<prefix>NNN.webp (1280 px wide, q72 by default).
//   First teacher (one combined PDF): prefix 'p'    → pNNN.webp   → slide id NNN
//   Other teachers (one PDF per lecture): prefix 'b02-' (key letter) → b02-NNN.webp → slide id 'b2:N'
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  if (i < 0) return d;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const prefix = opt('prefix', 'p');
const width = +opt('width', 1280);
const q = +opt('q', 72);
const [pdf, a, b] = args;
if (!pdf) throw new Error('usage: node scripts/render-slides.mjs "<slides.pdf>" [from] [to] [--prefix p] [--width 1280] [--q 72]');
// pdfinfo exits non-zero on some slightly broken PDFs but still prints the page count
let info;
try {
  info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  info = e.stdout || '';
}
const pages = +info.match(/Pages:\s+(\d+)/)[1];
const from = +(a || 1), to = +(b || pages);
const tmp = path.resolve('raw/render-' + prefix.replace(/[^a-z0-9]/gi, ''));
const out = path.resolve('src/assets/slides');
fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(tmp)) fs.unlinkSync(path.join(tmp, f));
execFileSync('pdftoppm', ['-r', '150', '-f', String(from), '-l', String(to), '-png', pdf, path.join(tmp, 's')], { stdio: 'ignore' });
let total = 0, n = 0;
for (const f of fs.readdirSync(tmp).filter((f) => f.endsWith('.png'))) {
  const num = +f.match(/(\d+)\.png$/)[1];
  const dst = path.join(out, `${prefix}${String(num).padStart(3, '0')}.webp`);
  await sharp(path.join(tmp, f)).resize({ width, withoutEnlargement: true }).webp({ quality: q }).toFile(dst);
  total += fs.statSync(dst).size;
  n++;
  fs.unlinkSync(path.join(tmp, f));
}
console.log(`${n} slides (${prefix}) → src/assets/slides (${(total / 1e6).toFixed(1)} MB)`);

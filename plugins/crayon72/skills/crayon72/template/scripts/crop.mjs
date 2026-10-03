// Usage: node scripts/crop.mjs "<paper.pdf>" <page> <x%> <y%> <w%> <h%> <name>
// Renders one question-paper page at 200 dpi, crops a region given in % of the page, trims margins,
// writes src/assets/attach/<name>.webp. Import it in a lecture file:  import fig from '@/assets/attach/<name>.webp';
import { execFileSync } from 'child_process';
import fs from 'fs';
import sharp from 'sharp';

const [pdf, page, x, y, w, h, name] = process.argv.slice(2);
if (!name) throw new Error('usage: node scripts/crop.mjs "<pdf>" <page> <x%> <y%> <w%> <h%> <name>');
fs.mkdirSync('raw/crop', { recursive: true });
fs.mkdirSync('src/assets/attach', { recursive: true });
execFileSync('pdftoppm', ['-r', '200', '-f', page, '-l', page, '-png', '-singlefile', pdf, 'raw/crop/page'], { stdio: 'ignore' });
const m = await sharp('raw/crop/page.png').metadata();
const box = {
  left: Math.round((m.width * +x) / 100),
  top: Math.round((m.height * +y) / 100),
  width: Math.round((m.width * +w) / 100),
  height: Math.round((m.height * +h) / 100),
};
await sharp('raw/crop/page.png').extract(box).trim({ threshold: 12 }).webp({ quality: 85 }).toFile(`src/assets/attach/${name}.webp`);
console.log(`wrote src/assets/attach/${name}.webp`, box);

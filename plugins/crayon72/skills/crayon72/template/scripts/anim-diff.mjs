// Usage: node scripts/anim-diff.mjs
// For every raw/anim/*-t0.png vs its -t1.png: what % of pixels changed. 0% = nothing is moving.
import sharp from 'sharp';
import fs from 'fs';
const files = fs.readdirSync('raw/anim').filter((f) => f.endsWith('-t0.png')).sort();
for (const f of files) {
  const a = await sharp('raw/anim/' + f).raw().toBuffer({ resolveWithObject: true });
  const b = await sharp('raw/anim/' + f.replace('-t0', '-t1')).raw().toBuffer();
  let diff = 0, n = a.data.length;
  for (let i = 0; i < n; i += 4) if (Math.abs(a.data[i] - b[i]) + Math.abs(a.data[i+1] - b[i+1]) + Math.abs(a.data[i+2] - b[i+2]) > 30) diff++;
  const pct = (100 * diff / (n / 4)).toFixed(2);
  console.log(`${pct.padStart(6)}% moved  ${a.info.width}x${a.info.height}  ${f.replace('-t0.png', '')}`);
}

// Usage: node scripts/grid.mjs out.png <cols> <width> a.png b.png …
// Review sheet: screenshots side by side, each scaled to <width>.
import sharp from 'sharp';

const [out, cols, w, ...files] = process.argv.slice(2);
const C = +cols, W = +w;
const imgs = await Promise.all(files.map((f) => sharp(f).resize({ width: W }).toBuffer({ resolveWithObject: true })));
const H = Math.max(...imgs.map((i) => i.info.height));
await sharp({ create: { width: W * C, height: H * Math.ceil(imgs.length / C), channels: 3, background: '#777' } })
  .composite(imgs.map((i, k) => ({ input: i.data, left: (k % C) * W, top: Math.floor(k / C) * H })))
  .png()
  .toFile(out);
console.log('wrote', out);

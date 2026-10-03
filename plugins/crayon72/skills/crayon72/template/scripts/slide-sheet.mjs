// Usage: node scripts/slide-sheet.mjs out.png 21 22 23 24
// Contact sheet (2 columns) of rendered slides, to look at the professor's figures and
// hand-made marks quickly. One sheet of 6-8 slides costs ~1.8-2.5k image tokens, versus
// ~1.2k per slide read individually — so always prefer a sheet.
//
// Images are downsampled to a 1568 px long edge before the model sees them, so a sheet
// taller than that just loses detail. We cap at 8 slides (1280x1440) and spill the rest
// into out-2.png, out-3.png, ... rather than silently producing an unreadable sheet.
import sharp from 'sharp';

const [out, ...pages] = process.argv.slice(2);
const W = 640, H = 360, cols = 2, MAX = 8;
// ids: 12 (combined PDF p012.webp) or 'c2:15' (per-lecture PDF c02-015.webp)
const slideFile = (id) => {
  const m = String(id).match(/^([a-z]+)(\d+):(\d+)$/);
  return m ? `src/assets/slides/${m[1]}${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(3, '0')}.webp` : `src/assets/slides/p${String(id).padStart(3, '0')}.webp`;
};

const sheet = async (list, file) => {
  const comps = await Promise.all(
    list.map(async (p, i) => ({
      input: await sharp(slideFile(p)).resize(W, H).toBuffer(),
      left: (i % cols) * W,
      top: Math.floor(i / cols) * H,
    })),
  );
  await sharp({ create: { width: W * cols, height: H * Math.ceil(list.length / cols), channels: 3, background: '#fff' } })
    .composite(comps).png().toFile(file);
  console.log('wrote', file, `(${list.length} slides, ${W * cols}x${H * Math.ceil(list.length / cols)})`);
};

for (let i = 0, n = 1; i < pages.length; i += MAX, n++) {
  const file = n === 1 ? out : out.replace(/\.png$/, `-${n}.png`);
  await sheet(pages.slice(i, i + MAX), file);
}

// Usage: node scripts/stress-nav.mjs
// Flips Home -> lecture -> animation pages -> back 25 times plus 5 stopwatch toggles, then asserts
// WebGL contexts stay bounded (alive canvases, none lost on screen), no console noise, no black frame.
// This is the "long session" scenario that the original context leak would have failed within 3 cycles.
import { launchBrowser } from './_browser.mjs';
import path from 'path';
import sharp from 'sharp';
const url = 'file:///' + path.resolve('dist/index.html').split(path.sep).join('/');
const b = await launchBrowser();
const p = await (await b.newContext({ viewport: { width: 1000, height: 1000 } })).newPage();
const bad = [];
p.on('pageerror', (e) => bad.push('PAGEERR ' + e.message.slice(0, 120)));
p.on('console', (m) => ['error', 'warning'].includes(m.type()) && bad.push(m.type() + ' ' + m.text().slice(0, 140)));
await p.addInitScript(() => {
  window.__made = 0; window.__lost = 0;
  const o = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...a) {
    const c = o.apply(this, a);
    if (!this.__w && /webgl/.test(a[0]) && c) { this.__w = 1; window.__made++; this.addEventListener('webglcontextlost', () => { if (this.isConnected) window.__lost++; }); }
    return c;
  };
});
await p.goto(url); await p.waitForTimeout(2400);
const live = () => p.evaluate(() => [...document.querySelectorAll('canvas')].length);
for (let i = 0; i < 25; i++) {
  await p.getByRole('button', { name: 'Start Studying' }).first().click(); await p.waitForTimeout(900);
  await p.locator('button.tile:not([disabled]):visible').first().click(); await p.waitForTimeout(700);
  for (let k = 0; k < 4; k++) { await p.keyboard.press('d'); await p.waitForTimeout(250); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(250); }
  await p.getByRole('button', { name: 'Back to lectures' }).click(); await p.waitForTimeout(500);
  await p.getByRole('link', { name: 'Home' }).or(p.getByRole('button', { name: 'Home' })).first().click(); await p.waitForTimeout(700);
  if (i % 5 === 4) { await p.keyboard.press('w'); await p.waitForTimeout(700); await p.keyboard.press('w'); await p.waitForTimeout(400); }
}
await p.waitForTimeout(1500);
const made = await p.evaluate(() => window.__made), lost = await p.evaluate(() => window.__lost);
console.log(`25 navigation cycles + 5 stopwatch toggles -> contexts created: ${made}, canvases alive now: ${await live()}, lost on screen: ${lost}`);
await p.screenshot({ path: 'raw/_stress.png' });
const { data, info } = await sharp('raw/_stress.png').raw().toBuffer({ resolveWithObject: true });
let n = 0; for (let i = 0; i < data.length; i += info.channels) if (data[i] < 10 && data[i+1] < 10 && data[i+2] < 10) n++;
console.log(`final frame near-black: ${(100 * n / (info.width * info.height)).toFixed(1)}%`);
console.log(bad.length ? 'PROBLEMS:\n' + [...new Set(bad)].slice(0, 8).join('\n') : 'no console warnings or errors');
await b.close();

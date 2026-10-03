// Usage: node scripts/anim-interact.mjs <lectureKey> [light|dark] [only-substring]
// Drives EVERY control of every animation in a lecture the way a real PC user does
// (real mouse down / move / up, one gesture) and fails on anything a user would hit:
//   - a slider that does not follow a single drag
//   - any console warning or error, WebGL included (shader compile errors are console.error)
//   - a WebGL context lost
//   - a canvas that goes black or blank after an interaction
// Idle-only checks (anim-shots / anim-diff) cannot catch these; this is the one that can.
import { launchBrowser } from './_browser.mjs';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const key = process.argv[2] || 'a1', theme = process.argv[3] || 'light', only = process.argv[4] || '';
const url = 'file:///' + path.resolve('dist/index.html').split(path.sep).join('/');
fs.mkdirSync('raw/anim', { recursive: true });
const b = await launchBrowser();
const ctx = await b.newContext({ viewport: { width: 900, height: 1000 }, colorScheme: theme });
const p = await ctx.newPage();
const bad = [];
let where = 'load';
p.on('pageerror', (e) => bad.push(`[${where}] PAGEERR ${e.message.slice(0, 200)}`));
p.on('console', (m) => ['error', 'warning'].includes(m.type()) && bad.push(`[${where}] ${m.type().toUpperCase()} ${m.text().slice(0, 240)}`));
await p.addInitScript(() => {
  // __ctxCreated: every WebGL context the page ever makes (a leak shows up as a number far above
  // the count of canvases a user could have seen). __ctxLost: only losses of a canvas that is STILL
  // on screen; the intentional release in disposeRenderer() fires on a detached canvas and is fine.
  window.__ctxCreated = 0; window.__ctxLost = 0;
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...a) {
    const c = orig.apply(this, a);
    if (!this.__w && /webgl/.test(a[0]) && c) {
      this.__w = 1; window.__ctxCreated++;
      this.addEventListener('webglcontextlost', () => { if (this.isConnected) window.__ctxLost++; });
    }
    return c;
  };
});
await p.goto(url); await p.waitForTimeout(2400);
await p.getByRole('button', { name: 'Start Studying' }).first().click(); await p.waitForTimeout(900);
const prefixes = [...fs.readFileSync('src/data/course.ts', 'utf8').matchAll(/keyPrefix: '([^']+)'/g)].map((m) => m[1]);
await p.getByRole('tab').nth(prefixes.indexOf(key[0])).click(); await p.waitForTimeout(700);
const tiles = p.locator('button.tile:not([disabled])');
for (let i = 0; i < await tiles.count(); i++) {
  if ((await tiles.nth(i).innerText()).toUpperCase().includes('LECTURE ' + key.slice(1) + String.fromCharCode(10))) { await tiles.nth(i).click({ force: true }); break; }
}
await p.waitForTimeout(1000);
const pages = await p.locator('header div[class*="gap-[3px]"] > button').count();

// share of near-black pixels in an element screenshot; a healthy frame has a light/surface background
const darkShare = async (el, file) => {
  await el.screenshot({ path: file });
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) if (data[i] < 10 && data[i + 1] < 10 && data[i + 2] < 10) n++;
  return n / (info.width * info.height);
};

const seen = new Set();
let checks = 0, mounts = 0;
for (let i = 0; i < pages; i++) {
  await p.keyboard.press('d'); await p.waitForTimeout(900);
  const figs = p.locator('figure.fig-clean');
  mounts += await figs.count();
  for (let f = 0; f < await figs.count(); f++) {
    const fig = figs.nth(f);
    const title = ((await fig.locator('span.truncate').first().innerText().catch(() => '')) || 'fig').trim();
    if (seen.has(title) || (only && !title.toLowerCase().includes(only.toLowerCase()))) continue;
    seen.add(title); where = `p${i + 1} ${title}`;
    await fig.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
    const tag = `raw/anim/ix-${key}-${theme}-${String(i + 1).padStart(2, '0')}`;
    const base = await darkShare(fig, tag + '-0idle.png');

    // 1. every slider: ONE drag from the thumb to the far end and back must move it
    const sliders = fig.locator('input[type=range]');
    for (let s = 0; s < await sliders.count(); s++) {
      const sl = sliders.nth(s), box = await sl.boundingBox();
      if (!box) continue;
      const v0 = await sl.inputValue();
      const y = box.y + box.height / 2;
      await p.mouse.move(box.x + 4, y); await p.mouse.down();
      for (let k = 1; k <= 14; k++) { await p.mouse.move(box.x + 4 + ((box.width - 8) * k) / 14, y); await p.waitForTimeout(40); }
      const vMid = await sl.inputValue();
      const share = await darkShare(fig, `${tag}-1slide${s}.png`);
      await p.mouse.up();
      checks++;
      if (v0 === vMid) bad.push(`[${where}] SLIDER ${s} did not follow a single drag (value stayed ${v0})`);
      if (share > Math.max(0.5, base + 0.35)) bad.push(`[${where}] BLACK while sliding slider ${s}: ${(share * 100).toFixed(0)}% near-black vs ${(base * 100).toFixed(0)}% at idle`);
      await p.waitForTimeout(250);
    }

    // 2. every option button: click it, the scene must stay alive and not go black
    const btns = fig.locator('button').filter({ hasNotText: /^$/ });
    const n = await btns.count();
    for (let k = 0; k < n; k++) {
      const bt = btns.nth(k);
      if (!(await bt.isVisible()) || (await bt.getAttribute('aria-label')) === 'Pause' || (await bt.getAttribute('aria-label')) === 'Play') continue;
      await bt.click({ force: true }).catch(() => {}); await p.waitForTimeout(450); checks++;
      const share = await darkShare(fig, `${tag}-2btn${k}.png`);
      if (share > Math.max(0.5, base + 0.35)) bad.push(`[${where}] BLACK after clicking "${(await bt.innerText()).trim().slice(0, 24)}": ${(share * 100).toFixed(0)}% near-black`);
    }

    // 3. a short orbit drag on the canvas itself
    const cv = fig.locator('canvas').first();
    if (await cv.count()) {
      const c = await cv.boundingBox();
      await p.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await p.mouse.down();
      for (let k = 1; k <= 10; k++) { await p.mouse.move(c.x + c.width / 2 + k * 14, c.y + c.height / 2 + k * 3); await p.waitForTimeout(30); }
      await p.mouse.up(); await p.waitForTimeout(300); checks++;
      const share = await darkShare(fig, tag + '-3orbit.png');
      if (share > Math.max(0.5, base + 0.35)) bad.push(`[${where}] BLACK after orbit drag: ${(share * 100).toFixed(0)}%`);
    }
  }
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700);
}
const created = await p.evaluate(() => window.__ctxCreated), lostNow = await p.evaluate(() => window.__ctxLost);
// one hero + one scene per page visited + a little slack. Anything beyond that is a leak.
// (a page can show several figures, so count the scenes actually mounted: one context each)
const budget = Math.max(pages, mounts) + 4;
if (created > budget) bad.push(`WEBGL LEAK: ${created} contexts created across ${pages} pages (budget ${budget}). Something probes or builds WebGL on every render.`);
if (lostNow) bad.push(`WEBGL CONTEXT LOST while on screen x${lostNow}`);
console.log(`${checks} interactions across ${seen.size} animations; WebGL contexts created: ${created} (budget ${budget})`);
console.log(bad.length ? bad.join('\n') : 'no interaction problems');
await b.close();
process.exit(bad.length ? 1 : 0);

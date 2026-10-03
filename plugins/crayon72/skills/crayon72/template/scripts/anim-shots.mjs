// Usage: node scripts/anim-shots.mjs <lectureKey> [light|dark]
// Visits every page of a lecture's Description tab and writes ONE small element screenshot per
// animation (two frames 900 ms apart) to raw/anim/. Far cheaper to review than full-page shots:
// an animation is ~450 image tokens; a 900x3800 page is ~1,300 and mostly blank.
// One element screenshot per animation (two frames, 900ms apart) + console errors.
import { launchBrowser } from './_browser.mjs';
import path from 'path';
import fs from 'fs';
const key = process.argv[2] || 'a1', theme = process.argv[3] || 'light';
const url = 'file:///' + path.resolve('dist/index.html').split(path.sep).join('/');
fs.mkdirSync('raw/anim', { recursive: true });
const b = await launchBrowser();
const p = await (await b.newContext({ viewport: { width: 760, height: 1000 }, colorScheme: theme })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 160)));
p.on('console', (m) => m.type() === 'error' && errs.push('CONSOLE ' + m.text().slice(0, 160)));
await p.goto(url); await p.waitForTimeout(2400);
await p.getByRole('button', { name: 'Start Studying' }).first().click(); await p.waitForTimeout(900);
const pre = key[0];
await p.getByRole('tab').nth([...fs.readFileSync('src/data/course.ts', 'utf8').matchAll(/keyPrefix: '([^']+)'/g)].map((m) => m[1]).indexOf(pre)).click(); await p.waitForTimeout(700);
const n = key.slice(1);
const tiles = p.locator('button.tile:not([disabled])');
for (let i = 0; i < await tiles.count(); i++) {
  if ((await tiles.nth(i).innerText()).toUpperCase().includes('LECTURE ' + n + String.fromCharCode(10))) { await tiles.nth(i).click({ force: true }); break; }
}
await p.waitForTimeout(1000);
const pages = await p.locator('header div[class*="gap-[3px]"] > button').count();
const seen = new Set();
for (let i = 0; i < pages; i++) {
  await p.keyboard.press('d'); await p.waitForTimeout(900);
  const figs = p.locator('figure.fig-clean');
  for (let f = 0; f < await figs.count(); f++) {
    const el = figs.nth(f);
    const title = ((await el.locator('span.truncate').first().innerText().catch(() => '')) || 'fig').trim();
    const id = title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
    if (seen.has(id)) continue; seen.add(id);
    await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    const base = `raw/anim/${key}-${theme}-${String(i + 1).padStart(2, '0')}-${id}`;
    await el.screenshot({ path: base + '-t0.png' });
    await p.waitForTimeout(900);
    await el.screenshot({ path: base + '-t1.png' });
    console.log(`page ${i + 1}  ${title}`);
  }
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700);
}
console.log('errors:', errs.length ? errs : 'none');
await b.close();

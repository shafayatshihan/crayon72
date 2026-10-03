// Usage: node scripts/check-pages.mjs [light|dark] [width] [only e.g. a3,m2]
// Opens dist/index.html, walks EVERY unlocked lecture and EVERY page, opens Solution then Description,
// screenshots raw/shots/<theme>-<a|m><n>-<i>-<s|d>.png (both teachers), and exits 1 on any console / page error.
import { launchBrowser } from './_browser.mjs';
import path from 'path';
import fs from 'fs';

const theme = process.argv[2] || 'light';
const width = +(process.argv[3] || 900);
const only = process.argv[4] ? process.argv[4].split(',') : null;
const url = 'file:///' + path.resolve('dist/index.html').split(path.sep).join('/');
fs.mkdirSync('raw/shots', { recursive: true });
// teachers come from course.ts — never hard-code them, every course has its own
const course = fs.readFileSync('src/data/course.ts', 'utf8');
const TEACHERS = [...course.matchAll(/short: '([^']+)'[^}]*?keyPrefix: '([^']+)'/g)].map((m) => [m[2], m[1]]);
if (!TEACHERS.length) throw new Error('no teachers parsed from src/data/course.ts');
const browser = await launchBrowser();
const p = await (await browser.newContext({ viewport: { width, height: 3800 }, colorScheme: theme })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
p.on('console', (m) => m.type() === 'error' && errs.push('CONSOLE ' + m.text()));
await p.goto(url);
await p.waitForTimeout(1500);
await p.getByRole('button', { name: 'Start Studying' }).first().click();
await p.waitForTimeout(800);
let tiles = 0;
let shots = 0;
for (const [tp, tname] of TEACHERS) {
  if (only && !only.some((k) => k.startsWith(tp))) continue;
  await p.getByRole('tab', { name: tname, exact: false }).click();
  await p.waitForTimeout(800);
  const count = await p.locator('button.tile:not([disabled])').count();
  for (let k = 0; k < count; k++) {
    const tile = p.locator('button.tile:not([disabled])').nth(k);
    const n = (await tile.innerText()).match(/Lecture\s+(\d+)/i)[1];
    if (only && !only.includes(tp + n)) continue;
    tiles++;
    await tile.click();
    await p.waitForTimeout(900);
    // one progress dot per page in the deck header
    const pages = await p.locator('header div.flex.gap-\\[3px\\] > button').count();
    for (let i = 0; i < pages; i++) {
      for (const t of ['s', 'd']) {
        await p.keyboard.press(t);
        await p.waitForTimeout(700);
        await p.screenshot({ path: `raw/shots/${theme}-${tp}${n}-${i + 1}-${t}.png` });
        shots++;
      }
      await p.keyboard.press('ArrowRight');
      await p.waitForTimeout(800);
    }
    await p.getByRole('button', { name: 'Back to lectures' }).click();
    await p.waitForTimeout(800);
  }
}
console.log(`${tiles} lectures, ${shots} screenshots → raw/shots`);
console.log(errs.join('\n') || 'no errors');
await browser.close();
process.exit(errs.length ? 1 : 0);

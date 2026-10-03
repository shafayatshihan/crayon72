// Regression tests for audited bugs. Usage: node scripts/regress.mjs
import { launchBrowser } from './_browser.mjs';
import path from 'path';
const url = 'file:///' + path.resolve('dist/index.html').split(path.sep).join('/');
const browser = await launchBrowser();
const res = {};
const errs = [];
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push(e.message));
const title = () => p.locator('article h2').first().innerText();
await p.goto(url); await p.waitForTimeout(1300);
await p.getByRole('button', { name: 'Start Studying' }).first().click(); await p.waitForTimeout(600);
await p.locator('button.tile:not([disabled])').first().click(); await p.waitForTimeout(900);
// 1 Spotlight jump inside the same lecture
const t0 = await title();
const dots = p.locator('header div.flex.gap-\\[3px\\] > button');
const target = await dots.nth((await dots.count()) - 1).getAttribute('aria-label'); // last page of this lecture
await p.keyboard.press('Control+k'); await p.waitForTimeout(400);
await p.keyboard.type(target); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
res.spotlightSameLecture = (await title()) !== t0 && (await title()) === target;
// 2 stopwatch open → arrows still work
await p.keyboard.press('w'); await p.waitForTimeout(700);
const t1 = await title(); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(900);
res.arrowsWithStopwatch = (await title()) !== t1;
await p.keyboard.press('w'); await p.waitForTimeout(500);
// 3 ctrl+z inside notes doesn't remove ink
if (!(await p.getByRole('button', { name: 'Pen (2)' }).count())) { await p.keyboard.press('i'); await p.waitForTimeout(500); }
await p.getByRole('button', { name: 'Pen (2)' }).click();
const card = await p.locator('article .tile').first().boundingBox();
await p.mouse.move(card.x + 40, card.y + 40); await p.mouse.down(); for (let i = 0; i < 20; i++) await p.mouse.move(card.x + 40 + i * 9, card.y + 44); await p.mouse.up();
await p.keyboard.press('1');
await p.getByRole('button', { name: /My notes/ }).click(); await p.waitForTimeout(400);
const ta = p.locator('textarea'); await ta.click(); await ta.type('hello'); await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
const inkAfter = await p.locator('article svg[viewBox^="0 0 1000"] path').count();
res.ctrlZInNotesKeepsInk = inkAfter >= 1;
await p.locator('article h2').first().click();
// 6 clear page clears ink on closed tabs too
await p.keyboard.press('s'); await p.waitForTimeout(600);
await p.getByRole('button', { name: 'Pen (2)' }).click();
const paper = await p.locator('.paper').first().boundingBox();
await p.mouse.move(paper.x + 80, paper.y + 60); await p.mouse.down(); for (let i = 0; i < 20; i++) await p.mouse.move(paper.x + 80 + i * 9, paper.y + 64); await p.mouse.up();
await p.keyboard.press('s'); await p.waitForTimeout(500); // close solution tab
await p.getByRole('button', { name: 'Clear page ink' }).click(); await p.getByRole('button', { name: 'Clear page ink' }).click(); await p.waitForTimeout(600);
await p.keyboard.press('s'); await p.waitForTimeout(600);
res.clearHitsClosedTabs = (await p.locator('article svg[viewBox^="0 0 1000"] path').count()) === 0;
await ctx.close();
// 13 phone header fits
const ph = await (await browser.newContext({ viewport: { width: 360, height: 760 }, hasTouch: true, isMobile: true })).newPage();
await ph.goto(url); await ph.waitForTimeout(1300);
await ph.getByRole('button', { name: 'Start Studying' }).first().tap(); await ph.waitForTimeout(600);
await ph.locator('button.tile:not([disabled])').first().tap(); await ph.waitForTimeout(900);
const hdr = await ph.evaluate(() => { const h = document.querySelector('header > div'); return { sw: h.scrollWidth, cw: h.clientWidth, titleW: h.querySelector('.font-display').getBoundingClientRect().width }; });
res.phoneHeaderFits = hdr.sw <= hdr.cw + 1 && hdr.titleW > 60;
console.log(JSON.stringify(res, null, 1));
console.log(errs.join('\n') || 'no errors');
await browser.close();
process.exit(Object.values(res).every(Boolean) && !errs.length ? 0 : 1);

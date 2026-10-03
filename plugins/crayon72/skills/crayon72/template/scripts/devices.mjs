import { launchBrowser } from './_browser.mjs';
import path from 'path';
const url = 'file:///' + path.resolve('dist/index.html').split(path.sep).join('/');
const browser = await launchBrowser();
// Lecture tiles animate in with a spring; wait for the entrance to settle before
// touching one, otherwise Playwright's stability check can outlive its timeout.
async function firstTile(p) {
  const t = p.locator('button.tile:not([disabled])').first();
  await t.waitFor({ state: 'visible' });
  await t.scrollIntoViewIfNeeded();
  await p.waitForTimeout(1200);
  return t;
}
const errs = [];
async function run(name, opts, fn) {
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(name + ' ' + e.message));
  await p.goto(url); await p.waitForTimeout(2400);
  await fn(p, (n) => p.screenshot({ path: `raw/shots/dev-${name}-${n}.png` }));
  await ctx.close();
}
await run('phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'light' }, async (p, s) => {
  await s('home');
  await p.getByRole('button', { name: 'Menu' }).tap(); await p.waitForTimeout(600); await s('menu');
  await p.getByRole('button', { name: 'Menu' }).tap(); await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Start Studying' }).first().tap(); await p.waitForTimeout(800); await s('lectures');
  await (await firstTile(p)).tap({ force: true }); await p.waitForTimeout(900);
  await p.getByRole('tab', { name: 'Solution' }).tap(); await p.waitForTimeout(700); await s('deck');
  await p.getByRole('button', { name: 'Contents' }).tap(); await p.waitForTimeout(700); await s('contents');
});
await run('ipad', { viewport: { width: 1180, height: 820 }, hasTouch: true, colorScheme: 'dark' }, async (p, s) => {
  await p.getByRole('button', { name: 'Start Studying' }).first().tap(); await p.waitForTimeout(800);
  await (await firstTile(p)).tap({ force: true }); await p.waitForTimeout(900);
  await p.getByRole('button', { name: 'Videos' }).tap(); await p.waitForTimeout(1500); await s('video');
  await p.getByRole('tab', { name: 'Slides' }).tap(); await p.waitForTimeout(1200);
  await p.getByRole('button', { name: 'Thumbnails' }).tap(); await p.waitForTimeout(600); await s('slides');
});
await run('print', { viewport: { width: 1200, height: 900 }, colorScheme: 'light' }, async (p, s) => {
  await p.getByRole('button', { name: 'Start Studying' }).first().click(); await p.waitForTimeout(800);
  await (await firstTile(p)).click({ force: true }); await p.waitForTimeout(900);
  await p.keyboard.press('s'); await p.waitForTimeout(700);
  await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(400);
  await p.pdf({ path: 'raw/shots/print.pdf', format: 'A4' }).catch(() => {});
  await s('print');
});
console.log(errs.join('\n') || 'no errors');
await browser.close();

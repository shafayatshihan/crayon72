// Usage: node scripts/printbook.mjs [all|<lectureKey>] [out.pdf]
// Exports the print book through the UI and saves it with Chrome's PDF engine (same as "Save as PDF").
import { launchBrowser } from './_browser.mjs';
import path from 'path';
const what = process.argv[2] || 'a3';
const out = process.argv[3] || `raw/printbook-${what}.pdf`;
const url = 'file:///' + path.resolve('dist/index.html').split(path.sep).join('/');
const b = await launchBrowser();
const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
await p.addInitScript(() => { window.print = () => {}; });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(url); await p.waitForTimeout(1500);
await p.getByRole('button', { name: 'Export PDF (print book)' }).click(); await p.waitForTimeout(600);
if (what !== 'all') { await p.getByRole('tab', { name: 'One lecture' }).click(); await p.getByLabel('Lecture', { exact: true }).selectOption(what); }
await p.getByRole('button', { name: /^Export \d+ question types/ }).click();
await p.waitForSelector('.pb-page'); await p.waitForTimeout(2500);
await p.emulateMedia({ media: 'print' });
await p.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
console.log('pages in book:', await p.locator('.pb-page').count(), '→', out);
console.log(errs.join('\n') || 'no errors');
await b.close();

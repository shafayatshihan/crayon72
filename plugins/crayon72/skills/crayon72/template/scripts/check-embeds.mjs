// Usage: node scripts/check-embeds.mjs [--fix]
// Loads every video in src/data/videos.json through the mobile relay and checks it really PLAYS here
// (catches region blocks / embedding disabled, which oEmbed does not). --fix removes the bad ones.
import { launchBrowser } from './_browser.mjs';
import fs from 'fs';

const RELAY = (fs.readFileSync('src/data/course.ts', 'utf8').match(/relayUrl: '([^']*)'/) || [])[1] || '';
if (!RELAY) {
  console.log('check-embeds: no relayUrl in course.json — skipped (verify-videos.mjs already checks every id with oEmbed).');
  process.exit(0);
}
const file = 'src/data/videos.json';
const v = JSON.parse(fs.readFileSync(file, 'utf8'));
const browser = await launchBrowser({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
const bad = [];
const all = Object.entries(v).flatMap(([topic, list]) => list.map((x) => ({ topic, ...x })));
const pool = 4;
async function check(x) {
  const p = await ctx.newPage();
  try {
    await p.goto(`${RELAY}?v=${x.id}&t=0`, { timeout: 30000 });
    let ok = false, why = 'no player';
    for (let i = 0; i < 14 && !ok; i++) {
      await p.waitForTimeout(1000);
      const f = p.frames().find((fr) => fr.url().includes('youtube'));
      if (!f) continue;
      const r = await f.evaluate(() => {
        const vid = document.querySelector('video');
        const txt = document.body.innerText;
        return { t: vid ? vid.currentTime : 0, err: /unavailable|not available|Error \d+|disabled|Sign in/i.exec(txt)?.[0] };
      }).catch(() => ({ t: 0, err: undefined }));
      if (r.err) { why = r.err; break; }
      if (r.t > 0.5) ok = true;
    }
    if (!ok) bad.push({ ...x, why });
    console.log(ok ? 'ok  ' : 'BAD ', x.topic.padEnd(20), x.id, ok ? '' : why);
  } finally {
    await p.close();
  }
}
for (let i = 0; i < all.length; i += pool) await Promise.all(all.slice(i, i + pool).map(check));
console.log(`${all.length - bad.length} play, ${bad.length} bad`);
if (process.argv.includes('--fix') && bad.length) {
  for (const b of bad) v[b.topic] = v[b.topic].filter((x) => x.id !== b.id);
  fs.writeFileSync(file, JSON.stringify(v, null, 2));
  console.log('removed', bad.map((b) => b.id).join(', '));
}
await browser.close();

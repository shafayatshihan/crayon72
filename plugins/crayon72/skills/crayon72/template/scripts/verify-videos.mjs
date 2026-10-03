// Usage: node scripts/verify-videos.mjs
// Checks every id in src/data/videos.json against YouTube oEmbed. Exit 1 if any is dead.
import fs from 'fs';

const v = JSON.parse(fs.readFileSync('src/data/videos.json', 'utf8'));
let bad = 0, ok = 0;
for (const [topic, list] of Object.entries(v)) {
  for (const x of list) {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${x.id}&format=json`);
    if (r.ok) ok++;
    else {
      bad++;
      console.log('DEAD', topic, x.id, x.title);
    }
  }
}
console.log(`${ok} ok, ${bad} dead`);
process.exit(bad ? 1 : 0);

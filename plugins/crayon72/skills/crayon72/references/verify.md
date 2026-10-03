# Verify & ship

Run from the project folder. A run is shippable only when **every** item is green.

## Commands
1. `npm run build` — type-check + single-file build, no errors.
2. `node scripts/check-pages.mjs light 900` and `dark 900` (optional 3rd arg: lecture keys `a3,m2`) — walks every unlocked lecture of every teacher and every page in light and dark (Solution + Description each), writes `raw/shots/<theme>-L<n>-<i>-<s|d>.png`, must print `no errors`.
3. `npm run videos` — `0 dead`, then every video **plays** through the relay (`check-embeds.mjs`; run `node scripts/check-embeds.mjs --fix` to drop region-blocked / non-embeddable ones).
4. `node scripts/ink.mjs` — prints `{ before: 1, afterUndo: 0, afterReload: 1 }` (ink saves, undoes, survives reload).
5. `node scripts/devices.mjs` — phone, iPad, print layouts render with no errors.
6. `node scripts/regress.mjs` — every flag `true` (Spotlight jump within a lecture, shortcuts with the stopwatch open, Ctrl+Z in notes keeps ink, clear removes ink on closed tabs, phone header fits).

## Look at every new page
Make review sheets and **view them** (the Read tool shows images):
`node scripts/grid.mjs raw/r1.png 4 450 raw/shots/light-L3-1-s.png raw/shots/light-L3-1-d.png …` — four tall shots per sheet, light and dark.

On each sheet confirm:
- every variant shows its own answer card (or a "same as" collapse), none empty;
- every hand-drawn figure: labels readable, nothing overlapping or cut off, caption present;
- every animated illustration: visible and in motion-start state, controls present, no element stuck at the SVG origin (top-left);
- dark mode: all text, ink-blue sketch lines and animation colours readable on black;
- KaTeX renders (no raw `\frac` text);
- slide pills open the right slide (spot-check one per lecture in split view).

Fix, rebuild, re-check until a full pass is clean.

## Ship
`bash scripts/ship.sh <keys>` copies `dist/index.html` to the path in `.ship-target` (written by new-course.py: `../Crayon72 - <code>.html`). Report size; ~70 KB per slide.

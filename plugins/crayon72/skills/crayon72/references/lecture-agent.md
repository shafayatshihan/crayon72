# Lecture-builder agent brief (copy to `<project>/raw/agent-brief.md` and fill the {PLACEHOLDERS})

You are building ONE lecture deck of an existing, finished study app. Project: `{PROJECT}` (React + TS). Read these first, fully:

1. `{SKILL_DIR}/references/content.md` — question, answer and description rules (follow exactly).
2. `{SKILL_DIR}/references/data-format.md` — file format, components, Sketch API, animation pattern and gotchas.
3. `{SKILL_DIR}/references/spec.md` — fixed product (do not redesign anything).
4. ONE gold standard, to match in tone, depth and structure: the most recently built sibling lecture in THIS project (`src/data/<fp><n>.tsx` + its `src/figs/drawings-*.tsx` and `src/figs/anim/*.tsx`). Read it with `sed -n`/`grep`, not whole. Only if this is the first deck of a new course, read ONE template file instead (`template/src/data/l1.tsx`) plus `template/src/figs/anim/core.tsx`. Reading all four template examples costs ~54k tokens and teaches nothing the first one does not.

## Sources
- Slides: images `src/assets/slides/` — combined PDF `pNNN.webp` (ids are numbers: `slides: [32]`, `<SlideRef p={32} />`); per-lecture PDF `<k>NN-PPP.webp` (ids are strings `'<k><n>:<p>'`: `slides: ['m2:15']`, `<SlideRef p="m2:15" />`). View them with Read (contact sheets: `node scripts/slide-sheet.mjs raw/s.png <ids…>`). Text: `pdftotext -f A -l B -layout "<pdf>" -` (Windows `C:/…` paths). Image-only slides: LOOK at them. Ticks/highlights = the teacher's exam hints.
- **Everything you need is in `raw/in-<yourkey>.md`** — your map section, your questions verbatim, and the slide text for your page range, already sliced. Do NOT open `questions.md`, `map.md` or the full slide-text extract; reading those whole costs ~20k tokens for ~2k of signal. Printed-paper page images, if you ever need one, are under `organized/pages/`.
- Paper figures: `raw/figures.md` (import crops from `@/assets/attach/<file>.webp`).
- Worked maths (if any): `{MATHS_PDF}` — `pdftoppm -r 110 -f N -l N -png "<pdf>" raw/maths-N`, then Read the png.

## What you write (ONLY these files — other agents write other lectures in parallel)
- `src/data/<fp><N>.tsx` exporting `<FP><N>_TOPICS` and `<FP><N>_PAGES`; page ids `<fp><N>-<slug>`; `lecture: <N>` (number).
- `src/figs/drawings-<fp><N>.tsx` (new hand-drawn figures; import `Sketch`, `type S` from `./sketch`), `src/figs/anim/<fp><N>.tsx` (animations per `core.tsx`). Reuse any existing figure/animation file.
- `raw/videos-<fp><N>.json` — 2–3 YouTube videos per video key (verify: `curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json"` returns a title). Keys prefixed `<fp><N>-`.
- `raw/<fp><N>-notes.md` — lecture title & subtitle (≤ 8 words); topics (exact names) + glyph idea each; a ```ts block of `VIDEO_TOPIC_NAMES` lines `'<key>': 'Name',`; `DUP: <existing page id> → ['<slide ids>']  topic '<your topic>'` lines; anything unsourced.
Never edit shared files. Check with `npx tsc --noEmit -p .` (fix errors in YOUR files). Do not run `npm run build`. Don't import a figure/anim file before it exists (other agents' builds break).

## Quality bar (non-negotiable)
- Every assigned question on a page; one page per question TYPE; variants newest first; every variant its own `answer` in a student's exam voice scaled to its marks (identical wording → `same`). Refs like `Q5(a) · Sec B` (the app derives "other section" from them).
- Numericals: Given line, formulas from memory, every substitution in `<MB>`, `\boxed{}` results with units, double-checked arithmetic. Note slips in the source and use consistent numbers.
- Every theory answer has a detailed hand-drawn figure (labels with leader lines, hachure needs a `fill`, arrows, caption "Fig: …"); p–V / T–s diagrams are plotted curves.
- Every description: (Recall if taught earlier) → Basics → at least one ANIMATED/interactive illustration → Steps with SlideRefs → Tip. Simple English.
- Lecture / maths examples: `kind: 'example'`, variants `year: 'Example'`, `ref` = source (e.g. 'Slide 7 · Maths sheet p. 3'), `marks: 0`.
- Questions already answered on another existing page (grep `src/data/*.tsx` for year + ref) → don't rewrite; report as DUP.
- framer-motion SVG: give every animated attribute a plain start prop too (`<motion.circle cx={x} cy={y} r={6} initial={false} animate={{ cx: x }} />`); never combine `whileTap`/`whileHover` with Tailwind `translate-*` (use `style={{ y: '-50%' }}`).

## Prompt (coordinator fills one per lecture)
> You are building {TEACHER}'s Lecture {N} ({NAME}) of the Crayon 72 study app ({COURSE}). FIRST read, completely: `{PROJECT}\raw\agent-brief.md`, then `{MAP_MD}` (section for this lecture + maths page ranges) and `{PROJECT}\raw\figures.md`. Slides: `{PDF}` → `src/assets/slides/{FILES}`, ids `{IDS}`. Worked maths: {MATHS_PAGES}. Write ONLY `src/data/{fp}{N}.tsx` ({FP}{N}_TOPICS, {FP}{N}_PAGES, ids `{fp}{N}-…`, `lecture: {N}`), `src/figs/drawings-{fp}{N}.tsx`, `src/figs/anim/{fp}{N}.tsx`, `raw/videos-{fp}{N}.json`, `raw/{fp}{N}-notes.md`. Assigned questions: {QUESTIONS}. DUP candidates (existing pages, don't rewrite): {DUPS}. Budget limited: write the page file early and extend. Finish with a SHORT report (pages, DUPs, problems).

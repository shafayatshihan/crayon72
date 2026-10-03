---
name: crayon72
description: Build a Crayon 72 interactive exam-study web app (ONE offline HTML file) from a course's teacher slide PDFs plus past-year exam papers — every past question with an exam-script answer, hand-drawn figures, animated/3D explanations, embedded slides, videos, ink, search, stopwatch, PDF export. Use when the user gives lecture-slide PDFs (one or several teachers) and past questions and asks for "a Crayon 72 app", "an exam prep HTML like Crayon72", "aura farm", or asks to add/resume lectures in an existing Crayon 72 project.
---

# Crayon 72 builder

Turns **slides + past papers** into one self-contained `.html` study app. The finished app (React + TypeScript + Vite + three.js, bundled to a single file) lives in [`template/`](template/); a run only produces **data** (course config, slide images, lecture pages, videos, paper crops) plus course art. Same process every time → same product. `SKILL_DIR` below = the directory that contains this file.

Branches: **new course** → Steps 1–9. **Continue** an existing project ("add lecture 3", "resume") → open its folder, read `raw/RESUME.md`, run Steps 5–8 for what is unbuilt.

Work autonomously. Ask the user only for facts not on disk (course code, who the teachers are, which paper section each sets, where the files are). Read [`references/spec.md`](references/spec.md) once; **never redesign the app**. Keep replies short; delegate lecture writing to subagents.

## Steps

### 1. Prerequisites and inputs
Follow [`references/setup.md`](references/setup.md) §1–§2: check Node ≥ 18, Python, Poppler, a Chrome-family browser; list the slide folders and past papers. Identify per teacher: one combined PDF (first teacher only) or one PDF per lecture; course code/name/institution/exam label; paper sessions (oldest → newest); each teacher's paper section (`''` if none). `pdftotext -f 1 -l 3` the first pages to read names.

### 2. Scaffold
- Project folder = `<next to the slides>/<code-slug>-app/`. Copy `SKILL_DIR/template/` there (without `node_modules`), `npm ci`.
- Write `course.json` (format: header of `scripts/new-course.py`; teacher key/file letters: setup.md §5; `creator`, `relayUrl` optional) and run `python scripts/new-course.py course.json`. It removes the demo lecture and writes `course.ts`, a reset `lectures.ts` (every lecture locked) and empty glyph maps.
- `references/examples/demo/` keeps the demo lecture (data + drawing + 3D animation): **the gold standard to read**.
**Done when** `npm run build` passes with every lecture "Coming soon".

### 3. Slides (1280 px webp q72)
- Combined PDF: `node scripts/render-slides.mjs "C:/…/slides.pdf"` → `pNNN.webp`, ids = page numbers.
- Per-lecture PDFs: `node scripts/render-slides.mjs "C:/…/n.pdf" --prefix <key><NN>-` (e.g. `b02-`) → ids `'b2:P'`. **Prefix = the teacher's KEY letter.**
- Sequential, never two renders with the same prefix; verify the file count equals the PDF page count. Also write each PDF's text (`pdftotext -layout`, pages separated by `--- Page N ---`) next to it for slicing. Look at image-only slides: ticks and highlights are the teacher's exam hints.

### 4. Questions and the plan
Per setup.md §3: write `raw/questions.md` (every part verbatim, topic index at the end), crop printed figures (`scripts/crop.mjs`, listed in `raw/figures.md`), write `raw/map.md` (question → lecture, with DUP candidates), build `raw/assign.json` (workflow.md; **every part assigned once**), run `python scripts/slice-inputs.py`. Copy `references/lecture-agent.md` to `raw/agent-brief.md` and fill it; add the per-teacher delta brief.

### 5. Build the lectures (subagents, **max 2 at a time**)
[`references/workflow.md`](references/workflow.md) is the playbook: pre-sliced bundles, one gold standard, two-pass big lectures, build → independent verify, halt and resume on usage limits, progress dashboard, hand-check list. Content rules: [`references/content.md`](references/content.md); formats and components: [`references/data-format.md`](references/data-format.md).
When a lecture is verified: wire it (`scripts/wire-lecture.py`), `bash scripts/ship.sh <keys>`, free the slot for the next. Ship early and often; the user can open the partial app anytime.

### 6. Course art (once)
Replace `src/figs/anim/hero3d.ts` (contract in its header) with a procedural 3D illustration of the course subject (the default is two meshing gears), and add line glyphs for the course's topics in `src/icons/glyphs.tsx`. Keep the Sisyphus headline and the Crayon 72 brand.

### 7. Verify
[`references/verify.md`](references/verify.md): `check-pages` (light and dark), `anim-interact` for every lecture with animations, `ink`, `devices`, `regress`, `npm run videos`. All green before shipping. Look at screenshot sheets for the first lectures and whenever a check fails.

### 8. Ship
`bash scripts/ship.sh <all keys>` writes the single file to the path in `.ship-target` (default `../Crayon72 - <code>.html`). Report its size.

### 9. Report
Tell the user: file path and size, lectures/pages/questions per lecture, **what is unsourced** (questions not on any slide, answers from textbooks, numbers read from faint scans, illustrative animation constants, videos chosen from titles) — the hand-check list from workflow.md — and how to resume (`raw/RESUME.md`). If you changed template code, say so.

## Hard rules
- A run writes only `src/data/`, `src/figs/`, `src/icons/glyphs.tsx`, `src/components/HeroScene.tsx` (hero art), `src/assets/` and `raw/`. Everything else is the finished product.
- Page ids are permanent. Never invent exam questions. Answers must be correct: re-derive numericals, cite slides, mark textbook-only material.
- 3D illustrations are built on `<Scene3D>` (`src/figs/anim/kit3d.tsx`); never create WebGL contexts yourself (`scripts/lint-gl.mjs` enforces it).
- Do not add fonts, images or text you do not have the right to redistribute; slide images and papers are the user's own inputs and stay out of any public repository.

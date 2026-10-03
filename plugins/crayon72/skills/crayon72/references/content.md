# Content rules

The gold standard for every rule below is the demo lecture (`references/examples/demo/` — data, drawing and animation files), plus the most recently built lecture of the project you are working in. When unsure how something should read, open the closest page there and match it.

## Questions

**Source.** Only final-exam papers of **this course code**: either the bundled bank (`question-bank/papers/*.md`, index `question-bank/README.md`, BUET ME L-4 papers) or the user's own papers transcribed to `raw/papers/*.md` in the same format (see `setup.md`, section Past papers). Older or sister course codes stay out unless the user asks. Read only this course's section of each paper:

```bash
awk '/^# ME 415/{on=1} /^# (ME|IPE|EEE|CE) [0-9]/ && !/^# ME 415/{on=0} on' question-bank/papers/<file>.md   # adjust the course code
```

The transcriptions may carry OCR slips; when a number or figure looks wrong, render the original PDF page (`pdftoppm -r 130 -f N -l N -png <paper.pdf> out`) and look at it.

**Mapping to a lecture.** A question (or sub-part) belongs to the lecture whose slides teach it — judge by slide content, not by section letter. Rules:
- **Split by sub-part**: a question whose parts span lectures goes part-by-part to each lecture; each page links to its siblings via `links` ("2021-22 Q5(b) 2nd part → …").
- **Other teacher's section**: include it when this lecture's slides cover the topic, with `otherSection: true` (shows "Sec A topic · in slides", lowers probability).
- **Lecture examples**: worked examples on the slides or in extra PDFs the user gave become pages with `kind: 'example'`; they rank after past finals inside their topic. Never invent "expected" questions.
- A lecture with no past question and no example stays `locked` with subtitle "No final questions from this lecture yet".

**Grouping.** One page = one **question type**: every year's version of the same ask is a `variant` on the same page, newest first. Identical wording → later variant gets `same: '<year>'`. Different scope (extra part, different numbers, narrower ask) → its own `answer`.

**Ordering.** Topics in the lecture's slide order (`L<n>_TOPICS`); the deck sorts pages inside a topic by probability automatically.

## Repeat probability
Automatic (`src/lib/prob.ts`): recency-weighted frequency over `COURSE.papers` (weights 1, 1.25, 1.5 …), ×0.92 cool-down if asked in the latest paper, ×0.9 for `otherSection`. Add `boost: { by: 6, why: '…' }` only when a wider family of the same idea recurs across papers (state the count in `why`). Never hand-set a percentage.

## Solution — the exam-script answer
Each variant's answer is what a well-prepared student writes in the script for **that wording and those marks**.
- **Student's voice**: direct, numbered points, `<H>` underlined headings, a table for any comparison. Length scales with marks: roughly one solid point per 1–2 marks.
- **Only what a student can remember**: definitions, mechanisms, reasons, the values the slides themselves quote (cite with `<SlideRef p={n} />`). Leave out example engine dimensions, exact temperatures, derived speeds and other lookup data.
- **Numericals**: "Given" line, definitions/formulas written from memory, every substitution in `<MB>` display math, `\boxed{}` results with units, assumptions stated in one line.
- **A hand-drawn figure** wherever a student would draw one (almost every theory answer): a component from `src/figs/drawings.tsx` built on `Sketch`. Figures carry detail a teacher rewards — labelled parts with leader lines (`lab()` helper), hachure-filled metal, flow arrows, dimension marks, a caption "Fig: …". Reuse one figure across variants of a page when it fits.
- Identical-wording variants reuse the first answer via `same`; never paste a duplicate.

## Description — learning it from the basics
Order inside `description`:
1. `<Recall to="page-id">` first when the theory was already taught on an earlier page of the topic order — link instead of re-teaching.
2. `<Basics>`: the one idea everything rests on, in plain words.
3. **At least one animated illustration** from `src/figs/anim/` (interactive where a control teaches something: a slider, a mode switch, a "try it" button). Descriptions use animations, never hand-drawn `Sketch` figures.
4. `<Step n title>` blocks from fundamentals to the exam point, each ending with the slide it comes from (`<SlideRef>`); formulas in `<MB>`.
5. `<Tip>`: how to score — what the examiner looks for, how long, which figure.

Simple English throughout; explain every term the first time it appears in the topic order.

## Figures and charts from the question paper
When a question prints a figure, chart or table:
- Crop it from the original paper PDF (`questions/` folder; page from the transcription's `pN` tag): `node scripts/crop.mjs "<paper.pdf>" <page> <x%> <y%> <w%> <h%> <name>` → `src/assets/attach/<name>.webp`. View the result and re-crop until it holds only the figure.
- A figure the question refers to → `variant.figure = { title, src }` (shown under the question text).
- Charts, tables or property data the solution needs (fuel tables, charts) → `page.attachments` (collapsible in Solution). A clean table may be rebuilt as a `node` instead of an image.

## Videos
Per lecture, dispatch one `general-purpose` subagent (background) with this prompt, filling the topic list:

> Find and VERIFY YouTube videos for a <course name> study app (undergraduate). For each topic key below find 2–3 concise, accurate videos (prefer Learn Engineering, Lesics, Engineering Explained, Animagraffs, The Engineering Mindset, NPTEL, well-known university lectures). Verify each id with `curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json"` — keep only ids returning a title. Use a start time (seconds) only when chapters confirm it. Write JSON `{ "<topicKey>": [ { "id", "title", "channel", "start", "why" (≤12 words) } ] }` to `<project>/raw/videos-l<n>.json` and report counts per topic and any topic with no good video.
> Topics: `<key>`: <what it should explain> …

Merge into `src/data/videos.json`, run `node scripts/check-embeds.mjs --fix` (oEmbed misses region blocks), add each key's display name to `VIDEO_TOPIC_NAMES` in `lectures.ts`, and point pages at keys with `videoTopics`.

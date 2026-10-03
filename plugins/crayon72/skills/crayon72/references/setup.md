# Setup, inputs and file formats

## 1. Prerequisites (check once, tell the user what is missing)

| Need | Check | Install hint |
|---|---|---|
| Node.js ≥ 18 (+ npm) | `node -v` | https://nodejs.org |
| Python ≥ 3.9 | `python --version` (or `python3`) | https://python.org — use whichever name works and say so in later commands |
| Poppler (`pdftoppm`, `pdfinfo`, `pdftotext`) | `pdfinfo -v` | Windows: `winget install poppler` or Scoop `scoop install poppler`; macOS `brew install poppler`; Linux `apt install poppler-utils` |
| Chrome / Edge / Chromium | any one installed | else `npx playwright-core install chromium` in the project; scripts also read `CHROME_PATH` |
| ~1.5 GB disk, internet | | `npm ci` pulls ~700 MB of node_modules; videos use oEmbed over the network |

Path rule: pass **forward-slash absolute paths** (`C:/Users/me/slides/x.pdf`) to the scripts on Windows; Git-Bash/MSYS rewrites paths that start with `/c/…`.

## 2. What the user must provide

1. **Slides**: one folder per teacher. A teacher may have **one combined PDF** (the *first* teacher only — numeric slide ids) or **one PDF per lecture** (slide ids `'<key><n>:<page>'`). `.pptx` files are not needed; export to PDF.
2. **Past papers** of the course (final exams), as PDFs/scans or as text — see §3. One paper = one exam session.
3. Course facts you can read off the slides: code, name, institution, exam label, teacher names, which paper *section* each teacher sets (`''` if the paper has none).
4. Optional: `creator` (name + tag shown on the Home page), `relayUrl` (§4).

Ask the user only for what you cannot read from disk.

## 3. Past papers → `raw/questions.md`

`scripts/slice-inputs.py` slices questions by lecture, so every question must live in `raw/questions.md` in exactly this shape (one block per question **part**, oldest or newest first, any order):

```markdown
# DEMO 101 (Simple Machines) — Past exam questions

## 2023
### Q1(a) · Sec A · 10 marks
Exact question text, LaTeX with $…$ for maths, tables as Markdown, figures described in words if not croppable.
<!-- pages: p3 -->

## 2022
### Q2(b) · Sec A · 5 marks
…
```

- Heading `## <session>` must repeat before every question (the slicer indexes `(year, Qref)`); `### Q<n>(<part>)[(roman)] · Sec <X> · <m> marks` (`Sec` may be dropped when the paper has no sections — keep the format consistent with `ref` strings in the lecture files).
- Add a `# Topic index` at the end: `## <topic>` headings with `- <year> <Qref> Sec <X> (<marks>) - <one-line summary>` bullets — the lecture-assignment step reads this.
- **Bundled bank**: `question-bank/papers/*.md` (BUET ME L-4, 2015-2023: ME 415/417/421/441/445/467, IPE 431 …). Its files are per-paper transcriptions: pick the course's section, normalise to the shape above.
- **Own papers (scans/PDFs)**: for each page `pdftotext -layout` first; if the text is empty or garbled render `pdftoppm -r 130 -f N -l N -png paper.pdf raw/pg` and **read the page image yourself** (you are multimodal), then transcribe. Mark unreadable bits `[illegible]` and keep a list. Crop every printed figure/table with `node scripts/crop.mjs` (see content.md §Figures).
- Check completeness: count question parts per paper against the paper's own numbering; note missing sections (e.g. a scan with a missing page) in `raw/map.md`.

Never invent a question. Questions with no matching slide are still real exam questions: they are answered from the course textbook and marked as such (see workflow.md).

## 4. Optional YouTube relay (phones/tablets)

A page opened from `file://` (the offline HTML) cannot embed YouTube on Android/iPadOS (Error 153). A 20-line static page hosted on any https origin (GitHub Pages) that reads `?v=<id>&t=<seconds>` and iframes `https://www.youtube-nocookie.com/embed/<id>?start=<t>&autoplay=1` fixes that. Put its URL in `course.json` → `"relayUrl": "https://<you>.github.io/<repo>/"`. With no relay the video poster simply opens YouTube in a window. `scripts/check-embeds.mjs` also needs the relay (it verifies that every video really plays) and is skipped when none is set.

## 5. Lecture files — key letters

Each teacher has a **key prefix** (lecture keys `a1`, `a2`; slide ids `'a2:15'`; slide files `a02-015.webp`) and a **file prefix** (data `src/data/<fp><n>.tsx`, figures `src/figs/drawings-<fp><n>.tsx`, animation `src/figs/anim/<fp><n>.tsx`, videos `raw/videos-<fp><n>.json`). They are chosen in `course.json`; the first teacher conventionally uses key `a` / file `l`. **Name the slide image files with the KEY prefix** — `slideid.ts` resolves the teacher from it.

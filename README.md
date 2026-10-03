# Crayon 72

**Give it your teachers' slides and the past-year exam papers. Get one offline HTML file that teaches the whole course and drills every question that ever came up.**

Crayon 72 is a [Claude Code](https://claude.com/claude-code) plugin. It carries a finished study-app template (React + TypeScript + Vite + three.js, bundled to a *single* `.html` file) and a skill that tells Claude how to fill it with a new course: render the slides, transcribe the past questions, map each question to the lecture that teaches it, write an exam-script answer for every question, draw the figures, build interactive 3D explanations, find videos, then check and ship the file.

What the finished app does (identical for every course):

- **Every past question, grouped by type** — all years' versions on one page, newest first, with an exam-script answer per variant, repeat-probability from the paper history, High-yield sorting.
- **Hand-drawn figures** in the answers; **animated and 3D illustrations** in the explanations (drag, sliders, buttons).
- **The teacher's own slides** beside every page (split view), slide search, **videos**, **ink** (pen, marker, highlighter, eraser — stylus draws, finger scrolls), notes, marks (Done / Revise / Important).
- Spotlight search, study stopwatch, focus mode, light / gray / dark themes, **Export PDF** print book. Works offline from a `file://` page on Windows, macOS, Android and iPadOS.

## Install

```text
/plugin marketplace add shafayatshihan/crayon72
/plugin install crayon72@crayon72
```

Then, in an empty folder next to your course material, tell Claude:

> Build a Crayon 72 app for my course. Slides are in `./slides/` (one folder per teacher). Past papers are in `./papers/`.

Claude will check your tools, ask only for what it cannot read off the files (course code, teacher names, which paper section each teacher sets), and then build lecture by lecture. You can open the partial app at any point; the file lands at `../Crayon72 - <course code>.html`.

### You need

| | |
|---|---|
| Node.js ≥ 18 and npm | `node -v` |
| Python ≥ 3.9 | `python --version` |
| Poppler (`pdftoppm`, `pdfinfo`, `pdftotext`) | Windows `winget install poppler` · macOS `brew install poppler` · Linux `apt install poppler-utils` |
| Chrome, Edge or Chromium | for the automatic page checks (or set `CHROME_PATH`) |
| ~1.5 GB free disk, internet | `npm ci`, video checks |

### Your inputs

- **Slides**: PDFs, one folder per teacher. One teacher may have a single combined PDF; others one PDF per lecture.
- **Past papers**: PDFs/scans or text of the final exams for the course. The repository also ships a text bank of BUET ME L-4 papers (`question-bank/`) — see the notice below.

## How long and how much

A course of ~20 lectures and ~170 question parts took roughly one working day of agent time and several usage-limit windows. Claude builds with at most two parallel subagents, verifies each lecture with a second agent that re-derives every numerical, and resumes by itself after a usage-limit stop. `python scripts/progress.py` in the project writes a live dashboard (`raw/progress.html`). The skill ends with a **hand-check list**: numbers read from faint scans, textbook-only answers and illustrative animation constants are flagged — check them before you rely on them in an exam.

## What is in this repository

```
.claude-plugin/marketplace.json       marketplace "crayon72"
plugins/crayon72/
  .claude-plugin/plugin.json
  skills/crayon72/
    SKILL.md                          the process (9 steps)
    references/                       spec, content rules, data formats, orchestration lessons, setup, verification
      examples/                       a made-up demo lecture (data + hand-drawn figure + 3D animation) and 3D builders
    template/                         the app (npm ci → npm run build → dist/index.html), with a demo course
question-bank/                        text transcriptions of BUET ME L-4 papers 2015-2023
```

Try the template on its own: copy `plugins/crayon72/skills/crayon72/template`, `npm ci`, `npm run build`, open `dist/index.html`.

## Notices

- **Bring your own slides.** No teacher slides, exam scans or page images are included, and none should be committed to a public repository.
- **`question-bank/` is an exam-text transcription** (BUET, L-4/T-1 and L-4/T-2, 2015-2023) included at the repository owner's request. The examination papers belong to their university and the question setters; the transcription may contain OCR errors. If you are a rights holder and want it removed, open an issue. It is not covered by the MIT licence.
- Answers written by Claude are study aids, **not** authoritative solutions. Verify them against your teacher's slides and textbook.
- Fonts: Inter (SIL OFL) is embedded; no Apple fonts or assets are used. See [THIRD_PARTY.md](THIRD_PARTY.md).

## License

MIT for the code, template and documentation — see [LICENSE](LICENSE).

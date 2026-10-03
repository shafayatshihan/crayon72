# Orchestration lessons (paid for on a 20-lecture, 4-teacher, 160-question course)

## Token and rate-limit discipline
- Cost is quadratic in session length: **one session per phase** (scaffold → slides/questions → lectures → ship). Write state to `raw/RESUME.md` so the next session starts cold.
- Delegate lecture writing to subagents (each returns a ≤15-line report). Your own output is the biggest context contributor: be decisive, batch independent tool calls.
- **At most 2 lecture agents at a time**; more trips the usage limit and all die. Never kill a running agent (its work is lost) — except when the user asks to stop everything: then stop agents, kill your own dev servers/browsers only, write `raw/RESUME.md`.
- **Pre-slice inputs**: `python scripts/slice-inputs.py <passKey>` → `raw/in-<passKey>.md` (~1–5k tokens: the lecture's questions verbatim + its slide text) instead of letting every agent read the whole bank (~20k).
- **One gold standard**: tell each agent to read ONE sibling lecture (the most recent) with `sed -n`/`grep`, never several, and never whole.
- Images are billed by area (long edge capped ~1568 px): use `node scripts/slide-sheet.mjs raw/sheet-<key>.png <ids…>` (8 slides per sheet; ids `12` or `'b2:15'`).
- When a usage limit hits mid-run, agents fail with a rate-limit error. Resume them later (SendMessage to the agent id, or `Workflow` with `resumeFromRunId`) — their files are on disk, so they continue instead of restarting.

## `raw/assign.json` (the plan)
```json
{
  "slideText": "C:/…/combined.txt",
  "lectures": {
    "a1": { "title": "…", "slides": [1, 29], "questions": ["2023-24 Q6(a)", "2020-21 Q2(b)"] },
    "b3a": { "title": "Part A", "lec": "b3", "slides": [1, 26], "slideText": "C:/…/b3.txt", "filePrefix": "m", "questions": ["…"] },
    "b3b": { "title": "Part B", "lec": "b3", "slides": [27, 58], "slideText": "C:/…/b3.txt", "filePrefix": "m", "questions": ["…"] }
  }
}
```
Keys are *pass keys*; `lec` (default = key) is the lecture they build. Big lectures (>~12 questions or >~25 slides) are built in two passes (A creates the files, B extends them). `slideText` per entry is the `pdftotext -layout` extract with `--- Page N ---` separators (generate it with a short loop over `pdftotext -f N -l N`). **Every question part must be assigned to exactly one lecture** — compute the unassigned set from the topic index (a 10-line Python script) before starting; questions with no matching deck go to the nearest lecture and are answered from textbooks.

## Agent prompt
Copy `references/lecture-agent.md` to `raw/agent-brief.md`, fill `{SKILL_DIR}`, `{PROJECT}`, and add a delta file `raw/agent-brief-<teacher>.md` for naming (key/file letters, slide id format, aspect), the gold-standard sibling, passes, and the "questions not on the slides" rule. Each agent writes ONLY its own files, runs `npx tsc --noEmit -p .` and `node scripts/lint-gl.mjs`, and does NOT run build/ship/wire/check-pages (shared state). The lead wires and ships.

## Build → independent verify (recommended pipeline)
1. **Build** pass(es) for a lecture. Structured report: placed / missing / flags.
2. **Verify** by a *different* agent: coverage of every question ref, re-derive every numerical independently (python), check claims against slide text, unique page ids and topic names across the project (`TOPIC_GLYPH` is keyed by topic name), `SlideRef` ids exist as files, videos resolve via oEmbed, tsc + lint-gl clean — and FIX in place.
3. Lead wires finished lectures (`python scripts/wire-lecture.py <keyPrefix> <n> "<title>" "<subtitle>" '{"<topic>":"<Glyph>"}' <LectureGlyph>`; names come from the lecture's `raw/<fp><n>-notes.md`), then `bash scripts/ship.sh <keys>`.
If the harness has the `Workflow` tool and the user opted into multi-agent orchestration, run lanes (two parallel lanes, each lecture = build pass(es) → verify) in one script; **halt a lane on the first null result** (usage limit) and resume. Otherwise use the Agent tool, two at a time.

## Progress view
`python scripts/progress.py` writes `raw/progress.html` (self-contained dashboard: per-lecture status, question coverage, agent activity from the workflow journal, flags). `--loop 15` refreshes it every 15 s; open the file in a browser. List already-shipped lectures in `raw/shipped.txt` (comma-separated) so they show as shipped.

## Hand-check list
Collect from agents' `flags`: numbers read from faint scans, derived (not slide-given) formulas, textbook-only answers, animation constants that are illustrative, videos chosen from titles only. Give it to the user at the end; never present these as verified.

## Known traps
- A usage-limit stop can leave an agent's half-written file: re-read before extending.
- Two renders with the same slide prefix at once corrupt each other; render sequentially.
- A Vite dev server left running by an agent holds a port; stop only your own.
- `anim-interact.mjs` counts WebGL contexts against `max(pages, mounted figures) + 4`; a lecture page with several 3D scenes is normal.
- Never rename a shipped page id (users' ink and marks are keyed to it).

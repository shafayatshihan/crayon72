# Crayon 72 — fixed product spec

The product was settled over many rounds. The template already implements all of it; this file exists so no run "improves" it away. Change only data and course art.

## Delivery
- **One self-contained HTML file** (vite-plugin-singlefile; fonts, slides, code inline). Never a multi-file export, never hosted. Opened offline in Chromium, Android Chrome, iPadOS.
- Output name: `Crayon72 - <course code>.html` beside the slides PDF.
- Slides: every PDF page rendered to **1280 px webp q72** (`render-slides.mjs` defaults) so many hundreds of slides still fit one file (a 4-teacher course with ~225 slides ships as ~20 MB; ~720 slides ≈ 50 MB).
- Storage: IndexedDB per device (ink, marks, notes, prefs, scroll, recent). Page ids are permanent — renaming one orphans users' ink.

## Brand & design
- Brand **Crayon 72**; logo = squircle with glossy "boulder" orb (`components/Logo.tsx`). No Apple logo or trademarks.
- Apple-inspired design language (no Apple assets): `#f5f5f7` canvas / white tiles / `#0071e3` action in light; black / `#1c1c1e` / `#0a84ff` in dark; 44 px frosted nav; pill buttons; 28 px tiles; black-pill segmented tabs. Themes **Light, Gray, Dark, Auto** — Gray is a soft neutral graphite (`#2a2a2d` canvas, `#37373b` tiles, `#e4e4e8` text) for users who find pure black too harsh; T cycles Light → Gray → Dark. Every view must read well in all three.
- Fonts: **Inter** (SIL OFL, embedded through `@fontsource/inter`) with a system fallback stack, and the system monospace; Caveat only for hand-drawn figure labels. Do NOT add SF Pro or any other font whose licence forbids redistribution.
- Motion: springs everywhere, press-scale, blur page transitions, rubber-band deck edges. Touch devices: native scrolling (Lenis off) and no backdrop blur, for full refresh rate.
- Cursor: boulder orb moved directly in the pointer event (zero lag), trailing halo, caret over text, spark burst on click. Sounds: synthesized, different per action, toggle + volume in Settings.

## Home
- Hero headline exactly **"One must imagine Sisyphus happy."** — word-by-word blur-in, "Sisyphus happy." in animated gradient. Buttons: **Start Studying** (filled) + "Continue where you left off ›". If `creator` is set in `course.json`, a line **"Created by <name> · <tag>"** appears under the buttons and in the footer (`course.creator`); empty = no line.
- Hero art: code-drawn animated illustration of the course subject (no video, no rolling orb).
- Below: lecture tiles, recently viewed, "Built for the exam" features, count-up stats, search CTA, footer.

## Navigation
- Global nav: Home · one link per teacher (e.g. `Rahman Sir`, `Karim Sir`) · Continue, plus search, stopwatch, settings, **fullscreen** and theme. Fullscreen is on every top bar (Home, Lectures, deck).
- **Several teachers, one course**: each teacher (`TEACHERS` in `course.ts`: id, name, short, paper section, key prefix) is a section of the app with its own lectures (keys `a1…`, `m1…`) and slides. Anup Sir's slide ids are combined-PDF page numbers (`32`); a teacher with one PDF per lecture uses `'m<lecture>:<page>'` (files `mLL-NNN.webp`). The slides pane only shows the open deck's teacher, grouped per lecture, page jump within the current lecture PDF; per-lecture `aspect` handles 4:3 decks.
- A question printed in one teacher's section but taught in the other teacher's slides appears in **both** decks: the other deck gets a copy via `DUPS` in `lectures.ts` (new id `<key>-<slug>`, own slides, own ink; both copies link to each other). `otherSection` is derived: true only if no variant was printed in that teacher's own section (badge "Sec X topic · in slides", probability ×0.9).
- Lectures page: teacher segmented switch (Rahman Sir · Sec B | Karim Sir · Sec A), chiclet row, All/Ready/Coming soon filter, tilt tiles with progress rings. Unbuilt lectures are locked "Coming soon". Home groups lecture tiles per teacher.

## Deck (one per lecture)
- Pages grouped by topic in lecture order; inside a topic, past finals by repeat probability, then lecture examples. **High-yield** toggle sorts the whole deck by probability.
- Page: topic chip + glyph, title, probability ring + "Asked k/N · last YYYY" with a why-popover, marks **Done / Revise / Important**, question card listing every year's version (newest first), cross-links to sibling sub-parts, slide pills, Videos, Print.
- Tabs **Solution | Description** (keys S / D). Solution = one exam-script answer card **per question variant** (identical wording collapses to "same as YYYY"), Self-test reveal, collapsible paper attachments. Description = Basics box, animated illustrations, numbered steps, slide links, "explained on page X" recalls, exam tip.
- Split view: slides pane (jumps to and flashes the slide; thumbnails; page jump; zoom; ink) or video pane; draggable divider; stacks on portrait phones.
- Videos: Windows file → poster opens a YouTube window (a repeat click on the same video within 20 s is ignored); Android/iPadOS → inline via the optional relay page set as `relayUrl` in `course.json` (YouTube refuses non-web embeds, Error 153; see `setup.md`; with no relay the poster just opens YouTube). "Local" means any non-http(s) or `null` origin — `file://` **and** Android's `content://`; Android "Desktop site" (Linux UA + touch) counts as mobile. Hosted → direct iframe.
- Ink: **off by default** — an **Ink** toggle in the deck top bar (key I, also in Settings) shows the macOS-dock toolbar: pen, marker, highlighter, eraser, colours, sizes, undo/redo, clear; stylus draws and finger scrolls (finger-draw toggle). Existing ink stays visible when tools are hidden.
- Extras: Spotlight search (⌘K or /), shortcuts sheet (?), Settings, focus mode (F), fullscreen, per-page notes, print to PDF (always light), scroll memory, toasts with Undo, **Mark done & next** button and M key.
- **Study stopwatch** (`components/Stopwatch.tsx` + `Watch3D.tsx`): a real-time **three.js WebGL** 3D chronograph (PBR chrome lathe case, environment reflections, extruded shadow-casting hands, domed glass, knurled crown, drag-to-rotate with spring back; 3D crown/pushers clickable), 2D SVG fallback when WebGL is missing — chrome case, bow ring, knurled crown (start/stop), two pushers (reset, lap), cream dial with 1/5 s ticks and minute/hour counters, shadowed hands beating 5×/s with overshoot, glass glare, 3D tilt; mechanical tick / crown / pusher / snap sounds; laps; draggable panel ↔ pill; daily study log shown on Home. Opened from the nav, the deck header, Spotlight, W (⇧W start/stop).

- **Export PDF (print book)**: blue "Export PDF" pill in the global top bar (icon-only on phones), Home footer, Lectures page, Spotlight, ⇧P in a deck → dialog (whole course / one teacher / one lecture, examples and paper tables toggles) → `PrintBook` view: A4, 2 columns, 6.8 pt, every variant's question + solution, no descriptions, page numbers; opens the print dialog (Save as PDF). `node scripts/printbook.mjs all "<out.pdf>"` writes it headlessly (a 165-page course → 64 A4 sheets).

## Language
Simple English only. Answers in a student's voice; descriptions explain from the basics.

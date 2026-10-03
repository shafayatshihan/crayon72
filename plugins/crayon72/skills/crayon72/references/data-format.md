# Data format & building blocks

Everything a run writes lives in `src/data/`, `src/figs/`, `src/icons/glyphs.tsx`, `src/components/HeroScene.tsx` and `src/assets/`. Components outside those are the finished app — leave them.

## Files a run writes

| File | Contents |
|---|---|
| `src/data/course.ts` | `COURSE`: code, name, teacher, teacherShort, institution, examLabel, creator (`{ name, tag }`, from `course.json`; empty = hidden), relayUrl (optional YouTube relay), `papers` (every session with this course, oldest → newest). `Year` type derives from it. |
| `src/data/lectures.ts` | `LECTURES` (one entry per lecture of the PDF: `n`, `title`, `subtitle`, `slideRange: [first, last]`, `topics`, `pages`, `locked` until built), `VIDEO_TOPIC_NAMES` (video key → display name), imports of every `l<n>.tsx`. |
| `src/data/l<n>.tsx` | exports `L<n>_TOPICS` (`{ name, tint }[]`, tints: rose, peach, butter, mint, sky, lilac) and `L<n>_PAGES` (`QPage[]`). |
| `src/data/videos.json` | `{ topicKey: [{ id, title, channel, start, why }] }` |
| `src/assets/slides/pNNN.webp` | rendered by `scripts/render-slides.mjs` (global PDF page numbers = the numbers used in `SlideRef` and `slides`). |
| `src/assets/attach/*.webp` | question-paper crops (`scripts/crop.mjs`), imported in lecture files. |

## Page object (`src/data/types.ts`)

```tsx
const turbo: QPage = {
  id: 'l1-super-turbo',            // 'l<n>-<slug>', permanent once shipped (ink is keyed by it)
  lecture: 1,
  topic: 'Air intake: supercharging & turbocharging',   // must equal a name in L1_TOPICS and a TOPIC_GLYPH key
  title: 'Supercharger vs turbocharger',                // the question TYPE, short
  kind: 'past',                                         // 'example' for lecture/worked examples
  slides: [12, 13],                                     // slide pills, most relevant first
  videoTopics: ['supercharger-turbo'],
  otherSection: true,          // optional: other teacher's section, covered by these slides
  boost: { by: 6, why: '…' },  // optional, see content.md
  links: [{ label: '2021-22 Q5(b) 2nd part → …', to: 'l2-why-2s-4s' }],  // optional sibling sub-parts
  variants: [                  // newest first
    { year: '2023-24', ref: 'Q3(a) · Sec A', marks: 8, text: <>…exact wording…</>, answer: <>…</> },
    { year: '2021-22', ref: 'Q2(b) · Sec A', marks: 10, text: <>…</>, same: '2023-24' },   // identical wording
    { year: '2018-19', ref: 'Q4(b) · Sec A', marks: 10, text: <>…</>, figure: { title: 'Fig. for Q4(b)', src: fig4b } },
  ],
  solution: null,              // default answer for variants without `answer` (use it when there is one variant)
  attachments: [{ title: 'Table: properties of fuels (attached to paper)', src: fuelTable }],  // optional, collapsible
  description: <>…</>,
};
```

`text` holds the question exactly as printed (bold the key word that distinguishes variants). `ref` format: `Q<no>(<part>) · Sec <A|B>`.

## Content components

From `@/components/content` and `@/lib/tex`:

| Component | Use |
|---|---|
| `<H>` | underlined script heading inside an answer |
| `<SlideRef p={23} />` (`>Slide 25</SlideRef>` for custom label) | blue pill that opens the slide in split view |
| `<Recall to="page-id">text</Recall>` | "already explained on …" link (description top) |
| `<Basics>` | green "Basics first" box |
| `<Step n={1} title="…">` | numbered explanation step |
| `<Tip>` | yellow exam-tip box |
| `<M>{'V/V_c'}</M>`, `<MB>{String.raw`…`}</MB>` | inline / display KaTeX |

Answers and descriptions are plain JSX: `<p>`, `<ol>`, `<ul>`, `<table>` (styled automatically), `<b>`, `<sub>`.

## Hand-drawn figures (Solution) — `src/figs/drawings.tsx`

Each figure is a named component wrapping `Sketch` (rough.js, deterministic seed):

```tsx
export const PoppetSketch = () => (
  <Sketch w={460} h={350} maxW={440} caption="Fig: poppet valve with push-rod & rocker (OHV)"
    draw={(s) => [ s.line(70, 44, 270, 74, { w: 4 }), ...lab(s, 170, 52, 150, 22, 'rocker arm & pivot', 'middle', 13), /* … */ ]} />
);
```

`s` primitives: `line rect circle ellipse arc path curve poly lines arrow text`. Options `{ c: 'pen'|'red'|'ink'|'sub'|'green', w, fill: 'soft'|colour, hachure: true, dash: true, rough }`. `lab(s, x1, y1, x2, y2, text, anchor, size)` draws a leader line + label. `deg()` converts degrees. Plotted curves: compute points in JS and pass to `s.lines(...)` (see `PVcSketch`).

Examples: `examples/demo/drawings-l1.tsx` (a lever sketch with the `lab()` leader-line helper) and, in the project, the figures of the most recent lecture.

## Animated illustrations (Description) — `src/figs/anim/`

Pattern every new one follows (`core.tsx`):
- Wrap in `<AnimFrame title caption controls playing setPlaying hint>`; controls from `Seg` (mode switch) and `Slider`.
- Continuous motion: render the SVG once, keep element refs, update them in `useLoop(boxRef, (t) => { attrs(el, {...}) }, playing)` — rAF runs only while on screen; **never `setState` per frame**.
- Simple loops: CSS classes `anim-dash` (flowing dashes), `anim-spin` (rotating group centred on its origin), `anim-spray`, `anim-pulse`, `anim-heat`, `anim-piston`; SMIL `<animateMotion>` for particles, staggered with **negative** `begin` offsets.
- One-shot / interactive: framer-motion (`animate`, springs, `motion.path` for morphing plots).
- Colours only from tokens (`var(--action)`, `var(--p-ink-rose)`, `var(--surface-solid)`, `var(--ink)` …) so both themes work.
- Gotchas: a CSS animation on an element overrides its SVG `transform` attribute — put the transform on a wrapping `<g>`; give `motion.rect` an initial `width`.

Examples: `examples/demo/anim-l1.tsx` (a `<Scene3D>` gear pair with sliders), `examples/anim/*.ts` (procedural lathe, gearbox and linkage builders on the kit) and `examples/me417-2d/` (older 2D SVG animations: pistons, timing wheels).

## Glyphs & hero
- `src/icons/glyphs.tsx`: 24×24 line icons (`base()` helper, stroke 1.6). `TOPIC_GLYPH[topicName]` for every topic, `LECTURE_GLYPH[n]` for every lecture. Draw new ones in the same style for a new subject.
- `src/components/HeroScene.tsx`: 960×500 SVG, refs + `useLoop`, pointer-parallax wrapper kept as is; only the drawing and its loop change per course.

## WebGL / 3D illustration rules (learned the hard way — enforced by `scripts/lint-gl.mjs`)

Browsers allow ~16 live WebGL contexts; past that Chrome silently kills the OLDEST, which is
usually the scene on screen, so it goes black. A slider that needed two clicks and then blacked
out the frame was this: `webglOK()` ran in a React render body, creating a new GL context on
every slider tick.

- **Build 3D illustrations on `<Scene3D>`** (`src/figs/anim/kit3d.tsx`). It owns the renderer,
  reflections, resize, off-screen pause, orbit, HTML labels, context-loss recovery and disposal.
  A new illustration is ~60-90 lines of geometry + an `update` function.
- **Never** call `getContext('webgl…')`, `new THREE.WebGLRenderer`, or `renderer.dispose()`
  yourself. Use `webglOK()` and `disposeRenderer()` from `@/lib/gl`. The build fails otherwise.
- **Never put anything that allocates a GL context inside a render body.** Props that change on
  every slider tick (`state`) must flow through a ref, never into an effect dependency list.
- Idle screenshots cannot catch these bugs. **`node scripts/anim-interact.mjs <key>`** drives
  every slider, button and orbit like a real user and fails on console warnings, a lost context,
  a black frame, a slider that ignores a single drag, or a WebGL leak. `ship.sh` runs it.

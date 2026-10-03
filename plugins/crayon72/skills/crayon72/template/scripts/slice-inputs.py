# Build one self-contained input bundle per lecture, so a lecture agent reads ONLY
# what it needs instead of the whole question bank, the whole slide deck and the
# whole map. Measured on a 20-lecture course: ~19 KB of shared pools -> ~3 KB per agent.
#
# Usage:  python scripts/slice-inputs.py            # all lectures in raw/assign.json
#         python scripts/slice-inputs.py a3         # just one
#
# raw/assign.json:
# {
#   "slideText": "C:/.../Teacher/slides.txt",   // optional, combined-PDF teachers
#   "lectures": {
#     "a3": { "title": "Feed Mechanism & Thread Cutting",
#             "slides": [41, 55],
#             "questions": ["2023-24 Q5(a)", "2017-18 Q5(d)"] }
#   }
# }
import json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
raw = root / 'raw'
cfg = json.loads((raw / 'assign.json').read_text(encoding='utf-8'))
only = sys.argv[1] if len(sys.argv) > 1 else None

questions = (raw / 'questions.md').read_text(encoding='utf-8')
mapmd = (raw / 'map.md').read_text(encoding='utf-8') if (raw / 'map.md').exists() else ''
slide_src = cfg.get('slideText')
slide_txt = pathlib.Path(slide_src).read_text(encoding='utf-8') if slide_src and pathlib.Path(slide_src).exists() else ''

# --- index questions.md: ("2023-24", "Q5(a)") -> full block ---------------------
blocks = {}
year = None
for chunk in re.split(r'\n(?=## )', questions):
    m = re.match(r'## (\d{4}-\d{2})', chunk)
    if not m:
        continue
    year = m.group(1)
    for qb in re.split(r'\n(?=### )', chunk):
        qm = re.match(r'### (Q\d+\([a-z]\)(?:\([ivx]+\))?)', qb)
        if qm:
            blocks[(year, qm.group(1))] = qb.strip()

# --- index the slide text by page ----------------------------------------------
pages = {}
for part in re.split(r'\n(?=--- Page )', slide_txt):
    pm = re.match(r'--- Page (\d+) ---', part)
    if pm:
        pages[int(pm.group(1))] = part.strip()

def section_of(key: str) -> str:
    """The `## Lecture N — \u0060key\u0060 ...` block of map.md, if present."""
    for chunk in re.split(r'\n(?=## )', mapmd):
        if re.match(rf'## Lecture \d+ — `{re.escape(key)}`', chunk):
            return chunk.strip()
    return ''

for key, L in cfg['lectures'].items():
    if only and key != only:
        continue
    out = [f"# Input bundle — lecture `{key}`: {L.get('title', '')}",
           '',
           'Everything this lecture needs. You do NOT need to open `questions.md`,',
           '`map.md` or the full slide-text extract — they are sliced into this file.',
           '']

    sec = section_of(key)
    if sec:
        out += ['## Your section of the question → lecture map', '', sec, '']

    out += ['## Your questions, verbatim', '']
    missing = []
    for q in L.get('questions', []):
        y, ref = q.split(' ', 1)
        b = blocks.get((y, ref))
        if b:
            out += [f'## {y}', b.split('\n', 1)[1] if b.startswith('### ') is False else b, '']
        else:
            missing.append(q)
    if missing:
        out += ['', '> NOT FOUND in questions.md — check the ref: ' + ', '.join(missing), '']

    lpages = pages
    if L.get('slideText'):  # per-lecture PDF: its own text extract
        t = pathlib.Path(L['slideText']).read_text(encoding='utf-8')
        lpages = {}
        for part in re.split(r'\n(?=--- Page )', t):
            pm = re.match(r'--- Page (\d+) ---', part)
            if pm:
                lpages[int(pm.group(1))] = part.strip()
    if L.get('slides') and lpages:
        a, b = L['slides']
        head = f'## Slide text, pages {a}-{b}'
        if L.get('slideText'):
            lk = L.get('lec', key)
            head += f' (slide ids "{lk}:N", e.g. slides: ["{lk}:5"]; files {lk[0]}0{lk[1:]}-NNN.webp)'
        out += ['', head, '']
        out += [lpages[p] for p in range(a, b + 1) if p in lpages]

    dst = raw / f'in-{key}.md'
    text = '\n'.join(out) + '\n'
    dst.write_text(text, encoding='utf-8')
    print(f'{dst.name:14} {len(text):>7,} chars  (~{len(text)//4:,} tok)  '
          f'{len(L.get("questions", []))} questions'
          + (f'  !! {len(missing)} unmatched' if missing else ''))

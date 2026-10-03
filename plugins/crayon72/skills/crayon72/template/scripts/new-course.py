# Reset a COPY of the Crayon 72 template for a new course.
# Usage (inside the new project folder):  python scripts/new-course.py course.json
#
# course.json:
# {
#   "code": "ME 415", "name": "…", "institution": "Your University", "examLabel": "Final exam",
#   "papers": ["2018-19", "2019-20", …],                 // oldest → newest, every paper containing this course
#   "creator": { "name": "Your Name", "tag": "ME’21" },    // optional: shown under the hero buttons and in the footer
#   "relayUrl": "",                                       // optional: https URL of a YouTube relay page (see references/setup.md); "" = direct embeds only
#   "teachers": [                                         // ONE entry per teacher = one section of the app
#     { "id": "rahman", "name": "Dr. X Rahman", "short": "Rahman Sir", "section": "A",   // section '' if the paper has none
#       "keyPrefix": "a", "filePrefix": "l",              // first teacher: may use ONE combined slides PDF (numeric slide ids)
#       "lectures": [ { "n": 1, "title": "…", "slideRange": [1, 18] }, … ] },
#     { "id": "karim", "name": "…", "short": "Karim Sir", "section": "B",
#       "keyPrefix": "m", "filePrefix": "m",               // per-lecture PDFs → slide ids 'm<n>:<page>', files mNN-PPP.webp
#       "lectures": [ { "n": 1, "title": "…", "aspect": "4 / 3" }, … ] }
#   ]
# }
# What it does: deletes the previous course's lecture pages / figures / videos / slides / paper crops,
# writes src/data/course.ts and resets src/data/lectures.ts (all lectures locked "Coming soon").
import json, re, sys, pathlib, shutil

def _match(s, i, open_c, close_c):
    """index of the bracket closing the one at s[i]; skips quoted strings."""
    depth, q, k = 0, None, i
    while k < len(s):
        ch = s[k]
        if q:
            if ch == chr(92):  # backslash: skip the escaped character
                k += 1
            elif ch == q:
                q = None
        elif ch == '/' and s[k + 1:k + 2] == '/':  # line comment: may contain apostrophes
            k = s.find('\n', k)
            if k < 0:
                break
        elif ch in ('"', "'", '`'):
            q = ch
        elif ch == open_c:
            depth += 1
        elif ch == close_c:
            depth -= 1
            if depth == 0:
                return k
        k += 1
    raise ValueError('unbalanced ' + open_c)


def clear_literal(s, decl, open_c, close_c):
    """empty the {...} / [...] literal that follows `decl ... =` (keeps declaration, type annotation and the `;`)."""
    i = s.index(decl)
    j = re.compile(r'=(?!>)').search(s, i).start()  # the assignment, not the `=>` inside a type
    k = s.index(open_c, j)
    return s[:k + 1] + s[_match(s, k, open_c, close_c):]


root = pathlib.Path(__file__).resolve().parent.parent
cfg = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
src = root / 'src'

# 1. delete previous course data
for f in (src / 'data').glob('*.tsx'):
    if re.fullmatch(r'[a-z]+\d+\.tsx', f.name):
        f.unlink()
for f in (src / 'figs').glob('drawings-*.tsx'):
    f.unlink()
for f in (src / 'figs' / 'anim').glob('*.tsx'):
    if re.fullmatch(r'[a-z]+\d+\.tsx', f.name):
        f.unlink()
for d in ['assets/slides', 'assets/attach']:
    p = src / d
    if p.exists():
        shutil.rmtree(p)
    p.mkdir(parents=True)
(src / 'data' / 'videos.json').write_text('{}\n', encoding='utf-8')

# 2. course.ts (keep helper functions below TEACHERS)
c = (src / 'data' / 'course.ts').read_text(encoding='utf-8')
tail = c[c.index('export type TeacherId'):]
cr = cfg.get('creator') or {}
creator = 'creator: { name: %s, tag: %s }' % (json.dumps(cr.get('name', ''), ensure_ascii=False), json.dumps(cr.get('tag', ''), ensure_ascii=False))
relay = json.dumps(cfg.get('relayUrl', ''))
T = cfg['teachers']
q = lambda s: json.dumps(s, ensure_ascii=False)  # a JSON string is a valid TS string (handles apostrophes)
teachers = '\n'.join(
    f"  {{ id: {q(t['id'])}, name: {q(t['name'])}, short: {q(t['short'])}, section: {q(t.get('section', ''))}, keyPrefix: {q(t['keyPrefix'])}, filePrefix: {q(t['filePrefix'])} }},"
    for t in T)
course = f"""// ONE place for everything course-specific. A new course = python scripts/new-course.py course.json, then lecture data files.
export const COURSE = {{
  code: {q(cfg['code'])},
  name: {q(cfg['name'])},
  teacher: {q(T[0]['name'])},
  teacherShort: {q(T[0]['short'])},
  institution: {q(cfg.get('institution', ''))},
  examLabel: {q(cfg.get('examLabel', 'finals'))},
  {creator},
  /** optional https page that relays YouTube embeds for file:// use on phones/iPads ('' = none) */
  relayUrl: {relay},
  /** every paper (session) that contains this course, oldest → newest */
  papers: [{', '.join(q(p) for p in cfg['papers'])}] as const,
}};
export type Year = (typeof COURSE.papers)[number];

/** Teachers of the course. Each one is a section of the app with its own lecture decks and slides. */
export const TEACHERS = [
  // keyPrefix: lecture keys (a1, a2…) and per-lecture slide ids ('m2:15'); filePrefix: page files src/data/<filePrefix><n>.tsx.
  // The FIRST teacher may use one combined slides PDF (numeric slide ids = PDF page); the others use one PDF per lecture.
  // section: the paper section this teacher sets ('' if the paper has no sections).
{teachers}
] as const;
{tail}"""
(src / 'data' / 'course.ts').write_text(course, encoding='utf-8')

# 3. lectures.ts: drop page imports, empty VIDEO_TOPIC_NAMES / DUPS / LINKS, regenerate L_<id> blocks + DEFS
p = src / 'data' / 'lectures.ts'
s = p.read_text(encoding='utf-8')
s = re.sub(r"^import \{ [A-Z]+\d+_PAGES, [A-Z]+\d+_TOPICS \} from '\./[a-z]+\d+';\n", '', s, flags=re.M)
s = clear_literal(s, 'export const VIDEO_TOPIC_NAMES', '{', '}')
s = clear_literal(s, 'const DUPS:', '[', ']')
s = clear_literal(s, 'const LINKS:', '[', ']')
while True:  # drop every previous course's L_<teacher> block (balanced, so nothing else is touched)
    m = re.search(r"\nconst L_\w+: Def\[\] = \[", s)
    if not m:
        break
    e = _match(s, m.end() - 1, '[', ']')
    s = s[:m.start()] + '\n' + s[e + 2:]
blocks = []
for t in T:
    rows = []
    for l in t['lectures']:
        extra = ''
        if l.get('slideRange'):
            extra += f", slideRange: [{l['slideRange'][0]}, {l['slideRange'][1]}]"
        if l.get('aspect'):
            extra += f", aspect: {q(l['aspect'])}"
        rows.append(f"  {{ n: {l['n']}, title: {q(l['title'])}{extra}, ...soon }},")
    blocks.append(f"const L_{t['id']}: Def[] = [\n" + '\n'.join(rows) + "\n];\n")
s = re.sub(r"const DEFS: Record<string, Def\[\]> = \{[^}]*\};",
           '\n'.join(blocks) + "\nconst DEFS: Record<string, Def[]> = { " + ', '.join(f"{t['id']}: L_{t['id']}" for t in T) + " };", s)
p.write_text(s, encoding='utf-8')

# 4. glyph maps (topic and lecture icons are re-added by wire-lecture.py)
gp = src / 'icons' / 'glyphs.tsx'
gs = gp.read_text(encoding='utf-8')
gs = clear_literal(gs, 'export const LECTURE_GLYPH', '{', '}')
gs = clear_literal(gs, 'export const TOPIC_GLYPH', '{', '}')
gp.write_text(gs, encoding='utf-8')
(root / '.ship-target').write_text(f"../Crayon72 - {cfg['code']}.html", encoding='utf-8')
print('reset for', cfg['code'], '·', ', '.join(t['short'] for t in T))

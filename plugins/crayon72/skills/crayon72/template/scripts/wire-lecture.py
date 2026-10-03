# Usage: python scripts/wire-lecture.py <keyPrefix> <N> "<title>" "<subtitle>" '<json {topic: GlyphName}>' [LectureGlyphName]
# Wires an agent-built lecture into the app:
#   - imports L<N>_PAGES / L<N>_TOPICS (file letter per teacher, see course.ts: src/data/<filePrefix><N>.tsx) into src/data/lectures.ts
#   - unlocks the lecture entry with the given title / subtitle
#   - merges raw/videos-<l|m><N>.json into src/data/videos.json
#   - adds VIDEO_TOPIC_NAMES entries from the ```ts block in raw/<l|m><N>-notes.md
#   - maps topic names to glyphs in src/icons/glyphs.tsx
import json, re, sys, pathlib

t, n, title, subtitle = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
glyphs = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
root = pathlib.Path(__file__).resolve().parent.parent
# teacher from src/data/course.ts: <keyPrefix> → (id, filePrefix)
course = (root / 'src/data/course.ts').read_text(encoding='utf-8')
tm = {kp: (i, fp) for i, kp, fp in re.findall(r"id: '([^']+)'.*?keyPrefix: '([^']+)', filePrefix: '([^']+)'", course)}
if t not in tm:
    sys.exit(f'unknown teacher keyPrefix {t}; known: {list(tm)}')
tid, pre = tm[t]
P, T = f'{pre.upper()}{n}_PAGES', f'{pre.upper()}{n}_TOPICS'
lec = root / 'src/data/lectures.ts'
s = lec.read_text(encoding='utf-8')

imp = f"import {{ {P}, {T} }} from './{pre}{n}';"
if imp not in s:
    s = s.replace("import videosJson from './videos.json';", imp + "\nimport videosJson from './videos.json';")

block = f'const L_{tid}: Def[] = ['
start = s.index(block)
end = s.index('];', start)
body = s[start:end]
m = re.search(r"^  \{ n: %d, .*\},$" % n, body, re.M)
if not m:
    sys.exit(f'lecture {t}{n} entry not found')
line = m.group(0)
aspect = re.search(r"aspect: '[^']+'", line)
rng = re.search(r"slideRange: \[\d+, \d+\]", line)
parts = [f"n: {n}", f"title: {json.dumps(title, ensure_ascii=False)}", f"subtitle: {json.dumps(subtitle, ensure_ascii=False)}"]
if rng: parts.append(rng.group(0))
if aspect: parts.append(aspect.group(0))
parts += [f"topics: {T}", f"pages: {P}"]
new = '  { ' + ', '.join(parts) + ' },'
body = body.replace(line, new)
s = s[:start] + body + s[end:]

# video topic names
notes = root / f'raw/{pre}{n}-notes.md'
if notes.exists():
    nt = notes.read_text(encoding='utf-8')
    for k, v in re.findall(r"'((?:[a-z]+\d+-)[a-z0-9-]+)':\s*'([^']+)'", nt):
        if f"'{k}':" not in s:
            s = s.replace("export const VIDEO_TOPIC_NAMES: Record<string, string> = {", "export const VIDEO_TOPIC_NAMES: Record<string, string> = {\n  '%s': %s," % (k, json.dumps(v, ensure_ascii=False)), 1)
lec.write_text(s, encoding='utf-8')

# videos
vj = root / 'src/data/videos.json'
vids = json.loads(vj.read_text(encoding='utf-8'))
src = root / f'raw/videos-{pre}{n}.json'
if src.exists():
    vids.update(json.loads(src.read_text(encoding='utf-8')))
    vj.write_text(json.dumps(vids, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

# topic glyphs
g = root / 'src/icons/glyphs.tsx'
gs = g.read_text(encoding='utf-8')
for topic, name in glyphs.items():
    if json.dumps(topic, ensure_ascii=False) not in gs:
        gs = gs.replace("export const TOPIC_GLYPH: Record<string, (p: P) => JSX.Element> = {", "export const TOPIC_GLYPH: Record<string, (p: P) => JSX.Element> = {\n  %s: %s," % (json.dumps(topic, ensure_ascii=False), name), 1)
lg = sys.argv[6] if len(sys.argv) > 6 else 'Tool'
if not re.search(rf"{t}{n}:", gs):
    hdr = 'export const LECTURE_GLYPH: Record<string, (p: P) => JSX.Element> = {'
    gs = gs.replace(hdr, hdr + '\n  %s%d: %s,' % (t, n, lg), 1)
g.write_text(gs, encoding='utf-8')
print(f'wired {t}{n}: {title}')

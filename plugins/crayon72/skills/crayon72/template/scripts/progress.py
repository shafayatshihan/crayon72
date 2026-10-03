# Live progress dashboard for the lecture-building workflow.
# Usage:  python scripts/progress.py [--loop 15]      -> writes raw/progress.html (self-contained, auto-reloads)
# Reads: raw/assign.json (plan), the workflow journal (agent start/result), the lecture files on disk.
import json, pathlib, re, sys, time, glob, os, html

root = pathlib.Path(__file__).resolve().parent.parent
raw = root / 'raw'
raw.mkdir(exist_ok=True)
# every Claude profile dir (~/.claude, ~/.claude-profiles/<name>) keeps workflow journals under projects/*/*/subagents/workflows/*/journal.jsonl
JOURNAL_GLOBS = [str(h / 'projects/*/*/subagents/workflows/*/journal.jsonl') for h in [pathlib.Path.home() / '.claude', *(pathlib.Path.home() / '.claude-profiles').glob('*')]]
if os.environ.get('CLAUDE_CONFIG_DIR'):
    JOURNAL_GLOBS.append(str(pathlib.Path(os.environ['CLAUDE_CONFIG_DIR']) / 'projects/*/*/subagents/workflows/*/journal.jsonl'))
# teachers, file letters and lecture titles come from the project's course.json (written by you, read by new-course.py)
_course = json.loads((root / 'course.json').read_text(encoding='utf-8')) if (root / 'course.json').exists() else {'teachers': []}
FL = {t['keyPrefix']: t['filePrefix'] for t in _course['teachers']}
TEACH = {t['keyPrefix']: t['short'] for t in _course['teachers']}
TITLES = {f"{t['keyPrefix']}{l['n']}": l['title'] for t in _course['teachers'] for l in t['lectures']}
# lectures you already shipped in an earlier session (no build step in this run): list them in raw/shipped.txt, comma separated
_sh = raw / 'shipped.txt'
SHIPPED = set(x.strip() for x in _sh.read_text(encoding='utf-8').split(',') if x.strip()) if _sh.exists() else set()


def latest_journal():
    fs = sorted({f for g in JOURNAL_GLOBS for f in glob.glob(g)}, key=os.path.getmtime)
    # pick the newest workflow journal that contains build agents ('build <key>' labels)
    for f in reversed(fs):
        try:
            if 'build ' in pathlib.Path(f).read_text(encoding='utf-8')[:4000]:
                return pathlib.Path(f)
        except Exception:
            pass
    return None


def read_journal():
    j = latest_journal()
    ev = {}  # label -> dict
    if not j:
        return ev, None
    base = j.parent
    for line in j.read_text(encoding='utf-8').splitlines():
        try:
            e = json.loads(line)
        except Exception:
            continue
        t = e.get('type')
        if t == 'started':
            ev[e['label']] = {'agentId': e['agentId'], 'phase': e.get('phase'), 'state': 'running', 'result': None}
        elif t == 'result':
            for k, v in ev.items():
                if v['agentId'] == e.get('agentId'):
                    v['state'] = 'done' if e.get('result') is not None else 'failed'
                    v['result'] = e.get('result')
    for k, v in ev.items():
        f = base / f"agent-{v['agentId']}.jsonl"
        v['mtime'] = f.stat().st_mtime if f.exists() else None
        v['bytes'] = f.stat().st_size if f.exists() else 0
    return ev, base


def refs_in(text):
    out = set()
    for m in re.finditer(r"year: '(\d{4}-\d{2})'.{0,160}?ref: '(Q\d+\([a-z]\)(?:\([ivx]+\))?)", text, re.S):
        out.add(m.group(1) + ' ' + m.group(2))
    return out


def count(rx, text):
    return len(re.findall(rx, text))


def main():
    assign = json.loads((raw / 'assign.json').read_text(encoding='utf-8'))['lectures']
    ev, jbase = read_journal()
    # group assign entries into lectures
    lecs = {}
    for k, v in assign.items():
        lk = v.get('lec', k)
        L = lecs.setdefault(lk, {'key': lk, 'title': '', 'passes': [], 'questions': []})
        L['passes'].append(k)
        L['questions'] += v['questions']
    titles = TITLES
    out = []
    now = time.time()
    for lk in sorted(lecs):
        L = lecs[lk]
        t, n = lk[0], lk[1:]
        fl = FL.get(t, t)
        L['teacher'] = TEACH.get(t, t)
        L['title'] = titles.get(lk, L['title'] or lk)
        L['uniq'] = sorted(set(L['questions']))
        data = raw.parent / 'src/data' / f'{fl}{n}.tsx'
        draw = raw.parent / 'src/figs' / f'drawings-{fl}{n}.tsx'
        anim = raw.parent / 'src/figs/anim' / f'{fl}{n}.tsx'
        vids = raw / f'videos-{fl}{n}.json'
        notes = raw / f'{fl}{n}-notes.md'
        dt = data.read_text(encoding='utf-8') if data.exists() else ''
        at = anim.read_text(encoding='utf-8') if anim.exists() else ''
        dr = draw.read_text(encoding='utf-8') if draw.exists() else ''
        placed = sorted(r for r in refs_in(dt) if r in set(L['uniq']))
        L['stats'] = {
            'pages': count(rf"id: '{fl}{n}-", dt), 'variants': count(r"year: '", dt),
            'figures': count(r'export (?:function|const) \w+', dr), 'anims': count(r'export (?:function|const) \w+Anim', at),
            'scene3d': count(r'<Scene3D', at), 'videos': (len(json.loads(vids.read_text(encoding='utf-8'))) if vids.exists() else 0),
            'notes': notes.exists(), 'dataKB': round(data.stat().st_size / 1024) if data.exists() else 0,
            'pageIds': re.findall(rf"id: '({fl}{n}-[a-z0-9-]+)'", dt)[:40],
        }
        if lk in SHIPPED and lk != 'c5':
            placed = L['uniq']  # shipped and verified earlier
        L['placed'] = placed
        steps = []
        for p in L['passes']:
            b = ev.get(f'build {p}')
            steps.append({'name': f'build {p}', 'state': b['state'] if b else 'waiting', 'agent': b['agentId'] if b else None,
                          'idle': (now - b['mtime']) if b and b.get('mtime') and b['state'] == 'running' else None,
                          'result': b['result'] if b else None})
        v = ev.get(f'verify {lk}')
        steps.append({'name': f'verify {lk}', 'state': v['state'] if v else 'waiting', 'agent': v['agentId'] if v else None,
                      'idle': (now - v['mtime']) if v and v.get('mtime') and v['state'] == 'running' else None,
                      'result': v['result'] if v else None})
        L['steps'] = steps
        if lk in SHIPPED and not any(s['state'] != 'waiting' for s in steps):
            L['status'] = 'shipped'
        elif steps[-1]['state'] == 'done':
            L['status'] = 'verified'
        elif any(s['state'] == 'running' for s in steps):
            L['status'] = 'verifying' if steps[-1]['state'] == 'running' else 'building'
        elif all(s['state'] == 'done' for s in steps[:-1]):
            L['status'] = 'built'
        elif any(s['state'] in ('done', 'failed') for s in steps):
            L['status'] = 'paused'
        else:
            L['status'] = 'waiting'
        # a1-a4 / c1-c6 are shipped and have no steps in this run
        if lk in SHIPPED:
            L['status'] = 'shipped' if L['status'] == 'waiting' else L['status']
        out.append(L)
    # strip bulky results
    for L in out:
        for s in L['steps']:
            r = s['result']
            if isinstance(r, dict):
                s['result'] = {k: (v if not isinstance(v, list) else v[:12]) for k, v in r.items() if k != 'files'}
    payload = {'generated': now, 'journal': str(jbase) if jbase else None, 'lectures': out, 'totalQuestions': len({q for v in assign.values() for q in v['questions']})}
    (raw / 'progress.json').write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
    tpl = (root / 'scripts/progress.tpl.html').read_text(encoding='utf-8')
    (raw / 'progress.html').write_text(tpl.replace('/*__DATA__*/null', json.dumps(payload, ensure_ascii=False)), encoding='utf-8')


if __name__ == '__main__':
    if '--loop' in sys.argv:
        gap = int(sys.argv[sys.argv.index('--loop') + 1])
        while True:
            try:
                main()
            except Exception as ex:  # keep looping
                print('progress error', ex)
            time.sleep(gap)
    else:
        main()

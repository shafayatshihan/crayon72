import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getStroke } from 'perfect-freehand';
import { kvGet, kvKeys, kvSet, useKV } from '@/lib/store';

export type Tool = 'none' | 'pen' | 'marker' | 'highlighter' | 'eraser';
export interface Stroke {
  t: Exclude<Tool, 'none' | 'eraser'>;
  c: string; // palette key
  s: number; // size multiplier
  p: number[]; // flat [x, y, pressure, ...] in surface units (width = 1000)
}

export const PEN_COLORS: Record<string, string> = {
  k: 'var(--ann-k)',
  b: 'var(--ann-b)',
  r: 'var(--ann-r)',
  g: 'var(--ann-g)',
  v: 'var(--ann-v)',
};
export const HL_COLORS: Record<string, string> = {
  y: 'var(--hl-y)',
  gr: 'var(--hl-g)',
  pk: 'var(--hl-p)',
  bl: 'var(--hl-b)',
};

interface HistItem {
  id: string;
  prev: Stroke[];
  next: Stroke[];
}
/** one undo step (a clear can touch several surfaces at once) */
interface Hist {
  items: HistItem[];
}

interface Ctx {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  hl: string;
  setHl: (c: string) => void;
  size: number;
  setSize: (n: number) => void;
  finger: boolean;
  setFinger: (b: boolean) => void;
  push: (h: Hist) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearPrefix: (prefix: string) => void;
}
const AnnCtx = createContext<Ctx | null>(null);
export const useAnn = () => useContext(AnnCtx)!;

const registry = new Set<string>();
/** shared palm-rejection window: a pen touching ANY surface blocks finger ink everywhere */
let penActiveUntil = 0;

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [tool, setTool] = useState<Tool>('none');
  const [color, setColor] = useKV('ann-color', 'b');
  const [hl, setHl] = useKV('ann-hl', 'y');
  const [size, setSize] = useKV('ann-size', 1);
  const [finger, setFinger] = useKV('ann-finger', false);
  const undoS = useRef<Hist[]>([]);
  const redoS = useRef<Hist[]>([]);
  const [, force] = useState(0);
  const bump = () => force((x) => x + 1);

  const push = useCallback((h: Hist) => {
    undoS.current.push(h);
    if (undoS.current.length > 200) undoS.current.shift();
    redoS.current = [];
    bump();
  }, []);
  // undo / redo only touch ink on the page that is on screen (a surface of it is mounted)
  const onScreen = (h: Hist) => h.items.some((it) => registry.has(it.id) || Array.from(registry).some((r) => r.split(':')[0] === it.id.split(':')[0]));
  const undo = useCallback(() => {
    const st = undoS.current;
    for (let i = st.length - 1; i >= 0; i--) {
      if (!onScreen(st[i])) continue;
      const [h] = st.splice(i, 1);
      h.items.forEach((it) => kvSet('ann:' + it.id, it.prev));
      redoS.current.push(h);
      bump();
      return;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const redo = useCallback(() => {
    const st = redoS.current;
    for (let i = st.length - 1; i >= 0; i--) {
      if (!onScreen(st[i])) continue;
      const [h] = st.splice(i, 1);
      h.items.forEach((it) => kvSet('ann:' + it.id, it.next));
      undoS.current.push(h);
      bump();
      return;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const clearPrefix = useCallback(
    async (prefix: string) => {
      // every ink surface of this page, including tabs that are closed right now
      const keys = await kvKeys('ann:' + prefix);
      const items: HistItem[] = [];
      for (const key of keys) {
        const prev = ((await kvGet<Stroke[]>(key)) ?? []) as Stroke[];
        if (!prev.length) continue;
        kvSet(key, []);
        items.push({ id: key.slice(4), prev, next: [] });
      }
      if (items.length) push({ items });
    },
    [push],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]')) return; // native text undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') setTool('none');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const v: Ctx = {
    tool,
    setTool,
    color,
    setColor,
    hl,
    setHl,
    size,
    setSize,
    finger,
    setFinger,
    push,
    undo,
    redo,
    canUndo: undoS.current.some(onScreen),
    canRedo: redoS.current.some(onScreen),
    clearPrefix,
  };
  return <AnnCtx.Provider value={v}>{children}</AnnCtx.Provider>;
}

/* ---------- geometry ---------- */
function svgPath(pts: number[][]) {
  if (!pts.length) return '';
  const d = pts.reduce(
    (acc, [x0, y0], i, a) => {
      const [x1, y1] = a[(i + 1) % a.length];
      acc.push(x0.toFixed(1), y0.toFixed(1), ((x0 + x1) / 2).toFixed(1), ((y0 + y1) / 2).toFixed(1));
      return acc;
    },
    ['M', ...pts[0].map((n) => n.toFixed(1)), 'Q'],
  );
  return d.join(' ') + ' Z';
}

const BASE = { pen: 3.2, marker: 7, highlighter: 22 };

function strokeOutline(st: Stroke, simulate: boolean) {
  const pts: number[][] = [];
  for (let i = 0; i < st.p.length; i += 3) pts.push([st.p[i], st.p[i + 1], st.p[i + 2]]);
  const size = BASE[st.t] * st.s;
  return getStroke(pts, {
    size,
    thinning: st.t === 'pen' ? 0.55 : 0,
    smoothing: 0.55,
    streamline: st.t === 'highlighter' ? 0.6 : 0.42,
    simulatePressure: simulate && st.t === 'pen',
    start: { cap: true },
    end: { cap: st.t !== 'highlighter' },
    last: true,
  });
}

function StrokePath({ st }: { st: Stroke }) {
  const d = useMemo(() => svgPath(strokeOutline(st, st.p[2] === 0.5)), [st]);
  const fill = st.t === 'highlighter' ? HL_COLORS[st.c] ?? HL_COLORS.y : PEN_COLORS[st.c] ?? PEN_COLORS.b;
  return <path d={d} style={{ fill, opacity: st.t === 'highlighter' ? 0.42 : st.t === 'marker' ? 0.92 : 1, mixBlendMode: st.t === 'highlighter' ? 'var(--hl-blend)' as never : undefined }} />;
}

/* ---------- Surface ---------- */
export function Surface({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const a = useAnn();
  const [strokes, setStrokes] = useKV<Stroke[]>('ann:' + id, []);
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [dim, setDim] = useState({ w: 1, h: 1 });
  const live = useRef<Stroke | null>(null);
  const [liveV, setLiveV] = useState(0);
  const lastType = useRef<string>('');
  const activePointer = useRef<number | null>(null);
  const erasing = useRef<{ before: Stroke[]; cur: Stroke[] } | null>(null);
  const active = a.tool !== 'none';

  useEffect(() => {
    registry.add(id);
    return () => {
      registry.delete(id);
    };
  }, [id]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDim({ w: el.offsetWidth || 1, h: el.offsetHeight || 1 }));
    ro.observe(el);
    setDim({ w: el.offsetWidth || 1, h: el.offsetHeight || 1 });
    return () => ro.disconnect();
  }, []);

  // block page scroll while the stylus (or finger in finger-mode) is drawing
  useEffect(() => {
    const el = svg.current;
    if (!el || !active) return;
    const block = (e: TouchEvent) => {
      const t = e.touches[0] as Touch & { touchType?: string };
      if (a.finger || lastType.current === 'pen' || t?.touchType === 'stylus') e.preventDefault();
    };
    el.addEventListener('touchstart', block, { passive: false });
    el.addEventListener('touchmove', block, { passive: false });
    return () => {
      el.removeEventListener('touchstart', block);
      el.removeEventListener('touchmove', block);
    };
  }, [active, a.finger]);

  const k = 1000 / dim.w; // px → units
  const H = dim.h * k;

  const toUnits = (e: PointerEvent | React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return [(e.clientX - r.left) * k, (e.clientY - r.top) * k];
  };

  const canDraw = (e: React.PointerEvent) => {
    if (!active) return false;
    if (e.pointerType === 'pen') return true;
    if (e.pointerType === 'mouse') return e.button === 0;
    // touch
    if (Date.now() < penActiveUntil) return false; // palm rejection
    return a.finger;
  };

  const eraseAt = (x: number, y: number) => {
    const er = erasing.current;
    if (!er) return;
    const R = 14 * a.size;
    const keep = er.cur.filter((st) => {
      for (let i = 0; i < st.p.length; i += 3) {
        const dx = st.p[i] - x, dy = st.p[i + 1] - y;
        if (dx * dx + dy * dy < R * R) return false;
      }
      return true;
    });
    if (keep.length !== er.cur.length) {
      er.cur = keep;
      setStrokes(keep);
    }
  };

  const onDown = (e: React.PointerEvent) => {
    lastType.current = e.pointerType;
    if (activePointer.current !== null && activePointer.current !== e.pointerId) return; // one stroke at a time
    if (!canDraw(e)) return;
    activePointer.current = e.pointerId;
    if (e.pointerType === 'pen') penActiveUntil = Date.now() + 600;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toUnits(e);
    if (a.tool === 'eraser') {
      erasing.current = { before: strokes, cur: strokes };
      eraseAt(x, y);
      return;
    }
    const pr = e.pointerType === 'pen' ? e.pressure || 0.5 : 0.5;
    live.current = { t: a.tool as Stroke['t'], c: a.tool === 'highlighter' ? a.hl : a.color, s: a.size, p: [x, y, pr] };
    setLiveV((v) => v + 1);
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'pen') penActiveUntil = Date.now() + 600;
    if (activePointer.current !== null && e.pointerId !== activePointer.current) return;
    if ((erasing.current || live.current) && e.buttons === 0 && e.pointerType === 'mouse') return onUp();
    if (erasing.current) {
      const [x, y] = toUnits(e);
      eraseAt(x, y);
      return;
    }
    const st = live.current;
    if (!st) return;
    const evs = (e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]) as PointerEvent[];
    for (const ev of evs) {
      const [x, y] = toUnits(ev);
      const pr = ev.pointerType === 'pen' ? ev.pressure || 0.5 : 0.5;
      st.p.push(x, y, pr);
    }
    setLiveV((v) => v + 1);
  };
  const onUp = (e?: React.PointerEvent) => {
    if (e && activePointer.current !== null && e.pointerId !== activePointer.current) return;
    activePointer.current = null;
    if (erasing.current) {
      const { before, cur } = erasing.current;
      erasing.current = null;
      if (before !== cur) a.push({ items: [{ id, prev: before, next: cur }] });
      return;
    }
    const st = live.current;
    live.current = null;
    if (!st) return;
    if (st.p.length < 6) st.p.push(st.p[0] + 0.5, st.p[1] + 0.5, st.p[2]);
    const next = [...strokes, st];
    a.push({ items: [{ id, prev: strokes, next }] });
    setStrokes(next);
    setLiveV((v) => v + 1);
  };

  return (
    <div ref={box} className={'relative ' + (className ?? '')}>
      {children}
      <svg
        ref={svg}
        viewBox={`0 0 1000 ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        data-ann-surface={active ? '1' : undefined}
        style={{
          pointerEvents: active ? 'auto' : 'none',
          touchAction: active && a.finger ? 'none' : 'pan-x pan-y pinch-zoom',
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onLostPointerCapture={onUp}
        onContextMenu={(e) => active && e.preventDefault()}
      >
        {strokes.map((st, i) => (
          <StrokePath key={i + ':' + st.p.length} st={st} />
        ))}
        {live.current && <StrokePath key={'live' + liveV} st={{ ...live.current, p: live.current.p.slice() }} />}
      </svg>
    </div>
  );
}

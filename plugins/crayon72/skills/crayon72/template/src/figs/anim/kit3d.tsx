// Shared host for the 3D description illustrations (three.js, fully procedural, offline).
// A scene supplies only geometry + an update function; this file owns the renderer, lights,
// reflections, drag-to-orbit, HTML labels, pausing off-screen, theme changes and disposal.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { webglOK, disposeRenderer } from '@/lib/gl';

export type V3 = [number, number, number];
export const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#0071e3';
export const isDark = () => document.documentElement.dataset.theme !== 'light';

/* ------------------------------- materials ------------------------------- */
export function makeMats() {
  const P = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
  const iron = P({ color: 0x5b646f, metalness: 0.92, roughness: 0.42, envMapIntensity: 1.35 });
  const ironDark = P({ color: 0x434b55, metalness: 0.92, roughness: 0.48, envMapIntensity: 1.15 });
  const chrome = P({ color: 0xdcdfe4, metalness: 1, roughness: 0.17, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 });
  const steel = P({ color: 0xaeb4bd, metalness: 1, roughness: 0.38, envMapIntensity: 1.1 });
  const cut = P({ color: 0xe6e9ee, metalness: 1, roughness: 0.1, clearcoat: 1, envMapIntensity: 1.4 });
  const brass = P({ color: 0xd9a64a, metalness: 1, roughness: 0.3, envMapIntensity: 1.2 });
  const paint = P({ color: new THREE.Color(cssVar('--action')), metalness: 0.35, roughness: 0.42, clearcoat: 0.5 });
  const all: THREE.Material[] = [iron, ironDark, chrome, steel, cut, brass, paint];
  const setDark = (dark: boolean) => {
    iron.color.set(dark ? 0x7b8694 : 0x59616b);
    ironDark.color.set(dark ? 0x626c79 : 0x414852);
    paint.color.set(new THREE.Color(cssVar('--action')));
  };
  return { iron, ironDark, chrome, steel, cut, brass, paint, all, setDark };
}
export type Mats = ReturnType<typeof makeMats>;

/** Ghost / highlight variants of a part's materials (cloned lazily, disposed with the scene). */
export function makeStyler() {
  type Mode = 'normal' | 'ghost' | 'hot';
  const orig = new Map<THREE.Mesh, THREE.Material>();
  const clones = new Map<THREE.Material, { ghost?: THREE.MeshPhysicalMaterial; hot?: THREE.MeshPhysicalMaterial }>();
  const hots: THREE.MeshPhysicalMaterial[] = [];
  const accent = () => new THREE.Color(cssVar('--action'));
  const variant = (m: THREE.MeshPhysicalMaterial, mode: 'ghost' | 'hot') => {
    const c = clones.get(m) ?? {};
    clones.set(m, c);
    if (!c[mode]) {
      const v = m.clone();
      if (mode === 'ghost') { v.transparent = true; v.opacity = 0.13; v.depthWrite = false; v.envMapIntensity = 0.4; }
      else { v.color.lerp(accent(), 0.5); v.emissive = accent(); v.emissiveIntensity = 0.3; hots.push(v); }
      c[mode] = v;
    }
    return c[mode]!;
  };
  return {
    set(g: THREE.Object3D, mode: Mode) {
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        if (!orig.has(m)) orig.set(m, m.material as THREE.Material);
        const base = orig.get(m) as THREE.MeshPhysicalMaterial;
        m.material = mode === 'normal' || !base.isMeshPhysicalMaterial ? base : variant(base, mode);
        m.castShadow = mode !== 'ghost';
      });
    },
    tick(t: number) { for (const h of hots) h.emissiveIntensity = 0.28 + 0.22 * Math.sin(t * 5); },
    dispose() { clones.forEach((c) => { c.ghost?.dispose(); c.hot?.dispose(); }); },
  };
}
export type Styler = ReturnType<typeof makeStyler>;

/* -------------------------------- geometry -------------------------------- */
/** Spur gear, axis = z, centred on z. */
export function gear(teeth: number, rOuter: number, rRoot: number, thickness: number, hole = 0) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [[-0.5, rRoot], [-0.2, rOuter], [0.2, rOuter], [0.5, rRoot]];
    pts.forEach(([f, r], k) => {
      const ang = a + step * (0.5 + f * 0.8);
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y);
    });
  }
  s.closePath();
  if (hole > 0) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -thickness / 2);
  return g;
}

/** Helical thread (a tube on a helix), axis = z, centred. */
export function helix(radius: number, pitch: number, turns: number, tubeR: number, seg = 24) {
  class H extends THREE.Curve<THREE.Vector3> {
    constructor() { super(); }
    getPoint(t: number, o = new THREE.Vector3()) {
      const a = t * turns * Math.PI * 2;
      return o.set(Math.cos(a) * radius, Math.sin(a) * radius, (t - 0.5) * pitch * turns);
    }
  }
  return new THREE.TubeGeometry(new H(), Math.round(turns * seg), tubeR, 8, false);
}

/** Cylinder (or any z-axis geometry) turned to lie along world X / Y / Z. */
export const along = <T extends THREE.Object3D>(m: T, ax: 'x' | 'y' | 'z'): T => {
  if (ax === 'x') m.rotation.z = Math.PI / 2;
  if (ax === 'z') m.rotation.x = Math.PI / 2;
  return m;
};

/* --------------------------------- scene host --------------------------------- */
export type LabelApi = { set(id: string, text: string, at: THREE.Vector3 | V3, off?: [number, number], show?: boolean): void };
export type Ctx = {
  THREE: typeof THREE; scene: THREE.Scene; camera: THREE.PerspectiveCamera; root: THREE.Group; renderer: THREE.WebGLRenderer;
  mats: Mats; dark: boolean; styler: Styler; labels: LabelApi;
  /** ease the camera to a new view and settle any orbit offset */
  view(pos: V3, look: V3, fov?: number): void;
};
export type Built<S> = { update?(t: number, dt: number, st: S): void; onTheme?(dark: boolean): void; dispose?(): void };
type Props<S> = {
  build: (ctx: Ctx) => Built<S>;
  cam: { pos: V3; look: V3; fov: number };
  state: S;
  aspect?: number;
  orbit?: boolean;
  floor?: number;
};

export function Scene3D<S>({ build, cam, state, aspect = 1.75, orbit = true, floor }: Props<S>) {
  const host = useRef<HTMLDivElement>(null);
  const st = useRef(state);
  st.current = state;
  const kick = useRef<() => void>();
  const [gen, setGen] = useState(0); // bumped to rebuild the scene after a lost context
  const retries = useRef(0);
  const ok = typeof window !== 'undefined' && webglOK();
  useEffect(() => { kick.current?.(); });

  useEffect(() => {
    const el = host.current;
    if (!el || !ok) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const cv = renderer.domElement;
    cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:' + (orbit ? 'grab' : 'default');
    el.appendChild(cv);
    // If the browser takes this context away (GPU reset, sleep/wake, too many contexts), do not
    // sit there black: rebuild the whole scene on a fresh context, a few times at most.
    const onLost = (e: Event) => { e.preventDefault(); if (retries.current < 3) { retries.current++; setTimeout(() => setGen((g) => g + 1), 300); } };
    cv.addEventListener('webglcontextlost', onLost);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    const camera = new THREE.PerspectiveCamera(cam.fov, aspect, 0.05, 60);
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-1.6, 3.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2 });
    key.shadow.bias = -0.0005; key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcd4ff, 0.8);
    rim.position.set(2.2, 1.1, -1.8);
    scene.add(rim, new THREE.HemisphereLight(0xffffff, 0x7d8694, 0.5));
    const root = new THREE.Group();
    scene.add(root);
    let shadowMat: THREE.ShadowMaterial | null = null;
    if (floor !== undefined) {
      shadowMat = new THREE.ShadowMaterial({ opacity: 0.17 });
      const f = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), shadowMat);
      f.rotation.x = -Math.PI / 2; f.position.y = floor; f.receiveShadow = true;
      scene.add(f);
    }

    /* ---- HTML labels with leader lines ---- */
    const layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%');
    layer.appendChild(svg);
    el.appendChild(layer);
    type L = { span: HTMLSpanElement; line: SVGLineElement; dot: SVGCircleElement; text: string; at: THREE.Vector3; off: [number, number]; show: boolean; w: number; h: number; seen: number };
    const labs = new Map<string, L>();
    let frameNo = 0, remeasure = true;
    const labels: LabelApi = {
      set(id, text, at, off = [34, -26], show = true) {
        let l = labs.get(id);
        if (!l) {
          const span = document.createElement('span');
          span.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap;font:600 11.5px/1.25 system-ui,sans-serif;padding:2px 7px;border-radius:8px;color:var(--ink);background:var(--surface-solid);border:1px solid var(--line, rgba(128,128,128,.35));box-shadow:0 1px 4px rgba(0,0,0,.12)';
          layer.appendChild(span);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('stroke', 'var(--sub)'); line.setAttribute('stroke-width', '1');
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('r', '2.6'); dot.setAttribute('fill', 'var(--action)');
          svg.append(line, dot);
          l = { span, line, dot, text: '', at: new THREE.Vector3(), off, show, w: 0, h: 0, seen: 0 };
          labs.set(id, l);
        }
        if (l.text !== text) { l.text = text; l.span.textContent = text; remeasure = true; }
        l.at.set(...(Array.isArray(at) ? at : at.toArray()) as V3);
        l.off = off; l.show = show; l.seen = frameNo;
      },
    };
    const flushLabels = () => {
      const W = el.clientWidth, H = el.clientHeight;
      const vis: { l: L; ax: number; ay: number; x: number; y: number }[] = [];
      labs.forEach((l) => {
        const v = l.at.clone().project(camera);
        const on = l.show && l.seen === frameNo && v.z < 1;
        l.span.style.display = on ? '' : 'none';
        l.line.style.display = l.dot.style.display = on ? '' : 'none';
        if (!on) return;
        if (remeasure || !l.w) { l.w = l.span.offsetWidth; l.h = l.span.offsetHeight; }
        const ax = (v.x * 0.5 + 0.5) * W, ay = (-v.y * 0.5 + 0.5) * H;
        vis.push({ l, ax, ay, x: Math.min(Math.max(ax + l.off[0], 4), W - l.w - 4), y: Math.min(Math.max(ay + l.off[1], 4), H - l.h - 4) });
      });
      remeasure = false;
      vis.sort((a, b) => a.y - b.y);
      vis.forEach((a, i) => {
        for (let j = 0; j < i; j++) {
          const b = vis[j];
          if (a.x < b.x + b.l.w + 4 && b.x < a.x + a.l.w + 4 && a.y < b.y + b.l.h + 3) a.y = Math.min(b.y + b.l.h + 3, H - a.l.h - 4);
        }
        a.l.span.style.transform = `translate(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px)`;
        const tx = Math.min(Math.max(a.ax, a.x), a.x + a.l.w), ty = Math.min(Math.max(a.ay, a.y), a.y + a.l.h);
        a.l.line.setAttribute('x1', a.ax.toFixed(1)); a.l.line.setAttribute('y1', a.ay.toFixed(1));
        a.l.line.setAttribute('x2', tx.toFixed(1)); a.l.line.setAttribute('y2', ty.toFixed(1));
        a.l.dot.setAttribute('cx', a.ax.toFixed(1)); a.l.dot.setAttribute('cy', a.ay.toFixed(1));
      });
    };

    /* ---- camera: eased view + drag orbit + idle sway ---- */
    const cur = { pos: new THREE.Vector3(...cam.pos), look: new THREE.Vector3(...cam.look), fov: cam.fov };
    const tgt = { pos: cur.pos.clone(), look: cur.look.clone(), fov: cam.fov };
    let yaw = 0, pitch = 0, vyaw = 0, vpitch = 0, dragging = false, idle = 0, sway = 0, settle = 0;
    const view: Ctx['view'] = (pos, look, fov) => { tgt.pos.set(...pos); tgt.look.set(...look); if (fov) tgt.fov = fov; settle = 1.4; };
    const placeCamera = (t: number, dt: number) => {
      const k = 1 - Math.exp(-dt * 4.5);
      cur.pos.lerp(tgt.pos, k); cur.look.lerp(tgt.look, k); cur.fov += (tgt.fov - cur.fov) * k;
      if (!dragging) {
        yaw += vyaw * dt; pitch += vpitch * dt;
        const d = Math.exp(-dt * 3.2); vyaw *= d; vpitch *= d;
        idle += dt;
        if (settle > 0) { settle -= dt; yaw *= Math.exp(-dt * 3); pitch *= Math.exp(-dt * 3); }
      }
      sway += ((idle > 1.5 ? 1 : 0) - sway) * Math.min(1, dt * 1.5);
      yaw = Math.max(-1.5, Math.min(1.5, yaw)); pitch = Math.max(-0.5, Math.min(0.7, pitch));
      const o = cur.pos.clone().sub(cur.look);
      const r = o.length();
      const th = Math.atan2(o.x, o.z) + yaw + Math.sin(t * 0.35) * 0.09 * sway;
      const ph = Math.max(-0.1, Math.min(1.45, Math.asin(o.y / r) + pitch));
      camera.position.set(cur.look.x + r * Math.cos(ph) * Math.sin(th), cur.look.y + r * Math.sin(ph), cur.look.z + r * Math.cos(ph) * Math.cos(th));
      camera.lookAt(cur.look);
      if (Math.abs(camera.fov - cur.fov) > 0.01) { camera.fov = cur.fov; camera.updateProjectionMatrix(); }
    };
    let px = 0, py = 0;
    const down = (e: PointerEvent) => { if (!orbit) return; dragging = true; idle = 0; vyaw = vpitch = 0; px = e.clientX; py = e.clientY; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; kickFn(); };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
      yaw -= dx * 0.008; pitch += dy * 0.005; vyaw = (-dx * 0.008) / 0.016; vpitch = (dy * 0.005) / 0.016; settle = 0;
    };
    const up = () => { dragging = false; idle = 0; cv.style.cursor = orbit ? 'grab' : 'default'; };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    let raf = 0, last = 0, t = 0, visible = true, kickUntil = 0;
    /* ---- build the scene ---- */
    const mats = makeMats();
    const styler = makeStyler();
    let dark = isDark();
    mats.setDark(dark);
    const ctx: Ctx = { THREE, scene, camera, root, renderer, mats, dark, styler, labels, view };
    const built = build(ctx);
    const applyTheme = () => {
      dark = isDark(); ctx.dark = dark;
      mats.setDark(dark);
      if (shadowMat) shadowMat.opacity = dark ? 0 : 0.17;
      key.intensity = dark ? 2.5 : 2.1;
      renderer.toneMappingExposure = dark ? 1.08 : 1;
      built.onTheme?.(dark);
      kickFn();
    };
    applyTheme();
    const themeObs = new MutationObserver(applyTheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const size = () => {
      const w = el.clientWidth || 700, h = el.clientHeight || Math.round(w / aspect);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix(); remeasure = true;
    };
    size();
    const ro = new ResizeObserver(() => { size(); kickFn(); });
    ro.observe(el);

    /* ---- loop ---- */
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
    function frame(now: number) {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now; t += dt; frameNo++;
      placeCamera(t, dt);
      built.update?.(t, dt, st.current);
      styler.tick(t);
      renderer.render(scene, camera);
      flushLabels();
      if (visible && !document.hidden && (!still || now < kickUntil)) raf = requestAnimationFrame(frame);
    }
    function kickFn() {
      kickUntil = performance.now() + 1600;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }
    kick.current = kickFn;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kickFn(); }, { rootMargin: '160px' });
    io.observe(el);
    const vis = () => { if (!document.hidden) kickFn(); };
    document.addEventListener('visibilitychange', vis);
    kickFn();

    return () => {
      cancelAnimationFrame(raf); kick.current = undefined;
      io.disconnect(); ro.disconnect(); themeObs.disconnect();
      document.removeEventListener('visibilitychange', vis);
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up);
      cv.removeEventListener('webglcontextlost', onLost);
      built.dispose?.();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
      mats.all.forEach((m) => m.dispose()); styler.dispose(); shadowMat?.dispose();
      env.dispose(); pmrem.dispose(); disposeRenderer(renderer);
      layer.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, gen]);

  if (!ok) return <div className="rounded-[14px] p-6 text-[13px] text-sub text-center" style={{ background: 'var(--fill)' }}>This 3D illustration needs WebGL, which is not available here. The caption below describes what it shows.</div>;
  return <div ref={host} className="relative w-full overflow-hidden rounded-[14px]" style={{ aspectRatio: String(aspect) }} />;
}

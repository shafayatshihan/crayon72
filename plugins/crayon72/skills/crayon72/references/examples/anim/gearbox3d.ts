// The 16K20 speed box as a 3D mechanism (shafts I-VI, reverse idler R, sliding gear clusters).
// Shared by the "principal movement" and "build a speed" illustrations of lecture 2.
// Tooth counts are the slide's (51/39 56/34 | 50/24 36/38 | 21/55 38/38 29/47 | 30/60 60/48 | 15/60 45/45 | 18/72 30/60);
// every pair is drawn at its real tooth ratio and meshes at the shaft spacing, so what turns is what the equation says.
import * as THREE from 'three';
import { cssVar, type Ctx } from './kit3d';
import { bx, cyl, damp, mk, pairGearGeo, meshPhase } from './mech3d';

export type GbSel = { dir: 'fwd' | 'rev'; train: 'short' | 'long'; a: number; b: number; c: number };
export const GB_N_I = 1460 * (148 / 268) * 0.985; // shaft I speed, rpm (belt 148/268, 0.985 slip)

const POS: Record<string, [number, number]> = {
  M: [-5.0, 0.2], I: [-3.6, 0.2], II: [-2.3, -0.3], III: [-1.0, 0.25], IV: [-0.1, 1.35], V: [1.25, 0.85], VI: [0.55, -0.35], R: [-2.52, 1.07],
};
type Grp = { n: number; sel: (s: GbSel) => number; act: (s: GbSel) => boolean };
const GRP: Record<string, Grp> = {
  A: { n: 2, sel: (s) => s.a, act: (s) => s.dir === 'fwd' },
  R1: { n: 1, sel: () => 0, act: (s) => s.dir === 'rev' },
  R2: { n: 1, sel: () => 0, act: (s) => s.dir === 'rev' },
  B: { n: 3, sel: (s) => s.b, act: () => true },
  C: { n: 2, sel: (s) => s.c, act: (s) => s.train === 'short' },
  D: { n: 2, sel: (s) => s.c, act: (s) => s.train === 'long' },
  E: { n: 1, sel: () => 0, act: (s) => s.train === 'long' },
  F: { n: 1, sel: () => 0, act: (s) => s.train === 'long' },
};
// driver shaft -> driven shaft, driver teeth / driven teeth, in the order the power meets them
const PAIRS: { g: string; j: number; a: string; b: string; za: number; zb: number }[] = [
  { g: 'A', j: 0, a: 'I', b: 'II', za: 51, zb: 39 }, { g: 'A', j: 1, a: 'I', b: 'II', za: 56, zb: 34 },
  { g: 'R1', j: 0, a: 'I', b: 'R', za: 50, zb: 24 }, { g: 'R2', j: 0, a: 'R', b: 'II', za: 36, zb: 38 },
  { g: 'B', j: 0, a: 'II', b: 'III', za: 21, zb: 55 }, { g: 'B', j: 1, a: 'II', b: 'III', za: 38, zb: 38 }, { g: 'B', j: 2, a: 'II', b: 'III', za: 29, zb: 47 },
  { g: 'C', j: 0, a: 'III', b: 'VI', za: 30, zb: 60 }, { g: 'C', j: 1, a: 'III', b: 'VI', za: 60, zb: 48 },
  { g: 'D', j: 0, a: 'III', b: 'IV', za: 15, zb: 60 }, { g: 'D', j: 1, a: 'III', b: 'IV', za: 45, zb: 45 },
  { g: 'E', j: 0, a: 'IV', b: 'V', za: 18, zb: 72 }, { g: 'F', j: 0, a: 'V', b: 'VI', za: 30, zb: 60 },
];
const TH = 0.055, S_FIX = 0.2, S_CL = 0.09;

export function chainOf(s: GbSel) {
  const pick = (g: string, j: number) => PAIRS.find((p) => p.g === g && p.j === j)!;
  const out = s.dir === 'fwd' ? [pick('A', s.a)] : [pick('R1', 0), pick('R2', 0)];
  out.push(pick('B', s.b));
  if (s.train === 'short') out.push(pick('C', s.c)); else out.push(pick('D', s.c), pick('E', 0), pick('F', 0));
  return out;
}
/** speed of every shaft relative to shaft I (signed), for a selection */
export function ratios(s: GbSel) {
  const r: Record<string, number> = { I: 1, M: 268 / 148 };
  for (const p of chainOf(s)) r[p.b] = -r[p.a] * (p.za / p.zb);
  return r;
}

export function buildGearbox(ctx: Ctx) {
  const { steel, chrome, iron, ironDark, paint } = ctx.mats;
  const gb = new THREE.Group();
  ctx.root.add(gb);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe0f2, metalness: 0, roughness: 0.2, transparent: true, opacity: 0.09, depthWrite: false });
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x2a2f36, metalness: 0.1, roughness: 0.7 });
  const ghost = new THREE.MeshPhysicalMaterial({ color: 0x8fa2b8, metalness: 0.2, roughness: 0.5, transparent: true, opacity: 0.07, depthWrite: false });
  const pulseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar('--action')) });

  // ---- shafts
  const sh: Record<string, THREE.Group> = {}, rods: Record<string, THREE.Mesh> = {}, free: Record<string, number> = {};
  for (const id of Object.keys(POS)) { const g = new THREE.Group(); g.position.set(POS[id][0], POS[id][1], 0); gb.add(g); sh[id] = g; free[id] = 0; }
  // ---- z-planes: each group gets a block of width n*S_FIX on both of its shafts
  const e0: Record<string, number> = {};
  for (const gname of Object.keys(GRP)) {
    const ps = PAIRS.filter((p) => p.g === gname);
    const z = Math.max(free[ps[0].a], free[ps[0].b]);
    e0[gname] = z; free[ps[0].a] = free[ps[0].b] = z + GRP[gname].n * S_FIX;
  }
  const zEnd = Math.max(...Object.values(free));
  // ---- gears
  const matOf = ctx.mats;
  const pairs = PAIRS.map((p) => {
    const D = Math.hypot(POS[p.b][0] - POS[p.a][0], POS[p.b][1] - POS[p.a][1]);
    const phi = Math.atan2(POS[p.b][1] - POS[p.a][1], POS[p.b][0] - POS[p.a][0]);
    const ph = meshPhase(p.za, phi);
    const mat = p.g === 'A' || p.g === 'R1' || p.g === 'R2' ? matOf.brass : p.g === 'B' ? matOf.chrome : p.g === 'C' || p.g === 'D' ? matOf.steel : matOf.iron;
    const ga = mk(sh[p.a], pairGearGeo(p.za, p.zb, D, TH), mat), gbm = mk(sh[p.b], pairGearGeo(p.zb, p.za, D, TH), mat);
    ga.rotation.z = ph.a; gbm.rotation.z = ph.b;
    const zf = e0[p.g] + S_FIX * p.j + S_FIX / 2;
    gbm.position.z = zf;
    return { ...p, ga, gb: gbm, zf, key: `${p.g}${p.j}` };
  });
  const kNow: Record<string, number> = {};
  // ---- rods, plate, bearings
  for (const id of Object.keys(POS)) {
    const z1 = id === 'VI' ? zEnd + 1.1 : id === 'M' ? 1.0 : Math.max(free[id], 0.5) + 0.25;
    rods[id] = cyl(sh[id], 0.05, z1 + 0.3, steel, 0, 0, (z1 - 0.3) / 2, 'z', 16);
    cyl(sh[id], 0.085, 0.06, ironDark, 0, 0, -0.27, 'z', 18);
  }
  bx(gb, 8.6, 4.2, 0.04, glass, -2.45, 0.7, -0.33).castShadow = false;
  // ---- motor + belt
  const motor = new THREE.Group(); motor.position.set(POS.M[0], POS.M[1], 0); gb.add(motor);
  cyl(motor, 0.42, 1.05, paint, 0, 0, -0.1, 'z', 40);
  cyl(motor, 0.3, 0.06, iron, 0, 0, 0.45, 'z', 40);
  const BZ = 0.82;
  const pul = (id: string, r: number) => { cyl(sh[id], r, 0.13, chrome, 0, 0, BZ, 'z', 40); cyl(sh[id], r * 0.55, 0.15, ironDark, 0, 0, BZ, 'z', 24); bx(sh[id], r * 0.9, 0.03, 0.15, paint, r * 0.4, 0, BZ); };
  pul('M', 0.3); pul('I', 0.543);
  const beltG = new THREE.Group(); beltG.position.z = BZ; gb.add(beltG);
  const beltN = 90, belt = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.03, 0.15), rubber, beltN);
  belt.frustumCulled = false; belt.castShadow = true; beltG.add(belt);
  const bo = new THREE.Object3D();
  // open belt between the two pulleys (straight runs + wrap), built once
  const bp = (() => {
    const [x1, y1] = POS.M, [x2, y2] = POS.I, r1 = 0.3, r2 = 0.543, d = x2 - x1, beta = Math.acos((r1 - r2) / d);
    const pts: [number, number][] = [];
    const arc = (cx: number, cy: number, r: number, a0: number, a1: number, k: number) => { for (let i = 0; i <= k; i++) { const a = a0 + ((a1 - a0) * i) / k; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    arc(x2, y2, r2, beta, -beta, 14); arc(x1, y1, r1, -beta, -(Math.PI * 2 - beta), 14);
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    pts.push(pts[0]); cum.push(cum[cum.length - 1] + Math.hypot(pts[pts.length - 1][0] - pts[pts.length - 2][0], pts[pts.length - 1][1] - pts[pts.length - 2][1]));
    return { pts, cum, L: cum[cum.length - 1] };
  })();
  let beltPh = 0;
  const placeBelt = () => {
    const { pts, cum, L } = bp;
    for (let i = 0, j = 0; i < beltN; i++) {
      const s = ((((i * L) / beltN + beltPh) % L) + L) % L;
      j = 0; while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const f = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), a = pts[j], b = pts[j + 1];
      bo.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0);
      bo.rotation.set(0, 0, Math.atan2(b[1] - a[1], b[0] - a[0]));
      bo.scale.set((L / beltN) * 1.05, 1, 1); bo.updateMatrix(); belt.setMatrixAt(i, bo.matrix);
    }
    belt.instanceMatrix.needsUpdate = true;
  };
  placeBelt();
  // ---- spindle: chuck + bar on shaft VI
  cyl(sh.VI, 0.34, 0.2, chrome, 0, 0, zEnd + 0.15, 'z', 40);
  for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3 + 0.4, j = bx(sh.VI, 0.1, 0.12, 0.2, steel, Math.cos(a) * 0.2, Math.sin(a) * 0.2, zEnd + 0.33); j.rotation.z = a; }
  cyl(sh.VI, 0.12, 0.7, matOf.cut, 0, 0, zEnd + 0.7, 'z', 24);

  // ---- pulse that carries the power along the active chain
  const pulse = mk(gb, new THREE.SphereGeometry(0.09, 16, 12), pulseMat); pulse.castShadow = false;
  let path: THREE.Vector3[] = [], plen: number[] = [], ptot = 1;

  let key = '', thetaI = 0, r: Record<string, number> = { I: 1 };
  const anchor = (id: string, dz = 0) => new THREE.Vector3(POS[id][0], POS[id][1], dz);
  function reselect(s: GbSel, hot: boolean) {
    key = JSON.stringify(s) + hot;
    r = ratios(s);
    const on = new Set(chainOf(s).map((p) => p.g + p.j));
    const setM = (m: THREE.Mesh, live: boolean) => { ctx.styler.set(m, live ? (hot ? 'hot' : 'normal') : 'normal'); if (!live) { m.material = ghost; m.castShadow = false; } };
    for (const p of pairs) { const live = on.has(p.key); setM(p.ga, live); setM(p.gb, live); }
    for (const id of Object.keys(rods)) { const live = r[id] !== undefined || id === 'M'; ctx.styler.set(rods[id], 'normal'); if (!live) { rods[id].material = ghost; rods[id].castShadow = false; } }
    // pulse path through the contact points
    path = [new THREE.Vector3(POS.M[0], POS.M[1], BZ), new THREE.Vector3(POS.I[0], POS.I[1], BZ)];
    for (const c of chainOf(s)) { const p = pairs.find((q) => q.key === c.g + c.j)!; path.push(new THREE.Vector3(POS[p.a][0], POS[p.a][1], p.zf), new THREE.Vector3(POS[p.b][0], POS[p.b][1], p.zf)); }
    path.push(new THREE.Vector3(POS.VI[0], POS.VI[1], zEnd + 0.7));
    plen = [0]; for (let i = 1; i < path.length; i++) plen.push(plen[i - 1] + path[i].distanceTo(path[i - 1]));
    ptot = plen[plen.length - 1];
  }
  return {
    root: gb, POS, anchor, zEnd, sh,
    rpm: (id: string, s: GbSel) => GB_N_I * Math.abs(ratios(s)[id] ?? 0),
    /** advance one frame. spin: turn the shafts; pulse: run the power marker */
    update(t: number, dt: number, s: GbSel, o: { spin: boolean; pulse: boolean; hot: boolean }) {
      if (key !== JSON.stringify(s) + o.hot) reselect(s, o.hot);
      const rmax = Math.max(...Object.values(r).map(Math.abs));
      if (o.spin) thetaI += (dt * 4.2) / rmax;
      for (const id of Object.keys(r)) if (id !== 'M') sh[id].rotation.z = -r[id] * thetaI; else sh.M.rotation.z = -r.M * thetaI;
      // sliding clusters: the driver cluster moves so that the chosen gear lines up with its partner
      for (const p of pairs) {
        const g = GRP[p.g], k = (kNow[p.g] = damp(kNow[p.g] ?? g.sel(s), g.sel(s), dt, 7));
        p.ga.position.z = e0[p.g] + S_FIX / 2 + (S_FIX - S_CL) * k + S_CL * p.j;
      }
      if (o.spin) beltPh += (dt * 4.2 * r.I * 0.543) / rmax;
      placeBelt();
      pulse.visible = o.pulse;
      if (o.pulse) {
        const u = ((t * 0.16) % 1) * ptot;
        let i = 1; while (i < plen.length - 1 && plen[i] < u) i++;
        pulse.position.lerpVectors(path[i - 1], path[i], (u - plen[i - 1]) / Math.max(1e-6, plen[i] - plen[i - 1]));
        pulse.scale.setScalar(1 + 0.2 * Math.sin(t * 9));
      }
    },
    dispose() { ghost.dispose(); glass.dispose(); rubber.dispose(); pulseMat.dispose(); },
  };
}

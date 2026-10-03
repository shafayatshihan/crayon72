// Small helpers shared by the 3D description illustrations of lectures 2-4 (no GL context is made here).
import * as THREE from 'three';
import { along, gear } from './kit3d';

export const TAU = Math.PI * 2;
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const damp = (c: number, t: number, dt: number, r = 6) => c + (t - c) * (1 - Math.exp(-dt * r));
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
export const rad = (d: number) => (d * Math.PI) / 180;
export type M = THREE.Material;

export function mk(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: M, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const bx = (p: THREE.Object3D, w: number, h: number, d: number, mat: M, x = 0, y = 0, z = 0) => mk(p, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
export const cyl = (p: THREE.Object3D, r: number, len: number, mat: M, x = 0, y = 0, z = 0, ax: 'x' | 'y' | 'z' = 'y', seg = 32) => along(mk(p, new THREE.CylinderGeometry(r, r, len, seg), mat, x, y, z), ax);
export const gearAt = (p: THREE.Object3D, n: number, ro: number, rr: number, th: number, mat: M, x = 0, y = 0, z = 0) => mk(p, gear(n, ro, rr, th), mat, x, y, z);
export const ghostMat = () => new THREE.MeshPhysicalMaterial({ color: 0xcfe0f2, metalness: 0, roughness: 0.15, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });

/** Gear geometry sized from tooth counts so that a pair at centre distance D really meshes: pitch radii D*za/(za+zb). */
export function pairGearGeo(z: number, zOther: number, D: number, th: number, hole = 0) {
  const rp = (D * z) / (z + zOther), m = (2 * rp) / z;
  return gear(z, rp + 0.9 * m, rp - 1.1 * m, th, hole);
}
/** Set the angular offset that makes gear A (tooth towards B) and gear B (gap towards A) mesh at angle phi. */
export const meshPhase = (za: number, phi: number) => ({ a: phi - Math.PI / za, b: phi + Math.PI });

/** Open-belt loop around two circles, in the XY plane: sampled centre line with cumulative length. */
export function beltPath(c1: [number, number], r1: number, c2: [number, number], r2: number, n = 120) {
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
  const beta = Math.acos(clamp((r1 - r2) / d, -1, 1)), a0 = Math.atan2(uy, ux);
  const pts: [number, number][] = [];
  const arc = (c: [number, number], r: number, from: number, to: number, k: number) => { for (let i = 0; i <= k; i++) { const a = a0 + from + ((to - from) * i) / k; pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } };
  const k2 = Math.max(6, Math.round(n * 0.12)), k1 = Math.max(8, Math.round(n * 0.2));
  arc(c2, r2, beta, -beta, k2);                 // far side of circle 2
  arc(c1, r1, -beta, -(TAU - beta), k1);        // back round circle 1
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1] + Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  pts.push(pts[0]); cum.push(L);
  return { pts, cum, L };
}

/** A belt of short instanced links that travel round a path built by beltPath(); local XY plane, width along local Z. */
export function makeBelt(parent: THREE.Object3D, mat: M, width: number, count = 150) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.026, width), mat, count);
  mesh.castShadow = true; mesh.frustumCulled = false;
  parent.add(mesh);
  const o = new THREE.Object3D();
  let path = beltPath([0, 1], 0.3, [0, 0], 0.5), phase = 0;
  const place = () => {
    const { pts, cum, L } = path, seg = (L / count) * 1.03;
    let j = 0;
    for (let i = 0; i < count; i++) {
      const s = (((i * L) / count + phase) % L + L) % L;
      while (j > 0 && cum[j] > s) j--;
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const f = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
      const a = pts[j], b = pts[j + 1];
      o.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0);
      o.rotation.set(0, 0, Math.atan2(b[1] - a[1], b[0] - a[0]));
      o.scale.set(seg, 1, 1);
      o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  place();
  return {
    mesh,
    /** reshape the loop (centres + radii) */
    set(c1: [number, number], r1: number, c2: [number, number], r2: number) { path = beltPath(c1, r1, c2, r2); place(); },
    /** advance the belt by a travelled length (same units as the radii) */
    run(ds: number) { phase += ds; place(); },
    dispose() { mesh.geometry.dispose(); },
  };
}

/** A thin dimension line between two points with small end balls (drawn on top of the machine). */
export function dimLine(parent: THREE.Object3D, a: [number, number, number], b: [number, number, number], r: number, mat: THREE.Material) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 8), mat);
  c.position.copy(A).add(B).multiplyScalar(0.5);
  c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  c.renderOrder = 20; parent.add(c);
  const ball = new THREE.SphereGeometry(r * 2.2, 10, 8);
  for (const p of [A, B]) { const s = new THREE.Mesh(ball, mat); s.position.copy(p); s.renderOrder = 20; parent.add(s); }
  return c.position.clone();
}
/** A ring (swing circle) standing in the YZ plane at x, centred on the spindle axis. */
export function swingRing(parent: THREE.Object3D, x: number, y: number, R: number, r: number, mat: THREE.Material) {
  const t = new THREE.Mesh(new THREE.TorusGeometry(R, r, 8, 72), mat);
  t.position.set(x, y, 0); t.rotation.y = Math.PI / 2; t.renderOrder = 20; parent.add(t);
  return t;
}

/** Spur gear of a given module m (pitch radius m*z/2), so gears made with the same m mesh at distance m*(z1+z2)/2. */
export function modGear(z: number, m: number, th: number, hole = 0) {
  const rp = (m * z) / 2;
  return gear(z, rp + 0.9 * m, rp - 1.1 * m, th, hole);
}
export const rp = (z: number, m: number) => (m * z) / 2;

/** A row of meshing gears along +x (axis z), with each gear's spin rate relative to the first (signed). */
export function gearRow(parent: THREE.Object3D, zs: number[], m: number, mats: THREE.Material[], th: number, x0 = 0, y = 0, z = 0) {
  let x = x0;
  const items = zs.map((n, i) => {
    if (i > 0) x += rp(zs[i - 1], m) + rp(n, m);
    const mesh = mk(parent, modGear(n, m, th), mats[i % mats.length], x, y, z);
    const off = i === 0 ? meshPhase(n, 0).a : meshPhase(n, 0).b;
    mesh.rotation.z = off;
    return { mesh, off, x, rate: 1 };
  });
  for (let i = 1; i < items.length; i++) items[i].rate = -items[i - 1].rate * (zs[i - 1] / zs[i]);
  return items;
}

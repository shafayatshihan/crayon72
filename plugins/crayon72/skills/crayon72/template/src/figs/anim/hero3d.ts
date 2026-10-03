// Default hero illustration: two meshing gears. The skill REPLACES this file with art for the course subject.
// Contract: buildHero(mats) -> { root, update(dt), dispose() }; build from primitives only (no assets);
// keep the model inside roughly x ∈ [-1, 1], y ∈ [0, 1.2], centred near (0, 0.56, 0) — the camera is fixed.
import * as THREE from 'three';
import { gear, type Mats } from './kit3d';

export function buildHero(mats: Mats) {
  const { chrome, iron, paint, steel } = mats;
  const root = new THREE.Group();
  const mesh = <T extends THREE.BufferGeometry>(g: T, m: THREE.Material) => {
    const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o;
  };
  const base = mesh(new THREE.BoxGeometry(1.7, 0.06, 0.5), iron); base.position.set(0.05, 0.03, 0); root.add(base);

  const mk = (teeth: number, ro: number, rr: number, hole: number, x: number, y: number, m: THREE.Material) => {
    const g = new THREE.Group(); g.position.set(x, y, 0);
    g.add(mesh(gear(teeth, ro, rr, 0.12, hole), m));
    const hub = mesh(new THREE.CylinderGeometry(hole * 1.9, hole * 1.9, 0.2, 32), steel); hub.rotation.x = Math.PI / 2; g.add(hub);
    const pin = mesh(new THREE.CylinderGeometry(hole, hole, 0.32, 24), chrome); pin.rotation.x = Math.PI / 2; g.add(pin);
    root.add(g); return g;
  };
  const A = mk(24, 0.4, 0.34, 0.05, -0.28, 0.68, paint);
  const B = mk(16, 0.275, 0.215, 0.04, 0.38, 0.68, chrome);
  B.rotation.z = Math.PI / 16; // half a tooth, so they mesh

  let a = 0;
  return {
    root,
    update(dt: number) { a += dt * 0.5; A.rotation.z = a; B.rotation.z = Math.PI / 16 - a * (24 / 16); },
    dispose() { /* geometries are disposed by the caller's scene traverse */ },
  };
}

// Procedural engine lathe shared by the hero and the lathe-tour illustration.
// Parts are named groups at the origin (children carry world positions) so a caller can ghost,
// highlight or hide each one. Everything is built from primitives: no asset files.
import * as THREE from 'three';
import type { Mats } from './kit3d';
import { helix } from './kit3d';

export const LATHE = {
  AX: 0.95,          // spindle / workpiece centre height
  R_STOCK: 0.062, R_CUT: 0.05,
  X_CHUCK: -0.38,    // chuck face: where the workpiece starts
  X_END: 0.58,       // free end of the workpiece
  WAY_TOP: 0.745, BED_TOP: 0.7,
};

export function buildLathe(mats: Mats, opt: { detail?: boolean } = {}) {
  const { AX, R_STOCK, R_CUT, X_CHUCK, X_END, WAY_TOP, BED_TOP } = LATHE;
  const { iron, ironDark, chrome, steel, cut, paint } = mats;
  const root = new THREE.Group();
  const group = (name: string) => { const g = new THREE.Group(); g.name = name; root.add(g); return g; };
  const bed = group('bed'), headstock = group('headstock'), spindleChuck = group('spindleChuck'),
    tailstock = group('tailstock'), carriage = group('carriage'), leadScrew = group('leadScrew'), feedRod = group('feedRod');
  const shadowed = <T extends THREE.Mesh>(m: T) => { m.castShadow = true; m.receiveShadow = true; return m; };

  const box = (g: THREE.Group, w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const b = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
    b.position.set(x, y, z); g.add(b); return b;
  };
  /** Cylinder lying along the bed axis (world X). */
  const shaft = (g: THREE.Group, r: number, len: number, m: THREE.Material, x: number, y: number, z = 0, seg = 32) => {
    const c = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m));
    c.rotation.z = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c;
  };

  // legs, bed casting, guideways
  box(bed, 0.26, 0.52, 0.44, ironDark, -0.78, 0.26, 0);
  box(bed, 0.26, 0.52, 0.44, ironDark, 0.8, 0.26, 0);
  box(bed, 2.0, 0.18, 0.42, iron, 0.02, 0.61, 0);
  box(bed, 2.0, 0.045, 0.08, chrome, 0.02, 0.7225, -0.15);
  box(bed, 2.0, 0.045, 0.08, chrome, 0.02, 0.7225, 0.15);

  // lead screw and feed rod across the front of the bed; each spins inside its own pivot
  const spinner = (g: THREE.Group, y: number) => { const s = new THREE.Group(); s.position.set(0.02, y, 0.28); g.add(s); return s; };
  const leadSpin = spinner(leadScrew, 0.6), feedSpin = spinner(feedRod, 0.52);
  const leadBody = shaft(leadSpin, 0.019, 1.92, chrome, 0, 0, 0, 20);
  const feedBody = shaft(feedSpin, 0.014, 1.92, steel, 0, 0, 0, 16);
  leadBody.position.set(0, 0, 0); feedBody.position.set(0, 0, 0);
  if (opt.detail) {
    // visible thread on the lead screw, key slot on the feed rod, so their spin can be seen
    const th = shadowed(new THREE.Mesh(helix(0.019, 0.05, 38, 0.006, 10), chrome));
    th.rotation.y = Math.PI / 2; leadSpin.add(th);
    box(feedSpin, 1.92, 0.006, 0.01, ironDark, 0, 0.0135, 0);
  }

  // headstock
  box(headstock, 0.52, 1.18 - BED_TOP, 0.44, iron, -0.76, (BED_TOP + 1.18) / 2, 0);
  box(headstock, 0.44, 0.05, 0.36, paint, -0.76, 1.19, 0);

  // spindle + chuck + work. pivot lays it along X, `spin` does the turning
  const pivot = new THREE.Group();
  pivot.position.set(0, AX, 0); pivot.rotation.z = -Math.PI / 2;
  spindleChuck.add(pivot);
  const spin = new THREE.Group();
  pivot.add(spin);
  const addSpin = (mesh: THREE.Mesh, alongX: number) => { mesh.position.y = alongX; shadowed(mesh); spin.add(mesh); return mesh; };
  addSpin(new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.13, 48), chrome), X_CHUCK - 0.075);
  addSpin(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 32), iron), X_CHUCK - 0.15);
  for (let i = 0; i < 3; i++) {
    const j = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.115), chrome));
    const a = (i * Math.PI * 2) / 3;
    j.position.set(Math.cos(a) * 0.098, X_CHUCK + 0.035, Math.sin(a) * 0.098);
    j.rotation.y = -a; spin.add(j);
  }
  // bright turned diameter behind the tool, rough stock ahead of it (unit length, scaled each frame)
  const turned = addSpin(new THREE.Mesh(new THREE.CylinderGeometry(R_CUT, R_CUT, 1, 36), cut), 0);
  const rough = addSpin(new THREE.Mesh(new THREE.CylinderGeometry(R_STOCK, R_STOCK, 1, 36), steel), 0);

  // carriage: saddle, apron, cross slide, compound rest, tool post, bit, handwheel
  box(carriage, 0.3, 0.07, 0.52, iron, 0, WAY_TOP + 0.035, 0);
  box(carriage, 0.28, 0.26, 0.15, iron, 0, 0.7, 0.27);
  box(carriage, 0.22, 0.06, 0.34, iron, 0, 0.845, 0.05);
  box(carriage, 0.17, 0.05, 0.22, iron, 0, 0.9, 0.08);
  box(carriage, 0.11, 0.09, 0.11, iron, 0, 0.97, 0.13);
  const bit = box(carriage, 0.05, 0.028, 0.14, chrome, 0, AX - 0.005, 0.055);
  bit.rotation.x = -0.1;
  const wheel = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.011, 10, 28), chrome));
  wheel.position.set(0, 0.7, 0.36); carriage.add(wheel);

  // tailstock
  box(tailstock, 0.32, 1.07 - BED_TOP, 0.34, iron, 0.88, (BED_TOP + 1.07) / 2, 0);
  shaft(tailstock, 0.045, 0.19, chrome, 0.72, AX, 0, 24);
  const centre = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 24), chrome));
  centre.rotation.z = Math.PI / 2; centre.position.set(X_END + 0.045, AX, 0); tailstock.add(centre);
  const tw = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.011, 10, 28), chrome));
  tw.position.set(1.02, AX, 0); tw.rotation.y = Math.PI / 2; tailstock.add(tw);

  // chips flying off the tool
  const chipGeo = new THREE.BoxGeometry(0.018, 0.005, 0.009);
  const chipMat = new THREE.MeshPhysicalMaterial({ color: 0xf0d9a8, metalness: 1, roughness: 0.3, envMapIntensity: 1.2 });
  const chips = Array.from({ length: 16 }, () => {
    const m = new THREE.Mesh(chipGeo, chipMat);
    m.visible = false; root.add(m);
    return { m, v: new THREE.Vector3(), life: Math.random() * 1.4 };
  });

  const st = { carriageX: X_END, chipTimer: 0 };
  /** Advance one frame. `feed:false` freezes the carriage (it still spins). */
  function update(dt: number, o: { feed?: boolean; chips?: boolean } = {}) {
    spin.rotation.y += dt * 2.6;
    leadSpin.rotation.x += dt * 1.4; feedSpin.rotation.x += dt * 1.4;
    wheel.rotation.z -= dt * 0.9;
    if (o.feed !== false) { st.carriageX -= dt * 0.055; if (st.carriageX < X_CHUCK + 0.04) st.carriageX = X_END; }
    const cx = st.carriageX;
    carriage.position.x = cx;
    const cutLen = Math.max(0.01, cx - X_CHUCK);
    turned.scale.y = cutLen; turned.position.y = X_CHUCK + cutLen / 2;
    const rawLen = Math.max(0.01, X_END - cx);
    rough.scale.y = rawLen; rough.position.y = cx + rawLen / 2;
    st.chipTimer += dt;
    if (o.chips !== false && o.feed !== false && st.chipTimer > 0.085) {
      st.chipTimer = 0;
      const c = chips.find((q) => !q.m.visible);
      if (c) {
        c.m.position.set(cx, AX + R_CUT * 0.5, R_STOCK);
        c.v.set((Math.random() - 0.3) * 0.45, 0.5 + Math.random() * 0.45, 0.35 + Math.random() * 0.45);
        c.m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        c.m.visible = true; c.life = 0;
      }
    }
    for (const c of chips) {
      if (!c.m.visible) continue;
      c.life += dt; c.v.y -= dt * 2.4;
      c.m.position.addScaledVector(c.v, dt);
      c.m.rotation.x += dt * 6; c.m.rotation.z += dt * 4;
      if (c.life > 1.2 || c.m.position.y < 0.02) c.m.visible = false;
    }
  }
  return {
    root, update, st,
    parts: { bed, headstock, spindleChuck, tailstock, carriage, leadScrew, feedRod },
    dispose() { chipGeo.dispose(); chipMat.dispose(); },
  };
}

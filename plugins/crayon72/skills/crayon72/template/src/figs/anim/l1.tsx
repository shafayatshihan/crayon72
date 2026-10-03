// DEMO animation on <Scene3D>: a gear pair whose ratio you can change. Copy this pattern for real lectures:
//   build(ctx) creates meshes ONCE and returns { update(t, dt, state) }; per-tick state flows through the `state` prop
//   (a ref inside Scene3D) — never into an effect dependency list, and never allocate GL objects in a render body.
import { useState } from 'react';
import * as THREE from 'three';
import { AnimFrame, Slider } from './core';
import { Scene3D, gear, type Built, type Ctx } from './kit3d';

type GearState = { z2: number; rpm: number; playing: boolean };
const Z1 = 20;

function buildGears(ctx: Ctx): Built<GearState> {
  const { mats, root, labels } = ctx;
  const mkGear = (z: number) => {
    const m = (z / 20) * 0.3; // radius grows with tooth count so the teeth stay the same size
    const g = new THREE.Mesh(gear(z, m + 0.045, m - 0.03, 0.16, 0.04), z === Z1 ? mats.paint : mats.chrome);
    g.castShadow = true;
    return g;
  };
  let g2: THREE.Mesh | null = null;
  let a1 = 0;
  let lastZ = -1;
  const g1 = mkGear(Z1);
  root.add(g1);
  const rebuild = (z2: number) => {
    if (g2) { root.remove(g2); g2.geometry.dispose(); }
    g2 = mkGear(z2);
    root.add(g2);
    lastZ = z2;
  };
  return {
    update(_t, dt, st) {
      if (st.z2 !== lastZ) rebuild(st.z2);
      if (st.playing) a1 += dt * (st.rpm / 60) * Math.PI * 2 * 0.1;
      const r1 = 0.3, r2 = (st.z2 / 20) * 0.3;
      g1.position.set(-(r1 + r2) / 2, 0.7, 0);
      g1.rotation.z = a1;
      if (g2) {
        g2.position.set(g1.position.x + r1 + r2, 0.7, 0);
        g2.rotation.z = Math.PI / st.z2 - a1 * (Z1 / st.z2);
      }
      labels.set('in', `driver z=${Z1} · ${st.rpm} rpm`, [g1.position.x, 1.2, 0], [0, 0]);
      if (g2) labels.set('out', `driven z=${st.z2} · ${Math.round((st.rpm * Z1) / st.z2)} rpm`, [g2.position.x, 0.2, 0], [0, 0]);
    },
  };
}

export function GearPairAnim() {
  const [z2, setZ2] = useState(40);
  const [rpm, setRpm] = useState(120);
  const [playing, setPlaying] = useState(true);
  return (
    <AnimFrame
      title="Gear pair — change the ratio"
      playing={playing}
      setPlaying={setPlaying}
      hint="Sliders · drag to orbit"
      controls={
        <>
          <Slider label="Driven gear teeth" value={z2} min={10} max={60} step={1} onChange={setZ2} />
          <Slider label="Driver speed" value={rpm} min={30} max={300} step={10} onChange={setRpm} unit=" rpm" />
        </>
      }
      caption={`Gear ratio i = z₂ / z₁ = ${z2}/${Z1} = ${(z2 / Z1).toFixed(2)}; the driven gear turns at ${Math.round((rpm * Z1) / z2)} rpm.`}
    >
      <Scene3D<GearState> build={buildGears} state={{ z2, rpm, playing }} cam={{ pos: [0.2, 1.4, 2.6], look: [0, 0.66, 0], fov: 38 }} aspect={1.7} floor={0} />
    </AnimFrame>
  );
}

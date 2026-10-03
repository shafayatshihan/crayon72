// Real-time 3D stopwatch (three.js / WebGL): PBR metal case, environment reflections, shadowed hands, domed glass.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { watchTick } from '@/lib/sound';
import { webglOK, disposeRenderer } from '@/lib/gl';
export { webglOK };

export interface WatchState {
  running: boolean;
  startAt: number;
  acc: number;
}
const elapsedOf = (s: WatchState, now = Date.now()) => s.acc + (s.running ? now - s.startAt : 0);
const easeBack = (x: number) => {
  const c1 = 2.2, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// webglOK lives in @/lib/gl (cached, releases its probe context) and is re-exported above.

/* ---------------- dial texture (canvas) ---------------- */
const DIAL_R = 0.86; // dial radius in world units
const SUB_Y = 0.36; // sub-dial offset (world units)
function dialTexture() {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const cx = S / 2, R = S / 2;
  const grad = g.createRadialGradient(cx * 0.84, cx * 0.76, 10, cx, cx, R);
  grad.addColorStop(0, '#fbf7ec');
  grad.addColorStop(0.72, '#ece5d3');
  grad.addColorStop(1, '#cfc5ae');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  // fine sunburst
  g.save();
  g.translate(cx, cx);
  for (let i = 0; i < 720; i++) {
    g.rotate(Math.PI / 360);
    g.fillStyle = i % 2 ? 'rgba(0,0,0,0.012)' : 'rgba(255,255,255,0.03)';
    g.fillRect(0, -1, R, 2);
  }
  g.restore();
  const tick = (i: number, n: number, r1: number, len: number, w: number, col: string) => {
    const a = (i / n) * Math.PI * 2;
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx + r1 * Math.sin(a), cx - r1 * Math.cos(a));
    g.lineTo(cx + (r1 - len) * Math.sin(a), cx - (r1 - len) * Math.cos(a));
    g.stroke();
  };
  for (let i = 0; i < 300; i++) {
    const major = i % 25 === 0, mid = i % 5 === 0;
    tick(i, 300, R - 26, major ? 50 : mid ? 30 : 14, major ? 9 : mid ? 5 : 2.4, major ? '#0b0b0c' : '#1d1d1f');
  }
  g.fillStyle = '#0b0b0c';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let k = 1; k <= 12; k++) {
    const n = k * 5, a = (n / 60) * Math.PI * 2, r = R - 128;
    g.font = `${n % 15 === 0 ? 800 : 700} ${n % 15 === 0 ? 76 : 58}px "Inter", system-ui, Helvetica, sans-serif`;
    g.fillText(String(n), cx + r * Math.sin(a), cx - r * Math.cos(a) + 2);
  }
  const subPx = (SUB_Y / DIAL_R) * R, subR = 100;
  [
    [-subPx, 30, 'MIN'],
    [subPx, 12, 'HR'],
  ].forEach(([dy, n, label]) => {
    const y = cx + (dy as number);
    const sg = g.createRadialGradient(cx - 20, y - 20, 4, cx, y, subR);
    sg.addColorStop(0, '#f1ece0');
    sg.addColorStop(1, '#ddd6c5');
    g.fillStyle = sg;
    g.beginPath();
    g.arc(cx, y, subR, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.18)';
    g.lineWidth = 3;
    g.stroke();
    for (let i = 0; i < (n as number); i++) {
      const a = (i / (n as number)) * Math.PI * 2, big = i % ((n as number) / 6) === 0;
      g.strokeStyle = '#1d1d1f';
      g.lineWidth = big ? 6 : 3;
      g.beginPath();
      g.moveTo(cx + 92 * Math.sin(a), y - 92 * Math.cos(a));
      g.lineTo(cx + (big ? 72 : 82) * Math.sin(a), y - (big ? 72 : 82) * Math.cos(a));
      g.stroke();
    }
    g.fillStyle = '#3a3a3c';
    g.font = '700 28px "Inter", system-ui, Helvetica, sans-serif';
    g.fillText(label as string, cx, y + 46);
  });
  g.fillStyle = '#1d1d1f';
  g.font = '800 40px "Inter", system-ui, Helvetica, sans-serif';
  g.fillText('P A S T E L   7 2', cx, cx - 14);
  g.fillStyle = '#5a5a5f';
  g.font = '600 22px "Inter", system-ui, Helvetica, sans-serif';
  g.fillText('C H R O N O G R A P H  ·  1 / 5  s', cx, cx + 26);
  // inner shadow at the rim
  const ig = g.createRadialGradient(cx, cx, R * 0.86, cx, cx, R);
  ig.addColorStop(0, 'rgba(0,0,0,0)');
  ig.addColorStop(1, 'rgba(0,0,0,0.38)');
  g.fillStyle = ig;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function knurlTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 256, 32);
  for (let i = 0; i < 64; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : '#000000';
    g.fillRect(i * 4, 0, 2, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------------- the component ---------------- */
export function Watch3D({ sw, ticking, onCrown, onReset, onLap }: { sw: WatchState; ticking: boolean; onCrown: () => void; onReset: () => void; onLap: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const swRef = useRef(sw);
  swRef.current = sw;
  const tickRef = useRef(ticking);
  tickRef.current = ticking;
  const cb = useRef({ onCrown, onReset, onLap });
  cb.current = { onCrown, onReset, onLap };
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    wakeRef.current();
  }, [sw.running, sw.acc, sw.startAt]);

  useEffect(() => {
    const el = host.current!;
    const W = el.clientWidth || 268, H = el.clientHeight || 300;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;

    const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 50);
    camera.position.set(0, 0.12, 5.4);
    camera.lookAt(0, 0.18, 0);

    // lights
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-1.6, 2.6, 5.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -1.6;
    key.shadow.camera.right = 1.6;
    key.shadow.camera.top = 2;
    key.shadow.camera.bottom = -1.6;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    scene.add(key);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.55));

    const watch = new THREE.Group();
    scene.add(watch);

    const chrome = new THREE.MeshPhysicalMaterial({ color: 0xdedee3, metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.25 });
    const satin = new THREE.MeshPhysicalMaterial({ color: 0xc8c8cc, metalness: 1, roughness: 0.32, envMapIntensity: 1.1 });

    // case (lathe = turned metal), axis → +Z
    const prof: THREE.Vector2[] = [
      [0, -0.16], [0.9, -0.16], [0.98, -0.14], [1.03, -0.09], [1.05, 0], [1.04, 0.06], [1.0, 0.1], [0.94, 0.12], [0.9, 0.12], [0.885, 0.07],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const caseGeo = new THREE.LatheGeometry(prof, 128);
    caseGeo.rotateX(Math.PI / 2);
    const caseMesh = new THREE.Mesh(caseGeo, chrome);
    caseMesh.castShadow = true;
    caseMesh.receiveShadow = true;
    watch.add(caseMesh);

    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.905, 0.035, 24, 128), chrome);
    bezel.position.z = 0.115;
    watch.add(bezel);

    // dial (recessed)
    const dialTex = dialTexture();
    const dial = new THREE.Mesh(new THREE.CircleGeometry(DIAL_R, 128), new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.82, metalness: 0, envMapIntensity: 0.18 }));
    dial.position.z = 0.07;
    dial.receiveShadow = true;
    watch.add(dial);
    void document.fonts?.ready.then(() => {
      const t2 = dialTexture();
      (dial.material as THREE.MeshStandardMaterial).map = t2;
      (dial.material as THREE.MeshStandardMaterial).needsUpdate = true;
      dialTex.dispose();
      wake();
    });
    // sub-dial rings (raised chapter rings)
    [SUB_Y, -SUB_Y].forEach((y) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.006, 8, 64), satin);
      ring.position.set(0, y, 0.072);
      watch.add(ring);
    });

    // hands
    const red = new THREE.MeshPhysicalMaterial({ color: 0xd70015, metalness: 0.35, roughness: 0.35, clearcoat: 0.6 });
    const black = new THREE.MeshPhysicalMaterial({ color: 0x1d1d1f, metalness: 0.5, roughness: 0.3 });
    const handShape = (len: number, tail: number, w0: number, w1: number) => {
      const s = new THREE.Shape();
      s.moveTo(-w0, -tail);
      s.lineTo(-w1, len);
      s.lineTo(w1, len);
      s.lineTo(w0, -tail);
      s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
    };
    const secPivot = new THREE.Group();
    secPivot.position.z = 0.125;
    const secHand = new THREE.Mesh(handShape(0.78, 0.2, 0.018, 0.006), red);
    secHand.castShadow = true;
    secPivot.add(secHand);
    const cw = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.014, 32), red);
    cw.rotation.x = Math.PI / 2;
    cw.position.set(0, -0.17, 0.008);
    cw.castShadow = true;
    secPivot.add(cw);
    watch.add(secPivot);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 32, 16), chrome);
    cap.scale.z = 0.6;
    cap.position.z = 0.145;
    cap.castShadow = true;
    watch.add(cap);
    const mkSub = (y: number) => {
      const p = new THREE.Group();
      p.position.set(0, y, 0.09);
      const h = new THREE.Mesh(handShape(0.15, 0.03, 0.012, 0.004), black);
      h.castShadow = true;
      p.add(h);
      const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 8), chrome);
      c2.position.z = 0.012;
      p.add(c2);
      watch.add(p);
      return p;
    };
    const minPivot = mkSub(SUB_Y);
    const hrPivot = mkSub(-SUB_Y);

    // glass dome
    const glassR = 4, theta = Math.asin(0.9 / glassR);
    const glassGeo = new THREE.SphereGeometry(glassR, 96, 12, 0, Math.PI * 2, 0, theta);
    glassGeo.rotateX(Math.PI / 2);
    const glass = new THREE.Mesh(
      glassGeo,
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.045, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 0.7, depthWrite: false }),
    );
    glass.position.z = 0.115 - glassR * Math.cos(theta) + 0.002;
    watch.add(glass);

    // crown, stem, bow
    const knurl = knurlTexture();
    knurl.repeat.set(3, 1);
    const crownG = new THREE.Group();
    crownG.name = 'crown';
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 32), satin);
    stem.position.y = 1.1;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.13, 64), new THREE.MeshPhysicalMaterial({ color: 0xd8d8dc, metalness: 1, roughness: 0.28, bumpMap: knurl, bumpScale: 1.4 }));
    crown.position.y = 1.23;
    const crownTop = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.13, 0.02, 64), chrome);
    crownTop.position.y = 1.305;
    crownG.add(stem, crown, crownTop);
    [stem, crown, crownTop].forEach((m) => {
      m.castShadow = true;
      m.userData.part = 'crown';
    });
    watch.add(crownG);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.038, 24, 64), chrome);
    bow.position.y = 1.5;
    bow.castShadow = true;
    watch.add(bow);

    const pushers: Record<string, THREE.Group> = {};
    [
      ['reset', 0.74],
      ['lap', -0.74],
    ].forEach(([name, ang]) => {
      const pg = new THREE.Group();
      pg.rotation.z = ang as number;
      const inner = new THREE.Group();
      const ps = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 24), satin);
      ps.position.y = 1.08;
      const pc = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 32), chrome);
      pc.position.y = 1.18;
      [ps, pc].forEach((m) => {
        m.castShadow = true;
        m.userData.part = name;
      });
      inner.add(ps, pc);
      pg.add(inner);
      watch.add(pg);
      pushers[name as string] = inner;
    });

    // soft contact shadow behind the watch
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.13 }));
    shadowPlane.position.z = -0.5;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    watch.scale.setScalar(0.92);
    watch.position.y = -0.05;

    /* ------------ interaction ------------ */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let rotX = 0.18, rotY = -0.28, tX = 0.18, tY = -0.28, vX = 0, vY = 0;
    let dragging = false, moved = 0, lx = 0, ly = 0;
    const press: Record<string, number> = { crown: 0, reset: 0, lap: 0 };
    const pick = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(watch.children, true).find((h) => h.object.userData.part);
      return hit?.object.userData.part as string | undefined;
    };
    const down = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lx = e.clientX;
      ly = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
      wake();
    };
    const move = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - lx, dy = e.clientY - ly;
        lx = e.clientX;
        ly = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        tY += dx * 0.012;
        tX += dy * 0.01;
        tX = Math.max(-1.2, Math.min(1.2, tX));
        vY = dx * 0.012;
        vX = dy * 0.01;
      } else if (e.pointerType === 'mouse') {
        const r = renderer.domElement.getBoundingClientRect();
        tY = -0.28 + ((e.clientX - r.left) / r.width - 0.5) * 0.5;
        tX = 0.18 + ((e.clientY - r.top) / r.height - 0.5) * 0.35;
        renderer.domElement.style.cursor = pick(e) ? 'pointer' : 'grab';
      }
      wake();
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved < 6) {
        const part = pick(e);
        if (part) {
          press[part] = 1;
          if (part === 'crown') cb.current.onCrown();
          else if (part === 'reset') cb.current.onReset();
          else cb.current.onLap();
        }
      } else {
        // fling with inertia, then settle back to a gentle three-quarter view
        tY += vY * 8;
        tX += vX * 8;
        window.setTimeout(() => {
          tX = 0.18;
          tY = -0.28;
          wake();
        }, 1400);
      }
      wake();
    };
    const leave = () => {
      if (dragging) return;
      tX = 0.18;
      tY = -0.28;
      wake();
    };
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', up);
    renderer.domElement.addEventListener('pointerleave', leave);

    /* ------------ animation ------------ */
    let raf = 0, idle = 0, lastBeat = -1;
    let reset: { from: [number, number, number]; t0: number } | null = null;
    let shown: [number, number, number] = [0, 0, 0];
    let prevAcc = swRef.current.acc + (swRef.current.running ? 1 : 0);
    const frame = () => {
      const s = swRef.current;
      const cur = s.acc + (s.running ? 1 : 0);
      if (cur === 0 && prevAcc !== 0) reset = { from: [...shown] as [number, number, number], t0: performance.now() };
      prevAcc = cur;
      const e = elapsedOf(s);
      let a: [number, number, number];
      if (reset) {
        const k = Math.min(1, (performance.now() - reset.t0) / 420);
        const q = 1 - Math.pow(1 - k, 3);
        a = [reset.from[0] * (1 - q), reset.from[1] * (1 - q), reset.from[2] * (1 - q)];
        if (k >= 1) reset = null;
      } else {
        const beat = Math.floor(e / 200);
        const frac = (e % 200) / 200;
        const step = s.running ? easeBack(Math.min(1, frac * 7)) : 1;
        a = [e ? ((beat - 1 + step) * 1.2) % 360 : 0, ((e / 60000) % 30) * 12, ((e / 3600000) % 12) * 30];
        if (s.running && beat !== lastBeat) {
          if (lastBeat >= 0 && tickRef.current) watchTick(beat % 5 === 0);
          lastBeat = beat;
        }
      }
      shown = a;
      secPivot.rotation.z = -THREE.MathUtils.degToRad(a[0]);
      minPivot.rotation.z = -THREE.MathUtils.degToRad(a[1]);
      hrPivot.rotation.z = -THREE.MathUtils.degToRad(a[2]);
      // springy orientation
      if (!dragging) {
        vX *= 0.9;
        vY *= 0.9;
      }
      rotX += (tX - rotX) * 0.12;
      rotY += (tY - rotY) * 0.12;
      watch.rotation.x = rotX;
      watch.rotation.y = rotY;
      // button presses
      let pressing = false;
      for (const k of Object.keys(press)) {
        if (press[k] > 0) {
          press[k] = Math.max(0, press[k] - 0.12);
          pressing = true;
        }
      }
      const depth = (v: number) => -0.06 * Math.sin(Math.min(1, v) * Math.PI);
      crownG.position.y = depth(press.crown);
      pushers.reset.position.y = depth(press.reset);
      pushers.lap.position.y = depth(press.lap);
      renderer.render(scene, camera);
      const settling = Math.abs(tX - rotX) + Math.abs(tY - rotY) > 0.002;
      idle = s.running || reset || dragging || settling || pressing ? 0 : idle + 1;
      raf = idle < 4 ? requestAnimationFrame(frame) : 0;
    };
    function wake() {
      idle = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    wakeRef.current = wake;
    wake();

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      wake();
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointercancel', up);
      renderer.domElement.removeEventListener('pointerleave', leave);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      knurl.dispose();
      env.dispose();
      pmrem.dispose();
      disposeRenderer(renderer);
    };
  }, []);

  return <div ref={host} className="w-full aspect-[268/300] select-none" aria-label="3D stopwatch — drag to rotate, click the crown to start or stop" role="img" />;
}

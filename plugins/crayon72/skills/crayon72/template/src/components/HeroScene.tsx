import { useEffect, useRef, useState } from 'react';
import { motion, useTransform, type MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { webglOK, disposeRenderer } from '@/lib/gl';
import { makeMats } from '@/figs/anim/kit3d';
import { buildHero } from '@/figs/anim/hero3d';

/* ---------------------------------------------------------------------------
   Hero: a procedural 3D illustration, rendered with three.js. Everything is
   built from primitives — no model file, no network — so it ships inside the
   single offline HTML. THE SKILL REPLACES `buildHero` (src/figs/anim/hero3d.ts)
   WITH AN ILLUSTRATION OF THE COURSE SUBJECT (see SKILL.md, "Course art").
   Without WebGL it falls back to the flat drawing below.
--------------------------------------------------------------------------- */

const ASPECT = 960 / 500;

/* ============================ fallback drawing ============================ */

function FallbackHero() {
  return (
    <svg viewBox="0 0 960 500" className="w-full h-auto block" role="img" aria-label="Illustration">
      <defs>
        <radialGradient id="hs-floor" cx=".5" cy=".5" r=".5">
          <stop offset="0" style={{ stopColor: 'var(--action)', stopOpacity: 0.16 }} />
          <stop offset="1" style={{ stopColor: 'var(--action)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse cx={480} cy={440} rx={420} ry={56} fill="url(#hs-floor)" />
      <circle cx={400} cy={250} r={140} fill="none" stroke="var(--action)" strokeWidth={14} strokeDasharray="22 12" opacity={0.55} />
      <circle cx={600} cy={300} r={90} fill="none" stroke="var(--action)" strokeWidth={12} strokeDasharray="18 10" opacity={0.4} />
    </svg>
  );
}

/* ============================== the 3D hero ============================== */

const DARK = () => document.documentElement.dataset.theme !== 'light';

function HeroScene3D() {
  const host = useRef<HTMLDivElement>(null);
  const [gen, setGen] = useState(0); // bumped to rebuild after a lost WebGL context
  const retries = useRef(0);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);
    // lose the context (GPU reset, sleep/wake, too many contexts) -> rebuild on a fresh one, a few times at most
    const onLost = (e: Event) => { e.preventDefault(); if (retries.current < 3) { retries.current++; setTimeout(() => setGen((g) => g + 1), 300); } };
    renderer.domElement.addEventListener('webglcontextlost', onLost);

    const scene = new THREE.Scene();
    // Reflections with no asset file — the same zero-download trick the stopwatch uses.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;

    // three-quarter product view: long lens, slightly above
    const camera = new THREE.PerspectiveCamera(30, ASPECT, 0.1, 50);
    camera.position.set(1.47, 1.56, 3.27);
    camera.lookAt(0.02, 0.56, 0);

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-1.6, 3.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -1.9; key.shadow.camera.right = 1.9;
    key.shadow.camera.top = 1.9; key.shadow.camera.bottom = -1.9;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcd4ff, 0.8);
    rim.position.set(2.2, 1.1, -1.8);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8694, 0.5));

    /* ---------------- materials + the hero model ---------------- */
    const mats = makeMats();
    mats.setDark(DARK());
    const lathe = buildHero(mats);
    const root = lathe.root;
    scene.add(root);

    /* ---------------- floor shadow ---------------- */
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.16 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), shadowMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    /* ---------------- theme ---------------- */
    const applyTheme = () => {
      const dark = DARK();
      mats.setDark(dark);
      shadowMat.opacity = dark ? 0 : 0.17; // a dark shadow does nothing on a black page
      key.intensity = dark ? 2.5 : 2.1;
      renderer.toneMappingExposure = dark ? 1.08 : 1;
    };
    applyTheme();
    const themeObs = new MutationObserver(applyTheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    /* ---------------- layout ---------------- */
    const size = () => {
      const w = el.clientWidth || 860;
      const h = Math.round(w / ASPECT);
      renderer.setSize(w, h, false);
      camera.aspect = ASPECT;
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);

    /* ---------------- loop ---------------- */
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, last = performance.now(), t = 0, visible = true;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      lathe.update(dt);
      root.rotation.y = Math.sin(t * 0.11) * 0.09;
      renderer.render(scene, camera);
      raf = visible ? requestAnimationFrame(frame) : 0;
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting && !still;
        if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      },
      { rootMargin: '160px' },
    );
    io.observe(el);
    renderer.render(scene, camera); // paint once even if reduced-motion keeps it frozen

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect(); themeObs.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      lathe.dispose();
      [...mats.all, shadowMat].forEach((m) => m.dispose());
      env.dispose(); pmrem.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      disposeRenderer(renderer);
    };
  }, [gen]);

  return <div ref={host} className="w-full" style={{ aspectRatio: String(ASPECT) }} />;
}

/* ================================= hero ================================= */

const GL = typeof window !== 'undefined' && webglOK();

export function HeroScene({ scroll }: { scroll: MotionValue<number> }) {
  const scale = useTransform(scroll, [0, 1], [0.97, 1.05]);
  const y = useTransform(scroll, [0, 1], [0, -40]);
  return (
    <div className="w-full max-w-[980px] mx-auto">
      <motion.div style={{ scale, y }}>{GL ? <HeroScene3D /> : <FallbackHero />}</motion.div>
    </div>
  );
}

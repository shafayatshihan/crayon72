// The ONLY place WebGL support is probed and renderers are released.
//
// Why this file exists: browsers allow ~16 live WebGL contexts per page. Once that is
// exceeded Chrome silently kills the OLDEST one, and that is usually the scene you are
// looking at, so it goes black. Two easy ways to hit the limit:
//
//   1. Probing support with `canvas.getContext('webgl')` inside a React render body.
//      It runs on every render, so a slider that re-renders 60 times a second creates
//      60 contexts a second. (This is exactly the bug that made the chuck slider need a
//      double click and then turn the scene black.)
//   2. Disposing a renderer with `renderer.dispose()` alone. That frees GPU resources but
//      NOT the context; the context lingers until garbage collection, so flipping through
//      lecture pages leaks one context per page.
//
// Rules: never call getContext('webgl*') yourself; call webglOK(); and release every
// renderer with disposeRenderer(), never with renderer.dispose() on its own.
import type { WebGLRenderer } from 'three';

let cached: boolean | null = null;

/** Is WebGL available? Probed once per page load, and the probe context is released at once. */
export function webglOK(): boolean {
  if (cached !== null) return cached;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    cached = !!gl;
    // hand the probe's context straight back so it never counts against the limit
    (gl?.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

/** Fully release a renderer: GPU resources AND the context itself, then drop the canvas. */
export function disposeRenderer(renderer: WebGLRenderer) {
  const cv = renderer.domElement;
  renderer.dispose();
  renderer.forceContextLoss();
  cv.remove();
}

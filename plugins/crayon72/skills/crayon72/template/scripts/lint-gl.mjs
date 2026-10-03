// Fails the build on the patterns that leak or kill WebGL contexts. Runs first in `npm run build`,
// so neither a hand edit nor a lecture subagent can ship them. Full reasoning: src/lib/gl.ts.
import fs from 'fs';
import path from 'path';

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : /[.]tsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
const norm = (f) => f.split(path.sep).join('/');

// the only files allowed to touch the raw APIs
const GL_LIB = 'src/lib/gl.ts';
const RENDERER_OWNERS = ['src/figs/anim/kit3d.tsx', 'src/components/HeroScene.tsx', 'src/components/Watch3D.tsx'];

const rules = [
  { why: 'probes WebGL by creating a context. Call webglOK() from @/lib/gl (cached, releases its probe).',
    test: (l) => /getContext\(\s*['"](webgl2?|experimental-webgl)['"]/.test(l), allow: [GL_LIB] },
  { why: 'builds its own WebGLRenderer. Use <Scene3D> from @/figs/anim/kit3d so context-loss recovery, off-screen pause and disposal come for free.',
    test: (l) => /new\s+(THREE\.)?WebGLRenderer\(/.test(l), allow: RENDERER_OWNERS },
  { why: 'disposes a renderer directly. renderer.dispose() does NOT free the context; use disposeRenderer() from @/lib/gl.',
    test: (l) => /\brenderer\.dispose\(\)/.test(l), allow: [GL_LIB] },
];

const errs = [];
for (const f of walk('src')) {
  const rel = norm(f);
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    for (const r of rules) if (r.test(line) && !r.allow.includes(rel)) errs.push(`${rel}:${i + 1}  ${r.why}\n      ${line.trim().slice(0, 110)}`);
  });
}
if (errs.length) {
  console.error('\nlint-gl: WebGL context-safety violations\n\n' + errs.join('\n\n') + '\n');
  process.exit(1);
}
console.log('lint-gl: ok');

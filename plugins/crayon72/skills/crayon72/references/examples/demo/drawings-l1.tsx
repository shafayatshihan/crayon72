// DEMO exam-script figure (hand-drawn style). Copy this pattern: <Sketch w h caption draw={(s) => [...]} />.
// Rules: labels with leader lines, arrows for forces/motion, hachure needs a fill, caption starts with "Fig:".
import { Sketch, type S } from './sketch';

const lab = (s: S, x1: number, y1: number, x2: number, y2: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start') => [
  s.line(x1, y1, x2, y2, { c: 'sub', w: 1.1, rough: 0.6 }),
  s.text(x2 + (anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0), y2 + 5, t, { size: 13, anchor }),
];

/** Class-1 lever: effort E at distance b from the fulcrum, load W at distance a. */
export const LeverSketch = () => (
  <Sketch
    w={560}
    h={260}
    maxW={560}
    caption="Fig: a lever balanced on its fulcrum — effort E at arm b, load W at arm a"
    draw={(s) => [
      s.line(60, 150, 500, 110, { w: 4 }),
      s.poly([[262, 134], [236, 190], [288, 190]], { fill: 'soft', hachure: true }),
      s.rect(214, 190, 100, 12, { fill: 'ink', hachure: true }),
      s.rect(88, 100, 54, 42, { fill: 'soft' }),
      s.text(115, 126, 'W', { size: 16, anchor: 'middle', weight: 700 }),
      s.arrow(468, 40, 472, 100, { w: 2.2 }),
      s.text(480, 36, 'E', { size: 16, weight: 700 }),
      s.line(115, 215, 262, 215, { c: 'sub', w: 1.1 }),
      s.line(262, 215, 472, 215, { c: 'sub', w: 1.1 }),
      s.text(188, 236, 'a', { size: 15, anchor: 'middle' }),
      s.text(367, 236, 'b', { size: 15, anchor: 'middle' }),
      ...lab(s, 262, 190, 330, 245, 'fulcrum'),
    ]}
  />
);

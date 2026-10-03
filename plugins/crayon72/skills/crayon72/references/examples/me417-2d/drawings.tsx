// Exam-script figures: the drawings a student is expected to make by hand, with labels and detail.
import { Sketch, type S } from './sketch';

const deg = (d: number) => (d * Math.PI) / 180;
/** leader line + label */
const lab = (s: S, x1: number, y1: number, x2: number, y2: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 14) => [
  s.line(x1, y1, x2, y2, { c: 'sub', w: 1.1, rough: 0.6 }),
  s.text(x2 + (anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0), y2 + 5, t, { size, anchor }),
];

export const ClassTreeSketch = () => (
  <Sketch
    w={560}
    h={200}
    caption="Fig: classification of IC engines"
    draw={(s) => [
      s.rect(220, 6, 120, 32, { fill: 'soft' }),
      s.text(280, 28, 'IC Engine', { anchor: 'middle', size: 17 }),
      ...[
        ['Ignition', 'SI / CI'],
        ['Cycle', '4S / 2S'],
        ['Valves', 'I / L head'],
        ['Design', 'Recip. / Rotary'],
        ['Cylinders', 'In-line, V, ...'],
      ].flatMap(([a, b], i) => [s.line(280, 38, 56 + i * 112, 74), s.rect(10 + i * 112, 74, 92, 44), s.text(56 + i * 112, 92, a, { anchor: 'middle', size: 14 }), s.text(56 + i * 112, 110, b, { anchor: 'middle', size: 12, c: 'sub' })]),
      ...[
        ['Air intake', 'NA / SC / TC'],
        ['Fuel input', 'Carb, MPFI, GDI'],
        ['Fuel', 'Petrol, Diesel..'],
        ['Cooling', 'Air / Liquid'],
        ['Application', 'Auto, Marine..'],
      ].flatMap(([a, b], i) => [s.line(56 + i * 112, 118, 56 + i * 112, 140, { c: 'sub', dash: true }), s.rect(10 + i * 112, 140, 92, 44), s.text(56 + i * 112, 158, a, { anchor: 'middle', size: 14 }), s.text(56 + i * 112, 176, b, { anchor: 'middle', size: 12, c: 'sub' })]),
    ]}
  />
);

export const TimelineSketch = () => (
  <Sketch
    w={520}
    h={110}
    caption="Fig: development of the IC engine"
    draw={(s) => [
      s.arrow(10, 60, 510, 60),
      ...[
        ['1860', 'Lenoir', 40],
        ['1876', 'Otto 4S', 150],
        ['1878', 'Clerk 2S', 250],
        ['1885', 'Benz', 340],
        ['1892', 'Diesel CI', 440],
      ].flatMap(([y, n, x], i) => [s.line(+x, 52, +x, 68, { w: 2.2 }), s.text(+x, i % 2 ? 90 : 40, String(y), { anchor: 'middle', size: 15 }), s.text(+x, i % 2 ? 106 : 24, String(n), { anchor: 'middle', size: 13, c: 'sub' })]),
    ]}
  />
);

export const InlineVSketch = () => (
  <Sketch
    w={560}
    h={190}
    caption="Fig: I-6 vs V-6 (top view) and V-6 front view"
    draw={(s) => [
      s.text(110, 18, 'I-6 (long)', { anchor: 'middle' }),
      s.rect(4, 30, 212, 44, { hachure: true, c: 'sub' }),
      ...[0, 1, 2, 3, 4, 5].map((i) => s.circle(22 + i * 35, 52, 28, { fill: 'soft' })),
      s.line(4, 84, 216, 84, { c: 'red', w: 1.2 }),
      s.text(110, 100, 'length L', { anchor: 'middle', size: 13, c: 'red' }),
      s.text(330, 18, 'V-6 (≈ L/2)', { anchor: 'middle' }),
      s.rect(262, 26, 136, 88, { hachure: true, c: 'sub' }),
      ...[0, 1, 2].flatMap((i) => [s.circle(286 + i * 38, 46, 28, { fill: 'soft' }), s.circle(304 + i * 38, 94, 28, { fill: 'soft' })]),
      s.text(480, 18, 'front view', { anchor: 'middle', size: 14 }),
      s.lines([[480, 160], [440, 70]], { w: 2 }),
      s.lines([[480, 160], [520, 70]], { w: 2 }),
      s.rect(424, 50, 30, 28, { c: 'sub' }),
      s.rect(508, 50, 30, 28, { c: 'sub' }),
      s.circle(480, 160, 22),
      s.arc(480, 160, 80, 80, deg(-114), deg(-66), { c: 'red' }),
      s.text(480, 128, '60°/90°', { anchor: 'middle', size: 12, c: 'red' }),
      s.text(480, 186, 'one crankshaft', { anchor: 'middle', size: 12, c: 'sub' }),
    ]}
  />
);

export const SuperTurboSketch = ({ which = 'both' as 'both' | 'turbo' | 'super' }) => (
  <Sketch
    w={which === 'both' ? 600 : 320}
    h={230}
    caption={which === 'turbo' ? 'Fig: turbocharger arrangement' : which === 'super' ? 'Fig: supercharger arrangement' : 'Fig: supercharging (left) and turbocharging (right)'}
    draw={(s) => {
      const sup = (ox: number) => [
        s.text(ox + 120, 16, 'Supercharger', { anchor: 'middle' }),
        s.arrow(ox + 2, 60, ox + 44, 60),
        s.text(ox + 2, 50, 'air', { size: 13 }),
        s.circle(ox + 70, 60, 50, { fill: 'soft' }),
        s.text(ox + 70, 65, 'C', { anchor: 'middle' }),
        s.rect(ox + 110, 44, 40, 32, { hachure: true, c: 'sub' }),
        ...lab(s, ox + 130, 44, ox + 150, 28, 'intercooler', 'start', 12),
        s.arrow(ox + 150, 60, ox + 190, 60),
        s.lines([[ox + 190, 60], [ox + 190, 96]]),
        s.rect(ox + 150, 96, 120, 78, { fill: 'soft' }),
        s.text(ox + 210, 140, 'Engine', { anchor: 'middle' }),
        s.circle(ox + 210, 202, 30),
        s.text(ox + 246, 214, 'crank pulley', { size: 12, c: 'sub' }),
        s.line(ox + 52, 74, ox + 196, 196, { c: 'sub', dash: true }),
        s.line(ox + 88, 78, ox + 224, 192, { c: 'sub', dash: true }),
        ...lab(s, ox + 120, 130, ox + 40, 150, 'belt / gear drive', 'end', 12),
        s.arrow(ox + 270, 110, ox + 300, 110, { c: 'red' }),
        s.text(ox + 272, 100, 'exh.', { size: 12, c: 'red' }),
      ];
      const tur = (ox: number) => [
        s.text(ox + 150, 16, 'Turbocharger', { anchor: 'middle' }),
        s.arrow(ox + 2, 60, ox + 34, 60),
        s.text(ox + 2, 50, 'air', { size: 13 }),
        s.circle(ox + 60, 60, 50, { fill: 'soft' }),
        s.text(ox + 60, 65, 'C', { anchor: 'middle' }),
        s.circle(ox + 250, 60, 50, { fill: 'soft', c: 'red' }),
        s.text(ox + 250, 65, 'T', { anchor: 'middle', c: 'red' }),
        s.line(ox + 85, 60, ox + 225, 60, { w: 3 }),
        s.text(ox + 155, 52, 'common shaft', { anchor: 'middle', size: 12, c: 'sub' }),
        s.lines([[ox + 60, 85], [ox + 60, 120], [ox + 110, 120]]),
        s.rect(ox + 84, 100, 30, 22, { hachure: true, c: 'sub' }),
        s.rect(ox + 110, 96, 120, 78, { fill: 'soft' }),
        s.text(ox + 170, 140, 'Engine', { anchor: 'middle' }),
        s.lines([[ox + 230, 120], [ox + 250, 120], [ox + 250, 86]], { c: 'red' }),
        s.arrow(ox + 250, 102, ox + 250, 88, { c: 'red' }),
        s.arrow(ox + 275, 60, ox + 312, 60, { c: 'red' }),
        s.text(ox + 280, 48, 'exhaust', { size: 12, c: 'red' }),
        s.lines([[ox + 236, 150], [ox + 290, 150], [ox + 290, 70]], { c: 'red', dash: true }),
        ...lab(s, ox + 290, 130, ox + 300, 190, 'wastegate', 'middle', 12),
      ];
      if (which === 'super') return sup(10);
      if (which === 'turbo') return tur(0);
      return [...sup(0), ...tur(290)];
    }}
  />
);

export const DiIdiSketch = () => (
  <Sketch
    w={540}
    h={230}
    caption="Fig: DI (open chamber, bowl-in-piston) and IDI (swirl pre-chamber)"
    draw={(s) => [
      s.text(110, 16, 'DI', { anchor: 'middle', size: 17 }),
      s.rect(10, 40, 200, 18, { hachure: true, c: 'sub' }),
      s.lines([[20, 58], [20, 210]], { w: 2.2 }),
      s.lines([[200, 58], [200, 210]], { w: 2.2 }),
      s.path('M24 130 H64 Q110 186 156 130 H196 V200 H24 Z', { hachure: true, c: 'sub' }),
      ...lab(s, 110, 170, 150, 222, 'bowl in piston', 'start', 12),
      s.rect(102, 22, 16, 36, { fill: 'ink' }),
      ...lab(s, 118, 30, 150, 30, 'multi-hole nozzle', 'start', 12),
      s.line(110, 60, 70, 126, { c: 'red', dash: true }),
      s.line(110, 60, 150, 126, { c: 'red', dash: true }),
      s.line(110, 60, 90, 132, { c: 'red', dash: true }),
      s.line(110, 60, 130, 132, { c: 'red', dash: true }),
      s.text(110, 102, 'spray', { anchor: 'middle', size: 12, c: 'red' }),
      s.text(390, 16, 'IDI', { anchor: 'middle', size: 17 }),
      s.rect(290, 60, 200, 18, { hachure: true, c: 'sub' }),
      s.lines([[300, 78], [300, 210]], { w: 2.2 }),
      s.lines([[480, 78], [480, 210]], { w: 2.2 }),
      s.rect(304, 150, 172, 50, { hachure: true, c: 'sub' }),
      s.circle(440, 40, 54, { fill: 'soft' }),
      s.line(426, 62, 414, 80, { w: 2.5 }),
      s.line(418, 62, 408, 78, { w: 2.5 }),
      ...lab(s, 412, 72, 340, 100, 'throat', 'end', 12),
      s.arc(440, 40, 34, 34, deg(-60), deg(220), { c: 'red' }),
      s.rect(462, 4, 12, 24, { fill: 'ink' }),
      ...lab(s, 474, 10, 500, 10, 'injector', 'start', 12),
      s.line(408, 18, 424, 30, { w: 2.5, c: 'red' }),
      ...lab(s, 410, 20, 360, 24, 'glow plug', 'end', 12),
      s.text(440, 112, 'pre-chamber', { anchor: 'middle', size: 12, c: 'sub' }),
      s.arrow(408, 84, 370, 130, { c: 'red' }),
    ]}
  />
);

export const CoolingSketch = () => (
  <Sketch
    w={580}
    h={210}
    caption="Fig: air cooling (fins) and liquid cooling circuit"
    draw={(s) => [
      s.text(80, 16, 'Air-cooled', { anchor: 'middle' }),
      s.rect(46, 30, 68, 160, { hachure: true, c: 'sub' }),
      ...Array.from({ length: 8 }, (_, i) => [s.line(18, 40 + i * 19, 46, 40 + i * 19, { w: 2.2 }), s.line(114, 40 + i * 19, 142, 40 + i * 19, { w: 2.2 })]).flat(),
      ...lab(s, 142, 59, 168, 70, 'fins', 'start', 13),
      s.arrow(160, 120, 200, 120, { c: 'red' }),
      s.text(162, 140, 'heat → air', { size: 12, c: 'red' }),
      s.text(400, 16, 'Liquid-cooled', { anchor: 'middle' }),
      s.rect(250, 40, 110, 140, { c: 'sub' }),
      s.rect(266, 56, 78, 108, { hachure: true, c: 'sub' }),
      ...lab(s, 256, 120, 230, 196, 'water jacket', 'middle', 12),
      s.lines([[360, 60], [430, 60]], { c: 'red' }),
      s.circle(400, 60, 22),
      ...lab(s, 400, 48, 400, 30, 'thermostat', 'middle', 12),
      s.rect(440, 40, 110, 140, { c: 'sub' }),
      ...Array.from({ length: 6 }, (_, i) => s.line(448, 58 + i * 20, 542, 58 + i * 20, { c: 'sub', w: 1 })),
      s.text(495, 196, 'radiator + fan', { anchor: 'middle', size: 12 }),
      s.arrow(430, 60, 440, 60, { c: 'red' }),
      s.lines([[440, 168], [360, 168]]),
      s.circle(400, 168, 24, { fill: 'soft' }),
      s.text(400, 173, 'P', { anchor: 'middle', size: 13 }),
      s.text(400, 200, 'pump', { anchor: 'middle', size: 12 }),
    ]}
  />
);

export const PoppetSketch = () => (
  <Sketch
    w={460}
    h={350}
    maxW={440}
    caption="Fig: poppet valve with push-rod & rocker (OHV)"
    draw={(s) => [
      s.line(70, 44, 270, 74, { w: 4 }),
      s.circle(170, 59, 16, { fill: 'soft' }),
      ...lab(s, 170, 52, 150, 22, 'rocker arm & pivot', 'middle', 13),
      s.line(76, 48, 76, 254, { w: 3 }),
      ...lab(s, 76, 150, 30, 150, 'push rod', 'end', 13),
      s.rect(62, 254, 28, 26, { hachure: true, c: 'sub' }),
      ...lab(s, 90, 266, 112, 266, 'tappet / follower', 'start', 12),
      s.circle(76, 312, 48),
      s.path('M58 292 Q76 266 94 292', { w: 2 }),
      ...lab(s, 100, 320, 120, 330, 'cam (lobe + base circle)', 'start', 12),
      s.line(266, 78, 266, 300, { w: 3.5 }),
      s.line(258, 76, 272, 76, { c: 'red', w: 1.2 }),
      ...lab(s, 274, 80, 300, 70, 'tappet clearance', 'start', 12),
      s.rect(250, 96, 32, 7, { fill: 'ink' }),
      ...lab(s, 282, 100, 304, 100, 'spring washer + keepers', 'start', 12),
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => s.ellipse(266, 112 + i * 13, 56, 10)),
      ...[0, 1, 2, 3, 4, 5].map((i) => s.ellipse(266, 118 + i * 13, 32, 7, { c: 'sub' })),
      ...lab(s, 294, 140, 320, 140, 'outer & inner springs', 'start', 12),
      s.rect(254, 204, 24, 56, { hachure: true, c: 'sub' }),
      ...lab(s, 278, 230, 304, 230, 'valve guide', 'start', 12),
      s.poly([[222, 310], [310, 310], [280, 292], [252, 292]], { fill: 'soft' }),
      ...lab(s, 300, 306, 330, 318, 'valve head (45° face)', 'start', 12),
      s.rect(196, 296, 26, 12, { hachure: true, c: 'sub' }),
      s.rect(310, 296, 26, 12, { hachure: true, c: 'sub' }),
      ...lab(s, 206, 302, 170, 290, 'seat insert', 'end', 12),
      s.lines([[150, 308], [196, 308]], { w: 2.5 }),
      s.lines([[336, 308], [380, 308]], { w: 2.5 }),
      s.text(266, 340, 'stem', { anchor: 'middle', size: 12, c: 'sub' }),
    ]}
  />
);

export const ValveTimingSketch = () => (
  <Sketch
    w={340}
    h={310}
    maxW={330}
    caption="Fig: valve timing diagram (4-stroke SI)"
    draw={(s) => {
      const cx = 170, cy = 155;
      const P = (phi: number, R: number) => [cx + R * Math.sin(deg(phi)), cy - R * Math.cos(deg(phi))] as [number, number];
      return [
        s.arc(cx, cy, 210, 210, deg(-15 - 90), deg(225 - 90), { c: 'pen', w: 2.6 }),
        s.arc(cx, cy, 160, 160, deg(135 - 90), deg(375 - 90), { c: 'red', w: 2.6 }),
        s.arc(cx, cy, 120, 120, deg(-15 - 90), deg(15 - 90), { c: 'green', w: 5 }),
        s.line(cx, 24, cx, 286, { c: 'sub', dash: true }),
        s.text(cx, 16, 'TDC', { anchor: 'middle', c: 'ink' }),
        s.text(cx, 304, 'BDC', { anchor: 'middle', c: 'ink' }),
        s.line(...P(-15, 96), ...P(-15, 114)),
        s.text(...P(-26, 132), 'IVO', { anchor: 'middle', size: 15 }),
        s.text(...P(-26, 116), '10–25°', { anchor: 'middle', size: 12 }),
        s.line(...P(225, 96), ...P(225, 114)),
        s.text(...P(226, 134), 'IVC 40–60°', { anchor: 'middle', size: 14 }),
        s.line(...P(135, 72), ...P(135, 88), { c: 'red' }),
        s.text(...P(132, 54), 'EVO 40–60°', { anchor: 'middle', size: 14, c: 'red' }),
        s.line(...P(15, 72), ...P(15, 88), { c: 'red' }),
        s.text(...P(30, 58), 'EVC 10–20°', { anchor: 'middle', size: 13, c: 'red' }),
        s.text(...P(270, 66), 'suction', { anchor: 'middle', size: 14 }),
        s.text(...P(90, 40), 'exhaust', { anchor: 'middle', size: 14, c: 'red' }),
        s.text(cx, 58, 'overlap', { anchor: 'middle', size: 12, c: 'green' }),
        s.circle(cx, cy, 10, { fill: 'ink' }),
        s.arrow(...P(200, 30), ...P(240, 30), { c: 'sub' }),
        s.text(cx + 44, cy + 6, 'rotation', { size: 11, c: 'sub' }),
      ];
    }}
  />
);

export const MbtSketch = () => (
  <Sketch
    w={520}
    h={200}
    caption="Fig: torque vs spark advance (left), p–θ for three timings (right)"
    draw={(s) => [
      s.arrow(30, 170, 240, 170, { c: 'ink' }),
      s.arrow(30, 170, 30, 16, { c: 'ink' }),
      s.text(240, 190, 'spark advance', { anchor: 'end', size: 13, c: 'ink' }),
      s.text(36, 24, 'brake torque', { size: 13, c: 'ink' }),
      s.curve([[46, 150], [90, 80], [140, 46], [180, 62], [230, 140]]),
      s.line(140, 46, 140, 170, { dash: true, c: 'red' }),
      s.text(146, 40, 'MBT', { size: 16, c: 'red' }),
      s.text(48, 138, 'retarded', { size: 12, c: 'sub' }),
      s.text(196, 112, 'advanced', { size: 12, c: 'sub' }),
      s.arrow(290, 170, 510, 170, { c: 'ink' }),
      s.arrow(290, 170, 290, 16, { c: 'ink' }),
      s.line(380, 30, 380, 170, { c: 'sub', dash: true }),
      s.text(380, 188, 'TDC', { anchor: 'middle', size: 12, c: 'ink' }),
      s.curve([[300, 160], [350, 120], [372, 40], [400, 60], [500, 160]], { c: 'red' }),
      s.curve([[300, 160], [356, 130], [392, 54], [420, 80], [500, 162]]),
      s.curve([[300, 160], [360, 140], [410, 96], [440, 104], [500, 164]], { c: 'sub' }),
      s.text(336, 44, 'early', { size: 12, c: 'red' }),
      s.text(404, 46, 'MBT', { size: 12 }),
      s.text(446, 96, 'late', { size: 12, c: 'sub' }),
    ]}
  />
);

export const PfiSketch = () => (
  <Sketch
    w={560}
    h={230}
    caption="Fig: port fuel injection system"
    draw={(s) => [
      s.rect(10, 170, 90, 44, { hachure: true, c: 'sub' }),
      s.text(55, 190, 'tank +', { anchor: 'middle', size: 13 }),
      s.text(55, 206, 'pump', { anchor: 'middle', size: 13 }),
      s.arrow(100, 192, 130, 192),
      s.rect(130, 178, 56, 28),
      s.text(158, 197, 'filter', { anchor: 'middle', size: 13 }),
      s.arrow(186, 192, 220, 130),
      s.rect(220, 112, 220, 20, { fill: 'soft' }),
      s.text(330, 106, 'fuel rail', { anchor: 'middle', size: 14 }),
      ...[0, 1, 2, 3].map((i) => s.line(246 + i * 56, 132, 246 + i * 56, 160, { w: 3.2 })),
      s.text(456, 160, 'injectors', { size: 13 }),
      s.rect(440, 114, 34, 16, { c: 'sub' }),
      ...lab(s, 474, 122, 500, 108, 'pressure reg.', 'start', 12),
      s.arrow(458, 130, 458, 216, { c: 'sub' }),
      s.lines([[458, 216], [100, 216]], { c: 'sub', dash: true }),
      s.text(300, 230, 'return line', { anchor: 'middle', size: 12, c: 'sub' }),
      s.rect(270, 10, 120, 42, { fill: 'soft' }),
      s.text(330, 37, 'ECU', { anchor: 'middle', size: 16 }),
      s.arrow(330, 52, 330, 110, { c: 'red' }),
      s.text(338, 84, 'pulse width', { size: 12, c: 'red' }),
      s.text(14, 18, 'sensors:', { size: 13 }),
      s.text(14, 36, 'MAF / MAP, TPS, rpm,', { size: 12, c: 'sub' }),
      s.text(14, 52, 'coolant T, O₂ sensor', { size: 12, c: 'sub' }),
      s.arrow(176, 32, 268, 32, { c: 'sub' }),
    ]}
  />
);

export const TbiSketch = () => (
  <Sketch
    w={340}
    h={240}
    maxW={320}
    caption="Fig: throttle-body (single-point) injection"
    draw={(s) => [
      s.arrow(170, 0, 170, 30),
      s.text(178, 14, 'air (from filter)', { size: 12 }),
      s.lines([[120, 30], [120, 160], [40, 220]], { w: 2.2 }),
      s.lines([[220, 30], [220, 160], [300, 220]], { w: 2.2 }),
      s.rect(154, 44, 32, 30, { fill: 'ink' }),
      ...lab(s, 186, 56, 240, 50, 'injector (ECU)', 'start', 12),
      s.line(170, 76, 150, 112, { c: 'red', dash: true }),
      s.line(170, 76, 190, 112, { c: 'red', dash: true }),
      s.line(170, 76, 170, 116, { c: 'red', dash: true }),
      s.line(130, 132, 210, 116, { w: 3.5 }),
      s.circle(170, 124, 10),
      ...lab(s, 210, 120, 240, 130, 'throttle plate', 'start', 12),
      s.text(170, 236, 'to intake manifold → all cylinders', { anchor: 'middle', size: 12, c: 'sub' }),
    ]}
  />
);

export const InjectorsCompareSketch = () => (
  <Sketch
    w={520}
    h={200}
    caption="Fig: SI port injection (left) vs CI direct injection (right)"
    draw={(s) => [
      s.lines([[10, 70], [120, 70], [160, 40]]),
      s.lines([[10, 110], [130, 110], [170, 80]]),
      s.rect(170, 40, 90, 140, { c: 'sub' }),
      s.rect(176, 130, 78, 44, { hachure: true, c: 'sub' }),
      s.rect(80, 30, 12, 30, { fill: 'ink' }),
      s.line(86, 62, 132, 86, { c: 'red', dash: true }),
      s.text(20, 24, 'injector in port', { size: 12 }),
      s.text(20, 140, '≈ 3–5 bar, during intake', { size: 12, c: 'sub' }),
      s.circle(215, 46, 10, { c: 'red' }),
      s.text(232, 30, 'spark', { size: 12, c: 'red' }),
      s.rect(340, 40, 120, 140, { c: 'sub' }),
      s.path('M346 132 H372 Q400 160 428 132 H454 V174 H346 Z', { hachure: true, c: 'sub' }),
      s.rect(394, 14, 12, 30, { fill: 'ink' }),
      s.line(400, 46, 370, 120, { c: 'red', dash: true }),
      s.line(400, 46, 430, 120, { c: 'red', dash: true }),
      s.text(400, 196, 'very high pressure, near TDC', { anchor: 'middle', size: 12, c: 'sub' }),
    ]}
  />
);

export const TwoStrokeSketch = () => (
  <Sketch
    w={420}
    h={330}
    maxW={400}
    caption="Fig: crankcase-scavenged two-stroke SI engine"
    draw={(s) => [
      s.lines([[130, 30], [130, 186], [90, 214], [90, 296], [310, 296], [310, 214], [270, 186], [270, 30]], { w: 2.4 }),
      s.line(118, 30, 282, 30, { w: 3 }),
      s.rect(193, 10, 14, 20, { fill: 'ink' }),
      ...lab(s, 207, 18, 240, 12, 'spark plug', 'start', 12),
      s.rect(138, 104, 124, 58, { hachure: true, c: 'sub' }),
      s.path('M138 104 Q170 84 200 104', { w: 2 }),
      ...lab(s, 150, 96, 60, 70, 'deflector piston', 'end', 12),
      s.line(200, 162, 222, 252, { w: 3.5 }),
      s.circle(200, 252, 60),
      s.circle(222, 252, 10, { fill: 'ink' }),
      s.rect(270, 92, 36, 34, { c: 'sub' }),
      ...lab(s, 306, 104, 330, 94, 'exhaust port', 'start', 12),
      s.lines([[130, 120], [104, 120], [104, 210]], { w: 2 }),
      s.lines([[130, 148], [116, 148], [116, 210]], { w: 2 }),
      ...lab(s, 108, 150, 40, 168, 'transfer port', 'end', 12),
      s.rect(56, 250, 34, 26, { c: 'sub' }),
      ...lab(s, 60, 262, 30, 300, 'inlet (reed valve)', 'start', 12),
      s.text(200, 320, 'sealed crankcase', { anchor: 'middle', size: 12, c: 'sub' }),
      s.arrow(110, 196, 160, 70, { c: 'red' }),
      s.arrow(232, 70, 296, 108, { c: 'sub' }),
      s.arrow(24, 262, 56, 262, { c: 'red' }),
    ]}
  />
);

export const FourStrokeStripSketch = () => (
  <Sketch
    w={560}
    h={160}
    caption="Fig: four strokes = two crank revolutions per power stroke"
    draw={(s) =>
      ['Intake', 'Compression', 'Power', 'Exhaust'].flatMap((n, i) => {
        const x = 20 + i * 138, down = i % 2 === 0;
        const py = down ? 96 : 40;
        return [
          s.lines([[x, 20], [x, 130]], { w: 2 }),
          s.lines([[x + 90, 20], [x + 90, 130]], { w: 2 }),
          s.line(x - 6, 20, x + 96, 20, { w: 2.4 }),
          s.rect(x + 4, py, 82, 28, { hachure: true, c: 'sub' }),
          s.line(x + 22, 20, x + 22, i === 0 ? 34 : 24, { w: 2.4, c: i === 0 ? 'red' : 'pen' }),
          s.line(x + 68, 20, x + 68, i === 3 ? 34 : 24, { w: 2.4, c: i === 3 ? 'red' : 'pen' }),
          s.arrow(x + 45, down ? py - 26 : py + 54, x + 45, down ? py - 4 : py + 32, { c: 'red' }),
          s.text(x + 45, 152, n, { anchor: 'middle', size: 14 }),
          ...(i === 2 ? [s.text(x + 45, 16, '✶', { anchor: 'middle', c: 'red', size: 16 })] : []),
        ];
      })
    }
  />
);

export const PVcSketch = () => (
  <Sketch
    w={460}
    h={250}
    caption="Fig: two-stroke CI — p and V/Vc vs crank angle"
    draw={(s) => {
      const Vr = (th: number) => 1 + 7.5 * (1 - Math.cos(deg(th)));
      const X = (t: number) => 50 + t * (380 / 360);
      const pk = 70;
      const p = (t: number) => {
        if (t <= 12) return 35.6 + (pk - 35.6) * Math.sin((t / 12) * (Math.PI / 2));
        if (t <= 100) return pk * Math.pow(Vr(12) / Vr(t), 1.3);
        if (t <= 130) {
          const e = pk * Math.pow(Vr(12) / Vr(100), 1.3);
          return e - (e - 1.5) * ((t - 100) / 30);
        }
        if (t <= 250) return 1.5;
        return 1.5 * Math.pow(Vr(250) / Vr(t), 1.35);
      };
      const Yp = (v: number) => 210 - v * 2.5;
      const Yv = (v: number) => 210 - (v / 16) * 160;
      const ts = Array.from({ length: 73 }, (_, i) => i * 5);
      return [
        s.arrow(50, 210, 445, 210, { c: 'ink' }),
        s.arrow(50, 210, 50, 14, { c: 'ink' }),
        s.lines(ts.map((t) => [X(t), Yp(p(t))] as [number, number]), { rough: 0.5, w: 2 }),
        s.lines(ts.filter((t) => t < 90).map((t) => [X(t), Yp(35.6 * Math.pow(1 / Vr(t), 1.35))] as [number, number]), { rough: 0.4, dash: true, c: 'sub' }),
        s.lines(ts.map((t) => [X(t), Yv(Vr(t))] as [number, number]), { rough: 0.5, w: 2, c: 'red' }),
        s.text(X(16), Yp(pk) - 4, 'p', { size: 17 }),
        s.text(X(180), Yv(16) - 8, 'V/Vc', { anchor: 'middle', size: 16, c: 'red' }),
        s.text(X(40), Yp(30), 'motored', { size: 11, c: 'sub' }),
        ...[
          ['EPO', 100],
          ['IPO', 115],
          ['IPC', 245],
          ['EPC', 260],
        ].flatMap(([n, t], k) => [s.line(X(+t), 200, X(+t), k % 2 ? 136 : 152, { c: 'sub' }), s.text(X(+t), k % 2 ? 130 : 146, String(n), { anchor: 'middle', size: 12, c: 'sub' })]),
        ...[
          ['TC', 0],
          ['90°', 90],
          ['BC', 180],
          ['270°', 270],
          ['TC', 360],
        ].map(([n, t]) => s.text(X(+t), 230, String(n), { anchor: 'middle', size: 13, c: 'ink' })),
      ];
    }}
  />
);

export const UniflowSketch = () => (
  <Sketch
    w={420}
    h={330}
    maxW={380}
    caption="Fig: uniflow scavenging (two-stroke CI)"
    draw={(s) => [
      s.lines([[120, 40], [120, 290]], { w: 2.4 }),
      s.lines([[260, 40], [260, 290]], { w: 2.4 }),
      s.rect(100, 26, 180, 14, { hachure: true, c: 'sub' }),
      s.poly([[160, 40], [220, 40], [206, 54], [174, 54]], { fill: 'soft' }),
      s.line(190, 0, 190, 40, { w: 3 }),
      ...lab(s, 196, 12, 230, 8, 'exhaust valve(s) in head', 'start', 12),
      s.rect(132, 10, 10, 18, { fill: 'ink' }),
      ...lab(s, 132, 18, 70, 14, 'injector', 'end', 12),
      ...[0, 1, 2].flatMap((i) => [s.rect(100, 230 + i * 16, 20, 9, { c: 'sub' }), s.rect(260, 230 + i * 16, 20, 9, { c: 'sub' })]),
      s.rect(70, 220, 30, 70, { hachure: true, c: 'sub' }),
      s.rect(280, 220, 30, 70, { hachure: true, c: 'sub' }),
      ...lab(s, 300, 250, 330, 250, 'scavenge air box', 'start', 12),
      ...lab(s, 270, 238, 330, 226, 'ports (all round)', 'start', 12),
      s.rect(124, 280, 132, 34, { hachure: true, c: 'sub' }),
      s.text(190, 326, 'piston near BDC', { anchor: 'middle', size: 12, c: 'sub' }),
      s.arrow(36, 250, 96, 250),
      s.text(10, 240, 'air from blower/turbo', { size: 12 }),
      ...[0, 1, 2].map((i) => s.arrow(150 + i * 40, 226, 150 + i * 40, 70, { c: 'red' })),
      s.text(190, 160, 'one-way flow ↑', { anchor: 'middle', size: 14, c: 'red' }),
      s.arrow(190, 36, 190, -6, { c: 'red' }),
    ]}
  />
);

export const ScavVolSketch = () => (
  <Sketch
    w={300}
    h={220}
    maxW={280}
    caption="Fig: cylinder volumes"
    draw={(s) => [
      s.lines([[80, 20], [80, 200]], { w: 2.2 }),
      s.lines([[200, 20], [200, 200]], { w: 2.2 }),
      s.line(70, 20, 210, 20, { w: 2.6 }),
      s.line(80, 50, 200, 50, { c: 'sub', dash: true }),
      s.text(140, 40, 'Vc', { anchor: 'middle', size: 15 }),
      s.rect(84, 170, 112, 28, { hachure: true, c: 'sub' }),
      s.text(140, 116, 'Vd = (π/4)B²S', { anchor: 'middle', size: 15 }),
      s.arrow(226, 50, 226, 168, { c: 'red' }),
      s.arrow(226, 168, 226, 50, { c: 'red' }),
      s.text(232, 114, 'S', { size: 15, c: 'red' }),
      s.arrow(84, 212, 196, 212, { c: 'red' }),
      s.text(140, 210, 'B', { anchor: 'middle', size: 13, c: 'red' }),
      s.text(16, 110, 'V₁ = Vd + Vc', { size: 13, c: 'sub' }),
    ]}
  />
);

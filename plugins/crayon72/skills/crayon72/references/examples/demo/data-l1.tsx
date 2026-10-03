import type { QPage } from './types';
import { Recall, Step, Basics, Tip, H } from '@/components/content';
import { MB } from '@/lib/tex';
import { LeverSketch } from '@/figs/drawings-l1';
import { GearPairAnim } from '@/figs/anim/l1';

/* ============================================================
   DEMO LECTURE (made-up questions) — the gold standard to copy.
   Teacher "Demo Sir" · lecture 1 · no slides (so no SlideRef; real lectures add <SlideRef p={12} /> or p="b2:7").
   A real lecture exports <FP><N>_TOPICS and <FP><N>_PAGES; wire-lecture.py adds it to lectures.ts.
   ============================================================ */

export const L1_TOPICS = [
  { name: 'Gear trains', tint: 'sky' as const },
  { name: 'Levers', tint: 'mint' as const },
];

/* 1. A numerical: gear train ------------------------------------------------ */
const gearTrain: QPage = {
  id: 'l1-gear-train',
  lecture: 1,
  topic: 'Gear trains',
  title: 'Speed ratio of a two-stage gear train',
  kind: 'past',
  slides: [],
  videoTopics: [],
  links: [{ label: 'The lever page (same lecture) →', to: 'l1-lever' }],
  variants: [
    {
      year: '2023',
      ref: 'Q1(a) · Sec A',
      marks: 10,
      text: (
        <>
          A motor running at <b>1800 rpm</b> drives a two-stage spur gear train. Stage 1: driver 20 teeth, driven 60 teeth. Stage 2: driver 15 teeth, driven 45 teeth.
          Find the overall gear ratio and the output speed.
        </>
      ),
    },
  ],
  solution: (
    <>
      <p>
        <b>Given:</b> N₁ = 1800 rpm; z₁ = 20, z₂ = 60; z₃ = 15, z₄ = 45.
      </p>
      <H>Stage ratios</H>
      <MB>{'i_1=\\frac{z_2}{z_1}=\\frac{60}{20}=3,\\qquad i_2=\\frac{z_4}{z_3}=\\frac{45}{15}=3'}</MB>
      <H>Overall ratio</H>
      <MB>{'i=i_1\\,i_2=3\\times3=9'}</MB>
      <H>Output speed</H>
      <MB>{'N_{out}=\\frac{N_1}{i}=\\frac{1800}{9}=\\boxed{200\\ \\text{rpm}}'}</MB>
      <p>The speed falls by 9 times and, ignoring losses, the torque rises 9 times.</p>
    </>
  ),
  description: (
    <>
      <Basics>
        Two meshing gears must have the same <b>tooth size</b>. The bigger gear has more teeth, so it turns <b>slower</b>. The gear ratio is simply{' '}
        <b>driven teeth ÷ driver teeth</b>.
      </Basics>
      <GearPairAnim />
      <Step n={1} title="Ratio of one pair">
        Divide driven by driver. 60 ÷ 20 = 3, so the second shaft turns three times slower.
      </Step>
      <Step n={2} title="Several stages multiply">
        Each stage divides the speed again, so the ratios multiply: 3 × 3 = 9.
      </Step>
      <Tip>Always write the formula first, then substitute — examiners give marks for the method even if the arithmetic slips.</Tip>
    </>
  ),
};

/* 2. A theory question with a hand-drawn figure ----------------------------- */
const lever: QPage = {
  id: 'l1-lever',
  lecture: 1,
  topic: 'Levers',
  title: 'Mechanical advantage of a lever',
  kind: 'past',
  slides: [],
  videoTopics: [],
  variants: [
    {
      year: '2022',
      ref: 'Q2(b) · Sec A',
      marks: 5,
      text: (
        <>
          Define the <b>mechanical advantage</b> of a lever and derive it with a neat sketch.
        </>
      ),
    },
  ],
  solution: (
    <>
      <p>
        Mechanical advantage is the ratio of the load lifted to the effort applied: <b>M.A. = W / E</b>.
      </p>
      <LeverSketch />
      <p>Taking moments about the fulcrum for equilibrium:</p>
      <MB>{'W\\,a=E\\,b\\;\\Rightarrow\\;\\text{M.A.}=\\frac{W}{E}=\\frac{b}{a}'}</MB>
      <p>A long effort arm (b &gt; a) gives M.A. &gt; 1: a small effort lifts a large load.</p>
    </>
  ),
  description: (
    <>
      <Recall to="l1-gear-train">A gear pair is a rotating lever: the ratio of the “arms” (radii) gives the speed and torque ratio.</Recall>
      <Basics>A lever turns about a fixed point (the fulcrum). A force far from the fulcrum has a bigger turning effect (moment = force × distance).</Basics>
      <Step n={1} title="Moments balance">
        At balance, clockwise and anticlockwise moments are equal: W·a = E·b.
      </Step>
      <Tip>Draw the figure first and mark a and b — the derivation then writes itself.</Tip>
    </>
  ),
};

export const L1_PAGES: QPage[] = [gearTrain, lever];

// Tiny Web-Audio sound kit — synthesized (no files), soft and natural, different per action.
// Requests made in the same instant are merged and only the highest-priority sound plays.

export type Snd = 'tap' | 'tick' | 'select' | 'on' | 'off' | 'toggle' | 'success' | 'open' | 'close' | 'page' | 'bump' | 'trash' | 'whoosh' | 'crown' | 'pusher' | 'snap' | 'none';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.6;
let noiseBuf: AudioBuffer | null = null;

export function configureSound(on: boolean, vol: number) {
  enabled = on;
  volume = vol;
  if (master) master.gain.value = volume * 0.9;
}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = volume * 0.9;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function env(g: GainNode, t: number, a: number, peak: number, dur: number) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(f0: number, f1: number, dur: number, peak = 0.2, type: OscillatorType = 'sine', delay = 0) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, 0.004, peak, dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, f0: number, f1: number, q = 1.2, peak = 0.2, kind: BiquadFilterType = 'bandpass', delay = 0) {
  const c = ac();
  if (!c || !master || !noiseBuf) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = kind;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = c.createGain();
  env(g, t, 0.003, peak, dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 0.3);
  s.stop(t + dur + 0.02);
}

const SOUNDS: Record<Exclude<Snd, 'none'>, () => void> = {
  // soft key-like click
  tap: () => {
    noise(0.03, 3800, 2200, 0.9, 0.16, 'bandpass');
    tone(1900, 1300, 0.025, 0.05, 'triangle');
  },
  tick: () => noise(0.018, 6000, 4500, 1.4, 0.13, 'bandpass'),
  select: () => {
    tone(880, 620, 0.06, 0.08, 'sine');
    noise(0.02, 4200, 3000, 1, 0.08);
  },
  on: () => {
    tone(660, 660, 0.05, 0.08, 'sine');
    tone(990, 990, 0.08, 0.08, 'sine', 0.05);
  },
  off: () => {
    tone(880, 880, 0.05, 0.07, 'sine');
    tone(560, 560, 0.08, 0.07, 'sine', 0.05);
  },
  toggle: () => {
    noise(0.015, 5200, 4200, 1.2, 0.12);
    noise(0.02, 2600, 2000, 1.2, 0.1, 'bandpass', 0.045);
  },
  // gentle two-note chime
  success: () => {
    tone(1046, 1046, 0.32, 0.09, 'sine');
    tone(1568, 1568, 0.42, 0.07, 'sine', 0.07);
  },
  open: () => noise(0.13, 500, 2400, 0.8, 0.09, 'bandpass'),
  close: () => noise(0.12, 2200, 500, 0.8, 0.08, 'bandpass'),
  // paper page flip
  page: () => {
    noise(0.09, 1800, 900, 0.7, 0.12, 'bandpass');
    noise(0.05, 5000, 3000, 0.7, 0.05, 'highpass', 0.03);
  },
  bump: () => tone(140, 70, 0.11, 0.18, 'sine'),
  trash: () => noise(0.22, 3000, 300, 0.6, 0.12, 'bandpass'),
  whoosh: () => noise(0.4, 300, 3000, 0.5, 0.12, 'bandpass'),
  // stopwatch crown: firm press + spring release
  crown: () => {
    noise(0.012, 3200, 2600, 2.5, 0.26, 'bandpass');
    tone(420, 260, 0.03, 0.08, 'triangle');
    noise(0.01, 5200, 4600, 3, 0.14, 'bandpass', 0.075);
  },
  // side pusher: lighter, higher click
  pusher: () => {
    noise(0.01, 4800, 4000, 3, 0.2, 'bandpass');
    noise(0.008, 6500, 6000, 3, 0.1, 'bandpass', 0.05);
  },
  // reset: snap + quick whirr of hands flying back
  snap: () => {
    noise(0.014, 4200, 3400, 2.5, 0.24, 'bandpass');
    noise(0.22, 2600, 900, 4, 0.05, 'bandpass', 0.02);
  },
};

/** Mechanical escapement tick (called directly, bypasses merge). `strong` on the full second. */
export function watchTick(strong = false) {
  if (!enabled) return;
  try {
    noise(0.006, strong ? 5200 : 6800, strong ? 4400 : 6000, 4, strong ? 0.07 : 0.035, 'bandpass');
    if (strong) tone(2400, 2100, 0.012, 0.012, 'sine');
  } catch {
    /* audio unavailable */
  }
}

let pending: { s: Snd; p: number } | null = null;
let timer = 0;
/** prio: 0 = generic tap, 1 = element's data-sound, 2 = app event */
export function play(s: Snd, prio = 2) {
  if (!enabled) return;
  if (s === 'none') {
    if (!timer) {
      pending = { s, p: prio };
      timer = window.setTimeout(() => {
        timer = 0;
        pending = null;
      }, 0);
    } else if (!pending || prio >= pending.p) pending = { s, p: prio };
    return;
  }
  if (!pending || prio >= pending.p) pending = { s, p: prio };
  if (timer) return;
  timer = window.setTimeout(() => {
    timer = 0;
    const q = pending;
    pending = null;
    if (q && q.s !== 'none') {
      try {
        SOUNDS[q.s]();
      } catch {
        /* audio unavailable */
      }
    }
  }, 0);
}

/** Global delegation: every button/link clicks softly; data-sound overrides. */
export function installClickSounds() {
  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null;
    if (!t?.closest) return;
    const tagged = t.closest('[data-sound]') as HTMLElement | null;
    if (tagged) return play(tagged.dataset.sound as Snd, 1);
    if (t.closest('button, a, [role=tab], [role=switch], [role=radio], summary, label')) play('tap', 0);
  };
  document.addEventListener('click', onClick, true);
  // unlock audio on first touch (iOS)
  const unlock = () => {
    ac();
    document.removeEventListener('pointerdown', unlock);
  };
  document.addEventListener('pointerdown', unlock);
  return () => document.removeEventListener('click', onClick, true);
}

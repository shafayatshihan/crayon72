import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useKV } from './store';
import { configureSound, installClickSounds } from './sound';

export interface Prefs {
  textScale: number;
  reduceMotion: boolean;
  cursor: boolean;
  showProb: boolean;
  sound: boolean;
  volume: number;
  /** ink / annotation tools shown in the deck */
  ink: boolean;
}
const DEF: Prefs = { textScale: 1, reduceMotion: false, cursor: true, showProb: true, sound: true, volume: 0.6, ink: false };
const C = createContext<{ prefs: Prefs; set: (p: Partial<Prefs>) => void }>({ prefs: DEF, set: () => {} });
export const usePrefs = () => useContext(C);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useKV<Prefs>('prefs', DEF);
  const prefs = { ...DEF, ...raw };
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--study-scale', String(prefs.textScale));
    r.classList.toggle('reduce-motion', prefs.reduceMotion);
  }, [prefs.textScale, prefs.reduceMotion]);
  useEffect(() => configureSound(prefs.sound, prefs.volume), [prefs.sound, prefs.volume]);
  useEffect(() => installClickSounds(), []);
  return (
    <C.Provider value={{ prefs, set: (p) => setRaw((o) => ({ ...DEF, ...o, ...p })) }}>
      <MotionConfig reducedMotion={prefs.reduceMotion ? 'always' : 'user'}>{children}</MotionConfig>
    </C.Provider>
  );
}

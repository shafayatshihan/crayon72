import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CloudMoon, Moon, Sun, SunMoon } from 'lucide-react';
import { prefGet, prefSet } from '@/lib/store';

export type Mode = 'light' | 'gray' | 'dark' | 'auto';
type Resolved = 'light' | 'gray' | 'dark';
interface Ctx {
  mode: Mode;
  theme: Resolved;
  setMode: (m: Mode) => void;
  toggle: () => void;
}
const C = createContext<Ctx>({ mode: 'auto', theme: 'light', setMode: () => {}, toggle: () => {} });
export const useTheme = () => useContext(C);

const sys = (): 'light' | 'dark' => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeS] = useState<Mode>(() => {
    const v = prefGet('theme', 'auto');
    return v === 'light' || v === 'dark' || v === 'gray' ? v : 'auto';
  });
  const [sysT, setSysT] = useState<'light' | 'dark'>(sys);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const f = () => setSysT(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  const theme: Resolved = mode === 'auto' ? sysT : mode;
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.dataset.theme = theme;
    prefSet('theme', mode);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#000000' : theme === 'gray' ? '#2a2a2d' : '#f5f5f7');
    const t = window.setTimeout(() => root.classList.remove('theme-switching'), 450);
    return () => window.clearTimeout(t);
  }, [theme, mode]);
  // print on white paper even in dark mode
  useEffect(() => {
    const before = () => (document.documentElement.dataset.theme = 'light');
    const after = () => (document.documentElement.dataset.theme = theme);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, [theme]);
  const setMode = (m: Mode) => setModeS(m);
  // T / toggle button cycles Light → Gray → Dark
  const toggle = () => setModeS(theme === 'light' ? 'gray' : theme === 'gray' ? 'dark' : 'light');
  return <C.Provider value={{ mode, theme, setMode, toggle }}>{children}</C.Provider>;
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, mode, toggle } = useTheme();
  const I = mode === 'auto' ? SunMoon : theme === 'dark' ? Moon : theme === 'gray' ? CloudMoon : Sun;
  return (
    <button type="button" onClick={toggle} data-sound="toggle" aria-label="Toggle appearance" title={`Appearance: ${mode === 'auto' ? 'Auto' : theme[0].toUpperCase() + theme.slice(1)} (T to cycle)`} data-cursor="link" className={'press h-9 w-9 grid place-items-center rounded-full hover:bg-[var(--hover-fill)] transition-colors text-ink ' + className}>
      <I size={17} />
    </button>
  );
}

/** Segmented Light / Dark / Auto picker */
export function ThemePicker() {
  const { mode, setMode } = useTheme();
  const opts: { m: Mode; I: typeof Sun; label: string }[] = [
    { m: 'light', I: Sun, label: 'Light' },
    { m: 'gray', I: CloudMoon, label: 'Gray' },
    { m: 'dark', I: Moon, label: 'Dark' },
    { m: 'auto', I: SunMoon, label: 'Auto' },
  ];
  return (
    <div className="relative grid grid-cols-4 rounded-[12px] bg-[var(--fill)] p-[3px]" role="radiogroup" aria-label="Appearance">
      {opts.map(({ m, I, label }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          data-cursor="link"
          onClick={() => setMode(m)}
          className={'relative z-10 h-9 rounded-[9px] text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors ' + (mode === m ? 'text-ink bg-[var(--surface-solid)] shadow-sm' : 'text-sub')}
        >
          <I size={15} /> {label}
        </button>
      ))}
    </div>
  );
}

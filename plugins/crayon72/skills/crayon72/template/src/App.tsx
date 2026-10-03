import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home } from './components/Home';
import { Lectures } from './components/Lectures';
import { Deck } from './components/Deck';
import { Cursor } from './components/Cursor';
import { ThemeProvider, useTheme } from './components/Theme';
import { AnnotationProvider } from './components/Annotate';
import { ToastProvider } from './components/Toast';
import { Spotlight } from './components/Spotlight';
import { Settings, Shortcuts } from './components/Settings';
import { LogoMark } from './components/Logo';
import { Stopwatch } from './components/Stopwatch';
import { ExportSheet, PrintBook } from './components/PrintBook';
import { lectureByKey } from './data/lectures';
import { TEACHERS } from './data/course';
import { useKV } from './lib/store';
import { PrefsProvider } from './lib/prefs';
import { AppCtx, emit, normCont, type View } from './lib/app';

function Splash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), 900);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="splash" className="fixed inset-0 z-[200] grid place-items-center bg-canvas" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: [0.4, 0, 0.6, 1] }}>
          <motion.div initial={{ scale: 0.6, opacity: 0, filter: 'blur(10px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} exit={{ scale: 1.25, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
            <LogoMark size={88} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Shell() {
  const [view, setView] = useState<View>({ v: 'hero' });
  const [rawCont] = useKV<{ key?: string; lecture?: number; page: string } | null>('continue', null);
  const cont = useMemo(() => normCont(rawCont), [rawCont]);
  const [spot, setSpot] = useState(false);
  const [settings, setSettings] = useState(false);
  const [keys, setKeys] = useState(false);
  const [exp, setExp] = useState<{ open: boolean; key?: string }>({ open: false });
  const [focus, setFocus] = useState(false);
  const { toggle } = useTheme();
  const prevView = useRef<View | null>(null);
  const curView = useRef<View>(view);
  if (curView.current !== view) {
    prevView.current = curView.current;
    curView.current = view;
  }

  useEffect(() => {
    const onPop = (e: PopStateEvent) => setView((e.state as View) ?? { v: 'hero' });
    window.addEventListener('popstate', onPop);
    try {
      history.replaceState({ v: 'hero' }, '');
    } catch {
      /* file:// may block */
    }
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const api = useMemo(
    () => ({
      view,
      nav: (n: View) => {
        if (n.v === 'deck') n = { ...n, t: Date.now() };
        try {
          history.pushState(n, '');
        } catch {
          /* ignore */
        }
        setFocus(false);
        setView(n);
        window.scrollTo({ top: 0 });
      },
      openSpotlight: () => setSpot(true),
      openSettings: () => setSettings(true),
      openShortcuts: () => setKeys(true),
      openExport: (key?: string) => setExp({ open: true, key }),
      focus,
      setFocus,
      cont,
    }),
    [view, focus, cont],
  );

  // global shortcuts
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = !!t.closest('input, textarea, select, [contenteditable]');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpot((s) => !s);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        setSpot(true);
      } else if (e.key === '?') setKeys(true);
      else if (e.key === 'W') emit('stopwatch-startstop');
      else if (e.key === 'w') emit('stopwatch');
      else if ((e.key === 't' || e.key === 'T') && !document.querySelector('[role=dialog][aria-modal=true]')) toggle();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [toggle]);

  const lec = view.v === 'deck' ? lectureByKey(view.key) : undefined;
  const key = view.v === 'deck' ? 'deck' + view.key : view.v;

  return (
    <AppCtx.Provider value={api}>
      <Cursor />
      <Splash />
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, scale: 0.985, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
          exit={{ opacity: 0, scale: 1.01, filter: 'blur(8px)' }}
          transition={{ duration: 0.38, ease: [0.25, 0.1, 0.3, 1] }}
        >
          {view.v === 'hero' && <Home />}
          {view.v === 'print' && <PrintBook scope={view.scope} />}
          {view.v === 'lectures' && <Lectures teacher={view.teacher ?? TEACHERS[0].id} />}
          {view.v === 'deck' && lec && <Deck lecture={lec} startId={view.page} nonce={view.t} onBack={() => {
            // go BACK (not forward) when we came from the lectures page, so Android back doesn't loop
            const prev = prevView.current;
            if (prev?.v === 'lectures' && (prev.teacher ?? TEACHERS[0].id) === lec.teacher) history.back();
            else api.nav({ v: 'lectures', teacher: lec.teacher });
          }} />}
        </motion.div>
      </AnimatePresence>
      <Spotlight open={spot} onClose={() => setSpot(false)} />
      <Settings open={settings} onClose={() => setSettings(false)} />
      <ExportSheet open={exp.open} preKey={exp.key} onClose={() => setExp({ open: false })} />
      <Shortcuts open={keys} onClose={() => setKeys(false)} />
      <Stopwatch />
    </AppCtx.Provider>
  );
}

export default function App() {
  return (
    <PrefsProvider>
      <ThemeProvider>
        <ToastProvider>
          <AnnotationProvider>
            <Shell />
          </AnnotationProvider>
        </ToastProvider>
      </ThemeProvider>
    </PrefsProvider>
  );
}

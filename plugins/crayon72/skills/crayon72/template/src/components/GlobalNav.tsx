import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Settings2, ChevronRight, Timer, FileDown } from 'lucide-react';
import { useApp, emit } from '@/lib/app';
import { TEACHERS, type TeacherId } from '@/data/course';
import { Logo } from './Logo';
import { ThemeToggle } from './Theme';
import { FullscreenButton } from './Fullscreen';

/** apple.com-style 44px global nav (material, 12px links), collapses to an animated menu on phones. */
export function GlobalNav({ active }: { active: 'home' | TeacherId }) {
  const app = useApp();
  const [menu, setMenu] = useState(false);
  const links = [
    { k: 'home', label: 'Home', run: () => app.nav({ v: 'hero' }) },
    ...TEACHERS.map((t) => ({ k: t.id as string, label: t.short, run: () => app.nav({ v: 'lectures', teacher: t.id }) })),
    { k: 'continue', label: 'Continue', run: () => (app.cont ? app.nav({ v: 'deck', key: app.cont.key, page: app.cont.page }) : app.nav({ v: 'lectures' })) },
  ];
  return (
    <>
      <header className="sticky top-0 z-50 material-regular hairline-b" data-chrome>
        <nav className="max-w-[1024px] mx-auto h-11 px-4 flex items-center justify-between gap-2">
          <button type="button" data-cursor="link" onClick={() => app.nav({ v: 'hero' })} className="press flex items-center" aria-label="Crayon 72 home">
            <Logo size={17} />
          </button>
          <div className="hidden md:flex items-center gap-8 text-[12px]">
            {links.map((l) => (
              <button
                key={l.k}
                type="button"
                data-cursor="link"
                onClick={l.run}
                className={'transition-colors duration-300 ' + (active === l.k ? 'text-ink' : 'text-ink/80 hover:text-ink')}
                style={{ opacity: active === l.k ? 1 : 0.8 }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <button type="button" aria-label="Export PDF" title="Export PDF — A4 print book, solutions only" data-cursor="link" onClick={() => app.openExport()} className="press h-8 w-8 sm:w-auto mr-0.5 inline-flex items-center justify-center gap-1.5 rounded-full sm:pl-2.5 sm:pr-3 text-[12.5px] font-medium bg-[var(--action)] text-white hover:brightness-110">
              <FileDown size={14} /> <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button type="button" aria-label="Search (⌘K)" title="Search (⌘K)" data-cursor="link" onClick={app.openSpotlight} className="press h-9 w-9 grid place-items-center rounded-full hover:bg-[var(--hover-fill)]">
              <Search size={16} />
            </button>
            <button type="button" aria-label="Stopwatch (W)" title="Stopwatch (W)" data-cursor="link" onClick={() => emit('stopwatch')} className="press h-9 w-9 grid place-items-center rounded-full hover:bg-[var(--hover-fill)]">
              <Timer size={16} />
            </button>
            <button type="button" aria-label="Settings" title="Settings" data-cursor="link" onClick={app.openSettings} className="press h-9 w-9 grid place-items-center rounded-full hover:bg-[var(--hover-fill)]">
              <Settings2 size={16} />
            </button>
            <FullscreenButton />
            <ThemeToggle />
            <button type="button" aria-label="Menu" aria-expanded={menu} data-cursor="link" onClick={() => setMenu((m) => !m)} className="md:hidden press h-9 w-9 grid place-items-center rounded-full">
              <span className="relative block w-[17px] h-[12px]">
                <motion.span className="absolute left-0 right-0 h-[1.5px] rounded bg-current" animate={menu ? { top: 5, rotate: 45 } : { top: 2, rotate: 0 }} transition={{ duration: 0.24, ease: [0.4, 0, 0.6, 1] }} />
                <motion.span className="absolute left-0 right-0 h-[1.5px] rounded bg-current" animate={menu ? { top: 5, rotate: -45 } : { top: 9, rotate: 0 }} transition={{ duration: 0.24, ease: [0.4, 0, 0.6, 1] }} />
              </span>
            </button>
          </div>
        </nav>
        <AnimatePresence>
          {menu && (
            <motion.div
              key="menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'calc(100dvh - 44px)', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.4, 0, 0.6, 1] }}
              className="md:hidden overflow-hidden"
              style={{ background: 'var(--nav-opened)' }}
            >
              <div className="px-10 pt-6 flex flex-col gap-1">
                {links.map((l, i) => (
                  <motion.button
                    key={l.k}
                    type="button"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.03, duration: 0.24 }}
                    onClick={() => {
                      setMenu(false);
                      l.run();
                    }}
                    className="text-left font-display text-[28px] font-semibold tracking-[-0.02em] py-1.5 flex items-center justify-between"
                  >
                    {l.label} <ChevronRight size={20} className="text-sub" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

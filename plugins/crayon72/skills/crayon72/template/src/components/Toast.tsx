import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface T {
  id: number;
  msg: string;
  icon?: ReactNode;
  action?: { label: string; run: () => void };
}
const C = createContext<(msg: string, opts?: { icon?: ReactNode; action?: T['action'] }) => void>(() => {});
export const useToast = () => useContext(C);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<T[]>([]);
  const n = useRef(0);
  const show = useCallback((msg: string, opts?: { icon?: ReactNode; action?: T['action'] }) => {
    const id = ++n.current;
    setList((l) => [...l.slice(-2), { id, msg, ...opts }]);
    window.setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <C.Provider value={show}>
      {children}
      <div className="fixed z-[90] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none" style={{ top: 'max(64px, env(safe-area-inset-top))' }} data-no-print>
        <AnimatePresence>
          {list.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -18, scale: 0.92, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, scale: 0.95, filter: 'blur(6px)' }}
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              className="pointer-events-auto glass-strong rounded-full pl-3 pr-2 h-11 flex items-center gap-2 text-[14px] font-medium shadow-lg"
            >
              <span className="text-[var(--p-ink-mint)]">{t.icon ?? <CheckCircle2 size={18} />}</span>
              <span className="pr-1">{t.msg}</span>
              {t.action && (
                <button
                  type="button"
                  data-cursor="link"
                  className="press h-8 px-3 rounded-full text-[13px] font-semibold text-action hover:bg-[var(--hover-fill)]"
                  onClick={() => {
                    t.action!.run();
                    setList((l) => l.filter((x) => x.id !== t.id));
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </C.Provider>
  );
}

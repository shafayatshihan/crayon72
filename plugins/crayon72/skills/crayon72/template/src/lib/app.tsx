import { createContext, useContext } from 'react';

import type { TeacherId } from '@/data/course';
import type { PrintScope } from '@/components/PrintBook';

export type View = { v: 'hero' } | { v: 'lectures'; teacher?: TeacherId } | { v: 'deck'; key: string; page?: string; t?: number } | { v: 'print'; scope: PrintScope };
/** Saved "continue where you left off" (old saves had `lecture: n` for Anup Sir's decks). */
export type Cont = { key: string; page: string };
export function normCont(c: { key?: string; lecture?: number; page: string } | null): Cont | null {
  if (!c) return null;
  if (c.key) return { key: c.key, page: c.page };
  if (typeof c.lecture === 'number') return { key: 'a' + c.lecture, page: c.page };
  return null;
}

export interface AppApi {
  view: View;
  nav: (v: View) => void;
  openSpotlight: () => void;
  openSettings: () => void;
  openShortcuts: () => void;
  /** Export PDF dialog (optionally pre-selecting a lecture key) */
  openExport: (key?: string) => void;
  focus: boolean;
  setFocus: (b: boolean) => void;
  cont: Cont | null;
}
export const AppCtx = createContext<AppApi>(null as unknown as AppApi);
export const useApp = () => useContext(AppCtx);

/** Tiny event bus for page-level shortcuts (S / D / P). */
export const bus = new EventTarget();
export const emit = (name: string) => bus.dispatchEvent(new Event(name));

// Tiny IndexedDB key-value store with an in-memory cache and localStorage fallback.
import { useEffect, useState, useSyncExternalStore } from 'react';

const DB = 'crayon72';
const OS = 'kv';
let dbp: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(OS);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
  return dbp;
}

const cache = new Map<string, unknown>();
const subs = new Map<string, Set<() => void>>();

function notify(key: string) {
  subs.get(key)?.forEach((f) => f());
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  if (cache.has(key)) return cache.get(key) as T;
  const db = await open();
  let v: T | undefined;
  if (db) {
    v = await new Promise<T | undefined>((res) => {
      const tx = db.transaction(OS, 'readonly').objectStore(OS).get(key);
      tx.onsuccess = () => res(tx.result as T);
      tx.onerror = () => res(undefined);
    });
  } else {
    try {
      const s = localStorage.getItem('c72:' + key);
      v = s ? JSON.parse(s) : undefined;
    } catch {
      v = undefined;
    }
  }
  if (!cache.has(key)) cache.set(key, v);
  return cache.get(key) as T;
}

const timers = new Map<string, number>();
const pendingW = new Map<string, unknown>();

async function persist(key: string, value: unknown) {
  pendingW.delete(key);
  const db = await open();
  if (db) {
    db.transaction(OS, 'readwrite').objectStore(OS).put(value, key);
  } else {
    try {
      localStorage.setItem('c72:' + key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }
}

export function kvSet<T>(key: string, value: T, debounce = 250) {
  cache.set(key, value);
  notify(key);
  window.clearTimeout(timers.get(key));
  pendingW.set(key, value);
  timers.set(key, window.setTimeout(() => void persist(key, value), debounce));
}

/** Write every pending value now (tab hidden / closing — mobile suspends timers). */
function flushAll() {
  for (const [k, v] of Array.from(pendingW)) {
    window.clearTimeout(timers.get(k));
    void persist(k, v);
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAll);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushAll());
}

/** All stored keys starting with prefix (IndexedDB + in-memory cache). */
export async function kvKeys(prefix: string): Promise<string[]> {
  const out = new Set<string>(Array.from(cache.keys()).filter((k) => k.startsWith(prefix)));
  const db = await open();
  if (db) {
    const keys = await new Promise<IDBValidKey[]>((res) => {
      const r = db.transaction(OS, 'readonly').objectStore(OS).getAllKeys();
      r.onsuccess = () => res(r.result);
      r.onerror = () => res([]);
    });
    keys.forEach((k) => typeof k === 'string' && k.startsWith(prefix) && out.add(k));
  }
  return Array.from(out);
}

/** React hook: persistent value. Returns [value, set, loaded]. */
export function useKV<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const subscribe = (cb: () => void) => {
    if (!subs.has(key)) subs.set(key, new Set());
    subs.get(key)!.add(cb);
    return () => subs.get(key)!.delete(cb);
  };
  const v = useSyncExternalStore(subscribe, () => cache.get(key) as T | undefined);
  const [loaded, setLoaded] = useState(cache.has(key));
  useEffect(() => {
    let alive = true;
    kvGet<T>(key).then(() => {
      if (alive) {
        setLoaded(true);
        notify(key);
      }
    });
    return () => {
      alive = false;
    };
  }, [key]);
  const set = (nv: T | ((p: T) => T)) => {
    const prev = (cache.get(key) as T | undefined) ?? initial;
    kvSet(key, typeof nv === 'function' ? (nv as (p: T) => T)(prev) : nv);
  };
  return [v ?? initial, set, loaded];
}

/** Small synchronous prefs (theme etc.) */
export function prefGet(k: string, d: string) {
  try {
    return localStorage.getItem('c72-' + k) ?? d;
  } catch {
    return d;
  }
}
export function prefSet(k: string, v: string) {
  try {
    localStorage.setItem('c72-' + k, v);
  } catch {
    /* ignore */
  }
}

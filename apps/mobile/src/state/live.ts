// State (02 §2): screens read SQLite through hooks that re-run when the database changes.
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useMemo, useSyncExternalStore } from 'react';

let version = 0;
const listeners = new Set<() => void>();
let queued = false;
addDatabaseChangeListener(() => {
  // One transaction fires many row events; coalesce them into one re-render.
  if (queued) return;
  queued = true;
  Promise.resolve().then(() => {
    queued = false;
    version++;
    for (const l of listeners) l();
  });
});

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useDbVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}

/** Runs a synchronous SQLite read and re-runs it whenever the database changes. */
export function useLive<T>(read: () => T, deps: readonly unknown[]): T {
  const v = useDbVersion();
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-read on every database change
  return useMemo(read, [v, ...deps]);
}

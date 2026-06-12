import type { Atom, getDefaultStore } from "jotai";

/**
 * Resolves to the first value of an atom that satisfies the predicate
 */
export function whenAtom<T>(
  store: ReturnType<typeof getDefaultStore>,
  atom: Atom<T>,
  pred: (value: T) => boolean,
): Promise<T> {
  const initial = store.get(atom);
  if (pred(initial)) return Promise.resolve(initial);
  return new Promise((resolve) => {
    const unsubscribe = store.sub(atom, () => {
      const value = store.get(atom);
      if (pred(value)) {
        unsubscribe();
        resolve(value);
      }
    });
  });
}

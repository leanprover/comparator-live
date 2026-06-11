import { atom } from "jotai";
import { atomWithStorage, unwrap } from "jotai/utils";

import { challengeAtom } from "./params.ts";

const CHALLENGE_HASH_MS_DEBOUNCE = 800;

/**
 * SHA-256 hashes the challenge (end-trimmed with a trailing newline
 * re-inserted).
 *
 * Uses promises and cancellation to debounce. The debounce is less about
 * avoiding useless hashes, and more about making the delay before showing a
 * challenge result look intentional instead of like an unpleasant flicker.
 */
export const challengeHashAtom = atom(async (get, { signal }) => {
  const challenge = get(challengeAtom);
  await new Promise((resolve) => setTimeout(resolve, CHALLENGE_HASH_MS_DEBOUNCE));
  signal.throwIfAborted();

  const encoder = new TextEncoder();
  const data = encoder.encode(challenge.trimEnd() + "\n");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b: number): string => b.toString(16).padStart(2, "0"))
    .join("");
});

const storeTrustedAtom = atomWithStorage<[string, string][]>("locallyTrusted", [], undefined, {
  getOnInit: true,
});

/** The set of challenges the user has chosen to trust */
export const locallyTrustedAtom = atom(
  (get) => {
    const stored = get(storeTrustedAtom);
    return Object.fromEntries(stored);
  },
  (get, set, trusted: { [hash: string]: string }) => {
    const keys = Object.keys(trusted);
    set(
      storeTrustedAtom,
      keys.map((key) => [key, trusted[key]!]),
    );
  },
);

type TrustRecognition =
  | { type: "built-in"; name: string; sources: string[] }
  | { type: "user"; name: string }
  | { type: "none" }
  | { type: "empty" };

/**
 * Do we recognize this challenge as one of our trusted challenges, or one of
 * the user's trusted challenges?
 */
export const recognitionAtom = atom<Promise<TrustRecognition>>(async (get) => {
  if (get(challengeAtom).trim() === "") {
    return { type: "empty" };
  }
  const challengeHash = await get(challengeHashAtom);
  const { builtInTrusted } = await import("./builtInTrusted.ts");
  const builtInTrust = builtInTrusted[challengeHash];
  if (builtInTrust) return { type: "built-in", ...builtInTrust };

  const locallyTrusted = get(locallyTrustedAtom)[challengeHash];
  if (locallyTrusted) return { type: "user", name: locallyTrusted };

  return { type: "none" };
});

/**
 * Same as `recognitionAtom`, but allows a synchronous check on an unready
 * promise (null means the promise is not ready).
 *
 * Implemented with [unwrap](https://jotai.org/docs/utilities/async#unwrap).
 */
export const recognitionStateAtom = unwrap(recognitionAtom, () => null);

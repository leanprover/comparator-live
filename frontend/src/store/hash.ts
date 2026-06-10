import { atom } from "jotai";
import { atomWithLocation } from "jotai-location";

import { fixedEncodeURIComponent } from "../utils/uri.ts";

/**
 * Manage the hash params in a custom way. This diverges slightly from the
 * behavior that jotai-location's `atomWithHash` in a couple of ways, for the
 * purpose of exactly matching the Live Lean app's behavior.
 */
export type HashArgs = { [key: string]: string | null };

/**
 * Format the arguments for displaying in the URL, i.e. join them
 * in the form `#project=Mathlib&url=...`
 */
function formatArgs(args: HashArgs): string {
  const out =
    "#" +
    Object.entries(args)
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].trim().length > 0,
      )
      .map(([key, val]) => `${key}=${fixedEncodeURIComponent(val)}`)
      .join("&");
  if (out === "#") {
    return "";
  }
  return out;
}

/**
 * Parse arguments from URL. These are of the form `#project=Mathlib&url=...`,
 * where the leading hash is optional.
 */
function parseArgs(hash: string): { [key: string]: string } {
  if (hash === "") return {};
  return Object.fromEntries(
    hash
      .replace("#", "")
      .split("&")
      .map<[string, string] | null>((s, i) => {
        const [key, value, ...rest] = s.split("=");
        if (!key || !value || rest.length > 0) {
          console.error(`Ignoring ill-formed URL arg ${i + 1}: ${s}`);
          return null;
        }
        return [key, decodeURIComponent(value)];
      })
      .filter((x): x is [string, string] => x !== null),
  );
}

/**
 * Jotai's mechanism for syncing with the URL. We'll interact with this
 * entirely through hashArgsAtom, so we don't export.
 *
 * `{ replace : true }` means keystroke don't create new browser history
 * elements, which is probably what we want: the Live Lean app started using
 * this option here:
 * https://github.com/leanprover-community/lean4web/pull/112/changes
 */
const locationAtom = atomWithLocation({ replace: true });

/**
 * Atom containing the key/value pairs in the hash. The functions in
 * ./params.ts will set this atom, other parts of the app should only read.
 */
export const hashArgsAtom = atom(
  (get) => {
    const hash = get(locationAtom).hash ?? "";
    return parseArgs(hash);
  },
  (get, set, val: HashArgs) => {
    const hash = formatArgs(val);
    const location = get(locationAtom);
    set(locationAtom, { ...location, hash });
  },
);

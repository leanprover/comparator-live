import { createListCollection } from "@chakra-ui/react";
import { produce } from "immer";
import { atom } from "jotai";
import LZString from "lz-string";

import { toLZCompressedString } from "../utils/compress.ts";
import { type HashArgs, hashArgsAtom } from "./hash.ts";

/**
 * LZString lies about its return type as of 1.5.0, it can definitely return
 * `null` (see, for example,
 * https://github.com/pieroxy/lz-string/blob/1.5.0/libs/lz-string.js#L475)
 */
function decompressFromBase64(input: string): string | null {
  return LZString.decompressFromBase64(input);
}

/**
 * Synchronizes code from the hash args: this code might be stored in
 * plain-text form, compressed form, or as a URL.
 *
 * The URL option is not currently supported: if you try to use it, the code
 * will literally appear to be the string "Import from a url like...not
 * currently supported", which is a bit of a strange move but is clear enough
 * and simplifies error handling quite a bit.
 */
function codeAtom(urlKey: string, plainTextKey: string, compressedKey: string) {
  return atom(
    (get) => {
      const hashArgs = get(hashArgsAtom);
      if (hashArgs[urlKey]) {
        return `Import from a url like ${hashArgs[urlKey]} not currently supported`;
      }
      if (hashArgs[plainTextKey]) {
        return hashArgs[plainTextKey];
      } else if (hashArgs[compressedKey]) {
        return decompressFromBase64(hashArgs[compressedKey]) ?? "";
      } else {
        return "";
      }
    },
    (get, set, code: string) => {
      const hashArgs = get(hashArgsAtom);
      const compressed = code.length === 0 ? null : toLZCompressedString(code);
      set(
        hashArgsAtom,
        produce(hashArgs, (draft: HashArgs) => {
          draft[urlKey] = null;
          draft[plainTextKey] = null;
          draft[compressedKey] = compressed;
        }),
      );
    },
  );
}

/**
 * Synchronize challenge code with the hash
 */
export const challengeAtom = codeAtom("challengeUrl", "challenge", "challengez");

/**
 * Synchronize solution code with the hash
 */
export const solutionAtom = codeAtom("url", "code", "codez");

/**
 * Chakra options for config
 */
export const leanConfigs = createListCollection({
  items: [
    { label: "Latest Release", value: "MathlibDemo" },
    { label: "Stable Release", value: "mathlib-stable" },
    { label: "Unsupported Project", value: "unknown" },
  ],
});

/**
 * Synchronize project key with the hash
 */
export const projectAtom = atom(
  (get) => {
    const hashArgs = get(hashArgsAtom);
    return hashArgs.project ?? "MathlibDemo";
  },
  (get, set, project: string) => {
    const hashArgs = get(hashArgsAtom);
    set(
      hashArgsAtom,
      produce(hashArgs, (draft: HashArgs) => {
        draft.project = project === "MathlibDemo" ? null : project;
      }),
    );
  },
);

/**
 * Using the projects actual key, as stored in `projectAtom`, pick the
 * appropriate selection from the menu: the "unknown" option is selected if
 * the project is not supported.
 */
export const projectSelectionAtom = atom((get) => {
  const project = get(projectAtom);
  return leanConfigs.has(project) ? project : "unknown";
});

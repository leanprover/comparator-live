import { createListCollection } from "@chakra-ui/react";
import { zProjectListResponse } from "@comparator/shared";
import { produce } from "immer";
import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
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

const projectListQueryAtom = atomWithQuery(() => {
  return {
    queryKey: ["project listing"],
    queryFn: async () => {
      const response = await fetch("/comparator/api/projects");
      const body = zProjectListResponse.parse(await response.json());
      if ("error" in body) {
        throw new Error(body.error);
      }
      return body;
    },
  };
});

/**
 * Returns null if the default project isn't
 */
export const defaultProjectAtom = atom((get) => {
  const { data } = get(projectListQueryAtom);
  return data?.[0]?.project ?? null;
});

/**
 * Synchronize project key with the hash
 */
export const projectAtom = atom(
  (get) => {
    const hashArgs = get(hashArgsAtom);
    return hashArgs.project ?? null;
  },
  (get, set, project: string) => {
    const hashArgs = get(hashArgsAtom);
    const { data } = get(projectListQueryAtom);
    set(
      hashArgsAtom,
      produce(hashArgs, (draft: HashArgs) => {
        if (!data) {
          draft.project = project;
        } else {
          // The default project doesn't get listed
          draft.project = project === data[0]!.project ? null : project;
        }
      }),
    );
  },
);

/**
 * Configuration options loaded from API
 */
export const leanConfigsAtom = atom((get) => {
  const { data } = get(projectListQueryAtom);
  if (!data) {
    return createListCollection({
      items: [{ label: "Loading projects...", value: "loading" }],
    });
  } else if (data.some(({ project }) => project === "unknown" || project === "loading")) {
    throw new Error(`Project listing includes a project with a reserved name`);
  } else {
    return createListCollection({
      items: [
        ...data.map(({ project, name }) => ({ label: name, value: project })),
        { label: "Unsupported project", value: "unknown" },
      ],
    });
  }
});

/**
 * Using the projects actual key, as stored in `projectAtom`, pick the
 * appropriate selection from the menu: the "unknown" option is selected if
 * the project is not supported.
 */
export const projectSelectionAtom = atom((get) => {
  const defaultProject = get(defaultProjectAtom);
  if (!defaultProject) return "loading";
  const project = get(projectAtom) ?? defaultProject;
  const leanConfigs = get(leanConfigsAtom);
  return leanConfigs.has(project) ? project : "unknown";
});

/**
 * Controls the message to put in an interface-blocking modal.
 */
export const interfaceDisabledAtom = atom((get) => {
  const projectSelection = get(projectSelectionAtom);
  if (projectSelection === "unknown") {
    const project = get(projectAtom);
    return [
      `The project ${project} is not supported.`,
      `Select a different project from the header menu to continue.`,
    ];
  }
  const { error } = get(projectListQueryAtom);
  if (error) {
    return [`There was an error retreiving the list of supported projects.`, error.message];
  }
  return null;
});

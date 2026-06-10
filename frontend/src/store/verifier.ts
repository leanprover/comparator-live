import {
  type CheckVerifyStatus,
  checkVerifyStatusIsTerminal,
  zCheckVerifyResponse,
  zStartVerifyResponse,
} from "@comparator/shared";
import { atom, getDefaultStore } from "jotai";
import { observe } from "jotai-effect";
import { atomWithQuery } from "jotai-tanstack-query";

import { challengeAtom, defaultProjectAtom, projectAtom, solutionAtom } from "./params.ts";

interface ComparatorJobParams {
  internalId: number;
  project: string | null;
  challenge: string;
  solution: string;
}
let internalIdSequenceNumber = 0;

/**
 * Stores the last version of code sent to comparator.
 *
 * Must only be accessed through `comparatorJobParamsAtom`
 */
const comparatorJobParamsHolder = atom<ComparatorJobParams | null>(null);

/**
 * Action atom that can be read to get the version of the code that was most
 * recently sent to comparator (see
 * https://jotai.org/docs/guides/composing-atoms#action-atoms).
 *
 * Setting this atom with no arguments does two things:
 *
 *  - snapshots the current code into `comparatorJobParamsHolder`, which is
 *    only accessed through this atom.
 *  - incrementing a counter that forces a new Comparator query via
 *    `comparatorJobIdAtom`.
 */
export const comparatorJobParamsAtom = atom(
  (get) => get(comparatorJobParamsHolder),
  (get, set, action?: "clear") => {
    if (action === "clear") {
      // Reset to a "we've not sent anything to comparator" state
      set(comparatorJobParamsHolder, null);
      return;
    }
    set(comparatorJobParamsHolder, {
      internalId: ++internalIdSequenceNumber,
      project: get(projectAtom),
      challenge: get(challengeAtom),
      solution: get(solutionAtom),
    });
  },
);

/**
 * Tracks whether the version of code that's been sent to comparator most
 * recently is the code we're looking at.
 */
export const isComparatorSyncedAtom = atom((get) => {
  const params = get(comparatorJobParamsAtom);
  if (!params) return false;
  return (
    params.project === get(projectAtom) &&
    params.challenge === get(challengeAtom) &&
    params.solution === get(solutionAtom)
  );
});

/**
 * Comparator API query, triggered whenever `comparatorJobParamsAtom` is set.
 */
const comparatorJobIdAtom = atomWithQuery((get) => {
  const params = get(comparatorJobParamsAtom);
  const defaultProject = get(defaultProjectAtom);
  return {
    queryKey: ["comparator-start", params?.internalId ?? null],
    enabled: params !== null && defaultProject !== null,
    queryFn: async ({ signal }) => {
      if (!params || defaultProject === null)
        throw new Error(
          `invariant violation: queryFn in comparatorJobIdAtom called when query should be disabled`,
        );

      const response = await fetch("/comparator/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: params.project ?? defaultProject,
          challenge: params.challenge,
          solution: params.solution,
        }),
        signal,
      });
      if (response.status !== 200) throw new Error(`got ${response.status} response on start`);

      const body = zStartVerifyResponse.parse(await response.json());
      if (body.type === "project-not-supported") {
        throw new Error(`Current project type not supported`);
      }

      return body.requestId;
    },
  };
});

/**
 * The last known output from comparator for the current code. (If
 * isComparatorSyncedAtom is false, this should not be shown to the user, as
 * it's out of date!)
 *
 * Not explicitly read-only, but should only be set by the effect observer in
 * `src/store/verifier.ts`.
 */
export const comparatorResultAtom = atom<CheckVerifyStatus>({ type: "initial-load" });

let navigatingAway = false;
window.addEventListener("pagehide", () => {
  navigatingAway = true;
});
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  const jotaiStore = getDefaultStore();
  const message = jotaiStore.get(comparatorResultAtom);
  if (!checkVerifyStatusIsTerminal(message)) {
    jotaiStore.set(comparatorJobParamsAtom, "clear");
  }
  navigatingAway = false;
});

/**
 * Effect observer that triggers whenever `comparatorJobIdAtom` is set and
 * manages the effect.
 */
export const unobserve = observe((get, set) => {
  const { data: requestId, status, isEnabled } = get(comparatorJobIdAtom);
  if (!isEnabled) {
    set(comparatorResultAtom, { type: "initial-load" });
    return;
  }

  if (status === "pending") {
    set(comparatorResultAtom, { type: "in-preparation" });
    return;
  }

  if (status === "error") {
    set(comparatorResultAtom, {
      type: "verification-failed",
      description: `Unexpected error initializing verification`,
    });
    return;
  }

  const source = new EventSource(`/comparator/api/track/${requestId}`);
  source.onmessage = (event) => {
    const message = zCheckVerifyResponse.parse(JSON.parse(event.data as string));
    set(comparatorResultAtom, message);
    if (checkVerifyStatusIsTerminal(message)) {
      source.close();
    }
  };

  source.onerror = () => {
    if (source.readyState === EventSource.CONNECTING) {
      // Let the app attempt to reconnect once, this is sure to 404 based on how the backend works.
      // This retry prevents the page from immediately flashing into an error state when the error
      // results from the user navigating to another page.
      return;
    }
    source.close();
    if (navigatingAway) return;
    set(comparatorResultAtom, {
      type: "verification-failed",
      description: `Lost server connection`,
      output: "",
    });
  };
  return () => {
    source.close();
  };
});

if (import.meta.hot) {
  import.meta.hot.dispose(unobserve);
}

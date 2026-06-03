import {
  type CheckVerifyStatus,
  zCheckVerifyResponse,
  zStartVerifyResponse,
} from "@comparator/shared";
import { atom } from "jotai";
import { observe } from "jotai-effect";
import { atomWithQuery } from "jotai-tanstack-query";

import { challengeAtom, projectAtom, solutionAtom } from "./params.ts";

interface ComparatorJobParams {
  internalId: number;
  project: string;
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
  (get, set) => {
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
  return {
    queryKey: ["comparator-start", params?.internalId ?? null],
    enabled: params !== null,
    queryFn: async ({ signal }) => {
      if (!params)
        throw new Error(
          `invariant violation: queryFn in comparatorJobIdAtom called when query should be disabled`,
        );

      const response = await fetch("/comparator/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: params.project,
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

  // If controller aborts, we mustn't set `comparatorResultAtom`
  const controller = new AbortController();
  (async () => {
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 50));
      const response = await fetch("/comparator/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
        signal: controller.signal,
      });
      if (response.status !== 200) throw new Error(`got ${response.status} response on poll`);

      const body = zCheckVerifyResponse.parse(await response.json());
      controller.signal.throwIfAborted();
      set(comparatorResultAtom, body);
      if (body.type !== "in-progress" && body.type !== "in-queue") return;
    }
  })().catch((err: unknown) => {
    if (controller.signal.aborted) return;
    // Don't go to an error state if the error is an AbortError. The reasoning
    // is that it's *probably* cancellation due to a page unload event, and
    // this avoids flashing a quick error state on some page navigation
    // events.
    //
    // If we're wrong, and something else aborted the fetch, the user will see
    // the app as stuck in the waiting state. That's better than flashing a
    // quick error state on page navigation.
    if (err instanceof Error && err.name === "AbortError") return;
    set(comparatorResultAtom, {
      type: "verification-failed",
      description: `Unexpected error while waiting for response`,
      output: err instanceof Error ? err.message : String(err),
    });
  });

  return () => {
    controller.abort();
    fetch("/comparator/api/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
      keepalive: true, // run this to completion if at all possible
    }).catch((err: unknown) => console.error(`Unexpected error during cancel`, err));
  };
});

if (import.meta.hot) {
  import.meta.hot.dispose(unobserve);
}

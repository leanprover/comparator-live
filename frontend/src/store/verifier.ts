import {
  type CheckVerifyStatus,
  checkVerifyStatusIsTerminal,
  type StartVerifyRequest,
  zCheckVerifyResponse,
  zStartVerifyResponse,
} from "@comparator/shared";
import { atom, getDefaultStore } from "jotai";
import { observe } from "jotai-effect";
import { atomWithMutation } from "jotai-tanstack-query";

import { challengeAtom, defaultProjectAtom, projectAtom, solutionAtom } from "./params.ts";

/** Snapshot of editor state that can be sent to comparator. */
interface ComparatorJobParams {
  project: string | null;
  challenge: string;
  solution: string;
}

/**
 * Stores the last editor state snapshot that was sent to comparator.
 * Written to by `requestVerificationAtom` (when a verification is requested),
 * by `clearVerificationAtom` (when a verification is cancelled). Not written
 * anywhere else.
 */
const comparatorJobAtom = atom<ComparatorJobParams | null>(null);

/** Action atom: request verification of the current editor state */
export const requestVerificationAtom = atom(null, (get, set) => {
  const defaultProject = get(defaultProjectAtom);
  if (defaultProject === null) {
    throw new Error("Invariant: requestVerificationAtom triggered before defaultProject resolved");
  }

  const project = get(projectAtom);
  const challenge = get(challengeAtom);
  const solution = get(solutionAtom);
  set(comparatorJobAtom, { project, challenge, solution });
  get(generateRequestIdAtom).mutate({ project: project ?? defaultProject, challenge, solution });
});

/** Action atom: cancel any in-flight requests */
export const cancelActiveVerificationAtom = atom(null, (get, set) => {
  if (checkVerifyStatusIsTerminal(get(comparatorResultAtom))) return;
  set(comparatorJobAtom, null);
  const mutation = get(generateRequestIdAtom);
  if (mutation.status !== "idle") {
    mutation.reset();
  }
});

const generateRequestIdAtom = atomWithMutation(() => ({
  mutationFn: async (request: StartVerifyRequest) => {
    const response = await fetch("/comparator/api/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    // todo: if (response.status === 429) set a new rate-limiting non-terminal status
    if (response.status !== 200) throw new Error(`got ${response.status} response on start`);

    const body = zStartVerifyResponse.parse(await response.json());
    if (body.type === "project-not-supported") {
      throw new Error(`Current project type not supported`);
    }

    return body.requestId;
  },
}));

/**
 * Tracks whether the version of code that's been sent to comparator most
 * recently is the code we're looking at.
 */
export const isComparatorSyncedAtom = atom((get) => {
  const params = get(comparatorJobAtom);
  if (!params) return false;
  return (
    params.project === get(projectAtom) &&
    params.challenge === get(challengeAtom) &&
    params.solution === get(solutionAtom)
  );
});

/**
 * The last known output from comparator for the current code. (If
 * isComparatorSyncedAtom is false, this should not be shown to the user, as
 * it's out of date!)
 *
 * Not explicitly read-only, but should only be set by the effect observer in
 * `src/store/verifier.ts`.
 */
export const comparatorResultAtom = atom<CheckVerifyStatus>({ type: "idle" });

/**
 * Effect observer that cancels an in-flight request if you edit things. (It's
 * nice to leave completed requests in place in case the user wants to undo
 * their edit.)
 */
const deSyncedTaskEffectCanceller = observe((get, set) => {
  if (get(isComparatorSyncedAtom)) return;
  set(cancelActiveVerificationAtom);
});

/** Set to true once the first request starts */
export const isComparatorInitializedAtom = atom(false);

/**
 * Effect observer that triggers whenever `comparatorJobIdAtom` is set and
 * manages the effect.
 */
const comparatorTaskEffectCanceller = observe((get, set) => {
  const { data: requestId, status } = get(generateRequestIdAtom);
  if (status === "idle") {
    set(comparatorResultAtom, { type: "idle" });
    return;
  }

  set(isComparatorInitializedAtom, true);
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
      // The connection was interrupted, but we're going to try to reestablish the connection
      // https://html.spec.whatwg.org/multipage/server-sent-events.html#reestablish-the-connection
      // We actually want to let the app try to reconnect, despite knowing for sure (based on how
      // our backend works) that it will be a 404. If we skip this, we'll get a flashed error
      // state when the user navigates to another page.
      return;
    }
    set(comparatorResultAtom, { type: "connection-lost" });
  };
  return () => {
    source.close();
  };
});

// Reset job status if page is closed
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  getDefaultStore().set(cancelActiveVerificationAtom);
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    deSyncedTaskEffectCanceller();
    comparatorTaskEffectCanceller();
  });
}

/* eslint no-console: "off" */

import {
  type StartVerifyRequest,
  zCheckVerifyResponse,
  zStartVerifyResponse,
} from "@comparator/shared";
import { env } from "process";

const BASE_URI = env.BASE_URI ?? "http://localhost:3000";
const DELAY = env.DELAY ? Number(env.DELAY) : 15 * 60 * 1000; // 15 minutes
console.log(
  `Comparator watchdog running against ${BASE_URI} with a ${DELAY / (60 * 1000)}-minute delay`,
);

const PROJECTS = ["mathlib-release", "mathlib-stable", "MathlibDemoForComparator"];

const CHALLENGES = [
  {
    challenge: "theorem triv : True",
    proof: "True.intro",
    ok: true,
  },
  {
    challenge: "import Mathlib.Tactic.Ring\ntheorem test (x y : Int) : x + y = y + 0 + x",
    proof: "by ring",
    ok: true,
  },
  {
    challenge: "theorem boom : False",
    proof: "by sorry",
    ok: false,
  },
] as const;

const CHALLENGE_MATRIX: {
  request: StartVerifyRequest;
  expect: "verification-failed" | "verification-ok";
}[] = CHALLENGES.map(({ challenge, proof, ok }) =>
  PROJECTS.map((project) => ({
    request: {
      project,
      challenge: `${challenge} := by sorry`,
      solution: `${challenge} := ${proof}`,
    },
    expect: ok ? ("verification-ok" as const) : ("verification-failed" as const),
  })),
).flat();

const startTimeSeconds = Date.now() / 1000;
const lastStartTimes: (Date | null)[] = CHALLENGE_MATRIX.map(() => null);
const isFailing: boolean[] = CHALLENGE_MATRIX.map(() => false);
export function stats() {
  const filtered = lastStartTimes.filter((t) => t !== null).map((t) => t.getTime());
  return {
    challenges_failing: isFailing.filter((b) => b).length,
    challenges_tested: filtered.length,
    oldest_challenge_start_timestamp_seconds:
      filtered.length > 0 ? Math.min(...filtered) / 1000 : startTimeSeconds,
    newest_challenge_start_timestamp_seconds:
      filtered.length > 0 ? Math.max(...filtered) / 1000 : startTimeSeconds,
  };
}

let nextChallenge = 0;
function incrChallenge() {
  nextChallenge = (nextChallenge + 1) % CHALLENGE_MATRIX.length;
}

/* Repeatedly tests challenges in a rotating fashion */
async function watchdog() {
  for (;;) {
    const thisChallenge = nextChallenge;
    lastStartTimes[thisChallenge] = new Date();
    if (env.NODE_ENV === "development") {
      console.log(
        `${lastStartTimes[thisChallenge].toISOString()}: starting challenge ${thisChallenge}`,
      );
    }
    try {
      const { request, expect } = CHALLENGE_MATRIX[thisChallenge]!;
      const response = await fetch(`${BASE_URI}/comparator/api/start`, {
        method: "POST",
        body: JSON.stringify(request),
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(DELAY),
      });
      if (!response.ok) throw new Error(`start returned ${response.status}`);

      const json = zStartVerifyResponse.parse(await response.json());
      if (json.type !== "ready") throw new Error(`start returned ${json.type}`);

      const track = await fetch(`${BASE_URI}/comparator/api/track/${json.requestId}`, {
        signal: AbortSignal.timeout(DELAY),
      });
      if (!track.ok) throw new Error(`track returned ${track.status}`);

      let verdict: null | "verification-failed" | "verification-ok" = null;
      for (const line of (await track.text()).split("\n")) {
        if (line.startsWith("data: ")) {
          const value = zCheckVerifyResponse.parse(JSON.parse(line.slice(5).trim()));
          if (value.type === "verification-failed" || value.type === "verification-ok") {
            verdict = value.type;
          }
        }
      }
      if (verdict !== expect) {
        throw new Error(`unexpected outcome ${verdict}`);
      }

      isFailing[thisChallenge] = false;
      if (env.NODE_ENV === "development") {
        console.log(`${new Date().toISOString()} request ${thisChallenge} succeeded`);
      }
    } catch (e) {
      isFailing[thisChallenge] = true;
      console.log(
        `${new Date().toISOString()} request ${thisChallenge} failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    incrChallenge();
    if (lastStartTimes[nextChallenge] !== null) {
      await new Promise((resolve) => setTimeout(resolve, DELAY));
    }
  }
}

void watchdog();

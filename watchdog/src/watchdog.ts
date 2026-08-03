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

const CHALLENGES: {
  request: StartVerifyRequest;
  expect: "verification-failed" | "verification-ok";
}[] = [
  {
    request: {
      project: "mathlib-release",
      challenge: "theorem triv : True := by sorry",
      solution: "theorem triv : True := True.intro",
    },
    expect: "verification-ok",
  },
  {
    request: {
      project: "mathlib-stable",
      challenge: "theorem triv : True := by sorry",
      solution: "theorem triv : True := True.intro",
    },
    expect: "verification-ok",
  },
  {
    request: {
      project: "mathlib-stable",
      challenge: "theorem boom : False := by sorry",
      solution: "theorem triv : True := True.intro",
    },
    expect: "verification-failed",
  },
  {
    request: {
      project: "MathlibDemoForComparator",
      challenge: "theorem triv : True := by sorry",
      solution: "theorem triv : True := True.intro",
    },
    expect: "verification-ok",
  },
  {
    request: {
      project: "MathlibDemoForComparator",
      challenge: "theorem triv : True := by sorry",
      solution: "import Mathlib\ntheorem triv : True := True.intro",
    },
    expect: "verification-ok",
  },
];

const startTimeSeconds = Date.now() / 1000;
const lastStartTimes: (Date | null)[] = CHALLENGES.map(() => null);
const isFailing: boolean[] = CHALLENGES.map(() => false);
export function stats() {
  const filtered = lastStartTimes.filter((t) => t !== null).map((t) => t.getTime());
  return {
    failing_count: isFailing.filter((b) => b).length,
    tested_count: filtered.length,
    oldest_start_timestamp_seconds:
      filtered.length > 0 ? Math.min(...filtered) / 1000 : startTimeSeconds,
    newest_start_timestamp_seconds:
      filtered.length > 0 ? Math.max(...filtered) / 1000 : startTimeSeconds,
  };
}

let nextChallenge = 0;
function incrChallenge() {
  nextChallenge = (nextChallenge + 1) % CHALLENGES.length;
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
      const { request, expect } = CHALLENGES[thisChallenge]!;
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

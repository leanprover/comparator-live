import { randomUUID } from "node:crypto";

import type { CheckVerifyResponse, StartVerifyRequest, VerifyResult } from "@comparator/shared";

import { Queue } from "./queue.ts";
import { doWork } from "./worker.ts";

/** Number of simultaneous processes. Must be 1 in development mode.  */
const CONCURRENCY = process.env.NODE_ENV === "production" ? 4 : 1;
let runningJobCount = 0;

const Q: Queue<string> = new Queue();
type JobStatus =
  | { type: "in-queue"; ticketNumber: number; data: StartVerifyRequest }
  | { type: "running" }
  | { type: "failed"; error: string }
  | { type: "complete"; result: VerifyResult };

const jobDb = new Map<string, JobStatus>();

let nextTicket = 1;
let nextServed = 1;

/**
 * Health check/stats
 */
export function health() {
  return { queueLength: Q.length, runningJobCount };
}

/**
 * Create a new work item for a verification request
 */
export function addWorkToQueue(data: StartVerifyRequest) {
  const id = randomUUID();

  const ticketNumber = nextTicket++;
  Q.enq(id);
  jobDb.set(id, { type: "in-queue", ticketNumber, data });
  drain();
  return id;
}

/**
 * Cancel work that is in the queue. (There's no mechanism for stopping a job
 * that is currently running; that cancellation will be detected when the
 * job finishes.)
 *
 * After cancellation, checking the status will always return not-found.
 */
export function cancelWork(id: string) {
  jobDb.delete(id);
}

/**
 * Request an update on verification request. If anything besides `in-queue`
 * or `in-progress` is returned, then this request will remove results, and
 * future requests will appear as not-found.
 *
 * NOTE: queue position in the queue includes cancelled jobs
 */
export function checkWorkStatus(id: string): CheckVerifyResponse {
  const job = jobDb.get(id);
  if (!job) return { type: "not-found" };
  switch (job.type) {
    case "in-queue":
      return { type: "in-queue", position: job.ticketNumber - nextServed };
    case "running":
      return { type: "in-progress" };
    case "failed":
      jobDb.delete(id);
      return {
        type: "verification-failed",
        description: "Unexpected failure",
        output: job.error,
      };
    case "complete":
      jobDb.delete(id);
      return job.result;
  }
}

/**
 * Start job if there's an available worker
 */
function drain() {
  while (runningJobCount < CONCURRENCY && Q.length > 0) {
    const id = Q.deq()!;
    const job = jobDb.get(id);
    if (!job) {
      // Cancelled jobs get removed from jobDb
      nextServed++;
      continue;
    }

    // Check invariants
    if (job.type !== "in-queue") {
      throw new Error(`enqueued job has bad status ${job.type}`);
    }
    if (job.ticketNumber !== nextServed) {
      throw new Error(`nextServed is out of sync, ${nextServed} vs ${job.ticketNumber}`);
    }

    jobDb.set(id, { type: "running" });
    runningJobCount++;
    nextServed++;
    doWork(id, job.data)
      .then((result) => {
        // Check for cancellation, which means we don't care anymore
        if (!jobDb.has(id)) return;
        jobDb.set(id, { type: "complete", result });
      })
      .catch((err: unknown) => {
        // Check for cancellation, which means we don't care anymore
        if (!jobDb.has(id)) return;

        // retry logic would go here
        jobDb.set(id, { type: "failed", error: err instanceof Error ? err.message : String(err) });
      })
      .finally(() => {
        runningJobCount--;
        drain();
      });
  }
}

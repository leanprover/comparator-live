import { randomUUID } from "node:crypto";

import type { CheckVerifyResponse, StartVerifyRequest, VerifyResult } from "@comparator/shared";

import { IS_PRODUCTION } from "./env.ts";
import { Queue } from "./queue.ts";
import { doWork } from "./worker.ts";

/** Number of simultaneous processes. Must be 1 in development mode.  */
const CONCURRENCY = IS_PRODUCTION ? 4 : 1;
let runningJobCount = 0;

const Q: Queue<string> = new Queue();
type JobStatus =
  | { type: "in-queue"; ticketNumber: number; data: StartVerifyRequest; enqueuedAt: number }
  | { type: "running"; enqueuedAt: number; since: number }
  | { type: "failed"; enqueuedAt: number; error: string }
  | { type: "complete"; enqueuedAt: number; result: VerifyResult };

const jobDb = new Map<string, JobStatus>();

let nextTicket = 1;
let nextServed = 1;

/**
 * Health check/stats
 */
export function health() {
  return {
    uptime: performance.now(),
    jobDbSize: jobDb.size,
    queueLength: Q.length,
    runningJobCount,
    totalJobs: nextTicket - 1,
  };
}

/**
 * Metrics (slightly slower than health())
 */
export function metrics() {
  const now = performance.now();
  let maxJob = 0;
  let totalJob = 0;
  let maxRunning = 0;
  let totalRunning = 0;
  let countRunning = 0;
  for (const [_key, value] of jobDb.entries()) {
    maxJob = Math.max(maxJob, now - value.enqueuedAt);
    totalJob += now - value.enqueuedAt;
    if (value.type === "running") {
      countRunning += 1;
      maxRunning = Math.max(maxRunning, now - value.since);
      totalRunning += now - value.since;
    }
  }

  if (runningJobCount !== countRunning) {
    console.warn(
      `Discrepancy: active running job count is ${runningJobCount} but jobDb has ${countRunning} running jobs`,
    );
  }

  return {
    comparator_uptime_ms: now,
    comparator_queue_length: Q.length,
    comparator_workers_active: countRunning,
    comparator_workers_longest_ms: maxRunning,
    comparator_workers_total_ms: totalRunning,
    comparator_workers_limit: CONCURRENCY,
    comparator_jobs_longest_ms: maxJob,
    comparator_jobs_total_ms: totalJob,
    comparator_jobs_active: jobDb.size,
    comparator_jobs_history_total: nextTicket - 1,
  };
}

/**
 * Create a new work item for a verification request
 */
export function addWorkToQueue(data: StartVerifyRequest) {
  const id = randomUUID();

  const ticketNumber = nextTicket++;
  Q.enq(id);
  jobDb.set(id, { type: "in-queue", ticketNumber, data, enqueuedAt: performance.now() });
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

    jobDb.set(id, { type: "running", enqueuedAt: job.enqueuedAt, since: performance.now() });
    runningJobCount++;
    nextServed++;
    doWork(id, job.data)
      .then((result) => {
        // Check for cancellation, which means we don't care anymore
        if (!jobDb.has(id)) return;
        jobDb.set(id, { type: "complete", result, enqueuedAt: job.enqueuedAt });
      })
      .catch((err: unknown) => {
        // Check for cancellation, which means we don't care anymore
        if (!jobDb.has(id)) return;

        // retry logic would go here
        jobDb.set(id, {
          type: "failed",
          error: err instanceof Error ? err.message : String(err),
          enqueuedAt: job.enqueuedAt,
        });
      })
      .finally(() => {
        runningJobCount--;
        drain();
      });
  }
}

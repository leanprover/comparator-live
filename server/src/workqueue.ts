import { EventEmitter } from "node:events";

import type { StartVerifyRequest, VerifyResult } from "@comparator/shared";

import { IS_PRODUCTION } from "./env.ts";
import { Queue } from "./queue.ts";
import { doWork } from "./worker.ts";

/** Number of simultaneous processes. Must be 1 in development mode.  */
const CONCURRENCY = IS_PRODUCTION ? 4 : 1;
let runningJobCount = 0;

export type WorkQueueEvents = {
  queueUpdate: [next: number];
  running: [];
  failed: [error: string];
  complete: [result: VerifyResult];
};

const Q: Queue<string> = new Queue();
type JobStatus =
  | {
      type: "in-queue";
      ticketNumber: number;
      data: StartVerifyRequest;
      enqueuedAt: number;
      emitter: EventEmitter<WorkQueueEvents>;
    }
  | {
      type: "running";
      enqueuedAt: number;
      since: number;
    };

const jobDb = new Map<string, JobStatus>();

let nextTicket = 1;
let nextServed = 1;

/**
 * Health check/stats
 */
export function health() {
  return {
    uptime: performance.now(),
    queueLength: Q.length,
    runningJobCount,
    totalJobs: nextTicket - 1,
  };
}

/**
 * Metrics (checks full jobDb and queue, so will be slower than health())
 *
 * Note: `comparator_jobs_size` and `comparator_jobs_longest_s` expose
 * information about the magnitude of potential memory leaks.
 */
export function metrics() {
  const now = performance.now();
  let maxQueue = 0;
  let totalQueue = 0;
  let activeQueue = 0;
  let cancelledQueue = 0;
  for (const key of Q) {
    const value = jobDb.get(key);
    if (!value) {
      cancelledQueue += 1;
    } else {
      activeQueue += 1;
      maxQueue = Math.max(maxQueue, now - value.enqueuedAt);
      totalQueue += now - value.enqueuedAt;
    }
  }

  let maxJob = 0;
  let maxRunning = 0;
  let totalRunning = 0;
  let countRunning = 0;
  for (const [_key, value] of jobDb.entries()) {
    maxJob = Math.max(maxJob, now - value.enqueuedAt);
    if (value.type === "running") {
      countRunning += 1;
      maxRunning = Math.max(maxRunning, now - value.since);
      totalRunning += now - value.since;
    }
  }

  /** Turn an ms count into a cleaner seconds count */
  const cleanS = (ms: number) => {
    return Math.round(ms / 125) / 8;
  };

  return {
    comparator_uptime_seconds: cleanS(now),
    comparator_workers_active_count: countRunning,
    comparator_workers_active_sum_seconds: cleanS(totalRunning),
    comparator_workers_active_longest_seconds: cleanS(maxRunning),
    comparator_workers_limit: CONCURRENCY,
    comparator_queue_live_count: activeQueue,
    comparator_queue_live_sum_seconds: cleanS(totalQueue),
    comparator_queue_live_longest_seconds: cleanS(maxQueue),
    comparator_queue_cancelled_count: cancelledQueue,
    comparator_jobs_longest_seconds: cleanS(maxJob),
    comparator_jobs_size: jobDb.size,
    comparator_jobs_total: nextTicket - 1,
  };
}

/**
 * Create a new work item for a verification request.
 *
 * `id` must be a UUID generated server-side, it can't come from the user.
 */
export function addWorkToQueue(id: string, data: StartVerifyRequest) {
  const ticketNumber = nextTicket++;
  Q.enq(id);
  const emitter = new EventEmitter<WorkQueueEvents>();
  jobDb.set(id, { type: "in-queue", ticketNumber, data, enqueuedAt: performance.now(), emitter });
  queueMicrotask(drain);
  return { emitter, position: ticketNumber - nextServed };
}

/**
 * Cancel work that is in the queue. (There's no mechanism for stopping a job
 * that is currently running; that cancellation will be detected when the
 * job finishes.)
 */
export function cancelWork(id: string) {
  jobDb.delete(id);
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

    job.emitter.emit("running");
    jobDb.set(id, { type: "running", enqueuedAt: job.enqueuedAt, since: performance.now() });

    runningJobCount++;
    nextServed++;
    doWork(id, job.data)
      .then((result) => {
        // Check for cancellation, which means we don't care anymore
        if (!jobDb.has(id)) return;
        job.emitter.emit("complete", result);
      })
      .catch((err: unknown) => {
        // Check for cancellation, which means we don't care anymore
        if (!jobDb.has(id)) return;

        // retry logic would go here
        job.emitter.emit("failed", err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        jobDb.delete(id);
        runningJobCount--;
        drain();
      });
  }

  // Report new queue positions
  for (const id of Q) {
    const job = jobDb.get(id);
    if (job?.type === "in-queue") {
      job.emitter.emit("queueUpdate", job.ticketNumber - nextServed);
    }
  }
}

import { randomUUID } from "node:crypto";
import type { EventEmitter } from "node:stream";

import { describe, expect, it } from "vitest";

import { addWorkToQueue, health, metrics, type WorkQueueEvents } from "./workqueue.ts";

function promisifyEmitter(emitter: EventEmitter<WorkQueueEvents>) {
  return new Promise((resolve, reject) => {
    emitter.on("complete", resolve);
    emitter.on("failed", reject);
  });
}

const basicJob = {
  project: "mathlib-stable",
  challenge: "theorem triv : True := by sorry",
  solution: "theorem triv : True := True.intro",
};
const basicResponse = {
  type: "verification-ok",
  theoremNames: ["triv"],
};

describe("the workqueue", () => {
  it("succeeds on an empty challenge", async () => {
    const { emitter, position } = addWorkToQueue(randomUUID(), { ...basicJob, challenge: "" });

    expect(position).toBe(0);

    expect(await promisifyEmitter(emitter)).toStrictEqual({ ...basicResponse, theoremNames: [] });
  });

  it("rejects on an ill-formed challenge", async () => {
    const { emitter, position } = addWorkToQueue(randomUUID(), { ...basicJob, challenge: "_bad_" });

    expect(position).toBe(0);

    expect(await promisifyEmitter(emitter)).toStrictEqual({
      type: "verification-failed",
      output: expect.anything(),
      description: expect.anything(),
    });
  });

  it("enqueues and discharges successive events, updating health and metrics", async () => {
    const before = health();

    const a = addWorkToQueue(randomUUID(), basicJob);
    const b = addWorkToQueue(randomUUID(), basicJob);
    const c = addWorkToQueue(randomUUID(), basicJob);

    expect(a.position).toBe(0);
    expect(b.position).toBe(1);
    expect(c.position).toBe(2);

    expect(metrics().comparator_queue_live_count).toBe(3);
    expect(await promisifyEmitter(a.emitter)).toStrictEqual(basicResponse);
    expect(metrics().comparator_queue_live_count).toBe(2);
    expect(await promisifyEmitter(b.emitter)).toStrictEqual(basicResponse);
    expect(metrics().comparator_queue_live_count).toBe(1);
    expect(await promisifyEmitter(c.emitter)).toStrictEqual(basicResponse);
    expect(metrics().comparator_queue_live_count).toBe(0);

    const after = health();
    expect(after.totalJobs - before.totalJobs).toBe(3);
  });
});

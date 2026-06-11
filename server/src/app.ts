import { randomUUID } from "node:crypto";

import {
  type CheckVerifyResponse,
  type StartVerifyResponse,
  zStartVerifyRequest,
} from "@comparator/shared";
import express, { type Response } from "express";
import { z, type ZodSafeParseResult } from "zod";

import { getProjects } from "./projects.ts";
import { addWorkToQueue, cancelWork, health, metrics } from "./workqueue.ts";

export const app = express();
app.use(express.json());

/** Return false, asserting that parsing succeeded, or send a 400 response */
function poorlyFormed<T>(
  data: ZodSafeParseResult<T>,
  res: Response,
): data is Extract<ZodSafeParseResult<T>, { success: false }> {
  if (!data.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return true;
  }
  return false;
}

app.get("/comparator/api/health", (_req, res) => {
  res.send(health());
});

app.get("/comparator/api/metrics.prom", (_req, res) => {
  res.set("Content-Type", "text/plain; charset=ascii");
  res.send(
    Object.entries(metrics())
      .map(([key, value]) => `${key} ${value}\n`)
      .toSorted()
      .join(""),
  );
});

/**
 * Jobs are stored with a post request and enqueued when their status is first requested.
 * In between, they're temporarily stored in `readyJobs`.
 */
const readyJobs = new Map<
  string,
  { timeoutCancel: NodeJS.Timeout; job: { project: string; challenge: string; solution: string } }
>();
const READY_JOB_TIMEOUT_MS = 5000;

app.post("/comparator/api/start", async (req, res) => {
  const body = zStartVerifyRequest.safeParse(req.body);
  if (poorlyFormed(body, res)) return;

  let result: StartVerifyResponse;
  if (!(await getProjects()).some(({ project }) => project === body.data.project)) {
    result = { type: "project-not-supported" };
  } else {
    const uuid = randomUUID();
    readyJobs.set(uuid, {
      timeoutCancel: setTimeout(() => readyJobs.delete(uuid), READY_JOB_TIMEOUT_MS),
      job: body.data,
    });
    result = { type: "ready", requestId: uuid };
  }
  res.send(result);
});

app.get("/comparator/api/track/:requestId", (req, res) => {
  const requestId = z.uuidv4().safeParse(req.params.requestId);
  if (poorlyFormed(requestId, res)) return;

  const readyJob = readyJobs.get(requestId.data);
  if (!readyJob) {
    res.sendStatus(404);
    return;
  }

  // Server-sent events always need these
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  // For nginx
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const keepAlive: NodeJS.Timeout | undefined = setInterval(() => {
    res.write(":\n");
  }, 5000);

  const sendMsg = (msg: CheckVerifyResponse) => {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  };

  clearTimeout(readyJob.timeoutCancel);
  readyJobs.delete(requestId.data);

  const { emitter, position } = addWorkToQueue(requestId.data, readyJob.job);
  sendMsg({ type: "in-queue", position });
  emitter.on("queueUpdate", (position) => {
    sendMsg({ type: "in-queue", position });
  });
  emitter.on("running", () => {
    sendMsg({ type: "in-progress" });
  });
  emitter.on("complete", (response) => {
    sendMsg(response);
    res.end();
  });
  emitter.on("failed", (error) => {
    sendMsg({ type: "verification-failed", description: "Unexpected failure", output: error });
    res.end();
  });

  // Close always fires after res.end, so cleanup can happen here
  req.on("close", () => {
    clearInterval(keepAlive);
    emitter.removeAllListeners();
    cancelWork(requestId.data);
  });
});

app.get("/comparator/api/projects", async (_req, res) => {
  try {
    res.send(await getProjects());
  } catch (err) {
    res.status(400).send({ error: err instanceof Error ? err.message : String(err) });
  }
});

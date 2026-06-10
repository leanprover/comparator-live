import {
  type CheckVerifyResponse,
  type StartVerifyResponse,
  zStartVerifyRequest,
  zVerifyRequest,
} from "@comparator/shared";
import express, { type Response } from "express";
import type { ZodSafeParseResult } from "zod";

import { getProjects } from "./projects.ts";
import { addWorkToQueue, cancelWork, checkWorkStatus, health, metrics } from "./workqueue.ts";
import { randomUUID } from "node:crypto";

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
const readyJobs = new Map<string, { project: string; challenge: string; solution: string }>();

app.post("/comparator/api/start", async (req, res) => {
  const body = zStartVerifyRequest.safeParse(req.body);
  if (poorlyFormed(body, res)) return;

  let result: StartVerifyResponse;
  if (!(await getProjects()).some(({ project }) => project === body.data.project)) {
    result = { type: "project-not-supported" };
  } else {
    const uuid = randomUUID();
    readyJobs.set(uuid, body.data);
    setTimeout(() => readyJobs.delete(uuid), 5000);
    result = { type: "ready", requestId: uuid };
  }
  res.send(result);
});

app.post("/comparator/api/cancel", (req, res) => {
  const body = zVerifyRequest.safeParse(req.body);
  if (poorlyFormed(body, res)) return;

  if (readyJobs.has(body.data.requestId)) {
    readyJobs.delete(body.data.requestId);
  } else {
    cancelWork(body.data.requestId);
  }

  res.send();
});

app.post("/comparator/api/poll", (req, res) => {
  const body = zVerifyRequest.safeParse(req.body);
  if (poorlyFormed(body, res)) return;

  const readyJob = readyJobs.get(body.data.requestId);
  if (readyJob) {
    // requestId can be safely assumed to be an ID the server recently generated
    addWorkToQueue(body.data.requestId, readyJob);
    readyJobs.delete(body.data.requestId);
  }

  const result: CheckVerifyResponse = checkWorkStatus(body.data.requestId);
  res.send(result);
});

app.get("/comparator/api/projects", async (_req, res) => {
  try {
    res.send(await getProjects());
  } catch (err) {
    res.status(400).send({ error: err instanceof Error ? err.message : String(err) });
  }
});

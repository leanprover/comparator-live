import {
  type CheckVerifyResponse,
  type StartVerifyResponse,
  zStartVerifyRequest,
  zVerifyRequest,
} from "@comparator/shared";
import express, { type Response } from "express";
import type { ZodSafeParseResult } from "zod";

import { addWorkToQueue, cancelWork, checkWorkStatus, health } from "./workqueue.ts";

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

app.get("/comparator/api/health", (req, res) => {
  res.send(health());
});

app.post("/comparator/api/start", (req, res) => {
  const body = zStartVerifyRequest.safeParse(req.body);
  if (poorlyFormed(body, res)) return;

  let result: StartVerifyResponse;
  if (body.data.project !== "MathlibDemo") {
    result = { type: "project-not-supported" };
  } else {
    result = { type: "enqueued", requestId: addWorkToQueue(body.data) };
  }
  res.send(result);
});

app.post("/comparator/api/cancel", (req, res) => {
  const body = zVerifyRequest.safeParse(req.body);
  if (poorlyFormed(body, res)) return;

  cancelWork(body.data.requestId);
  res.send();
});

app.post("/comparator/api/poll", (req, res) => {
  const body = zVerifyRequest.safeParse(req.body);
  if (poorlyFormed(body, res)) return;

  const result: CheckVerifyResponse = checkWorkStatus(body.data.requestId);
  res.send(result);
});

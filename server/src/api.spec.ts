import type { CheckVerifyResponse } from "@comparator/shared";
import supertest, { type Response } from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "./app.ts";
let response: Response;

describe(`POST /comparator/api/poll`, () => {
  it("should eventually validate a valid request", async () => {
    response = await supertest(app).post(`/comparator/api/start`).send({
      project: "MathlibDemo",
      challenge: `theorem triv : True := by sorry`,
      solution: `theorem triv : True := True.intro`,
    });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ type: "enqueued", requestId: expect.anything() });
    const requestId = response.body.requestId as string;

    expect(
      await (async (): Promise<CheckVerifyResponse> => {
        for (;;) {
          response = await supertest(app).post(`/comparator/api/poll`).send({ requestId });
          if (response.body.type !== "in-queue" && response.body.type !== "in-progress") {
            return response.body as CheckVerifyResponse;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      })(),
    ).toStrictEqual({ type: "verification-ok", theoremNames: ["triv"] });
  });
}, 50_000);

describe(`POST /comparator/api/start`, () => {
  it("should validate request structure", async () => {
    response = await supertest(app).post(`/comparator/api/start`).send({ random: true });
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({ error: "Poorly-formed request" });
  });

  it("should reject a bogus project", async () => {
    response = await supertest(app)
      .post(`/comparator/api/start`)
      .send({ project: "---bogus---", challenge: "", solution: "" });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ type: "project-not-supported" });
  });
});

describe(`POST /comparator/api/cancel`, () => {
  it("should successfully cancel a valid request", async () => {
    response = await supertest(app)
      .post(`/comparator/api/start`)
      .send({ project: "MathlibDemo", challenge: "", solution: "" });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ type: "enqueued", requestId: expect.anything() });
    const requestId = response.body.requestId as string;

    response = await supertest(app).post(`/comparator/api/cancel`).send({ requestId });
    expect(response.status).toBe(200);

    response = await supertest(app).post(`/comparator/api/poll`).send({ requestId });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ type: "not-found" });
  });
});

import supertest, { type Response } from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "./app.ts";

let response: Response;

function sseData(body: string): unknown[] {
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line): unknown => JSON.parse(line.slice(6)));
}

describe(`GET /comparator/api/track/:requestId`, () => {
  it("should successfully track a valid request", async () => {
    response = await supertest(app).post(`/comparator/api/start`).send({
      project: "mathlib-stable",
      challenge: `theorem triv : True := by sorry`,
      solution: `theorem triv : True := True.intro`,
    });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ type: "ready", requestId: expect.anything() });
    const requestId = response.body.requestId as string;

    response = await supertest(app).get(`/comparator/api/track/${requestId}`);
    const messages = sseData(response.text);
    expect([messages.at(0), messages.at(-1)]).toStrictEqual([
      { type: "in-queue", position: 0 },
      { type: "verification-ok", theoremNames: ["triv"] },
    ]);
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

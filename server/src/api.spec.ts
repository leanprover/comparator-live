import supertest, { type Response } from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { app } from "./app.ts";
let response: Response;

/** it would be more robust to reset the database explicitly, but this will do. */
const BAD_STUDENT_ID = 1_000_000_000;

describe(`POST /api/addStudent`, () => {
  it("should allow the addition of a new student", async () => {
    response = await supertest(app)
      .post(`/api/addStudent`)
      .send({ password: "password", studentName: "Bob" });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ studentID: expect.any(Number) });
  });

  it("should reject invalid payloads", async () => {
    response = await supertest(app).post(`/api/addStudent`).send({ whatever: false });
    expect(response.status).toBe(400);
  });

  it("should reject invalid auth", async () => {
    response = await supertest(app)
      .post(`/api/addStudent`)
      .send({ password: "wrong", studentName: "Bob" });
    expect(response.status).toBe(403);
  });
});

describe(`POST /api/addGrade`, () => {
  let id: number;
  beforeAll(async () => {
    response = await supertest(app)
      .post(`/api/addStudent`)
      .send({ password: "password", studentName: "Bob" });
    id = response.body.studentID;
  });

  it("should allow the addition of a new grade for an existing student", async () => {
    response = await supertest(app)
      .post(`/api/addGrade`)
      .send({ password: "password", studentID: id, courseName: "Science", courseGrade: 71 });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ success: true });
  });

  it("should reject the addition of a new grade for a nonexistent student id", async () => {
    response = await supertest(app).post(`/api/addGrade`).send({
      password: "password",
      studentID: BAD_STUDENT_ID,
      courseName: "Science",
      courseGrade: 71,
    });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ success: false });
  });

  it("should reject invalid payloads", async () => {
    response = await supertest(app)
      .post(`/api/addGrade`)
      .send({ password: "password", courseName: "Science", courseGrade: 71 });
    expect(response.status).toBe(400);
  });

  it("should reject invalid auth", async () => {
    response = await supertest(app)
      .post(`/api/addGrade`)
      .send({ password: "wrong", studentID: id, courseName: "Science", courseGrade: 71 });
    expect(response.status).toBe(403);
  });
});

describe(`POST /api/getTranscript`, () => {
  let id: number;
  beforeAll(async () => {
    response = await supertest(app)
      .post(`/api/addStudent`)
      .send({ password: "password", studentName: "Jo" });
    id = response.body.studentID;
    await supertest(app)
      .post(`/api/addGrade`)
      .send({ password: "password", studentID: id, courseName: "Science", courseGrade: 67 });
  });

  it("should get the transcript for an existing student", async () => {
    response = await supertest(app)
      .post(`/api/getTranscript`)
      .send({ password: "password", studentID: id });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      success: true,
      transcript: {
        student: { studentName: "Jo", studentID: id },
        grades: [{ course: "Science", grade: 67 }],
      },
    });
  });

  it("should report failing to get the transcript for a nonexistent student", async () => {
    response = await supertest(app)
      .post(`/api/getTranscript`)
      .send({ password: "password", studentID: BAD_STUDENT_ID });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ success: false });
  });

  it("should reject invalid payloads", async () => {
    response = await supertest(app).post(`/api/getTranscript`).send({ password: "password" });
    expect(response.status).toBe(400);
  });

  it("should reject invalid auth", async () => {
    response = await supertest(app)
      .post(`/api/getTranscript`)
      .send({ password: "wrong", studentID: id });
    expect(response.status).toBe(403);
  });
});

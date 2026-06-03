import {
  type AddGradeResponse,
  type AddStudentResponse,
  type GetTranscriptResponse,
  zAddGradeRequest,
  zAddStudentRequest,
  zGetTranscriptRequest,
} from "@sourdough/shared";
import express from "express";

import { checkPassword } from "./auth.service.ts";
import { TranscriptDB } from "./transcript.service.ts";

export const app = express();
app.use(express.json());
const db = new TranscriptDB();

/* Handle API requests to create a new student record */
app.post("/api/addStudent", (req, res) => {
  const body = zAddStudentRequest.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
  } else if (!checkPassword(body.data.password)) {
    res.status(403).send({ error: "Invalid credentials" });
  } else {
    const response: AddStudentResponse = {
      studentID: db.addStudent(body.data.studentName),
    };
    res.send(response);
  }
});

/* Handle API requests to add a grade to a student */
app.post("/api/addGrade", (req, res) => {
  const body = zAddGradeRequest.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
  } else if (!checkPassword(body.data.password)) {
    res.status(403).send({ error: "Invalid credentials" });
  } else {
    let response: AddGradeResponse;
    try {
      db.addGrade(body.data.studentID, body.data.courseName, body.data.courseGrade);
      response = { success: true };
    } catch {
      response = { success: false };
    }
    res.send(response);
  }
});

/* Handle API requests to retrieve a student transcript */
app.post("/api/getTranscript", (req, res) => {
  const body = zGetTranscriptRequest.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
  } else if (!checkPassword(body.data.password)) {
    res.status(403).send({ error: "Invalid credentials" });
  } else {
    let response: GetTranscriptResponse;
    try {
      const transcript = db.getTranscript(body.data.studentID);
      response = { success: true, transcript };
    } catch {
      response = { success: false };
    }
    res.send(response);
  }
});

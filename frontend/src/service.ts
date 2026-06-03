import {
  type AddGradeRequest,
  type AddStudentRequest,
  type AddStudentResponse,
  type GetTranscriptRequest,
  type GetTranscriptResponse,
  zAddGradeResponse,
  zAddStudentResponse,
  zError,
  zGetTranscriptResponse,
} from "@sourdough/shared";
import { z } from "zod";

export class ServiceError extends Error {}

/**
 * Convert an unknown error (probably a ServiceError) to a meaningful
 * user-facing message
 */
export function serviceErrorToStr(err: unknown) {
  if (err instanceof ServiceError) return err.message;
  return `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;
}

const zGrade = z
  .string()
  .regex(z.regexes.number)
  .transform((str) => Number.parseFloat(str))
  .pipe(z.number().gte(0).lte(100));

const zStudentID = z
  .string()
  .regex(z.regexes.integer)
  .transform((str) => Number.parseInt(str, 10))
  .pipe(z.int());

/**
 * Validate inputs and call the `addStudent` api
 *
 * @param password - credentials
 * @param studentName - a student name (error if empty)
 * @returns successful API response
 * @throws if validation fails or there is an API response error
 */
export async function addStudent(
  password: string,
  studentName: string,
): Promise<AddStudentResponse> {
  if (studentName === "") throw new ServiceError("Student name must be non-empty");

  const body: AddStudentRequest = { password, studentName };
  const response = await fetch("/api/addStudent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = z.union([zError, zAddStudentResponse]).parse(await response.json());
  if ("error" in data) throw new ServiceError(data.error);
  return data;
}

/**
 * Validate inputs and call the `addGrade` api
 *
 * @param password - credentials
 * @param studentIDStr - student ID
 * @param courseName - course name (can be any non-empty string)
 * @param courseGradeStr - course grade (error if not a number between 0 and 100, inclusive)
 * @returns successful API response
 * @throws if validation fails or there is an API response error
 */
export async function addGrade(
  password: string,
  studentIDStr: string,
  courseName: string,
  courseGradeStr: string,
): Promise<void> {
  const studentID = zStudentID.safeParse(studentIDStr);
  if (!studentID.success) {
    throw new ServiceError("Student ID is invalid");
  }

  const courseGrade = zGrade.safeParse(courseGradeStr);
  if (!courseGrade.success) {
    throw new ServiceError("Course grade is not valid");
  }

  if (courseName === "") {
    throw new ServiceError("Course name is required");
  }

  const body: AddGradeRequest = {
    password,
    studentID: studentID.data,
    courseName,
    courseGrade: courseGrade.data,
  };
  const response = await fetch("/api/addGrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = z.union([zError, zAddGradeResponse]).parse(await response.json());
  if ("error" in data) throw new ServiceError(data.error);
  if (!data.success) throw new ServiceError(`Failed to add grade for this student`);
}

/**
 * Validate inputs and call the `getTranscript` API
 *
 * @param password - credentials
 * @param studentIDStr - student ID
 * @returns successful API response
 * @throws if validation fails or there is an API response error
 */
export async function getTranscript(
  password: string,
  studentIDStr: string,
): Promise<GetTranscriptResponse> {
  const studentID = zStudentID.safeParse(studentIDStr);
  if (!studentID.success) {
    throw new ServiceError("Student ID is invalid");
  }

  const body: GetTranscriptRequest = { password, studentID: studentID.data };
  const response = await fetch("/api/getTranscript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = z.union([zError, zGetTranscriptResponse]).parse(await response.json());
  if ("error" in data) throw new ServiceError(data.error);
  return data;
}

import { z } from "zod";

/** Validator for error responses from the API */
export const zError = z.object({ error: z.string() });

/** Validator for POST `/api/addStudent` requests */
export const zAddStudentRequest = z.object({
  password: z.string(),
  studentName: z.string(),
});
/** Request type for POST `/api/addStudent` */
export type AddStudentRequest = z.infer<typeof zAddStudentRequest>;

/** Validator for POST `/api/addStudent` 200 responses */
export const zAddStudentResponse = z.object({ studentID: z.int() });
/** Response type for POST `/api/addStudent` */
export type AddStudentResponse = z.infer<typeof zAddStudentResponse>;

/** Validator for POST `/api/addGrade` requests */
export const zAddGradeRequest = z.object({
  password: z.string(),
  studentID: z.int().gte(0),
  courseName: z.string(),
  courseGrade: z.number().gte(0).lte(100),
});
/** Request type for POST `/api/addGrade` */
export type AddGradeRequest = z.infer<typeof zAddGradeRequest>;

/** Validator for POST `/api/addGrade` 200 responses */
export const zAddGradeResponse = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true) }),
  z.object({ success: z.literal(false) }),
]);
/** Response type for POST `/api/addGrade` */
export type AddGradeResponse = z.infer<typeof zAddGradeResponse>;

/** Validator for student records */
export const zStudent = z.object({ studentID: z.int(), studentName: z.string() });
export type Student = z.infer<typeof zStudent>;

/** Validator for individual course grade records */
export const zCourseGrade = z.object({ course: z.string(), grade: z.number() });
export type CourseGrade = z.infer<typeof zCourseGrade>;

/** Validator for transcripts */
export const zTranscript = z.object({ student: zStudent, grades: z.array(zCourseGrade) });
/** Type of student transcripts */
export type Transcript = z.infer<typeof zTranscript>;

/** Validator for POST `/api/getTranscript` requests */
export const zGetTranscriptRequest = z.object({
  password: z.string(),
  studentID: z.int().gte(0),
});
/** Request type for POST `/api/getTranscript` */
export type GetTranscriptRequest = z.infer<typeof zGetTranscriptRequest>;

/** Validator for POST `/api/getTranscript` 200 responses */
export const zGetTranscriptResponse = z.discriminatedUnion("success", [
  z.object({ success: z.literal(false) }),
  z.object({ success: z.literal(true), transcript: zTranscript }),
]);
/** Response type for POST `/api/getTranscript` */
export type GetTranscriptResponse = z.infer<typeof zGetTranscriptResponse>;

// Aliases for simple types

export type Course = string;
export type StudentID = number;

import { describe, expect, it } from "vitest";

import { zTranscript } from "./shared.ts";

describe("the Transcript validator", () => {
  it("forbids omission of the grades element", () => {
    const response = zTranscript.safeParse({
      student: { studentID: 4, studentName: "Naomi" },
    });
    expect(response.success).toBe(false);
  });

  it("forbids omission of the student element", () => {
    const response = zTranscript.safeParse({
      grades: [],
    });
    expect(response.success).toBe(false);
  });

  it("accepts transcripts with no grades", () => {
    const response = zTranscript.safeParse({
      student: { studentID: 4, studentName: "Naomi" },
      grades: [],
    });
    expect(response.success).toBe(true);
  });

  it("accepts transcripts with duplicate grades", () => {
    const response = zTranscript.safeParse({
      student: { studentID: 4, studentName: "Naomi" },
      grades: [
        { course: "Math", grade: 4 },
        { course: "Math", grade: 3 },
      ],
    });
    expect(response.success).toBe(true);
  });
});

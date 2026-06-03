import { beforeEach, describe, expect, it } from "vitest";

import { TranscriptDB } from "./transcript.service.ts";

let db: TranscriptDB;
beforeEach(() => {
  db = new TranscriptDB();
});

describe(`addStudent()`, () => {
  it(`should give students different IDs`, () => {
    const id1 = db.addStudent("Alvin");
    const id2 = db.addStudent("Bryn");
    const id3 = db.addStudent("Carol");
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it(`should allow students with the same name`, () => {
    const id1 = db.addStudent("Alvin");
    const id2 = db.addStudent("Alvin");
    expect(id1).not.toBe(id2);
  });
});

describe(`getTranscript()`, () => {
  it(`should return an empty transcript for a new student`, () => {
    const id = db.addStudent("Carol");
    expect(db.getTranscript(id)).toStrictEqual({
      student: { studentName: "Carol", studentID: id },
      grades: [],
    });
  });

  it(`should throw an error for a non-existent student`, () => {
    const id = db.addStudent("Carol");
    expect(() => db.getTranscript(id + 1)).toThrow();
  });
});

describe(`addGrade()`, () => {
  it(`should successfully add a new element to an empty transcript`, () => {
    const id = db.addStudent("Carol");
    db.addGrade(id, "Math", 91);
    expect(db.getTranscript(id)).toStrictEqual({
      student: { studentName: "Carol", studentID: id },
      grades: [{ course: "Math", grade: 91 }],
    });
  });

  it(`should throw if given an invalid id`, () => {
    // All IDs are invalid in the initial database... including 1.5
    expect(() => db.addGrade(1.5, "Math", 91)).toThrow();
  });

  it(`should attach different grades to different students`, () => {
    const id1 = db.addStudent("Carol");
    const id2 = db.addStudent("Darol");
    db.addGrade(id1, "Math", 91);
    db.addGrade(id2, "Math", 87);
    expect(db.getTranscript(id1).grades).toStrictEqual([{ course: "Math", grade: 91 }]);
    expect(db.getTranscript(id2).grades).toStrictEqual([{ course: "Math", grade: 87 }]);
  });

  it(`should permit multiple grades for a single class`, () => {
    const id = db.addStudent("Eris");
    db.addGrade(id, "Math", 91);
    db.addGrade(id, "Math", 87);
    expect(db.getTranscript(id).grades.sort((a, b) => a.grade - b.grade)).toStrictEqual([
      { course: "Math", grade: 87 },
      { course: "Math", grade: 91 },
    ]);
  });
});

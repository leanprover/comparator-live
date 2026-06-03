import { type Course, type Student, type StudentID, type Transcript } from "@sourdough/shared";

export class TranscriptDB {
  /**
   * The list of transcripts in the database
   */
  private _transcripts: Transcript[] = [];

  /**
   * The last assigned student ID
   */
  private _lastID: number = 0;

  /**
   * Adds a new student to the database
   * @param newName - the name of the student
   * @returns the newly-assigned ID for the new student
   */
  addStudent(newName: string): StudentID {
    this._lastID += 1;
    const newID = this._lastID;
    const newStudent: Student = { studentID: newID, studentName: newName };
    this._transcripts.push({ student: newStudent, grades: [] });
    return newID;
  }

  /**
   * Returns the index of the transcript for a given student ID in the
   * database. If this function returns successfully, the id can be assumed to
   * be a valid student ID.
   *
   * @param id - the id to look up
   * @returns the index of this transcript for this student ID in the `_transcripts` array
   * @throws if the there is no transcript with the given student ID
   */
  private _getIndexForId(id: StudentID): number {
    const index: number = this._transcripts.findIndex((t) => t.student.studentID === id);
    if (index === -1) {
      throw new Error(`Transcript not found for student with ID ${id}`);
    }
    return index;
  }

  /**
   * Returns the transcript for a student
   *
   * @param id - a student ID
   * @returns the transcript for this student with this ID
   * @throws if the there is no transcript with the given student ID
   */
  getTranscript(id: StudentID): Transcript {
    const index = this._getIndexForId(id); // will throw unless _transcripts[index] exists
    return this._transcripts[index]!;
  }

  /**
   * Adds a grade for a student
   *
   * @param id - a student ID
   * @param courseName - Name of the course
   * @param courseGrade - Student's grade in the course
   * @throws if the there is no transcript with the given student ID
   */
  addGrade(id: StudentID, courseName: Course, courseGrade: number): void {
    const index = this._getIndexForId(id); // will throw unless _transcripts[index] exists
    this._transcripts[index]!.grades.push({ course: courseName, grade: courseGrade });
  }
}

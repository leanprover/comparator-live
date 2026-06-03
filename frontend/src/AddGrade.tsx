import { useState } from "react";

import { usePasswordContext } from "./PasswordContext.ts";
import { addGrade, serviceErrorToStr } from "./service.ts";

export default function AddGrade() {
  const [feedback, setFeedback] = useState<null | string>(null);
  const [studentID, setStudentID] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseGrade, setCourseGrade] = useState("");
  const password = usePasswordContext();

  return (
    <>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          addGrade(password, studentID, courseName, courseGrade)
            .then(() => setFeedback(`Added grade of ${courseGrade} in ${courseName} successfully`))
            .catch((err: unknown) => setFeedback(serviceErrorToStr(err)));
        }}
      >
        <label htmlFor="studentIdForAddGrade">Student ID:</label>
        <input
          id="studentIdForAddGrade"
          value={studentID}
          onChange={(ev) => {
            setFeedback(null);
            setStudentID(ev.target.value);
          }}
        />
        <br />
        <label htmlFor="addGradeCourse">Course name:</label>
        <input
          id="addGradeCourse"
          value={courseName}
          onChange={(ev) => {
            setFeedback(null);
            setCourseName(ev.target.value);
          }}
        />
        <br />
        <label htmlFor="addGradeGrade">Course grade:</label>
        <input
          id="addGradeGrade"
          value={courseGrade}
          onChange={(ev) => {
            setFeedback(null);
            setCourseGrade(ev.target.value);
          }}
        />
        <br />
        <button>Add grade</button>
      </form>
      <div className="feedback">{feedback}</div>
    </>
  );
}

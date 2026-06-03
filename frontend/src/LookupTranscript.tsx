import type { Transcript } from "@sourdough/shared";
import { useState } from "react";

import { usePasswordContext } from "./PasswordContext.ts";
import { getTranscript, serviceErrorToStr } from "./service.ts";

export default function LookupTranscript() {
  const [feedback, setFeedback] = useState<
    null | { error: string } | { success: false } | { success: true; transcript: Transcript }
  >(null);
  const [studentID, setStudentID] = useState("");
  const password = usePasswordContext();

  return (
    <>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          getTranscript(password, studentID)
            .then((res) => setFeedback(res))
            .catch((err: unknown) => setFeedback({ error: serviceErrorToStr(err) }));
        }}
      >
        <label htmlFor="idToView">Enter student id to view:</label>
        <input
          id="idToView"
          value={studentID}
          onChange={(ev) => {
            setFeedback(null);
            setStudentID(ev.target.value);
          }}
        />
        <br />
        <button>View</button>
      </form>
      <div className="feedback">
        {feedback &&
          ("error" in feedback ? (
            feedback.error
          ) : !feedback.success ? (
            `No student exists with id ${studentID}`
          ) : (
            <>
              {`Transcript for student ${feedback.transcript.student.studentName} (id ${feedback.transcript.student.studentID})`}
              <ul>
                {feedback.transcript.grades.map(({ course, grade }, ndx) => (
                  /*
                   * Usually bad to have an index as a key!
                   * The right fix would be to give a unique id to a course+grade record.
                   */
                  <li key={ndx}>{`${grade} in ${course}`}</li>
                ))}
              </ul>
            </>
          ))}
      </div>
    </>
  );
}

import { useState } from "react";

import { PasswordContext } from "./PasswordContext.ts";
import TranscriptTabs from "./TranscriptTabs.tsx";

export default function App() {
  const [password, setPassword] = useState("");

  return (
    <>
      <h1>Transcript service</h1>
      <div>
        <label htmlFor="password">Enter credentials:</label>
        <br />
        <input id="password" type="password" onChange={(ev) => setPassword(ev.target.value)} />
        <PasswordContext.Provider value={password}>
          <TranscriptTabs />
        </PasswordContext.Provider>
      </div>
    </>
  );
}

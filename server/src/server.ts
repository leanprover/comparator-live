// Run this script to launch the server.
/* eslint no-console: "off" */

import * as path from "node:path";

import express from "express";

import { app } from "./app.ts";

// This if-then-else check for MODE=production helps avoid a common source of
// pain:
//
// 1. You build the website (`npm run build`) and test it in production mode
// 2. You want to update the frontend, so you start the Vite development
//    server and edit code
// 3. You don't realize you have the *Express* server open in your browser,
//    serving stale files created during the build command in step #1.
//    You can't get any frontend changes to show up in the browser, no
//    matter what you do.
if (process.env.NODE_ENV === "production") {
  // In production mode, we want to serve the frontend code from Express
  app.use(express.static(path.join(import.meta.dirname, "../../frontend/dist")));
  app.get(/(.*)/, (req, res) =>
    res.sendFile(path.join(import.meta.dirname, "../../frontend/dist/index.html")),
  );
} else {
  app.get("/", (req, res) => {
    res.send(
      "You are connecting directly to the API server in development mode! " +
        "You probably want to look elsewhere for the Vite frontend.",
    );
    res.end();
  });
}

// Actually start the server
const PORT = parseInt(process.env.PORT || "3000");
app.listen(PORT, () => {
  console.log(`Server started at ${import.meta.dirname}`);
  console.log(`Server is running on port ${PORT}`);
});

// Run this script to launch the server.
/* eslint no-console: "off" */

import express from "express";

import { stats } from "./watchdog.ts";

const PORT = parseInt(process.env.PORT || "3009");

const app = express();
app.get("/", (_req, res) => {
  res.set("Content-Type", "text/plain; charset=ascii");
  res.send(
    Object.entries(stats())
      .map(
        ([key, value]) =>
          `# TYPE comparator_watchdog_${key} gauge\ncomparator_watchdog_${key} ${value}\n`,
      )
      .toSorted()
      .join(""),
  );
});
app.listen(PORT, () => {
  console.log(`Comparator watchdog is running on port ${PORT}`);
});

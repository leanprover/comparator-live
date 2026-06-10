import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ROOT_DIR, sha256, WORK_DIR } from "./util.ts";

const REPO_URL = "git@github.com:leanprover/lean-eval.git";
const REPO_DIR = join(WORK_DIR, "lean-eval");
const GENERATED_DIR = join(REPO_DIR, "generated");

async function main() {
  if (existsSync(REPO_DIR)) {
    console.error(`Pulling latest changes in ${REPO_DIR}`);
    execSync("git pull --ff-only", { cwd: REPO_DIR, stdio: "inherit" });
  } else {
    console.error(`Cloning ${REPO_URL} as ${REPO_DIR}`);
    execSync(`git clone ${REPO_URL} ${REPO_DIR}`, { cwd: WORK_DIR, stdio: "inherit" });
  }

  const projects = await readdir(GENERATED_DIR, { withFileTypes: true });
  const files = await Promise.all(
    projects.map(async (d) => {
      if (!d.isDirectory()) return null;
      const proj = d.name;
      const dir = join(GENERATED_DIR, d.name);
      try {
        const readme = await readFile(join(dir, "README.md"));
        const description = readme.toString("utf-8").split("\n")[2]?.trim() ?? "";
        if (description === "") throw new Error("README line 3 empty");
        const challenge = await readFile(join(dir, "Challenge.lean"));
        const challengeHash = sha256(challenge.toString("utf-8"));
        return { proj, description, challengeHash };
      } catch (e) {
        console.error(`skipping ${d.name}: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      }
    }),
  );

  const trusted = Object.fromEntries(
    files
      .filter((a) => a !== null)
      .toSorted((a, b) => a.proj.localeCompare(b.proj))
      .map(({ proj, description, challengeHash }) => [
        challengeHash,
        {
          name: description,
          sources: [
            `https://lean-lang.org/eval/problems/${proj}/`,
            `https://github.com/leanprover/lean-eval/tree/main/generated/${proj}/`,
          ],
        },
      ]),
  );

  await writeFile(join(ROOT_DIR, "trusted", "lean-eval.json"), JSON.stringify(trusted));
}

await main();

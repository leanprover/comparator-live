import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { exit } from "node:process";

import { ROOT_DIR, sha256 } from "./util.ts";

const PROJECT_DIR = join(ROOT_DIR, "Projects", "MathlibDemo", "TrustedChallenges");

async function main() {
  if (!existsSync(PROJECT_DIR)) {
    console.error(`Directory does not exist ${PROJECT_DIR}`);
    exit(1);
  }

  const challenges = await readdir(PROJECT_DIR);
  const files = await Promise.all(
    challenges.map(async (chall): Promise<null | [string, { name: string; sources: string[] }]> => {
      if (extname(chall) !== ".lean") return null;
      const contents = (await readFile(join(PROJECT_DIR, chall))).toString("utf-8").split("\n");
      const sources: string[] = [];
      while (contents[0]?.startsWith("-- http")) {
        sources.push(contents.shift()!.slice(3).trim());
      }

      const name = basename(chall, ".lean");
      return [sha256(contents.join("\n")), { name, sources }];
    }),
  );

  const trusted = Object.fromEntries(
    files.filter((a) => a !== null).toSorted(([a], [b]) => a.localeCompare(b)),
  );

  await writeFile(join(ROOT_DIR, "trusted", "demos.json"), JSON.stringify(trusted));
}

await main();

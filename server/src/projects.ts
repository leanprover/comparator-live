import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { exit } from "node:process";

import type { ProjectListing } from "@comparator/shared";
import { z } from "zod";

import { PROJ_ROOT } from "./env.ts";

const zLeanWebProjectConfig = z.object({
  name: z.string(),
  hidden: z.boolean().optional(),
  default: z.boolean().optional(),
  sortOrder: z.number().min(0).optional(),
  comparator: z.boolean().optional(),
});

function toolchainToName(toolchain: string, prefixLean: boolean): string {
  const nightly = toolchain.match(/^leanprover\/lean4:nightly-(.*)$/);
  if (nightly) return prefixLean ? `Lean ${nightly[1]}` : nightly[1]!;
  const release = toolchain.match(/^leanprover\/lean4:(.*)$/);
  if (release) return prefixLean ? `Lean ${release[1]}` : release[1]!;
  return "Lean";
}

/**
 * Gets a sorted list of projects that are set up for comparator.
 *
 * Mimics `/api/projects` endpoint for lean4web, but goes ahead and sorts
 * server-side: the client should treat the default project as the first one
 * in the list.
 */
export async function getProjects(): Promise<ProjectListing[]> {
  const entries = await readdir(PROJ_ROOT, { withFileTypes: true });

  const projects = (
    await Promise.all([
      ...entries.map(async (entry) => {
        if (!entry.isDirectory()) return null;
        const projectDir = join(PROJ_ROOT, entry.name);
        const configJson = join(projectDir, "leanweb-config.json");
        try {
          const config = zLeanWebProjectConfig.parse(
            JSON.parse(await readFile(configJson, "utf-8")),
          );
          const toolchain = (await readFile(join(projectDir, "lean-toolchain"), "utf-8")).trim();
          if (!config.comparator) return null;

          for (const file of [
            "Challenge.lean",
            "Solution.lean",
            "ChallengeThms.lean",
            "config.json",
          ]) {
            if (!(await stat(join(projectDir, file))).isFile()) {
              throw new Error(`Comparator project ${entry.name} does not include ${file}`);
            }
          }

          return {
            project: entry.name,
            name: config.name
              .replaceAll("_LeanVers_", toolchainToName(toolchain, true))
              .replaceAll("_Vers_", toolchainToName(toolchain, false)),
            hidden: config.hidden ?? false,
            sortOrder: config.default ? Infinity : (config.sortOrder ?? 0),
          };
        } catch (err) {
          console.error(
            `Error reading config from ${projectDir}: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        }
      }),
    ])
  )
    .filter((x) => x !== null)
    .toSorted((a, b) => {
      if (a.sortOrder === b.sortOrder) return a.name.localeCompare(b.name);
      return b.sortOrder - a.sortOrder;
    })
    .map(({ sortOrder, ...rest }) => rest);

  if (projects.length === 0) {
    throw new Error(`No valid projects found in ${PROJ_ROOT}`);
  }
  return projects;
}

// If there aren't projects in place, don't run
try {
  const projects = await getProjects();
  console.log(`Comparator supports project(s) ${projects.map(({ project }) => project)}`);
} catch (err) {
  console.error(
    `Aborting due to problem reading projects: ${err instanceof Error ? err.message : String(err)}`,
  );
  exit(1);
}

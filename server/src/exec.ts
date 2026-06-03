import { execFile, spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { z } from "zod";

export interface VerifyTask {
  taskId: string;
  project: string;
  challenge: string;
  solution: string;
}

const PROJ_ROOT = resolve(process.env.COMPARATOR_PROJECT_BASE_PATH ?? "../Projects");
export const WORKING_TMP_ROOT_DIR = await mkdtemp(join(tmpdir(), "comparator-"));
console.log("Comparator project root: " + PROJ_ROOT);
console.log("Comparator working tmp root: " + WORKING_TMP_ROOT_DIR);

function workingDir(taskId: string) {
  return join(WORKING_TMP_ROOT_DIR, taskId);
}

export class CheckingError extends Error {
  output: string;
  constructor(description: string, output: string) {
    super(description);
    this.output = output;
  }
}

const BUFFER_LIMIT = 1_000_000;
const BACKUP_SIGKILL_MS = 120_000;

/**
 * Spawns with limited options and returns a promise with combined output
 * (stdout/stderr combined). This will be truncated at `BUFFER_LIMIT`,
 * the `stdout` and `stderr` callback options can be used to get non-truncated
 * output for individual streams, if specified they are called whenever a
 * "data" event is received from the process.
 */
function spawnPromise(
  command: string,
  args?: readonly string[],
  options?: {
    description?: string;
    stdout?: (data: string) => void;
    stderr?: (data: string) => void;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  },
) {
  const description = options?.description ?? "Process";
  const proc = spawn(command, args, { cwd: options?.cwd, env: options?.env ?? process.env });
  let size = 0;
  let overflow = false;
  const output: string[] = [];
  const handleStr = (str: string) => {
    if (overflow) return;
    if (str.length + size > BUFFER_LIMIT) {
      overflow = true;
      output.push(str.slice(0, BUFFER_LIMIT - size) + "\n...clipped...");
      size = BUFFER_LIMIT;
    } else {
      output.push(str);
      size += str.length;
    }
  };

  proc.stdout.on("data", (data) => {
    const str = data instanceof Buffer ? data.toString("utf8") : String(data);
    options?.stdout?.(str);
    handleStr(str);
  });
  proc.stderr.on("data", (data) => {
    const str = data instanceof Buffer ? data.toString("utf8") : String(data);
    options?.stderr?.(str);
    handleStr(str);
  });

  const cancelKill = setTimeout(() => proc.kill("SIGKILL"), BACKUP_SIGKILL_MS);
  return new Promise((resolve, reject) => {
    proc.on("error", (err) => {
      reject(new CheckingError(`${description} failed: ${err.message}`, output.join("")));
    });
    proc.on("close", () => {
      clearTimeout(cancelKill);
      resolve(undefined);
    });
  })
    .then(() => {
      if (proc.exitCode !== 0) {
        throw new CheckingError(
          `${description} returned a non-zero exit code, indicating failure`,
          output.join(""),
        );
      }
    })
    .then(() => {
      return output.join("");
    });
}

const staging = (module: string) => `${module}-staging`;

export async function createTaskDir(taskId: string) {
  await mkdir(join(workingDir(taskId), "Challenge", ".lake"), { recursive: true });
  await mkdir(join(workingDir(taskId), staging("Challenge")));
  await mkdir(join(workingDir(taskId), "Solution", ".lake"), { recursive: true });
  await mkdir(join(workingDir(taskId), staging("Solution")));
}

function projectDir(project: string) {
  return join(PROJ_ROOT, project);
}

const script = (scriptName: string) => join(import.meta.dirname, "..", "scripts", scriptName);

/**
 * Write <module> into the task directory at `$DIR/<module>/<module>.lean`,
 * and put the artifacts from building the module into
 * `$DIR/<module>/.lake/build`
 */
export async function compile(
  taskId: string,
  project: string,
  module: string,
  leanContents: string,
) {
  const projDir = projectDir(project);
  const workDir = workingDir(taskId);
  await writeFile(join(workDir, module, module + ".lean"), leanContents);

  let cmd: string;
  let args: string[];
  if (process.env.NODE_ENV === "development") {
    console.error("Running insecure compile without a sandbox", { taskId, project, module });

    await Promise.all([
      cp(join(projDir, "lake-manifest.json"), join(workDir, module, "lake-manifest.json")),
      cp(join(projDir, "lakefile.toml"), join(workDir, module, "lakefile.toml")),
      cp(join(projDir, "lean-toolchain"), join(workDir, module, "lean-toolchain")),
      symlink(join(projDir, ".lake", "packages"), join(workDir, module, ".lake", "packages")),
    ]);

    cmd = "lake";
    args = ["build", module];
  } else {
    cmd = script("compile.sh");
    args = [projDir, workDir, module];
  }

  return spawnPromise(cmd, args, {
    cwd: join(workDir, module),
    description: `Compilation of olean for ${module}`,
  });
}

export async function collectThms(taskId: string, project: string) {
  const module = "Challenge";
  const projDir = projectDir(project);
  const workDir = workingDir(taskId);

  let cmd: string;
  let args: string[];
  if (process.env.NODE_ENV === "development") {
    console.error("Running insecure collectThms without a sandbox", { taskId, project });

    await cp(join(projDir, "ChallengeThms.lean"), join(workDir, module, "ChallengeThms.lean"));

    cmd = "lake";
    args = ["exe", "challenge-thms"];
  } else {
    cmd = script("collectThms.sh");
    args = [projDir, workDir];
  }

  const stdout: string[] = [];
  await spawnPromise(cmd, args, {
    cwd: join(workDir, module),
    description: "Challenge theorem collection",
    stdout: (str) => stdout.push(str),
  });

  return z.array(z.string()).parse(JSON.parse(stdout.join("")));
}

export async function comparator(taskId: string, project: string, theoremNames: string[]) {
  const projDir = projectDir(project);
  const workDir = workingDir(taskId);

  await writeFile(
    join(workDir, "Challenge", "config.json"),
    JSON.stringify(
      {
        challenge_module: "Challenge",
        solution_module: "Solution",
        theorem_names: theoremNames,
        permitted_axioms: ["propext", "Quot.sound", "Classical.choice"],
        enable_nanoda: false,
      },
      undefined,
      2,
    ),
  );

  let cmd: string;
  let args: string[];
  let env: { [key: string]: string };
  if (process.env.NODE_ENV === "development") {
    console.error("Running insecure comparator without a sandbox", {
      taskId,
      project,
      theoremNames,
    });

    // Move files into place
    const mvSrc = join(workDir, "Solution", ".lake", "build", "lib", "lean");
    const mvDst = join(workDir, "Challenge", ".lake", "build", "lib", "lean");
    await Promise.all(
      (await readdir(mvSrc)).map((name) => cp(join(mvSrc, name), join(mvDst, name))),
    );
    await cp(
      join(workDir, "Solution", "Solution.lean"),
      join(workDir, "Challenge", "Solution.lean"),
    );

    cmd = "lake";
    args = ["exe", "comparator", "config.json"];
    env = {
      COMPARATOR_LANDRUN: ".lake/packages/comparator/scripts/fake-landrun.sh",
      COMPARATOR_LEAN4EXPORT: ".lake/packages/lean4export/.lake/build/bin/lean4export",
    };
  } else {
    cmd = script("comparator.sh");
    args = [projDir, workDir];
    env = {};
  }

  return spawnPromise(cmd, args, {
    cwd: join(workDir, "Challenge"),
    description: "Comparator",
    env: { ...process.env, ...env },
  });
}

const execFileAsync = promisify(execFile);
export async function cleanup(taskId: string) {
  const dir = workingDir(taskId);
  try {
    // Necessary to allow the overlayfs-created working directories to be deleted
    await execFileAsync("chmod", ["-R", "u+rwX", dir]);
  } catch (err) {
    console.error("chmod during cleanup failed", { taskId, err });
  }
  await rm(workingDir(taskId), { recursive: true, force: true });
}

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { exit } from "node:process";

if (!process.env.npm_config_local_prefix!) {
  console.error("This script must be run through `npm run`");
  exit(1);
}
export const ROOT_DIR = process.env.npm_config_local_prefix;
export const WORK_DIR = join(ROOT_DIR, ".scripts-tmp");
execSync(`mkdir -p ${WORK_DIR}`);

/**
 * Calculate sha256 hash (modulo removing trailing whitespace, adding a newline)
 */
export function sha256(contents: string) {
  const hash = createHash("sha256");
  hash.update(contents.trimEnd() + "\n");
  return hash.digest("hex");
}

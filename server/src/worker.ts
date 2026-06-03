import type { StartVerifyRequest, VerifyResult } from "@comparator/shared";

import { CheckingError, cleanup, collectThms, comparator, compile, createTaskDir } from "./exec.ts";
import { doMockWork } from "./mockworker.ts";

const USE_MOCK_VERIFICATION = process.env.USE_MOCK_VERIFICATION === "true";
const KEEP_COMPARATOR_TEMP_FILES = process.env.KEEP_COMPARATOR_TEMP_FILES === "true";

export async function doWork(
  taskId: string,
  { project, challenge, solution }: StartVerifyRequest,
): Promise<VerifyResult> {
  if (USE_MOCK_VERIFICATION) {
    return doMockWork(challenge, solution);
  }

  try {
    await createTaskDir(taskId);
    await Promise.all([
      compile(taskId, project, "Challenge", challenge),
      compile(taskId, project, "Solution", solution),
    ]);

    const theoremNames = await collectThms(taskId, project);

    await comparator(taskId, project, theoremNames);
    return { type: "verification-ok", theoremNames };
  } catch (err) {
    if (err instanceof CheckingError) {
      return {
        type: "verification-failed",
        description: err.message,
        output: err.output,
      };
    }
    return {
      type: "verification-failed",
      description: "Unexpected error",
      output: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (!KEEP_COMPARATOR_TEMP_FILES) {
      await cleanup(taskId);
    }
  }
}

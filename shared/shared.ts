import { z } from "zod";

export const zStartVerifyRequest = z.object({
  project: z.string(),
  challenge: z.string(),
  solution: z.string(),
});
export type StartVerifyRequest = z.infer<typeof zStartVerifyRequest>;

export const zStartVerifyResponse = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready"), requestId: z.uuidv4() }),
  z.object({ type: z.literal("project-not-supported") }),
]);
export type StartVerifyResponse = z.infer<typeof zStartVerifyResponse>;

export const zVerifier = z.enum(["Lean", "Nanoda"]);
export type Verifier = z.infer<typeof zVerifier>;

const zJudgement = z.enum(["success", "failure", "skipped"]);
const zProcOutput = z.union([
  z.object({ str: z.object({ string: z.string() }) }),
  z.object({ proc: z.object({ stdout: z.string(), stderr: z.string() }) }),
]);
export const zProcResult = z.object({ judgement: zJudgement, output: zProcOutput });
export const zComparatorResult = z.object({
  version: z.string(),
  sandboxed: z.boolean(),
  judgement: z.enum(["accepted", "failure"]),
  report: z.object({
    resolve_dependencies: zProcResult,
    build_challenge: zProcResult,
    build_solution: zProcResult,
    export_challenge: zProcResult,
    export_solution: zProcResult,
    compare_statements: zProcResult,
    check_axioms: zProcResult,
    kernel_reports: z.record(z.string(), zProcResult),
  }),
});

const zVerifyPossibilities = [
  z.object({
    type: z.literal("verification-ok"),
    theoremNames: z.array(z.string()),
    output: z.string(),
  }),
  z.object({
    type: z.literal("verification-failed"),
    description: z.string(),
    output: z.optional(z.string()),
  }),
] as const;
export const zVerifyResult = z.discriminatedUnion("type", zVerifyPossibilities);
export type VerifyResult = z.infer<typeof zVerifyResult>;

export const zCheckVerifyResponse = z.discriminatedUnion("type", [
  z.object({ type: z.literal("in-queue"), position: z.int().gte(0) }),
  z.object({ type: z.literal("in-progress") }),
  ...zVerifyPossibilities,
]);
export type CheckVerifyResponse = z.infer<typeof zCheckVerifyResponse>;

/** Client-only superset of `CheckVerifyResponse` */
export type CheckVerifyStatus =
  CheckVerifyResponse | { type: "idle" } | { type: "in-preparation" } | { type: "connection-lost" };

export function checkVerifyStatusIsTerminal(status: CheckVerifyStatus) {
  return status.type === "verification-failed" || status.type === "verification-ok";
}

export const zProjectListing = z.object({
  project: z.string(),
  name: z.string(),
  hidden: z.boolean(),
});

export type ProjectListing = z.infer<typeof zProjectListing>;
export const zProjectListResponse = z.union([
  z.object({ error: z.string() }),
  z.array(zProjectListing),
]);

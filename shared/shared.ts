import { z } from "zod";

export const zStartVerifyRequest = z.object({
  project: z.string(),
  challenge: z.string(),
  solution: z.string(),
});
export type StartVerifyRequest = z.infer<typeof zStartVerifyRequest>;

export const zStartVerifyResponse = z.discriminatedUnion("type", [
  z.object({ type: z.literal("enqueued"), requestId: z.uuidv4() }),
  z.object({ type: z.literal("project-not-supported") }),
]);
export type StartVerifyResponse = z.infer<typeof zStartVerifyResponse>;

export const zVerifyRequest = z.object({ requestId: z.string() });
export type VerifyRequest = z.infer<typeof zVerifyRequest>;

export const zVerifier = z.enum(["Lean", "Nanoda"]);
export type Verifier = z.infer<typeof zVerifier>;

const zVerifyPossibilities = [
  z.object({ type: z.literal("verification-ok"), theoremNames: z.array(z.string()) }),
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
  z.object({ type: z.literal("not-found") }),
  ...zVerifyPossibilities,
]);
export type CheckVerifyResponse = z.infer<typeof zCheckVerifyResponse>;

/** Client-only superset of `CheckVerifyResponse` */
export type CheckVerifyStatus =
  | CheckVerifyResponse
  | { type: "initial-load" }
  | { type: "in-preparation" };

export type ProjectListing = { project: string; name: string; hidden: boolean };
export type ProjectsResponse = { error: string } | ProjectListing[];

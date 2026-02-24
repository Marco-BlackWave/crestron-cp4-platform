import { apiFetch } from "./client";
import { joinContractSchema, JoinContract } from "../schema/joinContractSchema";

export async function loadJoinContract(): Promise<JoinContract> {
  const json = await apiFetch("/joincontract");
  const parsed = joinContractSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`JoinContract validation failed: ${message}`);
  }
  return parsed.data;
}

import { apiFetch } from "./client";
import { systemConfigSchema, SystemConfig } from "../schema/systemConfigSchema";

export async function loadSystemConfig(): Promise<SystemConfig> {
  const json = await apiFetch("/systemconfig");
  const parsed = systemConfigSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`SystemConfig validation failed: ${message}`);
  }
  return parsed.data;
}

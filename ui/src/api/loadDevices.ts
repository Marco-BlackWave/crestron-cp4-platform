import { apiFetch } from "./client";
import { deviceProfileSchema, DeviceProfile } from "../schema/deviceProfileSchema";

export async function loadDevices(): Promise<DeviceProfile[]> {
  const json = await apiFetch("/devices");
  if (!Array.isArray(json)) {
    throw new Error("Expected an array of device profiles.");
  }
  // Parse individually — skip items that don't match the schema (e.g. catalog.json)
  const results: DeviceProfile[] = [];
  for (const item of json) {
    const parsed = deviceProfileSchema.safeParse(item);
    if (parsed.success) {
      results.push(parsed.data);
    }
  }
  return results;
}

export async function loadDevice(id: string): Promise<DeviceProfile> {
  const json = await apiFetch(`/devices/${encodeURIComponent(id)}`);
  const parsed = deviceProfileSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Device profile validation failed: ${message}`);
  }
  return parsed.data;
}

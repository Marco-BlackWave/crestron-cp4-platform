import { apiFetch } from "./client";
import { deviceProfileSchema, DeviceProfile } from "../schema/deviceProfileSchema";
import { z } from "zod";

export async function loadDevices(apiKey: string): Promise<DeviceProfile[]> {
  const json = await apiFetch("/devices", apiKey);
  const parsed = z.array(deviceProfileSchema).safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Device profiles validation failed: ${message}`);
  }
  return parsed.data;
}

export async function loadDevice(apiKey: string, id: string): Promise<DeviceProfile> {
  const json = await apiFetch(`/devices/${encodeURIComponent(id)}`, apiKey);
  const parsed = deviceProfileSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Device profile validation failed: ${message}`);
  }
  return parsed.data;
}

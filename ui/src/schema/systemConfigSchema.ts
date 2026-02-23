import { z } from "zod";

const deviceRefSchema = z.object({
  profileId: z.string(),
  protocol: z.string(),
  port: z.string().optional(),
  address: z.string().optional(),
  objectId: z.number().optional(),
});

const roomConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  joinOffset: z.number().int().nonnegative(),
  subsystems: z.array(z.string()),
  devices: z.record(z.string(), deviceRefSchema),
  sources: z.array(z.string()),
});

const sourceConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
});

const sceneActionsSchema = z.record(z.string(), z.union([z.string(), z.number()]));

const sceneConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  rooms: z.array(z.string()),
  actions: sceneActionsSchema,
});

const systemInfoSchema = z.object({
  name: z.string(),
  eiscIpId: z.string(),
  eiscIpAddress: z.string(),
});

export const systemConfigSchema = z.object({
  schemaVersion: z.string(),
  projectId: z.string(),
  processor: z.string(),
  system: systemInfoSchema,
  rooms: z.array(roomConfigSchema),
  sources: z.array(sourceConfigSchema),
  scenes: z.array(sceneConfigSchema),
});

export type SystemConfig = z.infer<typeof systemConfigSchema>;
export type RoomConfig = z.infer<typeof roomConfigSchema>;
export type SourceConfig = z.infer<typeof sourceConfigSchema>;
export type SceneConfig = z.infer<typeof sceneConfigSchema>;
export type DeviceRef = z.infer<typeof deviceRefSchema>;

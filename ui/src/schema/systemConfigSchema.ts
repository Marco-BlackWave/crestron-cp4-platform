import { z } from "zod";

export const subsystemEnum = z.enum(["av", "lighting", "shades", "hvac", "security"]);
export const protocolEnum = z.enum(["ir", "serial", "ip", "bacnet", "modbus", "knx", "artnet", "shelly", "pjlink"]);
export const sourceTypeEnum = z.enum(["streaming", "settop", "audio", "gaming", "disc", "other"]);

const deviceRefSchema = z.object({
  profileId: z.string(),
  protocol: protocolEnum,
  port: z.string().optional(),
  address: z.string().optional(),
  objectId: z.number().optional(),
});

const roomConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  joinOffset: z.number().int().nonnegative(),
  subsystems: z.array(subsystemEnum),
  devices: z.record(z.string(), deviceRefSchema),
  sources: z.array(z.string()),
});

const sourceConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: sourceTypeEnum,
});

const sceneActionsSchema = z.record(z.string(), z.union([z.string(), z.number()]));

const sceneConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rooms: z.array(z.string()),
  actions: sceneActionsSchema,
});

const systemInfoSchema = z.object({
  name: z.string().min(1),
  eiscIpId: z.string(),
  eiscIpAddress: z.string(),
});

/** Read-only schema (permissive, for loading existing configs) */
export const systemConfigSchema = z.object({
  schemaVersion: z.string(),
  projectId: z.string(),
  processor: z.string(),
  system: systemInfoSchema,
  rooms: z.array(roomConfigSchema),
  sources: z.array(sourceConfigSchema),
  scenes: z.array(sceneConfigSchema),
});

/** Write schema with cross-field validation (for saving) */
export const systemConfigWriteSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    projectId: z.string().min(1),
    processor: z.preprocess(
      (v) => (typeof v === "string" ? v.toUpperCase() : v),
      z.literal("CP4")
    ),
    system: systemInfoSchema,
    rooms: z.array(roomConfigSchema),
    sources: z.array(sourceConfigSchema),
    scenes: z.array(sceneConfigSchema),
  })
  .superRefine((config, ctx) => {
    // Duplicate room IDs
    const roomIds = new Set<string>();
    for (let i = 0; i < config.rooms.length; i++) {
      const room = config.rooms[i];
      if (roomIds.has(room.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate room ID '${room.id}'`,
          path: ["rooms", i, "id"],
        });
      }
      roomIds.add(room.id);
    }

    // Join offset spacing >= 100 and < 900
    const offsets: { offset: number; index: number }[] = [];
    for (let i = 0; i < config.rooms.length; i++) {
      const room = config.rooms[i];
      if (room.joinOffset >= 900) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Join offset ${room.joinOffset} must be < 900 (900+ reserved for system)`,
          path: ["rooms", i, "joinOffset"],
        });
      }
      for (const prev of offsets) {
        if (Math.abs(room.joinOffset - prev.offset) < 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Join offset ${room.joinOffset} too close to room at offset ${prev.offset} (min spacing: 100)`,
            path: ["rooms", i, "joinOffset"],
          });
        }
      }
      offsets.push({ offset: room.joinOffset, index: i });
    }

    // Duplicate source IDs
    const sourceIds = new Set<string>();
    for (let i = 0; i < config.sources.length; i++) {
      if (sourceIds.has(config.sources[i].id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate source ID '${config.sources[i].id}'`,
          path: ["sources", i, "id"],
        });
      }
      sourceIds.add(config.sources[i].id);
    }

    // Source refs in rooms resolve to defined sources
    for (let i = 0; i < config.rooms.length; i++) {
      for (let j = 0; j < config.rooms[i].sources.length; j++) {
        const ref = config.rooms[i].sources[j];
        if (!sourceIds.has(ref)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Room '${config.rooms[i].id}' references undefined source '${ref}'`,
            path: ["rooms", i, "sources", j],
          });
        }
      }
    }

    // Duplicate scene IDs
    const sceneIds = new Set<string>();
    for (let i = 0; i < config.scenes.length; i++) {
      if (sceneIds.has(config.scenes[i].id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate scene ID '${config.scenes[i].id}'`,
          path: ["scenes", i, "id"],
        });
      }
      sceneIds.add(config.scenes[i].id);
    }

    // Scene room refs resolve to defined rooms or "all"
    for (let i = 0; i < config.scenes.length; i++) {
      for (let j = 0; j < config.scenes[i].rooms.length; j++) {
        const ref = config.scenes[i].rooms[j];
        if (ref !== "all" && !roomIds.has(ref)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Scene '${config.scenes[i].id}' references undefined room '${ref}'`,
            path: ["scenes", i, "rooms", j],
          });
        }
      }
    }
  });

export type SystemConfig = z.infer<typeof systemConfigSchema>;
export type RoomConfig = z.infer<typeof roomConfigSchema>;
export type SourceConfig = z.infer<typeof sourceConfigSchema>;
export type SceneConfig = z.infer<typeof sceneConfigSchema>;
export type DeviceRef = z.infer<typeof deviceRefSchema>;
export type Subsystem = z.infer<typeof subsystemEnum>;
export type Protocol = z.infer<typeof protocolEnum>;
export type SourceType = z.infer<typeof sourceTypeEnum>;

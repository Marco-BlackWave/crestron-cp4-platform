import { z } from "zod";

export const subsystemEnum = z.enum(["av", "lighting", "shades", "hvac", "security"]);
export const protocolEnum = z.enum(["ir", "serial", "ip", "bacnet", "modbus", "knx", "artnet", "shelly", "pjlink"]);
export const sourceTypeEnum = z.enum(["streaming", "settop", "audio", "gaming", "disc", "other"]);
export const roomTypeEnum = z.enum(["standard", "technical"]);
export const processorTypeEnum = z.enum(["CP4", "CP3", "RMC4", "VC-4"]);

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
  processorId: z.string().optional(),
  roomType: roomTypeEnum.default("standard").optional(),
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

const processorConfigSchema = z.object({
  id: z.string().min(1),
  processor: processorTypeEnum,
  eiscIpId: z.string().min(1),
  eiscIpAddress: z.string().min(1),
});

const systemInfoSchema = z.object({
  name: z.string().min(1),
  eiscIpId: z.string().optional(),
  eiscIpAddress: z.string().optional(),
  processors: z.array(processorConfigSchema).optional(),
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
      processorTypeEnum
    ),
    system: systemInfoSchema,
    rooms: z.array(roomConfigSchema),
    sources: z.array(sourceConfigSchema),
    scenes: z.array(sceneConfigSchema),
  })
  .superRefine((config, ctx) => {
    // Processor validation
    const processors = config.system.processors;
    const hasProcessors = processors && processors.length > 0;
    const processorIds = new Set<string>();
    const eiscIpIds = new Set<string>();

    if (hasProcessors) {
      for (let i = 0; i < processors.length; i++) {
        const proc = processors[i];
        if (processorIds.has(proc.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate processor ID '${proc.id}'`,
            path: ["system", "processors", i, "id"],
          });
        }
        processorIds.add(proc.id);

        if (eiscIpIds.has(proc.eiscIpId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate EISC IP-ID '${proc.eiscIpId}' on processor '${proc.id}'`,
            path: ["system", "processors", i, "eiscIpId"],
          });
        }
        eiscIpIds.add(proc.eiscIpId);
      }
    } else {
      // Legacy mode: require eiscIpId and eiscIpAddress
      if (!config.system.eiscIpId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "system.eiscIpId is required (or define system.processors array)",
          path: ["system", "eiscIpId"],
        });
      }
      if (!config.system.eiscIpAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "system.eiscIpAddress is required (or define system.processors array)",
          path: ["system", "eiscIpAddress"],
        });
      }
    }

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

      // Validate processorId references
      if (hasProcessors && room.processorId && !processorIds.has(room.processorId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Room '${room.id}' references undefined processor '${room.processorId}'`,
          path: ["rooms", i, "processorId"],
        });
      }
    }

    // Join offset spacing >= 100 and < 900, per-processor if multi-processor
    if (hasProcessors) {
      // Group rooms by processorId and validate offsets per processor
      const roomsByProc = new Map<string, { offset: number; index: number }[]>();
      for (let i = 0; i < config.rooms.length; i++) {
        const room = config.rooms[i];
        const procId = room.processorId ?? "";
        if (!roomsByProc.has(procId)) roomsByProc.set(procId, []);
        if (room.joinOffset >= 900) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Join offset ${room.joinOffset} must be < 900 (900+ reserved for system)`,
            path: ["rooms", i, "joinOffset"],
          });
        }
        const procOffsets = roomsByProc.get(procId)!;
        for (const prev of procOffsets) {
          if (Math.abs(room.joinOffset - prev.offset) < 100) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Join offset ${room.joinOffset} too close to room at offset ${prev.offset} on processor '${procId || "(unassigned)"}' (min spacing: 100)`,
              path: ["rooms", i, "joinOffset"],
            });
          }
        }
        procOffsets.push({ offset: room.joinOffset, index: i });
      }
    } else {
      // Legacy: global offset validation
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
        const srcRef = config.rooms[i].sources[j];
        if (!sourceIds.has(srcRef)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Room '${config.rooms[i].id}' references undefined source '${srcRef}'`,
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
        const roomRef = config.scenes[i].rooms[j];
        if (roomRef !== "all" && !roomIds.has(roomRef)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Scene '${config.scenes[i].id}' references undefined room '${roomRef}'`,
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
export type ProcessorConfig = z.infer<typeof processorConfigSchema>;
export type Subsystem = z.infer<typeof subsystemEnum>;
export type Protocol = z.infer<typeof protocolEnum>;
export type SourceType = z.infer<typeof sourceTypeEnum>;
export type RoomType = z.infer<typeof roomTypeEnum>;
export type ProcessorType = z.infer<typeof processorTypeEnum>;

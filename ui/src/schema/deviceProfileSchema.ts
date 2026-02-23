import { z } from "zod";

const serialSettingsSchema = z.object({
  baudRate: z.number().optional(),
  dataBits: z.number().optional(),
  parity: z.string().optional(),
  stopBits: z.number().optional(),
  commands: z.record(z.string(), z.string()).optional(),
  feedback: z.record(z.string(), z.unknown()).optional(),
});

const ipSettingsSchema = z.object({
  port: z.number().optional(),
  type: z.string().optional(),
  commands: z.record(z.string(), z.string()).optional(),
});

const irSettingsSchema = z.object({
  driverFile: z.string().optional(),
  commands: z.record(z.string(), z.string()).optional(),
});

const protocolsSchema = z.object({
  ir: irSettingsSchema.optional(),
  serial: serialSettingsSchema.optional(),
  ip: ipSettingsSchema.optional(),
}).catchall(z.unknown());

const capabilitiesSchema = z.object({
  discretePower: z.boolean(),
  volumeControl: z.boolean(),
  inputSelect: z.boolean(),
  feedback: z.boolean(),
  warmupMs: z.number().optional(),
  cooldownMs: z.number().optional(),
});

export const deviceProfileSchema = z.object({
  id: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  category: z.string(),
  protocols: protocolsSchema,
  capabilities: capabilitiesSchema,
  sourceModule: z.string().optional(),
  matrix: z.object({
    inputs: z.number(),
    outputs: z.number(),
    routeCommandTemplate: z.string().optional(),
    muteCommandTemplate: z.string().optional(),
    feedbackPattern: z.string().optional(),
  }).optional(),
  dsp: z.object({
    maxChannels: z.number(),
    objectIdFormat: z.string().optional(),
    levelCommandTemplate: z.string().optional(),
    muteCommandTemplate: z.string().optional(),
    subscribeCommandTemplate: z.string().optional(),
  }).optional(),
  media: z.object({
    transportCommands: z.record(z.string(), z.string()).optional(),
    nowPlayingFeedback: z.object({
      trackPattern: z.string().optional(),
      artistPattern: z.string().optional(),
    }).optional(),
  }).optional(),
  gateway: z.object({
    objects: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      dataType: z.string().optional(),
    })).optional(),
  }).optional(),
  feedbackRules: z.array(z.object({
    pattern: z.string(),
    signal: z.string(),
    transform: z.string().optional(),
    value: z.unknown().optional(),
  })).optional(),
});

export type DeviceProfile = z.infer<typeof deviceProfileSchema>;

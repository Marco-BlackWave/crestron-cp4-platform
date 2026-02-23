import { z } from "zod";

const joinContractEntrySchema = z.object({
  join: z.number().int().positive(),
  name: z.string(),
  direction: z.enum(["input", "output"]),
});

const joinTypeContractSchema = z.object({
  digital: z.array(joinContractEntrySchema),
  analog: z.array(joinContractEntrySchema),
  serial: z.array(joinContractEntrySchema),
});

const roomJoinContractSchema = z.object({
  id: z.string(),
  name: z.string(),
  joins: joinTypeContractSchema,
});

const systemJoinContractSchema = z.object({
  digital: z.array(joinContractEntrySchema),
  serial: z.array(joinContractEntrySchema),
});

export const joinContractSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  rooms: z.array(roomJoinContractSchema),
  system: systemJoinContractSchema,
});

export type JoinContract = z.infer<typeof joinContractSchema>;
export type RoomJoinContract = z.infer<typeof roomJoinContractSchema>;
export type JoinContractEntry = z.infer<typeof joinContractEntrySchema>;

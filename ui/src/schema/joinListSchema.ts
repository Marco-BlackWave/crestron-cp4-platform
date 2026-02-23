import { z } from "zod";

const directionSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.toLowerCase() : value),
  z.enum(["input", "output"])
);

const processorSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.toUpperCase() : value),
  z.literal("CP4")
);

const joinEntrySchema = z.object({
  join: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number().int().positive()
  ),
  name: z.string().min(1),
  direction: directionSchema
});

const noDuplicateJoins = (entries: { join: number }[], ctx: z.RefinementCtx, typeName: string) => {
  const seen = new Set<number>();
  for (const entry of entries) {
    if (seen.has(entry.join)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate join number ${entry.join} in ${typeName}`
      });
    }
    seen.add(entry.join);
  }
};

const joinsSchema = z
  .object({
    digital: z.array(joinEntrySchema),
    analog: z.array(joinEntrySchema),
    serial: z.array(joinEntrySchema)
  })
  .superRefine((joins, ctx) => {
    noDuplicateJoins(joins.digital, ctx, "digital");
    noDuplicateJoins(joins.analog, ctx, "analog");
    noDuplicateJoins(joins.serial, ctx, "serial");
  });

export const joinListSchema = z.object({
  schemaVersion: z.literal("1.0"),
  projectId: z.string().min(1),
  processor: processorSchema,
  debugMode: z.boolean().optional(),
  joins: joinsSchema
});

export type JoinListConfig = z.infer<typeof joinListSchema>;
export type JoinEntry = z.infer<typeof joinEntrySchema>;

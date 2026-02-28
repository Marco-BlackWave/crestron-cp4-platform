import { type ScaffoldProcessorSpec, type ScaffoldRoomSpec } from "../api/scaffoldSystemConfig";

export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseRooms(raw: string): ScaffoldRoomSpec[] {
  return splitLines(raw).flatMap((line) => {
    const [nameRaw, subsystemsRaw, roomTypeRaw, processorRaw] = line.split("|").map((part) => part.trim());
    if (!nameRaw) return [];

    const roomType = roomTypeRaw?.toLowerCase() === "technical" ? "technical" : "standard";
    const subsystems = subsystemsRaw
      ? subsystemsRaw.split(",").map((sub) => sub.trim().toLowerCase()).filter(Boolean)
      : undefined;

    const room: ScaffoldRoomSpec = {
      name: nameRaw,
      roomType,
      processorId: processorRaw || undefined,
      subsystems,
    };

    return [room];
  });
}

export function parseProcessors(raw: string): ScaffoldProcessorSpec[] {
  return splitLines(raw)
    .map((line) => {
      const [id, processor, eiscIpId, eiscIpAddress] = line.split("|").map((part) => part.trim());
      if (!id) return null;

      return {
        id,
        processor: processor || "CP4",
        eiscIpId: eiscIpId || "0x03",
        eiscIpAddress: eiscIpAddress || "127.0.0.2",
      } satisfies ScaffoldProcessorSpec;
    })
    .filter((entry): entry is ScaffoldProcessorSpec => entry !== null);
}

export type ParsedJoin = {
  type: "digital" | "analog" | "serial";
  number: number;
  name: string;
  description: string;
  group: string;
};

export type ImportResult = {
  fileName: string;
  joins: ParsedJoin[];
  stats: { totalJoins: number; groups: string[] };
};

export type JoinMapping = {
  elementId: string;
  joinType: "digital" | "analog" | "serial";
  joinNumber: number;
  confidence: "high" | "medium" | "low";
};

export type JoinBlock = {
  base: number;
  count: number;
  offset: number;
  label?: string;
};

export function parseCSharpJoins(content: string, fileName: string): ImportResult {
  const joins: ParsedJoin[] = [];
  const lines = content.split(/\r?\n/);
  const regex = /(digital|analog|serial)\s*(join)?\s*[:=]?\s*(\d+)/i;
  for (const line of lines) {
    const m = line.match(regex);
    if (!m) continue;
    const type = m[1].toLowerCase() as ParsedJoin["type"];
    const number = Number.parseInt(m[3], 10);
    if (!Number.isFinite(number)) continue;
    joins.push({ type, number, name: `${type}-${number}`, description: line.trim(), group: "Imported" });
  }

  return {
    fileName,
    joins,
    stats: {
      totalJoins: joins.length,
      groups: Array.from(new Set(joins.map((j) => j.group))),
    },
  };
}

export function suggestJoinMappings(elements: Array<{ id: string; name?: string; type?: string }>, joins: ParsedJoin[]): JoinMapping[] {
  return elements.slice(0, joins.length).map((el, i) => ({
    elementId: el.id,
    joinType: joins[i].type,
    joinNumber: joins[i].number,
    confidence: "medium",
  }));
}

export function detectJoinPatterns(joins: ParsedJoin[]): { contiguous: boolean; min: number; max: number } {
  if (joins.length === 0) return { contiguous: false, min: 0, max: 0 };
  const nums = joins.map((j) => j.number).sort((a, b) => a - b);
  let contiguous = true;
  for (let i = 1; i < nums.length; i += 1) {
    if (nums[i] !== nums[i - 1] + 1) {
      contiguous = false;
      break;
    }
  }
  return { contiguous, min: nums[0], max: nums[nums.length - 1] };
}

export function multiplyJoinBlock(block: JoinBlock): ParsedJoin[] {
  const out: ParsedJoin[] = [];
  for (let i = 0; i < block.count; i += 1) {
    out.push({
      type: "digital",
      number: block.base + i * block.offset,
      name: (block.label || "Block {n}").replace("{n}", String(i + 1)),
      description: "Generated from multiply block",
      group: "Generated",
    });
  }
  return out;
}

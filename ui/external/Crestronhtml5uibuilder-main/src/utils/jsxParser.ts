import type { JoinType } from "../types/crestron";

export type DetectedElement = {
  id: string;
  name: string;
  tag: string;
  suggestedJoinType: JoinType;
  suggestedDirection: "input" | "output";
  suggestedJoin: number;
};

export type ParsedComponent = {
  name: string;
  props: string[];
  source: string;
  detectedElements: DetectedElement[];
};

export function generateDefaultJoins(index: number): { digital: number; analog: number; serial: number } {
  const base = 1000 + index * 10;
  return { digital: base + 1, analog: base + 2, serial: base + 3 };
}

function detectElements(block: string): DetectedElement[] {
  const matches = [...block.matchAll(/<([A-Za-z][A-Za-z0-9-]*)\b([^>]*)>/g)];
  let i = 0;
  return matches
    .filter((m) => !m[1].startsWith("/"))
    .map((m) => {
      const tag = (m[1] || "div").toLowerCase();
      const attrs = m[2] || "";
      const nameMatch = attrs.match(/(id|name|aria-label)=["']([^"']+)["']/i);
      const name = nameMatch?.[2] || `${tag}-${i + 1}`;
      const interactive = /onClick|onChange|onInput|type=["']range["']|button|input|select|textarea/i.test(attrs) || ["button", "input", "select", "textarea"].includes(tag);
      const suggestedJoinType: JoinType = /range|slider|value|level/i.test(attrs) ? "analog" : /text|label|title/i.test(attrs) ? "serial" : "digital";
      const suggestedDirection: "input" | "output" = /value=|checked=|readOnly|disabled/i.test(attrs) ? "output" : "input";
      i += 1;
      return {
        id: `${tag}-${i}`,
        name,
        tag,
        suggestedJoinType: interactive ? suggestedJoinType : "serial",
        suggestedDirection: interactive ? suggestedDirection : "output",
        suggestedJoin: 1100 + i,
      };
    });
}

export function parseJSXFile(content: string): { components: ParsedComponent[]; errors: string[] } {
  const errors: string[] = [];
  const components: ParsedComponent[] = [];

  const componentRegex = /export\s+(default\s+)?(function|const)\s+([A-Z][A-Za-z0-9_]*)[\s\S]*?(?=\nexport\s+(default\s+)?(function|const)\s+[A-Z]|$)/g;
  const found = [...content.matchAll(componentRegex)];

  if (found.length === 0) {
    const fallbackName = "ImportedComponent";
    components.push({
      name: fallbackName,
      props: [],
      source: content,
      detectedElements: detectElements(content),
    });
    return { components, errors };
  }

  for (const match of found) {
    const name = match[3] || "Component";
    const source = match[0] || "";
    const propsMatch = source.match(/\(([^)]*)\)/);
    const propsRaw = propsMatch?.[1] || "";
    const props = [...propsRaw.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\??\s*:/g)].map((m) => m[1]);
    components.push({
      name,
      props,
      source,
      detectedElements: detectElements(source),
    });
  }

  return { components, errors };
}

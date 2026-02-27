export type JoinType = "digital" | "analog" | "serial";
export type Direction = "input" | "output";
export type WidgetType = "button" | "label" | "slider" | "icon";

type DbMode = "read" | "write" | "readwrite";

export type ImportedWidget = {
  id: string;
  type: WidgetType;
  name: string;
  section: string;
  x: number;
  y: number;
  w: number;
  h: number;
  joinType: JoinType;
  join: number;
  direction: Direction;
  isDatabaseTool: boolean;
  dbEntity: string;
  dbField: string;
  dbMode: DbMode;
  backgroundColor: string;
  color: string;
  borderRadius: string;
  border: string;
  fontSize: string;
  fontWeight: string;
  textAlign: string;
  opacity: string;
  textContent: string;
};

function mapTagToWidgetType(tag: string, attrs: string): WidgetType {
  const lowerTag = tag.toLowerCase();
  const lowerAttrs = attrs.toLowerCase();

  if (lowerTag === "button") return "button";
  if (lowerTag === "img" || lowerTag === "svg" || lowerTag === "icon" || lowerTag === "i") return "icon";
  if (lowerTag === "input" && /type\s*=\s*["']range["']/.test(lowerAttrs)) return "slider";
  if (/slider|range|dimmer|volume/.test(lowerAttrs)) return "slider";
  if (/button|btn|scene/.test(lowerAttrs)) return "button";
  return "label";
}

function parseNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  if (!m) return fallback;
  const value = Number.parseFloat(m[0]);
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function findAttr(attrs: string, key: string): string | undefined {
  const quoted = new RegExp(`${key}\\s*=\\s*["']([^"']*)["']`, "i");
  const expr = new RegExp(`${key}\\s*=\\s*\\{([^}]*)\\}`, "i");
  const q = attrs.match(quoted);
  if (q?.[1] != null) return q[1].trim();
  const e = attrs.match(expr);
  if (e?.[1] != null) return e[1].trim();
  return undefined;
}

function findStyleBlock(attrs: string): string {
  const styleMatch = attrs.match(/style\s*=\s*\{\{([\s\S]*?)\}\}/i);
  return styleMatch?.[1] ?? "";
}

function findStyleNumber(style: string, key: string): number | undefined {
  const keyExpr = new RegExp(key + "\\s*:\\s*([\\\"']?-?\\d+(?:\\.\\d+)?(?:px)?[\\\"']?)", "i");
  const match = style.match(keyExpr);
  if (!match?.[1]) return undefined;
  return parseNumber(match[1], 0);
}

function findStyleString(style: string, key: string): string {
  const keyExpr = new RegExp(key + '\\s*:\\s*["\']?([^,}"\']+)["\']?', "i");
  const match = style.match(keyExpr);
  if (!match?.[1]) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function normalizeJoinType(raw: string | undefined): JoinType {
  const v = (raw ?? "digital").toLowerCase();
  if (v === "analog" || v === "serial") return v;
  return "digital";
}

function normalizeDirection(raw: string | undefined): Direction {
  return (raw ?? "input").toLowerCase() === "output" ? "output" : "input";
}

function normalizeDbMode(raw: string | undefined): DbMode {
  const v = (raw ?? "read").toLowerCase();
  if (v === "write" || v === "readwrite") return v;
  return "read";
}

function extractTextContent(input: string, tagEndIndex: number, isSelfClosing: boolean): string {
  if (isSelfClosing) return "";
  const after = input.substring(tagEndIndex);
  const textMatch = after.match(/^([^<]*)/);
  if (!textMatch?.[1]) return "";
  return textMatch[1].trim();
}

export function parseTsxToWidgets(input: string): ImportedWidget[] {
  const widgets: ImportedWidget[] = [];
  const tagRegex = /<([A-Za-z][A-Za-z0-9._-]*)\b([^>]*?)(\/?)\s*>/g;
  let index = 0;

  for (const match of input.matchAll(tagRegex)) {
    const tag = match[1] ?? "div";
    const attrs = match[2] ?? "";
    const selfClose = match[3] === "/";

    if (attrs.trim().startsWith("/") || tag.startsWith("/")) {
      continue;
    }

    const style = findStyleBlock(attrs);
    const inferredX = 20 + (index % 8) * 28;
    const inferredY = 20 + Math.floor(index / 8) * 28;

    const x = findStyleNumber(style, "left") ?? parseNumber(findAttr(attrs, "x"), inferredX);
    const y = findStyleNumber(style, "top") ?? parseNumber(findAttr(attrs, "y"), inferredY);
    const w = Math.max(60, findStyleNumber(style, "width") ?? parseNumber(findAttr(attrs, "width"), 180));
    const h = Math.max(40, findStyleNumber(style, "height") ?? parseNumber(findAttr(attrs, "height"), 120));

    const join = Math.max(
      0,
      parseNumber(findAttr(attrs, "data-join") ?? findAttr(attrs, "join") ?? findAttr(attrs, "digitalJoin") ?? findAttr(attrs, "analogJoin") ?? findAttr(attrs, "serialJoin"), 0),
    );

    const joinType = normalizeJoinType(
      findAttr(attrs, "data-join-type")
        ?? findAttr(attrs, "joinType")
        ?? (findAttr(attrs, "analogJoin") ? "analog" : undefined)
        ?? (findAttr(attrs, "serialJoin") ? "serial" : undefined),
    );

    const direction = normalizeDirection(findAttr(attrs, "data-direction") ?? findAttr(attrs, "direction"));
    const section = findAttr(attrs, "data-section") ?? findAttr(attrs, "section") ?? "default";

    const type = mapTagToWidgetType(tag, attrs);
    const id = findAttr(attrs, "id") ?? `tsx-${Date.now()}-${index}`;
    const name = findAttr(attrs, "data-name")
      ?? findAttr(attrs, "name")
      ?? findAttr(attrs, "aria-label")
      ?? findAttr(attrs, "className")
      ?? `${type}-${index + 1}`;

    const dbEntity = findAttr(attrs, "data-db-entity") ?? findAttr(attrs, "dbEntity") ?? "";
    const dbField = findAttr(attrs, "data-db-field") ?? findAttr(attrs, "dbField") ?? "";
    const dbMode = normalizeDbMode(findAttr(attrs, "data-db-mode") ?? findAttr(attrs, "dbMode"));
    const isDatabaseTool =
      /\bdata-db-tool\b/i.test(attrs)
      || findAttr(attrs, "data-db-tool") === "true"
      || findAttr(attrs, "isDatabaseTool") === "true"
      || !!dbEntity
      || !!dbField;

    const backgroundColor = findStyleString(style, "background") || findStyleString(style, "backgroundColor");
    const color = findStyleString(style, "color");
    const borderRadius = findStyleString(style, "borderRadius");
    const border = findStyleString(style, "border");
    const fontSize = findStyleString(style, "fontSize");
    const fontWeight = findStyleString(style, "fontWeight");
    const textAlign = findStyleString(style, "textAlign");
    const opacity = findStyleString(style, "opacity");

    const tagEndIndex = (match.index ?? 0) + match[0].length;
    const textContent = extractTextContent(input, tagEndIndex, selfClose);

    widgets.push({
      id,
      type,
      name,
      section,
      x,
      y,
      w,
      h,
      joinType,
      join,
      direction,
      isDatabaseTool,
      dbEntity,
      dbField,
      dbMode,
      backgroundColor,
      color,
      borderRadius,
      border,
      fontSize,
      fontWeight,
      textAlign,
      opacity,
      textContent,
    });

    index += 1;
  }

  return widgets;
}

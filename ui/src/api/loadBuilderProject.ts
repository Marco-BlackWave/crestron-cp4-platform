export type BuilderElement = {
  id: string;
  type: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  icon?: string;
  label?: string;
};

export type BuilderPage = {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundImage?: string;
  elements: BuilderElement[];
};

export type BuilderProject = {
  name: string;
  pages: BuilderPage[];
};

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toElement(raw: unknown, index: number): BuilderElement {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    id: asString(obj.id, `el-${index + 1}`),
    type: asString(obj.type, "widget"),
    name: asString(obj.name, ""),
    x: asNumber(obj.x, 0),
    y: asNumber(obj.y, 0),
    width: Math.max(40, asNumber(obj.width, 180)),
    height: Math.max(24, asNumber(obj.height, 80)),
    icon: asString(obj.icon, ""),
    label: asString(obj.label, ""),
  };
}

function toPage(raw: unknown, index: number): BuilderPage {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const elementsRaw = Array.isArray(obj.elements)
    ? obj.elements
    : Array.isArray(obj.items)
      ? obj.items
      : [];

  return {
    id: asString(obj.id, `page-${index + 1}`),
    name: asString(obj.name, `Page ${index + 1}`),
    width: Math.max(320, asNumber(obj.width, 1920)),
    height: Math.max(240, asNumber(obj.height, 1080)),
    backgroundImage: asString(obj.backgroundImage, ""),
    elements: elementsRaw.map(toElement),
  };
}

export async function loadBuilderProject(): Promise<BuilderProject> {
  const response = await fetch("/builder-import/project-config.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      "Builder export not found at ui/public/builder-import/project-config.json. " +
      "Copy your full Crestron UI Builder export into ui/public/builder-import/."
    );
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const pagesRaw = Array.isArray(raw.pages)
    ? raw.pages
    : (raw.project as Record<string, unknown> | undefined)?.pages;

  if (!Array.isArray(pagesRaw) || pagesRaw.length === 0) {
    throw new Error("project-config.json loaded, but no pages[] were found.");
  }

  return {
    name: asString(raw.name, "Crestron Builder Project"),
    pages: pagesRaw.map(toPage),
  };
}

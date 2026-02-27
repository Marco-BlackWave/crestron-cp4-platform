import type { Project } from "../types/crestron";

export function exportToTailwindHTML(project: Project): string {
  const page = project.pages[0];
  const items = (page?.elements || [])
    .map((el) => `<div class=\"absolute border border-zinc-700 rounded p-2\" style=\"left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px\">${el.name || el.id}</div>`)
    .join("\n");

  return `<!doctype html>\n<html><body><div class=\"relative\" style=\"width:${page?.width || 1920}px;height:${page?.height || 1080}px\">${items}</div></body></html>`;
}

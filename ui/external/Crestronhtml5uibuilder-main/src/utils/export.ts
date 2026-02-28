import type { Project } from "../types/crestron";

export function exportToHTML(project: Project): string {
  return `<!doctype html>\n<html><head><meta charset="utf-8"/><title>${project.name}</title></head><body><pre>${escapeHtml(JSON.stringify(project, null, 2))}</pre></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

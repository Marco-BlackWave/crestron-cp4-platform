import type { Project } from "../types/crestron";

export function exportToReact(project: Project): string {
  const page = project.pages[0];
  const lines = (page?.elements || []).map((el) =>
    `      <div key=\"${el.id}\" style={{ position: \"absolute\", left: ${el.x}, top: ${el.y}, width: ${el.width}, height: ${el.height} }}>${el.name || el.id}</div>`
  );

  return [
    "export default function ImportedPage() {",
    "  return (",
    `    <div style={{ position: \"relative\", width: ${page?.width || 1920}, height: ${page?.height || 1080} }}>`,
    ...lines,
    "    </div>",
    "  );",
    "}",
    "",
  ].join("\n");
}

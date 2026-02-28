import type { Project } from "../types/crestron";

export function makeTemplateProject(name: string): Project {
  return {
    name,
    pages: [
      {
        id: "home",
        name: "Home",
        width: 1920,
        height: 1080,
        backgroundColor: "#10131a",
        elements: [
          { id: "header", type: "header", name: "Header", x: 0, y: 0, width: 1920, height: 84, style: {} },
          { id: "sidebar", type: "sidebar", name: "Sidebar", x: 0, y: 84, width: 240, height: 996, style: {} },
          { id: "tile-1", type: "card", name: "Tile 1", x: 280, y: 140, width: 420, height: 220, style: {} },
          { id: "tile-2", type: "card", name: "Tile 2", x: 740, y: 140, width: 420, height: 220, style: {} },
        ],
      },
    ],
    templates: [],
    libraries: [],
  };
}

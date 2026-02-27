import type { Project } from "../types/crestron";

export function createCrestronProV2Template(width = 1920, height = 1080, device = "TSW-1070"): Project {
  return {
    name: `Crestron Pro V2 (${device})`,
    pages: [
      {
        id: "home",
        name: "Home",
        width,
        height,
        backgroundColor: "#0b1020",
        elements: [
          { id: "header", type: "header", name: "Header", x: 0, y: 0, width, height: 80, style: { background: "rgba(255,255,255,0.06)" } },
          { id: "sidebar", type: "sidebar", name: "Sidebar", x: 0, y: 80, width: 240, height: height - 80, style: { background: "rgba(0,0,0,0.25)" } },
          { id: "card-1", type: "card", name: "Living Room", x: 280, y: 140, width: 460, height: 240, style: { borderRadius: 16 } },
          { id: "card-2", type: "card", name: "Bathroom", x: 780, y: 140, width: 460, height: 240, style: { borderRadius: 16 } },
        ],
      },
    ],
    templates: [],
    libraries: [],
  };
}

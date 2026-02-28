import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseTsxToWidgets } from "./prototypeStudioImport";

describe("parseTsxToWidgets", () => {
  it("parses inline style geometry and join metadata", () => {
    const src = `
      <div id="btn-play" data-name="Play" data-join="1201" data-join-type="digital" data-direction="input"
           style={{ left: 120, top: 80, width: 200, height: 72 }} />
    `;

    const widgets = parseTsxToWidgets(src);
    expect(widgets.length).toBe(1);
    expect(widgets[0].id).toBe("btn-play");
    expect(widgets[0].name).toBe("Play");
    expect(widgets[0].join).toBe(1201);
    expect(widgets[0].joinType).toBe("digital");
    expect(widgets[0].direction).toBe("input");
    expect(widgets[0].x).toBe(120);
    expect(widgets[0].y).toBe(80);
    expect(widgets[0].w).toBe(200);
    expect(widgets[0].h).toBe(72);
  });

  it("marks database tool metadata", () => {
    const src = `
      <button
        data-db-tool="true"
        data-db-entity="rooms"
        data-db-field="status"
        data-db-mode="readwrite"
      >Room</button>
    `;

    const widgets = parseTsxToWidgets(src);
    expect(widgets.length).toBe(1);
    expect(widgets[0].isDatabaseTool).toBe(true);
    expect(widgets[0].dbEntity).toBe("rooms");
    expect(widgets[0].dbField).toBe("status");
    expect(widgets[0].dbMode).toBe("readwrite");
  });

  it("detects slider semantics from input type range", () => {
    const src = `<input type="range" data-join="2301" analogJoin={2301} />`;
    const widgets = parseTsxToWidgets(src);
    expect(widgets.length).toBe(1);
    expect(widgets[0].type).toBe("slider");
    expect(widgets[0].joinType).toBe("analog");
    expect(widgets[0].join).toBe(2301);
  });

  it("extracts visual styles from inline style block", () => {
    const src = `
      <div id="styled-btn" data-name="Power"
           style={{ left: 10, top: 20, width: 200, height: 60, background: "#ff0000", color: "#ffffff", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px", fontWeight: "bold", textAlign: "center", opacity: 0.8 }}>Power On</div>
    `;

    const widgets = parseTsxToWidgets(src);
    expect(widgets.length).toBe(1);
    const w = widgets[0];
    expect(w.backgroundColor).toBe("#ff0000");
    expect(w.color).toBe("#ffffff");
    expect(w.borderRadius).toBe("8px");
    expect(w.border).toBe("1px solid #ccc");
    expect(w.fontSize).toBe("14px");
    expect(w.fontWeight).toBe("bold");
    expect(w.textAlign).toBe("center");
    expect(w.opacity).toBe("0.8");
    expect(w.textContent).toBe("Power On");
  });

  it("extracts backgroundColor when used instead of background", () => {
    const src = `<button style={{ backgroundColor: "#00ff00" }}>Go</button>`;
    const widgets = parseTsxToWidgets(src);
    expect(widgets.length).toBe(1);
    expect(widgets[0].backgroundColor).toBe("#00ff00");
    expect(widgets[0].textContent).toBe("Go");
  });

  it("returns empty strings for missing visual styles", () => {
    const src = `<div id="plain" data-name="Plain" style={{ left: 0, top: 0, width: 100, height: 50 }} />`;
    const widgets = parseTsxToWidgets(src);
    expect(widgets.length).toBe(1);
    const w = widgets[0];
    expect(w.backgroundColor).toBe("");
    expect(w.color).toBe("");
    expect(w.borderRadius).toBe("");
    expect(w.border).toBe("");
    expect(w.fontSize).toBe("");
    expect(w.fontWeight).toBe("");
    expect(w.textAlign).toBe("");
    expect(w.opacity).toBe("");
    expect(w.textContent).toBe("");
  });

  it("captures textContent from non-self-closing tags", () => {
    const src = `<span data-join="5">Hello World</span>`;
    const widgets = parseTsxToWidgets(src);
    expect(widgets.length).toBe(1);
    expect(widgets[0].textContent).toBe("Hello World");
  });

  it("returns empty textContent for self-closing tags", () => {
    const src = `<input type="range" data-join="10" />`;
    const widgets = parseTsxToWidgets(src);
    expect(widgets.length).toBe(1);
    expect(widgets[0].textContent).toBe("");
  });

  it("parses a real project TSX file", () => {
    const realFilePath = resolve(process.cwd(), "src/pages/PanelEmulatorPage.tsx");
    const realTsx = readFileSync(realFilePath, "utf8");
    const widgets = parseTsxToWidgets(realTsx);
    expect(widgets.length).toBeGreaterThan(0);
  });
});

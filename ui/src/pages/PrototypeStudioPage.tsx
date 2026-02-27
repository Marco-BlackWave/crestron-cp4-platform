import { useMemo, useRef, useState } from "react";
import { parseTsxToWidgets } from "./prototypeStudioImport";

type JoinType = "digital" | "analog" | "serial";
type Direction = "input" | "output";
type WidgetType = "button" | "label" | "slider" | "icon";

type CanvasWidget = {
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
  dbMode: "read" | "write" | "readwrite";
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

type DragState = {
  id: string;
  pointerOffsetX: number;
  pointerOffsetY: number;
};

type BuilderJoin = {
  type?: JoinType;
  number?: number;
  description?: string;
};

type BuilderElement = {
  id: string;
  type: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  joins?: Record<string, BuilderJoin | number | undefined>;
  digitalJoin?: number;
  analogJoin?: number;
  serialJoin?: number;
};

type BuilderPage = {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundImage?: string;
  elements: BuilderElement[];
};

type BuilderProject = {
  name: string;
  pages: BuilderPage[];
};

type StudioLayout = {
  version: string;
  generatedAt: string;
  backgroundUrl: string;
  frameUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  widgets: CanvasWidget[];
};

type SectionTemplate = {
  id: string;
  name: string;
  widgets: CanvasWidget[];
};

type ContextMenuState = {
  widgetId: string;
  x: number;
  y: number;
};

function newWidget(type: WidgetType, index: number): CanvasWidget {
  return {
    id: `widget-${Date.now()}-${index}`,
    type,
    name: `${type}-${index + 1}`,
    section: "default",
    x: 24 + index * 18,
    y: 24 + index * 18,
    w: 180,
    h: type === "slider" ? 88 : 120,
    joinType: "digital",
    join: 1000 + index,
    direction: "input",
    isDatabaseTool: false,
    dbEntity: "",
    dbField: "",
    dbMode: "read",
    backgroundColor: "",
    color: "",
    borderRadius: "",
    border: "",
    fontSize: "",
    fontWeight: "",
    textAlign: "",
    opacity: "",
    textContent: "",
  };
}

export default function PrototypeStudioPage() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [widgets, setWidgets] = useState<CanvasWidget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string>("");
  const [frameUrl, setFrameUrl] = useState<string>("http://localhost:5173");
  const [useFrame, setUseFrame] = useState<boolean>(true);
  const [frameInteractive, setFrameInteractive] = useState<boolean>(false);
  const [canvasWidth, setCanvasWidth] = useState<number>(1366);
  const [canvasHeight, setCanvasHeight] = useState<number>(768);
  const [zoomPct, setZoomPct] = useState<number>(100);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(8);
  const [jsonBuffer, setJsonBuffer] = useState<string>("");
  const [status, setStatus] = useState<string>("Ready");
  const [builderProject, setBuilderProject] = useState<BuilderProject | null>(null);
  const [builderPageId, setBuilderPageId] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [newSectionName, setNewSectionName] = useState<string>("");
  const [sectionTemplates, setSectionTemplates] = useState<SectionTemplate[]>([]);
  const [clipboardWidget, setClipboardWidget] = useState<CanvasWidget | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const selected = useMemo(
    () => widgets.find((w) => w.id === selectedId) ?? null,
    [widgets, selectedId],
  );

  const sections = useMemo(() => {
    const base = new Set<string>();
    for (const w of widgets) {
      base.add(w.section || "default");
    }
    base.add("default");
    return Array.from(base).sort((a, b) => a.localeCompare(b));
  }, [widgets]);

  const visibleWidgets = useMemo(() => {
    if (sectionFilter === "all") return widgets;
    return widgets.filter((w) => (w.section || "default") === sectionFilter);
  }, [widgets, sectionFilter]);

  const handleAddWidget = (type: WidgetType) => {
    setWidgets((prev) => {
      const next = [...prev, newWidget(type, prev.length)];
      setSelectedId(next[next.length - 1].id);
      return next;
    });
  };

  const startDrag = (id: string, event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    setContextMenu(null);
    if (!canvasRef.current) return;
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    setSelectedId(id);
    setDragState({
      id,
      pointerOffsetX: event.clientX - canvasRect.left - widget.x,
      pointerOffsetY: event.clientY - canvasRect.top - widget.y,
    });
  };

  const updateWidget = (id: string, patch: Partial<CanvasWidget>) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  const cloneWidget = (widget: CanvasWidget, patch?: Partial<CanvasWidget>): CanvasWidget => {
    return {
      ...widget,
      id: `widget-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: patch?.name ?? `${widget.name}-copy`,
      x: patch?.x ?? widget.x + 20,
      y: patch?.y ?? widget.y + 20,
      ...patch,
    };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const current = widgets.find((w) => w.id === dragState.id);
    if (!current) return;

    const maxX = Math.max(0, canvasRect.width - current.w);
    const maxY = Math.max(0, canvasRect.height - current.h);

    let x = Math.max(0, Math.min(maxX, event.clientX - canvasRect.left - dragState.pointerOffsetX));
    let y = Math.max(0, Math.min(maxY, event.clientY - canvasRect.top - dragState.pointerOffsetY));

    if (snapToGrid) {
      const grid = Math.max(1, gridSize);
      x = Math.round(x / grid) * grid;
      y = Math.round(y / grid) * grid;
    }

    updateWidget(dragState.id, { x, y });
  };

  const handleMouseUp = () => {
    if (dragState) setDragState(null);
  };

  const openContextMenu = (event: React.MouseEvent<HTMLDivElement>, widgetId: string) => {
    event.preventDefault();
    setSelectedId(widgetId);
    setContextMenu({ widgetId, x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const captureResize = (id: string, node: HTMLDivElement | null) => {
    if (!node || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    const maxW = Math.max(80, canvasRect.width);
    const maxH = Math.max(60, canvasRect.height);
    updateWidget(id, {
      w: Math.max(80, Math.min(maxW, Math.round(rect.width))),
      h: Math.max(60, Math.min(maxH, Math.round(rect.height))),
    });
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setWidgets((prev) => prev.filter((w) => w.id !== selectedId));
    setSelectedId(null);
  };

  const createSection = () => {
    const name = newSectionName.trim();
    if (!name) return;
    if (sections.includes(name)) {
      setStatus(`Section '${name}' already exists.`);
      return;
    }
    setWidgets((prev) => {
      if (prev.length === 0) {
        return [
          {
            ...newWidget("label", 0),
            name: `${name}-label`,
            section: name,
          },
        ];
      }
      return prev;
    });
    setNewSectionName("");
    setSectionFilter(name);
    setStatus(`Section '${name}' created.`);
  };

  const saveSectionTemplate = () => {
    if (!selected) {
      setStatus("Select a widget before saving a section template.");
      return;
    }
    const sourceSection = selected.section || "default";
    const sourceWidgets = widgets.filter((w) => (w.section || "default") === sourceSection);
    if (sourceWidgets.length === 0) return;
    const templateName = `${sourceSection}-${Date.now()}`;
    const template: SectionTemplate = {
      id: `section-template-${Date.now()}`,
      name: templateName,
      widgets: sourceWidgets.map((w) => ({ ...w })),
    };
    setSectionTemplates((prev) => [...prev, template]);
    setStatus(`Section template saved: ${templateName}`);
  };

  const insertSectionTemplate = (templateId: string) => {
    const template = sectionTemplates.find((s) => s.id === templateId);
    if (!template) return;
    const targetSection = newSectionName.trim() || `${template.name}-instance`;
    const minX = Math.min(...template.widgets.map((w) => w.x));
    const minY = Math.min(...template.widgets.map((w) => w.y));
    const pasted = template.widgets.map((w) =>
      cloneWidget(w, {
        section: targetSection,
        x: 40 + (w.x - minX),
        y: 40 + (w.y - minY),
      }),
    );
    setWidgets((prev) => [...prev, ...pasted]);
    setSectionFilter(targetSection);
    setStatus(`Inserted section '${targetSection}' from template.`);
  };

  const contextEditName = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;
    const next = window.prompt("Widget name", widget.name);
    if (next !== null) {
      updateWidget(widgetId, { name: next.trim() || widget.name });
      setStatus("Widget renamed.");
    }
  };

  const contextCopyWidget = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;
    setClipboardWidget({ ...widget });
    setStatus(`Copied widget '${widget.name}'.`);
  };

  const contextPasteWidget = () => {
    if (!clipboardWidget) {
      setStatus("Clipboard is empty.");
      return;
    }
    const copy = cloneWidget(clipboardWidget);
    setWidgets((prev) => [...prev, copy]);
    setSelectedId(copy.id);
    setStatus(`Pasted widget '${copy.name}'.`);
  };

  const contextDuplicateWidget = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;
    const copy = cloneWidget(widget);
    setWidgets((prev) => [...prev, copy]);
    setSelectedId(copy.id);
    setStatus(`Duplicated '${widget.name}'.`);
  };

  const contextToggleDatabaseTool = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;
    updateWidget(widgetId, { isDatabaseTool: !widget.isDatabaseTool });
    setStatus(widget.isDatabaseTool ? "Database tool disabled." : "Database tool enabled.");
  };

  const contextMoveToSection = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;
    const next = window.prompt("Move to section", widget.section || "default");
    if (!next) return;
    updateWidget(widgetId, { section: next.trim() || "default" });
    setStatus(`Moved '${widget.name}' to section '${next}'.`);
  };

  const contextDeleteWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    if (selectedId === widgetId) setSelectedId(null);
    setStatus("Widget deleted.");
  };

  const exportLayout = async () => {
    const payload: StudioLayout = {
      version: "1.0",
      generatedAt: new Date().toISOString(),
      backgroundUrl,
      frameUrl,
      canvasWidth,
      canvasHeight,
      widgets,
    };
    const text = JSON.stringify(payload, null, 2);
    setJsonBuffer(text);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Layout exported and copied to clipboard.");
    } catch {
      setStatus("Layout exported to JSON box.");
    }
  };

  const importLayout = () => {
    try {
      const parsed = JSON.parse(jsonBuffer) as Partial<StudioLayout>;
      setBackgroundUrl(parsed.backgroundUrl ?? "");
      setFrameUrl(parsed.frameUrl ?? frameUrl);
      setCanvasWidth(parsed.canvasWidth ?? canvasWidth);
      setCanvasHeight(parsed.canvasHeight ?? canvasHeight);
      setWidgets(Array.isArray(parsed.widgets) ? parsed.widgets : []);
      setSelectedId(null);
      setStatus("Layout imported.");
    } catch {
      setStatus("Invalid JSON layout.");
    }
  };

  const onBackgroundFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBackgroundUrl(typeof reader.result === "string" ? reader.result : "");
      setStatus(`Background loaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const mapBuilderType = (type: string): WidgetType => {
    if (type.includes("slider") || type.includes("dimmer") || type.includes("volume")) return "slider";
    if (type.includes("button") || type.includes("scene")) return "button";
    if (type.includes("image") || type.includes("icon")) return "icon";
    return "label";
  };

  const deriveJoin = (element: BuilderElement): { joinType: JoinType; join: number; direction: Direction } => {
    const joins = element.joins ?? {};
    const candidates = [
      joins.press,
      joins.value,
      joins.feedback,
      joins.text,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "number") {
        return { joinType: "digital", join: candidate, direction: "input" };
      }
      if (candidate && typeof candidate === "object") {
        const jt = candidate.type ?? "digital";
        const jn = candidate.number ?? 0;
        if (jn > 0) {
          const direction: Direction = candidate === joins.feedback || candidate === joins.text ? "output" : "input";
          return { joinType: jt, join: jn, direction };
        }
      }
    }

    if (typeof element.digitalJoin === "number" && element.digitalJoin > 0) {
      return { joinType: "digital", join: element.digitalJoin, direction: "input" };
    }
    if (typeof element.analogJoin === "number" && element.analogJoin > 0) {
      return { joinType: "analog", join: element.analogJoin, direction: "input" };
    }
    if (typeof element.serialJoin === "number" && element.serialJoin > 0) {
      return { joinType: "serial", join: element.serialJoin, direction: "output" };
    }

    return { joinType: "digital", join: 0, direction: "input" };
  };

  const convertBuilderPage = (page: BuilderPage) => {
    setCanvasWidth(Math.max(320, page.width || 1366));
    setCanvasHeight(Math.max(240, page.height || 768));
    if (page.backgroundImage) setBackgroundUrl(page.backgroundImage);

    const converted: CanvasWidget[] = (page.elements ?? []).map((element, index) => {
      const join = deriveJoin(element);
      return {
        id: `builder-${element.id || index}-${Date.now()}`,
        type: mapBuilderType((element.type || "").toLowerCase()),
        name: element.name || element.type || `element-${index + 1}`,
        x: Number.isFinite(element.x) ? element.x : 0,
        y: Number.isFinite(element.y) ? element.y : 0,
        w: Number.isFinite(element.width) ? Math.max(60, element.width) : 160,
        h: Number.isFinite(element.height) ? Math.max(40, element.height) : 90,
        section: page.name || "default",
        joinType: join.joinType,
        join: join.join,
        direction: join.direction,
        isDatabaseTool: false,
        dbEntity: "",
        dbField: "",
        dbMode: "read",
        backgroundColor: "",
        color: "",
        borderRadius: "",
        border: "",
        fontSize: "",
        fontWeight: "",
        textAlign: "",
        opacity: "",
        textContent: "",
      };
    });

    setWidgets(converted);
    setSelectedId(null);
    setStatus(`Imported page '${page.name}' with ${converted.length} elements.`);
  };

  const onBuilderProjectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const parsed = JSON.parse(text) as BuilderProject;
        if (!parsed || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
          setStatus("Invalid builder project JSON.");
          return;
        }

        setBuilderProject(parsed);
        const first = parsed.pages[0];
        setBuilderPageId(first.id);
        convertBuilderPage(first);
      } catch {
        setStatus("Failed to parse builder project JSON.");
      }
    };
    reader.readAsText(file);
  };

  const onTsxFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const parsed = parseTsxToWidgets(text);
        if (parsed.length === 0) {
          setStatus("No JSX/TSX elements detected.");
          return;
        }

        const converted: CanvasWidget[] = parsed.map((w, index) => ({
          id: `${w.id}-${Date.now()}-${index}`,
          type: w.type,
          name: w.name,
          section: w.section || "default",
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          joinType: w.joinType,
          join: w.join,
          direction: w.direction,
          isDatabaseTool: w.isDatabaseTool,
          dbEntity: w.dbEntity,
          dbField: w.dbField,
          dbMode: w.dbMode,
          backgroundColor: w.backgroundColor,
          color: w.color,
          borderRadius: w.borderRadius,
          border: w.border,
          fontSize: w.fontSize,
          fontWeight: w.fontWeight,
          textAlign: w.textAlign,
          opacity: w.opacity,
          textContent: w.textContent,
        }));

        setWidgets(converted);
        setSelectedId(converted[0]?.id ?? null);
        setStatus(`Imported ${converted.length} widgets from ${file.name}.`);
      } catch {
        setStatus("Failed to parse JSX/TSX file.");
      }
    };
    reader.readAsText(file);
  };

  const importTsxFromEditor = () => {
    try {
      const parsed = parseTsxToWidgets(jsonBuffer);
      if (parsed.length === 0) {
        setStatus("No JSX/TSX elements detected in editor buffer.");
        return;
      }

      const converted: CanvasWidget[] = parsed.map((w, index) => ({
        id: `${w.id}-${Date.now()}-${index}`,
        type: w.type,
        name: w.name,
        section: w.section || "default",
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        joinType: w.joinType,
        join: w.join,
        direction: w.direction,
        isDatabaseTool: w.isDatabaseTool,
        dbEntity: w.dbEntity,
        dbField: w.dbField,
        dbMode: w.dbMode,
        backgroundColor: w.backgroundColor,
        color: w.color,
        borderRadius: w.borderRadius,
        border: w.border,
        fontSize: w.fontSize,
        fontWeight: w.fontWeight,
        textAlign: w.textAlign,
        opacity: w.opacity,
        textContent: w.textContent,
      }));

      setWidgets(converted);
      setSelectedId(converted[0]?.id ?? null);
      setStatus(`Imported ${converted.length} widgets from editor TSX/JSX.`);
    } catch {
      setStatus("Failed to parse TSX/JSX from editor buffer.");
    }
  };

  const onBuilderPageChange = (pageId: string) => {
    setBuilderPageId(pageId);
    const page = builderProject?.pages.find((p) => p.id === pageId);
    if (!page) return;
    convertBuilderPage(page);
  };

  const exportReactOverlay = async () => {
    const lines = widgets.map((w) => {
      const styleParts = [`position: \"absolute\"`, `left: ${w.x}`, `top: ${w.y}`, `width: ${w.w}`, `height: ${w.h}`];
      if (w.backgroundColor) styleParts.push(`background: \"${w.backgroundColor}\"`);
      if (w.color) styleParts.push(`color: \"${w.color}\"`);
      if (w.borderRadius) styleParts.push(`borderRadius: \"${w.borderRadius}\"`);
      if (w.border) styleParts.push(`border: \"${w.border}\"`);
      if (w.fontSize) styleParts.push(`fontSize: \"${w.fontSize}\"`);
      if (w.fontWeight) styleParts.push(`fontWeight: \"${w.fontWeight}\"`);
      if (w.textAlign) styleParts.push(`textAlign: \"${w.textAlign}\"`);
      if (w.opacity) styleParts.push(`opacity: ${w.opacity}`);
      const styleStr = styleParts.join(", ");
      const content = w.textContent || w.name;
      return `      <div key=\"${w.id}\" style={{ ${styleStr} }} data-join-type=\"${w.joinType}\" data-join=\"${w.join}\" data-direction=\"${w.direction}\">${content}</div>`;
    });

    const text = [
      "export default function ImportedOverlay() {",
      "  return (",
      `    <div style={{ position: \"relative\", width: ${canvasWidth}, height: ${canvasHeight} }}>`,
      ...lines,
      "    </div>",
      "  );",
      "}",
      "",
    ].join("\n");

    setJsonBuffer(text);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("React overlay exported and copied.");
    } catch {
      setStatus("React overlay exported to editor.");
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Prototype Studio</h1>
          <p className="subhead">
            Drag, resize, map joins, and export a layout JSON for rapid prototype integration.
          </p>
        </div>
      </div>

      <div className="prototype-shell">
        <section className="card prototype-toolbar">
          <p className="label">Widget Palette</p>
          <div className="prototype-actions">
            <label className="label" style={{ margin: 0 }}>Section</label>
            <select className="input" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="all">all sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              className="input"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="new section name"
              style={{ maxWidth: 220 }}
            />
            <button className="button" onClick={createSection}>Create Section</button>
          </div>
          <div className="prototype-form">
            <label className="label">Loaded React/CSS Frame URL (1:1 base)</label>
            <input
              className="input"
              value={frameUrl}
              onChange={(e) => setFrameUrl(e.target.value)}
              placeholder="http://localhost:5173"
            />
          </div>
          <div className="prototype-actions">
            <label className="button" style={{ cursor: "pointer" }}>
              Import Builder JSON
              <input type="file" accept="application/json" onChange={onBuilderProjectFile} style={{ display: "none" }} />
            </label>
            <label className="button" style={{ cursor: "pointer" }}>
              Import JSX/TSX
              <input type="file" accept=".tsx,.jsx,.ts,.js,text/plain" onChange={onTsxFile} style={{ display: "none" }} />
            </label>
            {builderProject && (
              <select className="input" value={builderPageId} onChange={(e) => onBuilderPageChange(e.target.value)} style={{ maxWidth: 220 }}>
                {builderProject.pages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={useFrame} onChange={(e) => setUseFrame(e.target.checked)} />
              Use frame as 1:1 base
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={frameInteractive} onChange={(e) => setFrameInteractive(e.target.checked)} />
              Interact with frame
            </label>
          </div>
          <div className="prototype-actions">
            <label className="label" style={{ margin: 0 }}>W</label>
            <input className="input" type="number" value={canvasWidth} onChange={(e) => setCanvasWidth(Math.max(320, Number.parseInt(e.target.value || "0", 10) || 320))} style={{ width: 90 }} />
            <label className="label" style={{ margin: 0 }}>H</label>
            <input className="input" type="number" value={canvasHeight} onChange={(e) => setCanvasHeight(Math.max(240, Number.parseInt(e.target.value || "0", 10) || 240))} style={{ width: 90 }} />
            <label className="label" style={{ margin: 0 }}>Zoom %</label>
            <input className="input" type="number" value={zoomPct} onChange={(e) => setZoomPct(Math.max(25, Math.min(300, Number.parseInt(e.target.value || "100", 10) || 100)))} style={{ width: 90 }} />
          </div>
          <div className="prototype-actions">
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
              Snap to grid
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
              Show grid
            </label>
            <label className="label" style={{ margin: 0 }}>Grid</label>
            <input className="input" type="number" value={gridSize} onChange={(e) => setGridSize(Math.max(1, Number.parseInt(e.target.value || "8", 10) || 8))} style={{ width: 70 }} />
          </div>
          <div className="prototype-actions">
            <button className="button" onClick={() => handleAddWidget("button")}>Add Button</button>
            <button className="button" onClick={() => handleAddWidget("label")}>Add Label</button>
            <button className="button" onClick={() => handleAddWidget("slider")}>Add Slider</button>
            <button className="button" onClick={() => handleAddWidget("icon")}>Add Icon</button>
            <button className="button" onClick={removeSelected} disabled={!selectedId}>Delete Selected</button>
            <button className="button" onClick={contextPasteWidget}>Paste Widget</button>
            <button className="button" onClick={saveSectionTemplate} disabled={!selectedId}>Save Section Template</button>
          </div>
          {sectionTemplates.length > 0 && (
            <div className="prototype-actions">
              <label className="label" style={{ margin: 0 }}>Reuse Template</label>
              <select className="input" onChange={(e) => insertSectionTemplate(e.target.value)} defaultValue="" style={{ maxWidth: 260 }}>
                <option value="" disabled>select template</option>
                {sectionTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="prototype-actions">
            <label className="button" style={{ cursor: "pointer" }}>
              Load Background
              <input type="file" accept="image/*" onChange={onBackgroundFile} style={{ display: "none" }} />
            </label>
            <button className="button" onClick={exportLayout}>Export JSON</button>
            <button className="button" onClick={exportReactOverlay}>Export React</button>
            <button className="button" onClick={importLayout}>Import JSON</button>
            <button className="button" onClick={importTsxFromEditor}>Import TSX From Editor</button>
          </div>
          <p className="subhead">{status}</p>
        </section>

        <section className="card prototype-canvas-card">
          <p className="label">Canvas</p>
          <div
            className={`prototype-canvas ${showGrid ? "prototype-canvas--grid" : ""}`}
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={closeContextMenu}
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${zoomPct / 100})`,
              transformOrigin: "top left",
              backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              ["--grid-size" as string]: `${gridSize}px`,
            }}
          >
            {useFrame && (
              <iframe
                title="Loaded React UI"
                src={frameUrl}
                className="prototype-frame"
                style={{ pointerEvents: frameInteractive ? "auto" : "none" }}
              />
            )}
            {visibleWidgets.map((widget) => (
              <div
                key={widget.id}
                className={`prototype-widget ${selectedId === widget.id ? "prototype-widget--selected" : ""}`}
                style={{
                  left: widget.x,
                  top: widget.y,
                  width: widget.w,
                  height: widget.h,
                  backgroundColor: widget.backgroundColor || undefined,
                  color: widget.color || undefined,
                  borderRadius: widget.borderRadius || undefined,
                  border: widget.border || undefined,
                  fontSize: widget.fontSize || undefined,
                  fontWeight: widget.fontWeight || undefined,
                  textAlign: (widget.textAlign as React.CSSProperties["textAlign"]) || undefined,
                  opacity: widget.opacity ? Number(widget.opacity) : undefined,
                }}
                onMouseDown={() => setSelectedId(widget.id)}
                onContextMenu={(e) => openContextMenu(e, widget.id)}
                ref={(node) => captureResize(widget.id, node)}
              >
                <div className="prototype-widget-drag" onMouseDown={(e) => startDrag(widget.id, e)}>
                  {widget.name}
                </div>
                <div className="prototype-widget-body">
                  {widget.textContent ? (
                    <p>{widget.textContent}</p>
                  ) : (
                    <p>{widget.type.toUpperCase()}</p>
                  )}
                  <small>{widget.joinType}:{widget.join} ({widget.direction})</small>
                  <small>{widget.section || "default"}</small>
                  {widget.isDatabaseTool && <small className="prototype-db-badge">DB tool: {widget.dbEntity || "entity"}.{widget.dbField || "field"}</small>}
                </div>
              </div>
            ))}
            {contextMenu && (
              <div className="prototype-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
                <button type="button" onClick={() => { contextEditName(contextMenu.widgetId); closeContextMenu(); }}>Edit Name</button>
                <button type="button" onClick={() => { contextCopyWidget(contextMenu.widgetId); closeContextMenu(); }}>Copy</button>
                <button type="button" onClick={() => { contextDuplicateWidget(contextMenu.widgetId); closeContextMenu(); }}>Duplicate</button>
                <button type="button" onClick={() => { contextMoveToSection(contextMenu.widgetId); closeContextMenu(); }}>Move to Section</button>
                <button type="button" onClick={() => { contextToggleDatabaseTool(contextMenu.widgetId); closeContextMenu(); }}>Toggle DB Tool</button>
                <button type="button" onClick={() => { contextDeleteWidget(contextMenu.widgetId); closeContextMenu(); }}>Delete</button>
              </div>
            )}
          </div>
        </section>

        <section className="card prototype-properties">
          <p className="label">Selected Widget</p>
          {!selected && <p className="subhead">Select a widget to edit properties.</p>}
          {selected && (
            <div className="prototype-form">
              <label className="label">Name</label>
              <input className="input" value={selected.name} onChange={(e) => updateWidget(selected.id, { name: e.target.value })} />

              <label className="label">Section</label>
              <input className="input" value={selected.section || "default"} onChange={(e) => updateWidget(selected.id, { section: e.target.value || "default" })} />

              <label className="label">Join Type</label>
              <select className="input" value={selected.joinType} onChange={(e) => updateWidget(selected.id, { joinType: e.target.value as JoinType })}>
                <option value="digital">digital</option>
                <option value="analog">analog</option>
                <option value="serial">serial</option>
              </select>

              <label className="label">Join Number</label>
              <input
                className="input"
                type="number"
                value={selected.join}
                onChange={(e) => updateWidget(selected.id, { join: Number.parseInt(e.target.value || "0", 10) || 0 })}
              />

              <label className="label">Direction</label>
              <select className="input" value={selected.direction} onChange={(e) => updateWidget(selected.id, { direction: e.target.value as Direction })}>
                <option value="input">input</option>
                <option value="output">output</option>
              </select>

              <label className="label">X / Y / W / H</label>
              <p className="subhead">{selected.x}, {selected.y}, {selected.w}, {selected.h}</p>

              <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={selected.isDatabaseTool} onChange={(e) => updateWidget(selected.id, { isDatabaseTool: e.target.checked })} />
                Database tool
              </label>

              {selected.isDatabaseTool && (
                <>
                  <label className="label">Database Entity</label>
                  <input className="input" value={selected.dbEntity} onChange={(e) => updateWidget(selected.id, { dbEntity: e.target.value })} placeholder="rooms, scenes, devices..." />

                  <label className="label">Database Field</label>
                  <input className="input" value={selected.dbField} onChange={(e) => updateWidget(selected.id, { dbField: e.target.value })} placeholder="name, status, level..." />

                  <label className="label">Database Mode</label>
                  <select className="input" value={selected.dbMode} onChange={(e) => updateWidget(selected.id, { dbMode: e.target.value as CanvasWidget["dbMode"] })}>
                    <option value="read">read</option>
                    <option value="write">write</option>
                    <option value="readwrite">readwrite</option>
                  </select>
                </>
              )}

              <label className="label">Text Content</label>
              <input className="input" value={selected.textContent} onChange={(e) => updateWidget(selected.id, { textContent: e.target.value })} placeholder="Display text..." />

              <label className="label">Background Color</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="color" value={selected.backgroundColor || "#808080"} onChange={(e) => updateWidget(selected.id, { backgroundColor: e.target.value })} />
                <input className="input" value={selected.backgroundColor} onChange={(e) => updateWidget(selected.id, { backgroundColor: e.target.value })} placeholder="#rrggbb" style={{ flex: 1 }} />
              </div>

              <label className="label">Text Color</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="color" value={selected.color || "#000000"} onChange={(e) => updateWidget(selected.id, { color: e.target.value })} />
                <input className="input" value={selected.color} onChange={(e) => updateWidget(selected.id, { color: e.target.value })} placeholder="#rrggbb" style={{ flex: 1 }} />
              </div>

              <label className="label">Border Radius</label>
              <input className="input" value={selected.borderRadius} onChange={(e) => updateWidget(selected.id, { borderRadius: e.target.value })} placeholder="8px or 50%" />

              <label className="label">Border</label>
              <input className="input" value={selected.border} onChange={(e) => updateWidget(selected.id, { border: e.target.value })} placeholder="1px solid #ccc" />

              <label className="label">Font Size</label>
              <input className="input" value={selected.fontSize} onChange={(e) => updateWidget(selected.id, { fontSize: e.target.value })} placeholder="14px" />

              <label className="label">Font Weight</label>
              <select className="input" value={selected.fontWeight} onChange={(e) => updateWidget(selected.id, { fontWeight: e.target.value })}>
                <option value="">default</option>
                <option value="normal">normal</option>
                <option value="bold">bold</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="400">400</option>
                <option value="500">500</option>
                <option value="600">600</option>
                <option value="700">700</option>
                <option value="800">800</option>
                <option value="900">900</option>
              </select>

              <label className="label">Text Align</label>
              <select className="input" value={selected.textAlign} onChange={(e) => updateWidget(selected.id, { textAlign: e.target.value })}>
                <option value="">default</option>
                <option value="left">left</option>
                <option value="center">center</option>
                <option value="right">right</option>
              </select>

              <label className="label">Opacity</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="range" min="0" max="1" step="0.05" value={selected.opacity || "1"} onChange={(e) => updateWidget(selected.id, { opacity: e.target.value })} style={{ flex: 1 }} />
                <span style={{ minWidth: 32, textAlign: "right" }}>{selected.opacity || "1"}</span>
              </div>
            </div>
          )}

          <p className="label" style={{ marginTop: 12 }}>Layout JSON</p>
          <textarea
            className="input"
            value={jsonBuffer}
            onChange={(e) => setJsonBuffer(e.target.value)}
            rows={12}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
        </section>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ELEMENT_TYPES } from "../simulator/LogicElements";
import { ContextMenu, type ContextMenuItem } from "../components/ContextMenu";
import { useContextMenu } from "../hooks/useContextMenu";

interface PlacedElement {
  id: string;
  type: string;
  x: number;
  y: number;
  inputPorts: { id: string; label: string }[];
  outputPorts: { id: string; label: string }[];
}

interface Wire {
  id: string;
  fromElement: string;
  fromPort: string;
  toElement: string;
  toPort: string;
}

const PORT_DEFS: Record<string, { inputs: string[]; outputs: string[] }> = {
  "Digital Input": { inputs: [], outputs: ["out"] },
  "Analog Input": { inputs: [], outputs: ["out"] },
  "Buffer": { inputs: ["enable", "data"], outputs: ["out"] },
  "Toggle": { inputs: ["trigger"], outputs: ["out"] },
  "Interlock": { inputs: ["in1", "in2", "in3"], outputs: ["out1", "out2", "out3"] },
  "AND": { inputs: ["A", "B"], outputs: ["out"] },
  "OR": { inputs: ["A", "B"], outputs: ["out"] },
  "NOT": { inputs: ["in"], outputs: ["out"] },
  "OneShot": { inputs: ["trigger"], outputs: ["pulse"] },
  "Delay": { inputs: ["in"], outputs: ["out"] },
  "SR Latch": { inputs: ["set", "reset"], outputs: ["Q"] },
  "Oscillator": { inputs: ["enable"], outputs: ["pulse"] },
  "Analog Buffer": { inputs: ["enable", "analog"], outputs: ["out"] },
  "Analog Ramp": { inputs: ["up", "down"], outputs: ["level"] },
  "Analog Scaler": { inputs: ["in"], outputs: ["out"] },
  "Analog Sum": { inputs: ["A", "B"], outputs: ["sum"] },
  "Serial Buffer": { inputs: ["enable", "serial"], outputs: ["out"] },
  "Crosspoint": { inputs: ["in1", "in2", "in3"], outputs: ["out1", "out2", "out3"] },
};

const ALL_ELEMENT_TYPES = ["Digital Input", "Analog Input", ...ELEMENT_TYPES];

let nextId = 1;

// Compute logic for a given element based on its inputs
function computeElement(
  el: PlacedElement,
  wires: Wire[],
  portValues: Map<string, number>,
  inputValues: Map<string, number>,
): void {
  // Gather input values from wires
  for (const port of el.inputPorts) {
    const wire = wires.find(w => w.toElement === el.id && w.toPort === port.id);
    if (wire) {
      const srcVal = portValues.get(wire.fromPort) ?? 0;
      portValues.set(port.id, srcVal);
    }
  }

  // Compute output based on type
  if (el.type === "Digital Input") {
    const val = inputValues.get(el.id) ?? 0;
    for (const port of el.outputPorts) portValues.set(port.id, val);
  } else if (el.type === "Analog Input") {
    const val = inputValues.get(el.id) ?? 0;
    for (const port of el.outputPorts) portValues.set(port.id, val);
  } else if (el.type === "AND") {
    const a = portValues.get(el.inputPorts[0]?.id) ?? 0;
    const b = portValues.get(el.inputPorts[1]?.id) ?? 0;
    portValues.set(el.outputPorts[0]?.id, (a && b) ? 1 : 0);
  } else if (el.type === "OR") {
    const a = portValues.get(el.inputPorts[0]?.id) ?? 0;
    const b = portValues.get(el.inputPorts[1]?.id) ?? 0;
    portValues.set(el.outputPorts[0]?.id, (a || b) ? 1 : 0);
  } else if (el.type === "NOT") {
    const v = portValues.get(el.inputPorts[0]?.id) ?? 0;
    portValues.set(el.outputPorts[0]?.id, v ? 0 : 1);
  } else if (el.type === "Buffer") {
    const enable = portValues.get(el.inputPorts[0]?.id) ?? 0;
    const data = portValues.get(el.inputPorts[1]?.id) ?? 0;
    portValues.set(el.outputPorts[0]?.id, enable ? data : 0);
  } else if (el.type === "Toggle") {
    // Toggle is stateful - handled via inputValues
    const val = inputValues.get(el.id) ?? 0;
    portValues.set(el.outputPorts[0]?.id, val);
  } else if (el.type === "SR Latch") {
    const s = portValues.get(el.inputPorts[0]?.id) ?? 0;
    const r = portValues.get(el.inputPorts[1]?.id) ?? 0;
    const prev = inputValues.get(el.id) ?? 0;
    const out = s ? 1 : r ? 0 : prev;
    inputValues.set(el.id, out);
    portValues.set(el.outputPorts[0]?.id, out);
  } else if (el.type === "Interlock") {
    const vals = el.inputPorts.map(p => portValues.get(p.id) ?? 0);
    const activeIdx = vals.findIndex(v => v > 0);
    el.outputPorts.forEach((p, i) => portValues.set(p.id, i === activeIdx ? 1 : 0));
  } else if (el.type === "Analog Buffer") {
    const enable = portValues.get(el.inputPorts[0]?.id) ?? 0;
    const analog = portValues.get(el.inputPorts[1]?.id) ?? 0;
    portValues.set(el.outputPorts[0]?.id, enable ? analog : 0);
  } else if (el.type === "Analog Sum") {
    const a = portValues.get(el.inputPorts[0]?.id) ?? 0;
    const b = portValues.get(el.inputPorts[1]?.id) ?? 0;
    portValues.set(el.outputPorts[0]?.id, Math.min(a + b, 65535));
  } else if (el.type === "Analog Scaler") {
    const v = portValues.get(el.inputPorts[0]?.id) ?? 0;
    portValues.set(el.outputPorts[0]?.id, Math.round(v * 0.5));
  } else {
    // Pass-through for unimplemented elements
    for (const port of el.outputPorts) {
      const firstInput = el.inputPorts[0];
      if (firstInput) portValues.set(port.id, portValues.get(firstInput.id) ?? 0);
    }
  }
}

// Topological sort for element evaluation order
function topoSort(elements: PlacedElement[], wires: Wire[]): PlacedElement[] {
  const graph = new Map<string, Set<string>>();
  const inDeg = new Map<string, number>();
  for (const el of elements) {
    graph.set(el.id, new Set());
    inDeg.set(el.id, 0);
  }
  for (const w of wires) {
    graph.get(w.fromElement)?.add(w.toElement);
    inDeg.set(w.toElement, (inDeg.get(w.toElement) ?? 0) + 1);
  }
  const queue = elements.filter(el => (inDeg.get(el.id) ?? 0) === 0);
  const sorted: PlacedElement[] = [];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const el = queue.shift()!;
    if (visited.has(el.id)) continue;
    visited.add(el.id);
    sorted.push(el);
    for (const nextId of graph.get(el.id) ?? []) {
      inDeg.set(nextId, (inDeg.get(nextId) ?? 0) - 1);
      if ((inDeg.get(nextId) ?? 0) <= 0) {
        const nextEl = elements.find(e => e.id === nextId);
        if (nextEl) queue.push(nextEl);
      }
    }
  }
  // Add any remaining (cycles) at the end
  for (const el of elements) {
    if (!visited.has(el.id)) sorted.push(el);
  }
  return sorted;
}

export default function LogicPlaygroundPage() {
  const [elements, setElements] = useState<PlacedElement[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [wiring, setWiring] = useState<{ fromElement: string; fromPort: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Signal values: inputValues stores user inputs (toggles/sliders), portValues stores computed
  const [inputValues, setInputValues] = useState<Map<string, number>>(new Map());
  const [portValues, setPortValues] = useState<Map<string, number>>(new Map());

  // Undo/Redo for canvas
  const [undoStack, setUndoStack] = useState<{ elements: PlacedElement[]; wires: Wire[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ elements: PlacedElement[]; wires: Wire[] }[]>([]);

  // Context menu
  const { menuPos, openMenu, closeMenu } = useContextMenu();
  const [contextTarget, setContextTarget] = useState<{ type: "element" | "wire" | "canvas"; id?: string } | null>(null);

  useEffect(() => { document.title = "Logic Playground — CP4"; }, []);

  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-49), { elements: [...elements], wires: [...wires] }]);
    setRedoStack([]);
  }, [elements, wires]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, { elements: [...elements], wires: [...wires] }]);
    setElements(last.elements);
    setWires(last.wires);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack, elements, wires]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, { elements: [...elements], wires: [...wires] }]);
    setElements(last.elements);
    setWires(last.wires);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, elements, wires]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === "Delete" && selectedId) deleteSelected();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, selectedId]);

  // Recompute signals whenever elements, wires, or inputValues change
  useEffect(() => {
    const sorted = topoSort(elements, wires);
    const pv = new Map<string, number>();
    const iv = new Map(inputValues);
    for (const el of sorted) {
      computeElement(el, wires, pv, iv);
    }
    setPortValues(pv);
  }, [elements, wires, inputValues]);

  const addElement = useCallback((type: string) => {
    pushUndo();
    const ports = PORT_DEFS[type] ?? { inputs: ["in"], outputs: ["out"] };
    const id = `elem-${nextId++}`;
    const el: PlacedElement = {
      id,
      type,
      x: 100 + Math.random() * 300,
      y: 80 + Math.random() * 200,
      inputPorts: ports.inputs.map((p) => ({ id: `${id}:in:${p}`, label: p })),
      outputPorts: ports.outputs.map((p) => ({ id: `${id}:out:${p}`, label: p })),
    };
    setElements((prev) => [...prev, el]);
    setSelectedId(id);
  }, [pushUndo]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragging.offsetX;
    const y = e.clientY - rect.top - dragging.offsetY;
    setElements((prev) => prev.map((el) => el.id === dragging.id ? { ...el, x, y } : el));
  }, [dragging]);

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleElementMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const el = elements.find((el) => el.id === id);
    if (!el || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging({ id, offsetX: e.clientX - rect.left - el.x, offsetY: e.clientY - rect.top - el.y });
    setSelectedId(id);
  }, [elements]);

  const handlePortClick = useCallback((elementId: string, portId: string, isOutput: boolean) => {
    if (!wiring) {
      if (isOutput) setWiring({ fromElement: elementId, fromPort: portId });
    } else {
      if (!isOutput && wiring.fromElement !== elementId) {
        pushUndo();
        setWires((prev) => [...prev, {
          id: `wire-${nextId++}`,
          fromElement: wiring.fromElement,
          fromPort: wiring.fromPort,
          toElement: elementId,
          toPort: portId,
        }]);
      }
      setWiring(null);
    }
  }, [wiring, pushUndo]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    pushUndo();
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setWires((prev) => prev.filter((w) => w.fromElement !== selectedId && w.toElement !== selectedId));
    setSelectedId(null);
  }, [selectedId, pushUndo]);

  const disconnectAll = useCallback((elementId: string) => {
    pushUndo();
    setWires(prev => prev.filter(w => w.fromElement !== elementId && w.toElement !== elementId));
  }, [pushUndo]);

  const deleteWire = useCallback((wireId: string) => {
    pushUndo();
    setWires(prev => prev.filter(w => w.id !== wireId));
  }, [pushUndo]);

  const clearAll = useCallback(() => {
    pushUndo();
    setElements([]);
    setWires([]);
    setInputValues(new Map());
  }, [pushUndo]);

  const toggleDigitalInput = useCallback((elementId: string) => {
    setInputValues(prev => {
      const next = new Map(prev);
      next.set(elementId, (next.get(elementId) ?? 0) ? 0 : 1);
      return next;
    });
  }, []);

  const setAnalogInput = useCallback((elementId: string, value: number) => {
    setInputValues(prev => {
      const next = new Map(prev);
      next.set(elementId, value);
      return next;
    });
  }, []);

  // Compute wire paths
  const wirePaths = useMemo(() => {
    return wires.map((w) => {
      const fromEl = elements.find((el) => el.id === w.fromElement);
      const toEl = elements.find((el) => el.id === w.toElement);
      if (!fromEl || !toEl) return null;
      const fromIdx = fromEl.outputPorts.findIndex((p) => p.id === w.fromPort);
      const toIdx = toEl.inputPorts.findIndex((p) => p.id === w.toPort);
      const x1 = fromEl.x + 130;
      const y1 = fromEl.y + 30 + fromIdx * 20;
      const x2 = toEl.x;
      const y2 = toEl.y + 30 + toIdx * 20;
      const cx1 = x1 + 40;
      const cx2 = x2 - 40;
      const fromVal = portValues.get(w.fromPort) ?? 0;
      const isHigh = fromVal > 0;
      return { ...w, path: `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`, isHigh };
    }).filter(Boolean) as (Wire & { path: string; isHigh: boolean })[];
  }, [wires, elements, portValues]);

  // Context menu items
  const contextItems: ContextMenuItem[] = useMemo(() => {
    if (!contextTarget) return [];
    if (contextTarget.type === "element") {
      return [
        { label: "Delete", danger: true, onClick: () => { setSelectedId(contextTarget.id!); pushUndo(); setElements(prev => prev.filter(e => e.id !== contextTarget.id)); setWires(prev => prev.filter(w => w.fromElement !== contextTarget.id && w.toElement !== contextTarget.id)); } },
        { label: "Disconnect All", onClick: () => disconnectAll(contextTarget.id!) },
        { label: "Duplicate", onClick: () => { const el = elements.find(e => e.id === contextTarget.id); if (el) { pushUndo(); const id = `elem-${nextId++}`; const dup = { ...el, id, x: el.x + 20, y: el.y + 20, inputPorts: el.inputPorts.map(p => ({ ...p, id: p.id.replace(el.id, id) })), outputPorts: el.outputPorts.map(p => ({ ...p, id: p.id.replace(el.id, id) })) }; setElements(prev => [...prev, dup]); } } },
      ];
    }
    if (contextTarget.type === "wire") {
      return [
        { label: "Delete Wire", danger: true, onClick: () => deleteWire(contextTarget.id!) },
      ];
    }
    // Canvas context menu
    return [
      { label: "Clear All", danger: true, onClick: clearAll },
      { label: "", divider: true, onClick: () => {} },
      ...ALL_ELEMENT_TYPES.slice(0, 4).map(type => ({
        label: `Add ${type}`,
        onClick: () => addElement(type),
      })),
    ];
  }, [contextTarget, elements, pushUndo, disconnectAll, deleteWire, clearAll, addElement]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Logic Playground</h1>
          <p className="subhead">Wire SIMPL logic elements to see signal flow</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button" onClick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">Undo</button>
          <button className="button" onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)">Redo</button>
          {selectedId && <button className="button danger" onClick={deleteSelected}>Delete</button>}
          {wiring && <button className="button" onClick={() => setWiring(null)}>Cancel Wire</button>}
        </div>
      </div>

      <div
        className="logic-canvas"
        ref={canvasRef}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onClick={() => { setSelectedId(null); setWiring(null); }}
        onContextMenu={(e) => { setContextTarget({ type: "canvas" }); openMenu(e); }}
      >
        {/* Palette */}
        <div className="logic-palette">
          {ALL_ELEMENT_TYPES.map((type) => (
            <button key={type} className="logic-palette-item" onClick={(e) => { e.stopPropagation(); addElement(type); }}>
              {type}
            </button>
          ))}
        </div>

        {/* SVG wires */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
          {wirePaths.map((w) => (
            <path
              key={w.id}
              d={w.path}
              stroke={w.isHigh ? "#22c55e" : "#94a3b8"}
              strokeWidth={w.isHigh ? 3 : 2}
              fill="none"
              opacity={w.isHigh ? 0.9 : 0.5}
              style={{ pointerEvents: "stroke", cursor: "pointer" }}
              onContextMenu={(e) => { e.stopPropagation(); setContextTarget({ type: "wire", id: w.id }); openMenu(e as unknown as React.MouseEvent); }}
            />
          ))}
        </svg>

        {/* Elements */}
        {elements.map((el) => (
          <div
            key={el.id}
            className={`logic-element${selectedId === el.id ? " logic-element--selected" : ""}`}
            style={{ left: el.x, top: el.y }}
            onMouseDown={(e) => handleElementMouseDown(el.id, e)}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => { e.stopPropagation(); setContextTarget({ type: "element", id: el.id }); openMenu(e); }}
          >
            <div className="logic-element__title">{el.type}</div>

            {/* Digital Input: toggle button */}
            {el.type === "Digital Input" && (
              <button
                className={`logic-input-toggle${(inputValues.get(el.id) ?? 0) ? " logic-input-toggle--on" : ""}`}
                onClick={(e) => { e.stopPropagation(); toggleDigitalInput(el.id); }}
              >
                {(inputValues.get(el.id) ?? 0) ? "HIGH" : "LOW"}
              </button>
            )}

            {/* Analog Input: slider */}
            {el.type === "Analog Input" && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="range"
                  className="logic-input-slider"
                  min="0"
                  max="65535"
                  value={inputValues.get(el.id) ?? 0}
                  onChange={(e) => { e.stopPropagation(); setAnalogInput(el.id, parseInt(e.target.value, 10)); }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="logic-port__value">{inputValues.get(el.id) ?? 0}</span>
              </div>
            )}

            <div className="logic-element__ports">
              <div>
                {el.inputPorts.map((port) => {
                  const val = portValues.get(port.id) ?? 0;
                  return (
                    <div key={port.id} className="logic-port" onClick={(e) => { e.stopPropagation(); handlePortClick(el.id, port.id, false); }}>
                      <span className={`logic-port__dot${val ? " logic-port__dot--high" : ""}`} />
                      {port.label}
                      {val > 1 && <span className="logic-port__value">{val}</span>}
                    </div>
                  );
                })}
              </div>
              <div>
                {el.outputPorts.map((port) => {
                  const val = portValues.get(port.id) ?? 0;
                  return (
                    <div key={port.id} className="logic-port" style={{ justifyContent: "flex-end" }} onClick={(e) => { e.stopPropagation(); handlePortClick(el.id, port.id, true); }}>
                      {port.label}
                      {val > 1 && <span className="logic-port__value">{val}</span>}
                      <span className={`logic-port__dot${val ? " logic-port__dot--high" : ""}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {elements.length === 0 && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", color: "#94a3b8" }}>
            <p style={{ fontSize: 16, fontWeight: 600 }}>Click an element from the palette above</p>
            <p style={{ fontSize: 13 }}>Drag to position, click output ports then input ports to wire</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Right-click for context menu. Ctrl+Z to undo.</p>
          </div>
        )}
      </div>

      <ContextMenu items={contextItems} position={menuPos} onClose={closeMenu} />
    </div>
  );
}

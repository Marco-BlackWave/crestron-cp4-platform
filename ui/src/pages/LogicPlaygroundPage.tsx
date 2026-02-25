import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, foldGutter, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { simplPlusDef } from "../simplplus/codemirrorMode";
import { SimplPlusRuntime } from "../simplplus/runtime";
import { TEMPLATES } from "../simplplus/templates";
import type { ProgramNode, IODeclNode, ParseError } from "../simplplus/types";
import type { VFSEntry } from "../simplplus/virtualFs";
import type { VSocket } from "../simplplus/virtualNet";

type RightTab = "program" | "io" | "files" | "network";

// Category lookup for #CATEGORY codes
const CATEGORY_NAMES: Record<string, string> = {
  "0": "Control System", "3": "Video", "4": "Lighting",
  "5": "Audio", "6": "HVAC", "7": "Security", "8": "Transport",
  "9": "Conferencing", "10": "Shade/Blind", "11": "Switcher",
  "14": "Keypad", "17": "Display", "19": "Camera",
  "46": "Miscellaneous",
};

const IO_TYPE_LABELS: Record<string, { label: string; abbr: string; color: string }> = {
  DIGITAL_INPUT:  { label: "Digital Input",  abbr: "DI", color: "#2563eb" },
  DIGITAL_OUTPUT: { label: "Digital Output", abbr: "DO", color: "#059669" },
  ANALOG_INPUT:   { label: "Analog Input",   abbr: "AI", color: "#7c3aed" },
  ANALOG_OUTPUT:  { label: "Analog Output",  abbr: "AO", color: "#d97706" },
  STRING_INPUT:   { label: "String Input",   abbr: "SI", color: "#be185d" },
  STRING_OUTPUT:  { label: "String Output",  abbr: "SO", color: "#ea580c" },
  BUFFER_INPUT:   { label: "Buffer Input",   abbr: "BI", color: "#64748b" },
};

export default function LogicPlaygroundPage() {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SimplPlusRuntime | null>(null);

  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [ioDecls, setIODecls] = useState<IODeclNode[]>([]);
  const [ast, setAst] = useState<ProgramNode | null>(null);
  const [templateIdx, setTemplateIdx] = useState(0);
  const [rightTab, setRightTab] = useState<RightTab>("program");
  const [isRunning, setIsRunning] = useState(false);

  // I/O state mirrors
  const [digitalInputs, setDigitalInputs] = useState<Map<string, number>>(new Map());
  const [digitalOutputs, setDigitalOutputs] = useState<Map<string, number>>(new Map());
  const [analogInputs, setAnalogInputs] = useState<Map<string, number>>(new Map());
  const [analogOutputs, setAnalogOutputs] = useState<Map<string, number>>(new Map());
  const [stringInputs, setStringInputs] = useState<Map<string, string>>(new Map());
  const [stringOutputs, setStringOutputs] = useState<Map<string, string>>(new Map());

  // VFS + VNet state
  const [vfsFiles, setVfsFiles] = useState<VFSEntry[]>([]);
  const [vfsSelectedFile, setVfsSelectedFile] = useState<string | null>(null);
  const [vfsFileContent, setVfsFileContent] = useState("");
  const [sockets, setSockets] = useState<VSocket[]>([]);

  // Collapsed sections in overview
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => { document.title = "SIMPL+ Playground — CP4"; }, []);

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Callbacks for runtime ──
  const callbacks = useMemo(() => ({
    onConsoleOutput: (msg: string) => {
      setConsoleLines(prev => [...prev, msg]);
    },
    onOutputChange: (type: "digital" | "analog" | "string", name: string, value: number | string) => {
      if (type === "digital") setDigitalOutputs(prev => new Map(prev).set(name, Number(value)));
      if (type === "analog") setAnalogOutputs(prev => new Map(prev).set(name, Number(value)));
      if (type === "string") setStringOutputs(prev => new Map(prev).set(name, String(value)));
    },
    onError: (error: ParseError) => {
      setErrors(prev => [...prev, error]);
    },
  }), []);

  useEffect(() => {
    const rt = new SimplPlusRuntime(callbacks);
    runtimeRef.current = rt;
    rt.getVFS().onChange = () => setVfsFiles(rt.getVFS().listFiles());
    rt.getVNet().onChange = () => setSockets(rt.getVNet().getSocketList());
  }, [callbacks]);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [consoleLines]);

  // ── CodeMirror editor ──
  const sourceRef = useRef(TEMPLATES[0].code);

  const createEditorState = useCallback((doc: string) => {
    return EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        bracketMatching(),
        closeBrackets(),
        foldGutter(),
        history(),
        highlightSelectionMatches(),
        simplPlusDef,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([
          ...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap, ...searchKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            sourceRef.current = update.state.doc.toString();
            debouncedReparse();
          }
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto", fontFamily: "var(--font-mono, monospace)" },
        }),
      ],
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editorContainerRef.current) return;
    const view = new EditorView({
      state: createEditorState(TEMPLATES[0].code),
      parent: editorContainerRef.current,
    });
    editorViewRef.current = view;
    // Initial parse
    reparse(TEMPLATES[0].code);
    return () => { view.destroy(); editorViewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced reparse ──
  const reparseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedReparse = useCallback(() => {
    if (reparseTimerRef.current) clearTimeout(reparseTimerRef.current);
    reparseTimerRef.current = setTimeout(() => {
      reparse(sourceRef.current);
    }, 300);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function reparse(source: string) {
    const rt = runtimeRef.current;
    if (!rt) return;
    setErrors([]);
    const result = rt.load(source);
    setIODecls(result.ioDecls);
    setAst(rt.getAST());
    syncIOState(rt);
    if (result.errors.length > 0) setErrors(result.errors);
  }

  function syncIOState(rt: SimplPlusRuntime) {
    const io = rt.getIO();
    setDigitalInputs(new Map(io.digitalInputs));
    setDigitalOutputs(new Map(io.digitalOutputs));
    setAnalogInputs(new Map(io.analogInputs));
    setAnalogOutputs(new Map(io.analogOutputs));
    setStringInputs(new Map(io.stringInputs));
    setStringOutputs(new Map(io.stringOutputs));
  }

  // ── Actions ──
  async function handleRun() {
    const rt = runtimeRef.current;
    if (!rt) return;
    rt.stop();
    setConsoleLines([]);
    setErrors([]);
    const result = rt.load(sourceRef.current);
    setIODecls(result.ioDecls);
    setAst(rt.getAST());
    syncIOState(rt);
    if (result.errors.length > 0) { setErrors(result.errors); return; }
    setIsRunning(true);
    await rt.runMain();
    syncIOState(rt);
  }

  function handleStop() {
    const rt = runtimeRef.current;
    if (!rt) return;
    rt.stop();
    setIsRunning(false);
  }

  function handleReset() {
    const rt = runtimeRef.current;
    if (!rt) return;
    setConsoleLines([]);
    setErrors([]);
    setIsRunning(false);
    rt.reset();
    syncIOState(rt);
    setIODecls([]);
    setAst(null);
    reparse(sourceRef.current);
  }

  function handleTemplateChange(idx: number) {
    setTemplateIdx(idx);
    const code = TEMPLATES[idx].code;
    sourceRef.current = code;
    const view = editorViewRef.current;
    if (view) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
    }
    setIsRunning(false);
    setConsoleLines([]);
    setErrors([]);
    const rt = runtimeRef.current;
    if (rt) { rt.reset(); reparse(code); }
  }

  // ── I/O interactions ──
  function handleDigitalInput(name: string) {
    const rt = runtimeRef.current;
    if (!rt) return;
    const current = digitalInputs.get(name) ?? 0;
    const next = current ? 0 : 1;
    setDigitalInputs(prev => new Map(prev).set(name, next));
    rt.setDigitalInput(name, next);
    syncIOState(rt);
  }

  function handleAnalogInput(name: string, value: number) {
    const rt = runtimeRef.current;
    if (!rt) return;
    setAnalogInputs(prev => new Map(prev).set(name, value));
    rt.setAnalogInput(name, value);
    syncIOState(rt);
  }

  function handleStringInput(name: string, value: string) {
    const rt = runtimeRef.current;
    if (!rt) return;
    setStringInputs(prev => new Map(prev).set(name, value));
    rt.setStringInput(name, value);
    syncIOState(rt);
  }

  // ── I/O groups ──
  const ioGroups = useMemo(() => {
    const groups: Record<string, string[]> = {
      DIGITAL_INPUT: [], DIGITAL_OUTPUT: [],
      ANALOG_INPUT: [], ANALOG_OUTPUT: [],
      STRING_INPUT: [], STRING_OUTPUT: [],
      BUFFER_INPUT: [],
    };
    for (const decl of ioDecls) {
      for (const name of decl.names) {
        if (decl.arraySize && decl.arraySize > 1) {
          for (let i = 1; i <= decl.arraySize; i++) {
            (groups[decl.ioType] ??= []).push(`${name}[${i}]`);
          }
        } else {
          (groups[decl.ioType] ??= []).push(name);
        }
      }
    }
    return groups;
  }, [ioDecls]);

  const hasInputs = ioGroups.DIGITAL_INPUT.length + ioGroups.ANALOG_INPUT.length +
    ioGroups.STRING_INPUT.length + ioGroups.BUFFER_INPUT.length > 0;
  const hasOutputs = ioGroups.DIGITAL_OUTPUT.length + ioGroups.ANALOG_OUTPUT.length +
    ioGroups.STRING_OUTPUT.length > 0;

  // ── Signal table for overview ──
  const signalTable = useMemo(() => {
    const rows: { pos: number; name: string; ioType: string; direction: string }[] = [];
    let diPos = 1, doPos = 1, aiPos = 1, aoPos = 1, siPos = 1, soPos = 1;
    for (const decl of ioDecls) {
      const count = (decl.arraySize && decl.arraySize > 1) ? decl.arraySize : 1;
      for (const name of decl.names) {
        for (let i = 0; i < count; i++) {
          const sigName = count > 1 ? `${name}[${i + 1}]` : name;
          let pos = 0;
          let direction = "";
          switch (decl.ioType) {
            case "DIGITAL_INPUT":  pos = diPos++; direction = "Input"; break;
            case "DIGITAL_OUTPUT": pos = doPos++; direction = "Output"; break;
            case "ANALOG_INPUT":   pos = aiPos++; direction = "Input"; break;
            case "ANALOG_OUTPUT":  pos = aoPos++; direction = "Output"; break;
            case "STRING_INPUT":   pos = siPos++; direction = "Input"; break;
            case "STRING_OUTPUT":  pos = soPos++; direction = "Output"; break;
            case "BUFFER_INPUT":   pos = siPos++; direction = "Input (Buffer)"; break;
          }
          rows.push({ pos, name: sigName, ioType: decl.ioType, direction });
        }
      }
    }
    return rows;
  }, [ioDecls]);

  // ── Module stats ──
  const stats = useMemo(() => {
    if (!ast) return null;
    const diCount = ioGroups.DIGITAL_INPUT.length;
    const doCount = ioGroups.DIGITAL_OUTPUT.length;
    const aiCount = ioGroups.ANALOG_INPUT.length;
    const aoCount = ioGroups.ANALOG_OUTPUT.length;
    const siCount = ioGroups.STRING_INPUT.length + ioGroups.BUFFER_INPUT.length;
    const soCount = ioGroups.STRING_OUTPUT.length;
    return {
      totalSignals: diCount + doCount + aiCount + aoCount + siCount + soCount,
      di: diCount, do: doCount, ai: aiCount, ao: aoCount, si: siCount, so: soCount,
      constants: ast.defines.length,
      variables: ast.varDecls.reduce((sum, v) => sum + v.names.length, 0),
      functions: ast.functions.length,
      events: ast.eventHandlers.length,
      hasMain: !!ast.mainFunction,
    };
  }, [ast, ioGroups]);

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>SIMPL+ Playground</h1>
          <p className="subhead">
            {ast?.symbolName
              ? <><span className="sp-module-name">{ast.symbolName}</span> — Write and test SIMPL+ programs</>
              : "Write and test SIMPL+ programs interactively"}
          </p>
        </div>
        <div className="splus-toolbar">
          <select value={templateIdx} onChange={e => handleTemplateChange(Number(e.target.value))}>
            {TEMPLATES.map((t, i) => (
              <option key={t.name} value={i}>{t.name}</option>
            ))}
          </select>
          <button className="button primary" onClick={handleRun}>
            {isRunning ? "Rebuild" : "Build & Run"}
          </button>
          {isRunning && (
            <button className="button" style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }} onClick={handleStop}>
              Stop
            </button>
          )}
          <button className="button" onClick={handleReset}>Reset</button>
        </div>
      </div>

      {/* ── Module Info Bar ── */}
      {ast && stats && (
        <div className="sp-module-bar">
          <div className="sp-module-bar__info">
            <span className="sp-module-bar__name">{ast.symbolName || "Untitled Module"}</span>
            {ast.directives.find(d => d.name === "HINT") && (
              <span className="sp-module-bar__hint">
                {ast.directives.find(d => d.name === "HINT")!.value}
              </span>
            )}
          </div>
          <div className="sp-module-bar__stats">
            {stats.di > 0 && <span className="sp-stat" style={{ borderColor: "#2563eb" }}>DI:{stats.di}</span>}
            {stats.do > 0 && <span className="sp-stat" style={{ borderColor: "#059669" }}>DO:{stats.do}</span>}
            {stats.ai > 0 && <span className="sp-stat" style={{ borderColor: "#7c3aed" }}>AI:{stats.ai}</span>}
            {stats.ao > 0 && <span className="sp-stat" style={{ borderColor: "#d97706" }}>AO:{stats.ao}</span>}
            {stats.si > 0 && <span className="sp-stat" style={{ borderColor: "#be185d" }}>SI:{stats.si}</span>}
            {stats.so > 0 && <span className="sp-stat" style={{ borderColor: "#ea580c" }}>SO:{stats.so}</span>}
            <span className="sp-stat sp-stat--plain">{stats.constants} const</span>
            <span className="sp-stat sp-stat--plain">{stats.variables} var</span>
            <span className="sp-stat sp-stat--plain">{stats.functions} fn</span>
            <span className="sp-stat sp-stat--plain">{stats.events} evt</span>
            {stats.hasMain && <span className="sp-stat sp-stat--main">Main()</span>}
          </div>
        </div>
      )}

      {/* ── Three-area layout ── */}
      <div className="sp-layout">
        {/* Left: Editor + Console */}
        <div className="sp-left">
          <div className="splus-editor" ref={editorContainerRef} />

          <div>
            <div className="splus-console-header">
              <h3>Console Output</h3>
              <button className="button" style={{ padding: "2px 10px", fontSize: 11 }} onClick={() => setConsoleLines([])}>
                Clear
              </button>
            </div>
            <div className="splus-console" ref={consoleRef}>
              {consoleLines.length === 0 && (
                <span style={{ color: "#475569", fontStyle: "italic" }}>
                  {isRunning ? "No output yet" : 'Click "Build & Run" to start...'}
                </span>
              )}
              {consoleLines.map((line, i) => (
                <div key={i} className="splus-console-line">{line}</div>
              ))}
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="splus-errors">
              <h4>Errors ({errors.length})</h4>
              {errors.map((err, i) => (
                <div key={i} className="splus-error-line">
                  {err.line > 0 ? `Line ${err.line}: ` : ""}{err.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Tabbed panel */}
        <div className="sp-right">
          <div className="sp-tabs">
            <button
              className={`sp-tab${rightTab === "program" ? " sp-tab--active" : ""}`}
              onClick={() => setRightTab("program")}
            >
              Program
            </button>
            <button
              className={`sp-tab${rightTab === "io" ? " sp-tab--active" : ""}`}
              onClick={() => setRightTab("io")}
            >
              Signal I/O
            </button>
            <button
              className={`sp-tab${rightTab === "files" ? " sp-tab--active" : ""}`}
              onClick={() => setRightTab("files")}
            >
              Files
            </button>
            <button
              className={`sp-tab${rightTab === "network" ? " sp-tab--active" : ""}`}
              onClick={() => setRightTab("network")}
            >
              Network
            </button>
          </div>

          <div className="sp-tab-body">
            {rightTab === "program" && (
              <ProgramOverview
                ast={ast}
                stats={stats}
                signalTable={signalTable}
                collapsed={collapsed}
                onToggle={toggleCollapse}
              />
            )}
            {rightTab === "io" && (
              <IOPanel
                ioGroups={ioGroups}
                hasInputs={hasInputs}
                hasOutputs={hasOutputs}
                isRunning={isRunning}
                digitalInputs={digitalInputs}
                digitalOutputs={digitalOutputs}
                analogInputs={analogInputs}
                analogOutputs={analogOutputs}
                stringInputs={stringInputs}
                stringOutputs={stringOutputs}
                onDigitalInput={handleDigitalInput}
                onAnalogInput={handleAnalogInput}
                onStringInput={handleStringInput}
              />
            )}
            {rightTab === "files" && (
              <FilesPanel
                files={vfsFiles}
                selectedFile={vfsSelectedFile}
                fileContent={vfsFileContent}
                onSelectFile={(path) => {
                  setVfsSelectedFile(path);
                  const rt = runtimeRef.current;
                  if (rt) setVfsFileContent(rt.getVFS().getFileContent(path));
                }}
                onClearAll={() => {
                  const rt = runtimeRef.current;
                  if (rt) { rt.getVFS().clearAll(); setVfsFiles(rt.getVFS().listFiles()); setVfsSelectedFile(null); setVfsFileContent(""); }
                }}
              />
            )}
            {rightTab === "network" && (
              <NetworkPanel
                sockets={sockets}
                onInjectData={(socketId, data) => {
                  const rt = runtimeRef.current;
                  if (rt) rt.getVNet().injectData(socketId, data);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Program Overview Panel
// ══════════════════════════════════════════════════════════════

function ProgramOverview({ ast, stats, signalTable, collapsed, onToggle }: {
  ast: ProgramNode | null;
  stats: { totalSignals: number; di: number; do: number; ai: number; ao: number; si: number; so: number; constants: number; variables: number; functions: number; events: number; hasMain: boolean } | null;
  signalTable: { pos: number; name: string; ioType: string; direction: string }[];
  collapsed: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (!ast || !stats) {
    return (
      <div className="sp-empty">
        <div className="sp-empty__icon">S+</div>
        <p>Write SIMPL+ code to see the program overview</p>
      </div>
    );
  }

  const catCode = ast.directives.find(d => d.name === "CATEGORY")?.value ?? "";
  const catName = CATEGORY_NAMES[catCode] ?? catCode;
  const hint = ast.directives.find(d => d.name === "HINT")?.value ?? "";
  const compilerDirs = ast.directives.filter(d =>
    !["SYMBOL_NAME", "HINT", "CATEGORY"].includes(d.name) && d.value === ""
  );

  return (
    <div className="sp-overview">
      {/* Module Info */}
      <div className="sp-ov-card">
        <div className="sp-ov-card__header">
          <div className="sp-ov-card__icon">S+</div>
          <div>
            <div className="sp-ov-card__title">{ast.symbolName || "Untitled"}</div>
            {hint && <div className="sp-ov-card__hint">{hint}</div>}
          </div>
        </div>
        <div className="sp-ov-card__meta">
          {catName && (
            <span className="sp-ov-meta-tag">Category: {catName}</span>
          )}
          {compilerDirs.map((d, i) => (
            <span key={i} className="sp-ov-meta-tag sp-ov-meta-tag--dir">#{d.name}</span>
          ))}
          {ast.mainFunction ? (
            <span className="sp-ov-meta-tag sp-ov-meta-tag--ok">Main() defined</span>
          ) : (
            <span className="sp-ov-meta-tag sp-ov-meta-tag--warn">No Main()</span>
          )}
        </div>
      </div>

      {/* Signal Table */}
      <OverviewSection
        title="Signal Table"
        badge={`${stats.totalSignals}`}
        collapsed={collapsed.has("signals")}
        onToggle={() => onToggle("signals")}
      >
        {signalTable.length > 0 ? (
          <table className="sp-sig-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Signal Name</th>
                <th>Type</th>
                <th>Dir</th>
              </tr>
            </thead>
            <tbody>
              {signalTable.map((sig, i) => {
                const meta = IO_TYPE_LABELS[sig.ioType];
                return (
                  <tr key={i}>
                    <td className="sp-sig-table__pos">{sig.pos}</td>
                    <td className="sp-sig-table__name">{sig.name}</td>
                    <td>
                      <span className="sp-sig-type" style={{ borderColor: meta?.color }}>
                        {meta?.abbr ?? sig.ioType}
                      </span>
                    </td>
                    <td className="sp-sig-table__dir">{sig.direction}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="sp-ov-empty">No signals declared</p>
        )}
      </OverviewSection>

      {/* Constants */}
      <OverviewSection
        title="Constants"
        badge={`${ast.defines.length}`}
        collapsed={collapsed.has("constants")}
        onToggle={() => onToggle("constants")}
      >
        {ast.defines.length > 0 ? (
          <table className="sp-const-table">
            <thead>
              <tr><th>Name</th><th>Value</th></tr>
            </thead>
            <tbody>
              {ast.defines.map((d, i) => (
                <tr key={i}>
                  <td className="sp-const-table__name">{d.name}</td>
                  <td className="sp-const-table__val">{String(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="sp-ov-empty">No constants defined</p>
        )}
      </OverviewSection>

      {/* Variables */}
      <OverviewSection
        title="Variables"
        badge={`${stats.variables}`}
        collapsed={collapsed.has("variables")}
        onToggle={() => onToggle("variables")}
      >
        {ast.varDecls.length > 0 ? (
          <table className="sp-var-table">
            <thead>
              <tr><th>Type</th><th>Name</th><th>Size</th></tr>
            </thead>
            <tbody>
              {ast.varDecls.flatMap((v, vi) =>
                v.names.map((n, ni) => (
                  <tr key={`${vi}-${ni}`}>
                    <td className="sp-var-table__type">{v.varType}</td>
                    <td className="sp-var-table__name">{n.name}</td>
                    <td className="sp-var-table__size">
                      {n.arraySize ? `[${n.arraySize}]` : ""}
                      {n.initSize ? `[${n.initSize}]` : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <p className="sp-ov-empty">No variables declared</p>
        )}
      </OverviewSection>

      {/* Functions */}
      <OverviewSection
        title="Functions"
        badge={`${ast.functions.length + (ast.mainFunction ? 1 : 0)}`}
        collapsed={collapsed.has("functions")}
        onToggle={() => onToggle("functions")}
      >
        <div className="sp-fn-list">
          {ast.mainFunction && (
            <div className="sp-fn-item sp-fn-item--main">
              <span className="sp-fn-return">void</span>
              <span className="sp-fn-name">Main</span>
              <span className="sp-fn-params">()</span>
              <span className="sp-fn-line">:{ast.mainFunction.line}</span>
            </div>
          )}
          {ast.functions.map((fn, i) => (
            <div key={i} className="sp-fn-item">
              <span className="sp-fn-return">{fn.returnType}</span>
              <span className="sp-fn-name">{fn.name}</span>
              <span className="sp-fn-params">
                ({fn.params.map(p => `${p.type} ${p.name}`).join(", ")})
              </span>
              <span className="sp-fn-line">:{fn.line}</span>
            </div>
          ))}
          {ast.functions.length === 0 && !ast.mainFunction && (
            <p className="sp-ov-empty">No functions defined</p>
          )}
        </div>
      </OverviewSection>

      {/* Event Handlers */}
      <OverviewSection
        title="Event Handlers"
        badge={`${ast.eventHandlers.length}`}
        collapsed={collapsed.has("events")}
        onToggle={() => onToggle("events")}
      >
        {ast.eventHandlers.length > 0 ? (
          <div className="sp-evt-list">
            {ast.eventHandlers.map((eh, i) => (
              <div key={i} className="sp-evt-item">
                <span className={`sp-evt-type sp-evt-type--${eh.eventType.toLowerCase()}`}>
                  {eh.eventType}
                </span>
                <span className="sp-evt-signal">{eh.signalName}</span>
                <span className="sp-fn-line">:{eh.line}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="sp-ov-empty">No event handlers</p>
        )}
      </OverviewSection>
    </div>
  );
}

function OverviewSection({ title, badge, collapsed, onToggle, children }: {
  title: string; badge: string; collapsed: boolean;
  onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="sp-ov-section">
      <button className="sp-ov-section__header" onClick={onToggle}>
        <span className="sp-ov-section__arrow">{collapsed ? "\u25B6" : "\u25BC"}</span>
        <span className="sp-ov-section__title">{title}</span>
        <span className="sp-ov-section__badge">{badge}</span>
      </button>
      {!collapsed && <div className="sp-ov-section__body">{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Signal I/O Panel (interactive testing)
// ══════════════════════════════════════════════════════════════

function IOPanel({ ioGroups, hasInputs, hasOutputs, isRunning, digitalInputs, digitalOutputs, analogInputs, analogOutputs, stringInputs, stringOutputs, onDigitalInput, onAnalogInput, onStringInput }: {
  ioGroups: Record<string, string[]>;
  hasInputs: boolean; hasOutputs: boolean; isRunning: boolean;
  digitalInputs: Map<string, number>; digitalOutputs: Map<string, number>;
  analogInputs: Map<string, number>; analogOutputs: Map<string, number>;
  stringInputs: Map<string, string>; stringOutputs: Map<string, string>;
  onDigitalInput: (name: string) => void;
  onAnalogInput: (name: string, value: number) => void;
  onStringInput: (name: string, value: string) => void;
}) {
  if (!hasInputs && !hasOutputs) {
    return (
      <div className="sp-empty">
        <div className="sp-empty__icon">I/O</div>
        <p>{isRunning ? "No I/O signals in this program" : 'Click "Build & Run" to load signals'}</p>
      </div>
    );
  }

  return (
    <div className="sp-io">
      {!isRunning && (
        <div className="sp-io-notice">Build & Run to enable interactive signal testing</div>
      )}

      {/* Digital Inputs */}
      {ioGroups.DIGITAL_INPUT.length > 0 && (
        <div className="splus-io-section">
          <h4>Digital Inputs</h4>
          {ioGroups.DIGITAL_INPUT.map(name => (
            <div key={name} className="splus-io-row">
              <span className="splus-io-row__name">{name}</span>
              <div className="splus-io-row__control">
                <button
                  className={`logic-input-toggle${(digitalInputs.get(name) ?? 0) ? " logic-input-toggle--on" : ""}`}
                  onClick={() => onDigitalInput(name)}
                  disabled={!isRunning}
                >
                  {(digitalInputs.get(name) ?? 0) ? "HIGH" : "LOW"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analog Inputs */}
      {ioGroups.ANALOG_INPUT.length > 0 && (
        <div className="splus-io-section">
          <h4>Analog Inputs</h4>
          {ioGroups.ANALOG_INPUT.map(name => (
            <div key={name} className="splus-io-row">
              <span className="splus-io-row__name">{name}</span>
              <div className="splus-io-row__control">
                <input type="range" className="splus-io-slider" min="0" max="65535"
                  value={analogInputs.get(name) ?? 0}
                  onChange={e => onAnalogInput(name, parseInt(e.target.value, 10))}
                  disabled={!isRunning}
                />
                <span className="splus-io-value">{analogInputs.get(name) ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* String / Buffer Inputs */}
      {(ioGroups.STRING_INPUT.length > 0 || ioGroups.BUFFER_INPUT.length > 0) && (
        <div className="splus-io-section">
          <h4>String Inputs</h4>
          {[...ioGroups.STRING_INPUT, ...ioGroups.BUFFER_INPUT].map(name => (
            <div key={name} className="splus-io-row">
              <span className="splus-io-row__name">{name}</span>
              <div className="splus-io-row__control">
                <input type="text" className="splus-io-text"
                  value={stringInputs.get(name) ?? ""}
                  onChange={e => onStringInput(name, e.target.value)}
                  placeholder="Type text..."
                  disabled={!isRunning}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Digital Outputs */}
      {ioGroups.DIGITAL_OUTPUT.length > 0 && (
        <div className="splus-io-section">
          <h4>Digital Outputs</h4>
          {ioGroups.DIGITAL_OUTPUT.map(name => {
            const val = digitalOutputs.get(name) ?? 0;
            return (
              <div key={name} className="splus-io-row">
                <span className="splus-io-row__name">{name}</span>
                <div className="splus-io-row__control">
                  <span className={`splus-signal-dot${val ? " splus-signal-dot--high" : ""}`} />
                  <span className={val ? "splus-signal-high" : "splus-signal-low"}>
                    {val ? "HIGH" : "LOW"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Analog Outputs */}
      {ioGroups.ANALOG_OUTPUT.length > 0 && (
        <div className="splus-io-section">
          <h4>Analog Outputs</h4>
          {ioGroups.ANALOG_OUTPUT.map(name => (
            <div key={name} className="splus-io-row">
              <span className="splus-io-row__name">{name}</span>
              <div className="splus-io-row__control">
                <span className="splus-io-value">{analogOutputs.get(name) ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* String Outputs */}
      {ioGroups.STRING_OUTPUT.length > 0 && (
        <div className="splus-io-section">
          <h4>String Outputs</h4>
          {ioGroups.STRING_OUTPUT.map(name => (
            <div key={name} className="splus-io-row">
              <span className="splus-io-row__name">{name}</span>
              <div className="splus-io-row__control">
                <span className="splus-io-string-value" title={stringOutputs.get(name) ?? ""}>
                  "{stringOutputs.get(name) ?? ""}"
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Files Panel (Virtual File System)
// ══════════════════════════════════════════════════════════════

function FilesPanel({ files, selectedFile, fileContent, onSelectFile, onClearAll }: {
  files: VFSEntry[];
  selectedFile: string | null;
  fileContent: string;
  onSelectFile: (path: string) => void;
  onClearAll: () => void;
}) {
  const dirs = files.filter(f => f.isDirectory);
  const regularFiles = files.filter(f => !f.isDirectory);
  const totalBytes = regularFiles.reduce((sum, f) => sum + f.content.length, 0);

  return (
    <div className="sp-vfs">
      <div className="sp-vfs-header">
        <div className="sp-vfs-stats">
          <span className="sp-vfs-stat">{dirs.length} dirs</span>
          <span className="sp-vfs-stat">{regularFiles.length} files</span>
          <span className="sp-vfs-stat">{totalBytes} bytes</span>
        </div>
        <button className="button" style={{ padding: "2px 10px", fontSize: 11 }} onClick={onClearAll}>
          Clear All
        </button>
      </div>

      {files.length === 0 ? (
        <div className="sp-empty">
          <div className="sp-empty__icon">FS</div>
          <p>No files yet. Run a program that uses file I/O.</p>
        </div>
      ) : (
        <div className="sp-vfs-content">
          <div className="sp-vfs-tree">
            {files.map(entry => (
              <button
                key={entry.path}
                className={`sp-vfs-item${entry.isDirectory ? " sp-vfs-item--dir" : ""}${entry.path === selectedFile ? " sp-vfs-item--selected" : ""}`}
                onClick={() => !entry.isDirectory && onSelectFile(entry.path)}
              >
                <span className="sp-vfs-item__icon">{entry.isDirectory ? "\uD83D\uDCC1" : "\uD83D\uDCC4"}</span>
                <span className="sp-vfs-item__name">{entry.path}</span>
                {!entry.isDirectory && (
                  <span className="sp-vfs-item__size">{entry.content.length}B</span>
                )}
              </button>
            ))}
          </div>

          {selectedFile && (
            <div className="sp-vfs-preview">
              <div className="sp-vfs-preview__header">{selectedFile}</div>
              <pre className="sp-vfs-preview__content">{fileContent || "(empty)"}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Network Panel (Virtual Sockets)
// ══════════════════════════════════════════════════════════════

function NetworkPanel({ sockets, onInjectData }: {
  sockets: VSocket[];
  onInjectData: (socketId: number, data: string) => void;
}) {
  const [injectSocketId, setInjectSocketId] = useState<number | null>(null);
  const [injectText, setInjectText] = useState("");

  const statusColors: Record<string, string> = {
    closed: "#94a3b8",
    connecting: "#d97706",
    connected: "#059669",
    error: "#dc2626",
  };

  if (sockets.length === 0) {
    return (
      <div className="sp-empty">
        <div className="sp-empty__icon">NET</div>
        <p>No sockets yet. Run a program that uses TCP/UDP.</p>
        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
          <div>Available simulators:</div>
          <div style={{ fontFamily: "var(--font-mono)", marginTop: 4 }}>
            <div>Echo Server &nbsp;&nbsp;&nbsp;192.168.1.100:23</div>
            <div>Projector Sim &nbsp;192.168.1.101:23</div>
            <div>Display Sim &nbsp;&nbsp;&nbsp;192.168.1.102:4660</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-net">
      <div className="sp-net-header">
        <span className="sp-vfs-stat">{sockets.length} socket{sockets.length !== 1 ? "s" : ""}</span>
        <span className="sp-vfs-stat">{sockets.filter(s => s.status === "connected").length} connected</span>
      </div>

      {sockets.map(sock => (
        <div key={sock.id} className="sp-net-socket">
          <div className="sp-net-socket__header">
            <span className="sp-net-socket__dot" style={{ background: statusColors[sock.status] }} />
            <span className="sp-net-socket__label">
              Socket #{sock.id} — {sock.protocol}
            </span>
            <span className="sp-net-socket__status">{sock.status}</span>
          </div>
          <div className="sp-net-socket__info">
            {sock.remoteAddress}:{sock.remotePort}
            {sock.localPort > 0 && <span style={{ color: "#94a3b8" }}> (local:{sock.localPort})</span>}
          </div>

          {/* TX/RX log */}
          {(sock.txLog.length > 0 || sock.rxLog.length > 0) && (
            <div className="sp-net-log">
              {[...sock.txLog.map(t => ({ dir: "TX" as const, ...t })),
                ...sock.rxLog.map(r => ({ dir: "RX" as const, ...r }))
              ].sort((a, b) => a.time - b.time).slice(-8).map((entry, i) => (
                <div key={i} className={`sp-net-log__entry sp-net-log__entry--${entry.dir.toLowerCase()}`}>
                  <span className="sp-net-log__dir">{entry.dir}</span>
                  <span className="sp-net-log__data">{entry.data.replace(/\r?\n/g, "\\n").substring(0, 60)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Inject data */}
          {sock.status === "connected" && (
            <div className="sp-net-inject">
              {injectSocketId === sock.id ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    type="text"
                    className="splus-io-text"
                    style={{ flex: 1, fontSize: 11 }}
                    value={injectText}
                    onChange={e => setInjectText(e.target.value)}
                    placeholder="Data to inject..."
                    onKeyDown={e => {
                      if (e.key === "Enter" && injectText) {
                        onInjectData(sock.id, injectText + "\r\n");
                        setInjectText("");
                        setInjectSocketId(null);
                      }
                    }}
                  />
                  <button className="button" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => {
                    if (injectText) { onInjectData(sock.id, injectText + "\r\n"); setInjectText(""); }
                    setInjectSocketId(null);
                  }}>Send</button>
                </div>
              ) : (
                <button className="button" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setInjectSocketId(sock.id)}>
                  Inject Data
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

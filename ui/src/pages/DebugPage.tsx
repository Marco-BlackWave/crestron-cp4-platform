import { useEffect, useMemo, useState, useRef } from "react";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { useSignalEngine } from "../hooks/useSignalEngine";
import type { SimSignal } from "../simulator/SignalEngine";

type Tab = "signals" | "connections" | "joinmap" | "log";

interface LogEntry {
  time: number;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
}

export default function DebugPage() {
  const { data: config } = useSystemConfig();
  const { signals, eiscs, toggleConnection, resetSimulation, setSignalValue } = useSignalEngine(config);
  const [tab, setTab] = useState<Tab>("signals");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dirFilter, setDirFilter] = useState<string>("all");
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const prevSignalsRef = useRef<Map<string, unknown>>(new Map());

  useEffect(() => { document.title = "Debug — CP4"; }, []);

  // Track signal changes for log and flash
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newFlash = new Set<string>();
    for (const sig of signals) {
      const prev = prevSignalsRef.current.get(sig.key);
      if (prev !== undefined && prev !== sig.value) {
        newFlash.add(sig.key);
        setLogEntries((entries) => {
          const entry: LogEntry = {
            time: Date.now(),
            level: "info",
            source: sig.roomId ?? "system",
            message: `${sig.name} (${sig.type}:${sig.joinNumber}) = ${JSON.stringify(sig.value)}`,
          };
          return [...entries.slice(-999), entry];
        });
      }
      prevSignalsRef.current.set(sig.key, sig.value);
    }
    if (newFlash.size > 0) {
      setFlashKeys(newFlash);
      setTimeout(() => setFlashKeys(new Set()), 500);
    }
  }, [signals]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logEntries]);

  const rooms = useMemo(() => {
    const ids = new Set<string>();
    for (const s of signals) if (s.roomId) ids.add(s.roomId);
    return Array.from(ids).sort();
  }, [signals]);

  const filteredSignals = useMemo(() => {
    let list = signals;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q) || String(s.joinNumber).includes(q));
    }
    if (typeFilter !== "all") list = list.filter((s) => s.type === typeFilter);
    if (dirFilter !== "all") list = list.filter((s) => s.direction === dirFilter);
    if (roomFilter !== "all") list = list.filter((s) => (s.roomId ?? "system") === roomFilter);
    return list;
  }, [signals, search, typeFilter, dirFilter, roomFilter]);

  const handleEdit = (sig: SimSignal) => {
    setEditingKey(sig.key);
    setEditValue(String(sig.value));
  };

  const handleSaveEdit = () => {
    if (!editingKey) return;
    const sig = signals.find((s) => s.key === editingKey);
    if (!sig) return;
    let val: unknown;
    if (sig.type === "digital") val = editValue === "true";
    else if (sig.type === "analog") val = parseInt(editValue) || 0;
    else val = editValue;
    setSignalValue(editingKey, val as boolean | number | string);
    setEditingKey(null);
  };

  const formatValue = (sig: SimSignal) => {
    if (sig.type === "digital") return sig.value ? "HIGH" : "LOW";
    if (sig.type === "analog") return String(sig.value);
    return `"${sig.value}"`;
  };

  const formatTime = (ts: number) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  if (!config) {
    return <div className="page-content"><div className="empty-state"><h2>No Config</h2><p>Load a system config to start debugging.</p></div></div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Debug Panel</h1>
          <p className="subhead">{signals.length} signals tracked</p>
        </div>
        <button className="button" onClick={resetSimulation}>Reset Simulation</button>
      </div>

      <div className="debug-tabs">
        {(["signals", "connections", "joinmap", "log"] as Tab[]).map((t) => (
          <button key={t} className={`debug-tab${tab === t ? " debug-tab--active" : ""}`} onClick={() => setTab(t)}>
            {t === "signals" ? "Signal Monitor" : t === "connections" ? "EISC Connections" : t === "joinmap" ? "Join Map" : "Log Viewer"}
          </button>
        ))}
      </div>

      {tab === "signals" && (
        <>
          <div className="filter-bar">
            <input className="search-input" placeholder="Search signals..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: 130 }}>
              <option value="all">All Types</option>
              <option value="digital">Digital</option>
              <option value="analog">Analog</option>
              <option value="serial">Serial</option>
            </select>
            <select className="input" value={dirFilter} onChange={(e) => setDirFilter(e.target.value)} style={{ width: 130 }}>
              <option value="all">All Directions</option>
              <option value="input">Input</option>
              <option value="output">Output</option>
            </select>
            <select className="input" value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} style={{ width: 160 }}>
              <option value="all">All Rooms</option>
              {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value="system">System</option>
            </select>
          </div>
          <div className="card card--flush" style={{ overflow: "auto", maxHeight: 600 }}>
            <table className="signal-table">
              <thead>
                <tr>
                  <th>Join</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Direction</th>
                  <th>Room</th>
                  <th>Value</th>
                  <th>Changed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredSignals.map((sig) => (
                  <tr key={sig.key} className={flashKeys.has(sig.key) ? "signal-flash" : ""}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{sig.joinNumber}</td>
                    <td><span className={`signal-type-dot signal-type-dot--${sig.type}`} />{sig.type}</td>
                    <td>{sig.name}</td>
                    <td><span className={`pill pill--${sig.direction}`}>{sig.direction}</span></td>
                    <td>{sig.roomId ?? "system"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {editingKey === sig.key ? (
                        <span style={{ display: "flex", gap: 4 }}>
                          <input className="input" value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{ width: 100, padding: "2px 6px", fontSize: 12 }} onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()} />
                          <button className="button" style={{ fontSize: 11, padding: "2px 8px" }} onClick={handleSaveEdit}>OK</button>
                        </span>
                      ) : formatValue(sig)}
                    </td>
                    <td style={{ fontSize: 11, color: "#64748b" }}>{formatTime(sig.lastChanged)}</td>
                    <td>
                      <button className="button" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => handleEdit(sig)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "connections" && (
        <div className="grid">
          {eiscs.map((eisc) => (
            <div key={eisc.processorId} className="eisc-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{eisc.processorId}</h3>
                <span className="eisc-card__status">
                  <span className={`eisc-card__dot ${eisc.online ? "eisc-card__dot--online" : "eisc-card__dot--offline"}`} />
                  {eisc.online ? "Online" : "Offline"}
                </span>
              </div>
              <p style={{ color: "#475569", fontSize: 13, margin: "0 0 12px" }}>
                Digital: {eisc.digitalInputs.size + eisc.digitalOutputs.size} | Analog: {eisc.analogInputs.size + eisc.analogOutputs.size} | Serial: {eisc.serialInputs.size + eisc.serialOutputs.size}
              </p>
              <button className={`toggle-switch${eisc.online ? " toggle-switch--on" : ""}`} onClick={() => toggleConnection(eisc.processorId)} aria-label="Toggle connection" />
            </div>
          ))}
        </div>
      )}

      {tab === "joinmap" && (
        <div className="card card--flush" style={{ overflow: "auto", maxHeight: 600, padding: 16 }}>
          <p className="subhead" style={{ marginBottom: 12 }}>Interactive join grid — rooms vs join offsets</p>
          <table className="signal-table">
            <thead>
              <tr>
                <th>Room</th>
                {Array.from({ length: 16 }, (_, i) => <th key={i} style={{ textAlign: "center" }}>{i}</th>)}
              </tr>
            </thead>
            <tbody>
              {rooms.map((roomId) => (
                <tr key={roomId}>
                  <td style={{ fontWeight: 600 }}>{roomId}</td>
                  {Array.from({ length: 16 }, (_, i) => {
                    const sig = signals.find((s) => s.key === `digital:${roomId}:${i}`);
                    const val = sig?.value;
                    return (
                      <td key={i} style={{
                        textAlign: "center",
                        background: val === true ? "rgba(37, 99, 235, 0.15)" : undefined,
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        cursor: "pointer",
                      }} title={sig?.name} onClick={() => sig && setSignalValue(sig.key, !val)}>
                        {val === true ? "1" : val === false ? "0" : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "log" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>{logEntries.length} entries</span>
            <button className="button" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setLogEntries([])}>Clear</button>
          </div>
          <div className="log-viewer" ref={logRef}>
            {logEntries.length === 0 && <div style={{ color: "#64748b", padding: 16 }}>No log entries yet. Interact with the Panel Emulator to see signal changes.</div>}
            {logEntries.map((entry, i) => (
              <div key={i} className="log-entry">
                <span className="log-entry__time">{new Date(entry.time).toLocaleTimeString([], { hour12: false })}</span>
                <span className={`log-entry__level--${entry.level}`}>[{entry.level.toUpperCase()}]</span>
                <span style={{ color: "#94a3b8" }}>{entry.source}</span>
                <span className="log-entry__msg">{entry.message}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

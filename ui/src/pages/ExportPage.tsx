import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";

export default function ExportPage() {
  const { draft, loadStatus, loadFromServer, validationErrors, isDirty, save, saveStatus } = useConfigEditor();
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "error">("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const [joinContract, setJoinContract] = useState<unknown>(null);

  useEffect(() => { document.title = "Export — Configure — CP4"; }, []);

  useEffect(() => {
    if (!draft && loadStatus === "idle") loadFromServer();
  }, [draft, loadStatus, loadFromServer]);

  // Load join contract when draft is available and not dirty
  useEffect(() => {
    if (!draft || isDirty) return;
    setExportStatus("loading");
    fetch("/api/joincontract", {
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load join contract");
        return r.json();
      })
      .then((data) => {
        setJoinContract(data);
        setExportStatus("idle");
      })
      .catch((e) => {
        setExportError(e.message);
        setExportStatus("error");
      });
  }, [draft, isDirty]);

  const configJson = useMemo(() => {
    if (!draft) return "";
    return JSON.stringify(draft, null, 2);
  }, [draft]);

  const handleDownload = async () => {
    try {
      const response = await fetch("/api/systemconfig/export", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Export failed");
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${draft?.projectId || "project"}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    }
  };

  const handleCopyContract = () => {
    if (joinContract) {
      navigator.clipboard.writeText(JSON.stringify(joinContract, null, 2));
    }
  };

  if (!draft) {
    return (
      <div>
        <h2>No Configuration Loaded</h2>
        <p className="subhead">Go to <Link to="/configure">Configure</Link> to load or create a project.</p>
      </div>
    );
  }

  const contractRooms = joinContract && typeof joinContract === "object" && "rooms" in joinContract
    ? (joinContract as { rooms: { id: string; name: string; joins: { digital: { join: number; name: string; direction: string }[]; analog: { join: number; name: string; direction: string }[]; serial: { join: number; name: string; direction: string }[] } }[] }).rooms
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Export</h1>
          <p className="subhead">Validate and export your configuration</p>
        </div>
      </div>

      <div className="help-text">
        <strong>SystemConfig</strong> is the full project configuration (rooms, devices, sources, scenes).
        The <strong>Join Contract</strong> is a computed map of all join numbers, generated from your config and used by
        the VTPro-e/CH5 graphics project. Save your config, then download or copy the contract for deployment.
      </div>

      {/* Validation Summary */}
      <div className={`card ${validationErrors.length > 0 ? "error" : ""}`} style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Validation</h2>
        {validationErrors.length === 0 ? (
          <p style={{ color: "#15803d", fontWeight: 600 }}>All checks passed</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((err, i) => (
              <li key={i} style={{ color: "#b91c1c", fontSize: 13 }}>{err}</li>
            ))}
          </ul>
        )}
        {isDirty && (
          <p style={{ color: "#d97706", fontSize: 13, marginTop: 8 }}>
            Unsaved changes — save before exporting.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          className="button primary"
          onClick={save}
          disabled={!isDirty || validationErrors.length > 0 || saveStatus === "saving"}
        >
          {saveStatus === "saving" ? "Saving..." : "Save Configuration"}
        </button>
        <button
          className="button"
          onClick={handleDownload}
          disabled={isDirty || validationErrors.length > 0}
        >
          Download Package
        </button>
        <button
          className="button"
          onClick={handleCopyContract}
          disabled={!joinContract}
        >
          Copy Join Contract
        </button>
        <Link to="/joins" className="button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Browse Full Join Map
        </Link>
        <Link to="/joinlist" className="button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          JoinList Editor (Legacy)
        </Link>
      </div>

      {exportError && (
        <p style={{ color: "#b91c1c", marginBottom: 16 }}>{exportError}</p>
      )}

      {/* JSON Preview */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setJsonExpanded(!jsonExpanded)}
        >
          <h2 style={{ margin: 0, fontSize: 16 }}>SystemConfig JSON</h2>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{jsonExpanded ? "Collapse" : "Expand"}</span>
        </div>
        {jsonExpanded && (
          <pre style={{
            marginTop: 12,
            padding: 16,
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 12,
            fontSize: 12,
            overflow: "auto",
            maxHeight: 500,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}>
            {configJson}
          </pre>
        )}
      </div>

      {/* Deploy to Processor */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Deploy to Processor</h2>
        <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 16 }}>
          Transfer configuration files directly to your CP4 processor via SFTP — with real-time progress,
          file verification, and program restart.
        </p>
        <Link
          to="/configure/deploy"
          className="button primary"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          Open Deploy Wizard
        </Link>
      </div>

      {/* Join Contract Preview */}
      {contractRooms.length > 0 && (
        <div className="card">
          <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Join Contract Preview</h2>
          {contractRooms.map((room) => (
            <details key={room.id} style={{ marginBottom: 8 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, padding: "4px 0" }}>
                {room.name} ({room.id})
              </summary>
              <table className="command-table" style={{ marginTop: 4, marginBottom: 12 }}>
                <thead>
                  <tr>
                    <th>Join</th>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {(["digital", "analog", "serial"] as const).flatMap((type) =>
                    room.joins[type].map((j) => (
                      <tr key={`${type}-${j.join}`}>
                        <td><code>{j.join}</code></td>
                        <td><span className={`pill pill--${type}`}>{type}</span></td>
                        <td>{j.name}</td>
                        <td><span className={`pill pill--${j.direction}`}>{j.direction}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

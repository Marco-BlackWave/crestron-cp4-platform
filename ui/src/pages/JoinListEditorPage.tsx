import { useCallback, useEffect, useMemo, useState } from "react";
import { loadJoinList } from "../api/loadJoinList";
import { saveJoinList } from "../api/saveJoinList";
import { JoinListConfig } from "../schema/joinListSchema";
import { useApiKey } from "../hooks/useApiKey";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: JoinListConfig };

const typeOrder = ["digital", "analog", "serial"] as const;

export default function JoinListEditorPage() {
  const { apiKey } = useApiKey();
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [rawJson, setRawJson] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    document.title = "JoinList Editor — CP4";
  }, []);

  const fetchJoinList = useCallback(() => {
    if (!apiKey.trim()) {
      setState({ status: "idle" });
      return;
    }
    setState({ status: "loading" });
    loadJoinList("/api", apiKey)
      .then((data) => {
        setState({ status: "ready", data });
        setRawJson(JSON.stringify(data, null, 2));
      })
      .catch((error) => {
        setState({ status: "error", message: error.message });
      });
  }, [apiKey]);

  useEffect(() => {
    fetchJoinList();
  }, [fetchJoinList]);

  useEffect(() => {
    if (saveStatus === "saved" || saveStatus === "error") {
      const timer = setTimeout(() => {
        setSaveStatus("idle");
        setSaveMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const stats = useMemo(() => {
    if (state.status !== "ready") return null;
    const { joins } = state.data;
    return {
      total: joins.digital.length + joins.analog.length + joins.serial.length,
      digital: joins.digital.length,
      analog: joins.analog.length,
      serial: joins.serial.length,
    };
  }, [state]);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>JoinList Editor</h1>
          <p className="subhead">Read and edit the legacy Join List JSON configuration.</p>
        </div>
        <button className="button" onClick={fetchJoinList}>
          Refresh
        </button>
      </div>

      {state.status === "error" && (
        <div className="card error" role="alert">{state.message}</div>
      )}

      {state.status === "loading" && (
        <div className="grid">
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
        </div>
      )}

      {state.status === "ready" && (
        <>
          <section className="grid">
            <div className="card">
              <p className="label">Project</p>
              <h2>{state.data.projectId}</h2>
              <p>Schema: {state.data.schemaVersion} | Processor: {state.data.processor}</p>
            </div>
            <div className="card">
              <p className="label">Debug Mode</p>
              <h2>{state.data.debugMode ? "Enabled" : "Disabled"}</h2>
            </div>
            <div className="card">
              <p className="label">Joins</p>
              <h2>{stats?.total ?? 0}</h2>
              <p>Digital {stats?.digital} · Analog {stats?.analog} · Serial {stats?.serial}</p>
            </div>
          </section>

          <section className="card">
            <table className="join-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Join</th>
                  <th>Name</th>
                  <th className="direction-col">Direction</th>
                </tr>
              </thead>
              <tbody>
                {typeOrder.map((type) =>
                  state.data.joins[type].map((entry) => (
                    <tr key={`${type}-${entry.join}`}>
                      <td><span className="pill">{type}</span></td>
                      <td>{entry.join}</td>
                      <td>{entry.name}</td>
                      <td className="direction direction-col">{entry.direction}</td>
                    </tr>
                  ))
                )}
                {stats?.total === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>
                      No joins configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="card">
            <div className="editor-header">
              <div>
                <label className="label" htmlFor="json-editor">Join List JSON</label>
                <p className="subhead">Edit and push updates to the API.</p>
              </div>
              <button
                className="button primary"
                onClick={async () => {
                  setSaveStatus("saving");
                  setSaveMessage("");
                  try {
                    const parsed = JSON.parse(rawJson);
                    await saveJoinList("/api", apiKey, parsed);
                    setSaveStatus("saved");
                    setSaveMessage("Saved successfully.");
                    fetchJoinList();
                  } catch (error) {
                    setSaveStatus("error");
                    setSaveMessage(error instanceof Error ? error.message : "Save failed.");
                  }
                }}
                disabled={saveStatus === "saving"}
              >
                {saveStatus === "saving" ? "Saving..." : "Save"}
              </button>
            </div>
            <textarea
              id="json-editor"
              className="editor"
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
            />
            {saveStatus !== "idle" && (
              <div className={`save-status ${saveStatus}`} role="alert" aria-live="assertive">
                {saveMessage}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

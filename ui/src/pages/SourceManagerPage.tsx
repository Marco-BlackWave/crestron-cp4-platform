import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";
import { ContextMenu } from "../components/ContextMenu";
import { useContextMenu } from "../hooks/useContextMenu";
import type { SourceType } from "../schema/systemConfigSchema";

const SOURCE_TYPES: SourceType[] = ["streaming", "settop", "audio", "gaming", "disc", "other"];

export default function SourceManagerPage() {
  const { draft, loadStatus, loadFromServer, addSource, updateSource, removeSource, toggleRoomSource } = useConfigEditor();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<SourceType>("streaming");
  const { menuPos, openMenu, closeMenu } = useContextMenu();
  const [contextSourceId, setContextSourceId] = useState<string | null>(null);

  useEffect(() => { document.title = "Sources — Configure — CP4"; }, []);

  useEffect(() => {
    if (!draft && loadStatus === "idle") loadFromServer();
  }, [draft, loadStatus, loadFromServer]);

  if (!draft) {
    return (
      <div>
        <h2>No Configuration Loaded</h2>
        <p className="subhead">Go to <Link to="/configure">Configure</Link> to load or create a project.</p>
      </div>
    );
  }

  const handleAdd = () => {
    if (newName.trim()) {
      addSource(newName.trim(), newType);
      setNewName("");
      setNewType("streaming");
    }
  };

  // Which rooms reference each source
  const sourceRoomMap = new Map<string, string[]>();
  for (const src of draft.sources) {
    sourceRoomMap.set(src.id, []);
  }
  for (const room of draft.rooms) {
    for (const sId of room.sources) {
      const list = sourceRoomMap.get(sId);
      if (list) list.push(room.name);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sources</h1>
          <p className="subhead">{draft.sources.length} source{draft.sources.length !== 1 ? "s" : ""} defined</p>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 20, maxWidth: 600 }}>
        <input
          className="input"
          placeholder="Source name (e.g. Apple TV)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <select className="input" value={newType} onChange={(e) => setNewType(e.target.value as SourceType)} style={{ maxWidth: 140 }}>
          {SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="button primary" onClick={handleAdd} disabled={!newName.trim()}>
          Add Source
        </button>
      </div>

      {draft.sources.length === 0 ? (
        <div className="empty-state">
          <h2>No Sources</h2>
          <p>Add sources like Apple TV, Cable Box, Sonos, etc.</p>
        </div>
      ) : (
        <div className="card-grid">
          {draft.sources.map((src) => {
            const rooms = sourceRoomMap.get(src.id) ?? [];
            return (
              <div key={src.id} className="card" onContextMenu={(e) => { setContextSourceId(src.id); openMenu(e); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <span className="pill" style={{ fontSize: 11 }}>{src.type}</span>
                  <button
                    className="button"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                    onClick={() => removeSource(src.id)}
                  >
                    Delete
                  </button>
                </div>
                <h3 style={{ margin: "0 0 4px" }}>{src.name}</h3>
                <p className="subhead" style={{ fontSize: 13 }}>ID: {src.id}</p>
                {rooms.length > 0 && (
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0" }}>
                    Used in: {rooms.join(", ")}
                  </p>
                )}
                <div className="form-row" style={{ marginTop: 8 }}>
                  <input
                    className="input"
                    defaultValue={src.name}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val && val !== src.name) updateSource(src.id, { name: val });
                    }}
                    style={{ fontSize: 13 }}
                  />
                  <select
                    className="input"
                    value={src.type}
                    onChange={(e) => updateSource(src.id, { type: e.target.value as SourceType })}
                    style={{ maxWidth: 120, fontSize: 13 }}
                  >
                    {SOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ContextMenu
        position={menuPos}
        onClose={closeMenu}
        items={[
          { label: "Edit Name", onClick: () => { if (contextSourceId) { const name = prompt("New name:", draft?.sources.find(s => s.id === contextSourceId)?.name); if (name) updateSource(contextSourceId, { name }); } } },
          { label: "", divider: true, onClick: () => {} },
          { label: "Delete", danger: true, onClick: () => { if (contextSourceId && confirm(`Delete source "${contextSourceId}"?`)) removeSource(contextSourceId); } },
        ]}
      />
    </div>
  );
}

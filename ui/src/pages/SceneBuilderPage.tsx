import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";
import { ContextMenu } from "../components/ContextMenu";
import { useContextMenu } from "../hooks/useContextMenu";

export default function SceneBuilderPage() {
  const { draft, loadStatus, loadFromServer, addScene, updateScene, removeScene } = useConfigEditor();
  const [newName, setNewName] = useState("");
  const { menuPos, openMenu, closeMenu } = useContextMenu();
  const [contextSceneId, setContextSceneId] = useState<string | null>(null);

  useEffect(() => { document.title = "Scenes — Configure — CP4"; }, []);

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
      addScene(newName.trim());
      setNewName("");
    }
  };

  const toggleSceneRoom = (sceneId: string, roomId: string) => {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const has = scene.rooms.includes(roomId);
    updateScene(sceneId, {
      rooms: has ? scene.rooms.filter((r) => r !== roomId) : [...scene.rooms, roomId],
    });
  };

  const toggleSceneAll = (sceneId: string) => {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const hasAll = scene.rooms.includes("all");
    updateScene(sceneId, {
      rooms: hasAll ? [] : ["all"],
    });
  };

  const setAction = (sceneId: string, key: string, value: string | number) => {
    const scene = draft.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const actions = { ...scene.actions };
    if (value === "" || value === undefined) {
      delete actions[key];
    } else {
      actions[key] = value;
    }
    updateScene(sceneId, { actions });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Scene Builder</h1>
          <p className="subhead">{draft.scenes.length} scene{draft.scenes.length !== 1 ? "s" : ""} defined</p>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 20, maxWidth: 480 }}>
        <input
          className="input"
          placeholder="Scene name (e.g. Movie Night)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="button primary" onClick={handleAdd} disabled={!newName.trim()}>
          Add Scene
        </button>
      </div>

      {draft.scenes.length === 0 ? (
        <div className="empty-state">
          <h2>No Scenes</h2>
          <p>Create scenes to control multiple rooms with one tap.</p>
        </div>
      ) : (
        <div className="card-grid">
          {draft.scenes.map((scene) => (
            <div key={scene.id} className="card" onContextMenu={(e) => { setContextSceneId(scene.id); openMenu(e); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                <input
                  className="input"
                  style={{ fontWeight: 600, fontSize: 16, border: "none", padding: 0, background: "transparent" }}
                  defaultValue={scene.name}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val && val !== scene.name) updateScene(scene.id, { name: val });
                  }}
                />
                <button
                  className="button"
                  style={{ fontSize: 12, padding: "4px 10px", flexShrink: 0 }}
                  onClick={() => removeScene(scene.id)}
                >
                  Delete
                </button>
              </div>

              <p className="subhead" style={{ fontSize: 13, marginBottom: 8 }}>ID: {scene.id}</p>

              {/* Target rooms */}
              <div style={{ marginBottom: 12 }}>
                <label className="label">Target Rooms</label>
                <div className="badge-row" style={{ gap: 6 }}>
                  <button
                    className={`pill ${scene.rooms.includes("all") ? "pill--checked pill--input" : "pill--unchecked"}`}
                    onClick={() => toggleSceneAll(scene.id)}
                  >
                    All
                  </button>
                  {!scene.rooms.includes("all") && draft.rooms.map((room) => (
                    <button
                      key={room.id}
                      className={`pill ${scene.rooms.includes(room.id) ? "pill--checked pill--input" : "pill--unchecked"}`}
                      onClick={() => toggleSceneRoom(scene.id, room.id)}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <label className="label">Actions</label>
                <div className="scene-editor-actions">
                  <div className="form-row" style={{ alignItems: "center" }}>
                    <span style={{ fontSize: 13, minWidth: 60 }}>Lighting</span>
                    <input
                      className="input"
                      type="range"
                      min="0"
                      max="100"
                      value={typeof scene.actions.lighting === "number" ? scene.actions.lighting : 100}
                      onChange={(e) => setAction(scene.id, "lighting", parseInt(e.target.value, 10))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 12, minWidth: 32, textAlign: "right" }}>
                      {typeof scene.actions.lighting === "number" ? `${scene.actions.lighting}%` : "—"}
                    </span>
                  </div>

                  <div className="form-row" style={{ alignItems: "center" }}>
                    <span style={{ fontSize: 13, minWidth: 60 }}>Shades</span>
                    <select
                      className="input"
                      value={typeof scene.actions.shades === "string" ? scene.actions.shades : ""}
                      onChange={(e) => setAction(scene.id, "shades", e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">— none —</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="form-row" style={{ alignItems: "center" }}>
                    <span style={{ fontSize: 13, minWidth: 60 }}>Source</span>
                    <select
                      className="input"
                      value={typeof scene.actions.source === "string" ? scene.actions.source : ""}
                      onChange={(e) => setAction(scene.id, "source", e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">— none —</option>
                      {draft.sources.map((src) => (
                        <option key={src.id} value={src.id}>{src.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row" style={{ alignItems: "center" }}>
                    <span style={{ fontSize: 13, minWidth: 60 }}>AV</span>
                    <select
                      className="input"
                      value={typeof scene.actions.av === "string" ? scene.actions.av : ""}
                      onChange={(e) => setAction(scene.id, "av", e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">— none —</option>
                      <option value="on">Power On</option>
                      <option value="off">Power Off</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ContextMenu
        position={menuPos}
        onClose={closeMenu}
        items={[
          { label: "Edit Name", onClick: () => { if (contextSceneId) { const name = prompt("New name:", draft?.scenes.find(s => s.id === contextSceneId)?.name); if (name) updateScene(contextSceneId, { name }); } } },
          { label: "Duplicate", onClick: () => {
            if (contextSceneId) {
              const scene = draft?.scenes.find(s => s.id === contextSceneId);
              if (scene) { addScene(`${scene.name} Copy`); }
            }
          }},
          { label: "", divider: true, onClick: () => {} },
          { label: "Delete", danger: true, onClick: () => { if (contextSceneId && confirm(`Delete scene "${contextSceneId}"?`)) removeScene(contextSceneId); } },
        ]}
      />
    </div>
  );
}

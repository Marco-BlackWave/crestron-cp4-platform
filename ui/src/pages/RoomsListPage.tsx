import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";
import { ContextMenu } from "../components/ContextMenu";
import { useContextMenu } from "../hooks/useContextMenu";

export default function RoomsListPage() {
  const { draft, loadStatus, loadFromServer, addRoom, removeRoom, reorderRoom } = useConfigEditor();
  const [newRoomName, setNewRoomName] = useState("");
  const navigate = useNavigate();
  const { menuPos, openMenu, closeMenu } = useContextMenu();
  const [contextRoomId, setContextRoomId] = useState<string | null>(null);

  useEffect(() => { document.title = "Rooms — Configure — CP4"; }, []);

  useEffect(() => {
    if (!draft && loadStatus === "idle") {
      loadFromServer();
    }
  }, [draft, loadStatus, loadFromServer]);

  if (loadStatus === "loading" || (!draft && loadStatus === "idle")) {
    return (
      <div>
        <div className="skeleton skeleton-heading" />
        <div className="card-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div>
        <h2>No Configuration Loaded</h2>
        <p className="subhead">Go to <Link to="/configure">Configure</Link> to load or create a project.</p>
      </div>
    );
  }

  const handleAddRoom = () => {
    if (newRoomName.trim()) {
      addRoom(newRoomName.trim());
      setNewRoomName("");
    }
  };

  const handleAddEquipmentRoom = () => {
    addRoom("Equipment Rack", [], "technical");
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Rooms</h1>
          <p className="subhead">{draft.rooms.length} room{draft.rooms.length !== 1 ? "s" : ""} configured</p>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 20, maxWidth: 580 }}>
        <input
          className="input"
          placeholder="New room name..."
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddRoom()}
        />
        <button className="button primary" onClick={handleAddRoom} disabled={!newRoomName.trim()}>
          Add Room
        </button>
        <button className="button" onClick={handleAddEquipmentRoom}>
          + Equipment Room
        </button>
      </div>

      {draft.rooms.length === 0 ? (
        <div className="empty-state">
          <h2>No Rooms</h2>
          <p>Add a room to get started.</p>
        </div>
      ) : (
        <section className="card-grid">
          {draft.rooms.map((room) => {
            const deviceCount = Object.keys(room.devices).length;
            const roleCount = room.subsystems.reduce((acc, sub) => {
              if (sub === "av") return acc + 2; // display + audio
              return acc + 1;
            }, 0);

            return (
              <Link to={`/configure/rooms/${room.id}`} className="card-link" key={room.id}>
                <div className="card clickable" onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextRoomId(room.id); openMenu(e); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span className="pill" style={{ fontSize: 11 }}>
                        Joins {room.joinOffset + 1}–{room.joinOffset + 100}
                      </span>
                      {(draft.system.processors?.length ?? 0) > 1 && room.processorId && (
                        <span className="pill" style={{ fontSize: 11, background: "rgba(59,130,246,0.12)", color: "#2563eb" }}>
                          {room.processorId}
                        </span>
                      )}
                    </div>
                    {deviceCount >= roleCount && roleCount > 0 ? (
                      <span className="pill pill--input" style={{ fontSize: 11 }}>Complete</span>
                    ) : (
                      <span className="pill" style={{ fontSize: 11, background: "rgba(234,88,12,0.12)", color: "#c2410c" }}>
                        {deviceCount}/{roleCount} assigned
                      </span>
                    )}
                  </div>
                  <h2 style={{ margin: "0 0 4px" }}>
                    {room.name}
                    {room.roomType === "technical" && <span className="pill pill--technical" style={{ marginLeft: 8, fontSize: 10, verticalAlign: "middle" }}>Equipment</span>}
                  </h2>
                  <p className="subhead" style={{ marginBottom: 10, fontSize: 13 }}>{room.id}</p>
                  <div className="badge-row">
                    {room.roomType === "technical" ? (
                      <span className="pill pill--technical">No subsystems</span>
                    ) : (
                      room.subsystems.map((sub) => (
                        <span key={sub} className={`pill pill--${sub}`}>{sub}</span>
                      ))
                    )}
                  </div>
                  {room.sources.length > 0 && (
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                      Sources: {room.sources.join(", ")}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <ContextMenu
        position={menuPos}
        onClose={closeMenu}
        items={[
          { label: "Edit Room", onClick: () => { if (contextRoomId) navigate(`/configure/rooms/${contextRoomId}`); } },
          { label: "Move Up", onClick: () => { if (contextRoomId) reorderRoom(contextRoomId, "up"); } },
          { label: "Move Down", onClick: () => { if (contextRoomId) reorderRoom(contextRoomId, "down"); } },
          { label: "", divider: true, onClick: () => {} },
          { label: "Delete", danger: true, onClick: () => { if (contextRoomId && confirm(`Delete room "${contextRoomId}"?`)) removeRoom(contextRoomId); } },
        ]}
      />
    </div>
  );
}

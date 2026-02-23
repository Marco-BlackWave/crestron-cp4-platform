import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";

export default function RoomsListPage() {
  const { draft, loadStatus, loadFromServer, addRoom } = useConfigEditor();
  const [newRoomName, setNewRoomName] = useState("");

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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Rooms</h1>
          <p className="subhead">{draft.rooms.length} room{draft.rooms.length !== 1 ? "s" : ""} configured</p>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 20, maxWidth: 480 }}>
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
                <div className="card clickable">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <span className="pill" style={{ fontSize: 11 }}>
                      Joins {room.joinOffset + 1}–{room.joinOffset + 100}
                    </span>
                    {deviceCount >= roleCount && roleCount > 0 ? (
                      <span className="pill pill--input" style={{ fontSize: 11 }}>Complete</span>
                    ) : (
                      <span className="pill" style={{ fontSize: 11, background: "rgba(234,88,12,0.12)", color: "#c2410c" }}>
                        {deviceCount}/{roleCount} assigned
                      </span>
                    )}
                  </div>
                  <h2 style={{ margin: "0 0 4px" }}>{room.name}</h2>
                  <p className="subhead" style={{ marginBottom: 10, fontSize: 13 }}>{room.id}</p>
                  <div className="badge-row">
                    {room.subsystems.map((sub) => (
                      <span key={sub} className={`pill pill--${sub}`}>{sub}</span>
                    ))}
                  </div>
                  {room.sources.length > 0 && (
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>
                      Sources: {room.sources.join(", ")}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}

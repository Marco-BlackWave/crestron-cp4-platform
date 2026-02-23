import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { useJoinContract } from "../hooks/useJoinContract";
import { useCatalog } from "../hooks/useCatalog";

const subsystemColors: Record<string, string> = {
  av: "av", lighting: "lighting", shades: "shades", hvac: "hvac", security: "security",
};

export default function DashboardPage() {
  const config = useSystemConfig();
  const contract = useJoinContract();
  const catalog = useCatalog();

  useEffect(() => { document.title = "Dashboard — CP4"; }, []);

  const stats = useMemo(() => {
    if (!config.data || !contract.data) return null;
    const totalJoins = contract.data.rooms.reduce((sum, r) =>
      sum + r.joins.digital.length + r.joins.analog.length + r.joins.serial.length, 0)
      + contract.data.system.digital.length + contract.data.system.serial.length;

    const totalDevices = config.data.rooms.reduce((sum, r) =>
      sum + Object.keys(r.devices).length, 0);

    return {
      rooms: config.data.rooms.length,
      devices: totalDevices,
      joins: totalJoins,
      scenes: config.data.scenes.length,
      sources: config.data.sources.length,
    };
  }, [config.data, contract.data]);

  if (config.status === "loading" || contract.status === "loading") {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" />
        <div className="grid">
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
        </div>
      </div>
    );
  }

  if (config.status === "error") {
    return (
      <div className="page-content">
        <h1>Dashboard</h1>
        <div className="card error" role="alert">{config.error}</div>
      </div>
    );
  }

  if (!config.data || !contract.data) {
    return (
      <div className="page-content">
        <h1>Dashboard</h1>
        <div className="empty-state">
          <h2>No Data</h2>
          <p>Could not load system configuration.</p>
        </div>
      </div>
    );
  }

  const { data } = config;

  return (
    <div className="page-content">
      {/* System header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <p className="label">System</p>
        <h1 style={{ margin: "0 0 4px" }}>{data.system.name}</h1>
        <p className="subhead">
          Project: {data.projectId} &middot; Processor: {data.processor} &middot;
          EISC: {data.system.eiscIpId} @ {data.system.eiscIpAddress}
        </p>
      </div>

      {/* Stats row */}
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <div className="card stat-card">
          <p className="stat-value">{stats?.rooms}</p>
          <p className="stat-label">Rooms</p>
        </div>
        <div className="card stat-card">
          <p className="stat-value">{stats?.devices}</p>
          <p className="stat-label">Devices</p>
        </div>
        <div className="card stat-card">
          <p className="stat-value">{stats?.joins}</p>
          <p className="stat-label">Total Joins</p>
        </div>
        <div className="card stat-card">
          <p className="stat-value">{stats?.scenes}</p>
          <p className="stat-label">Scenes</p>
        </div>
        <div className="card stat-card">
          <p className="stat-value">{stats?.sources}</p>
          <p className="stat-label">Sources</p>
        </div>
      </section>

      {/* Module catalog stats */}
      {catalog.data && (
        <>
          <h2 style={{ margin: "28px 0 12px" }}>Module Catalog</h2>
          <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <div className="card stat-card">
              <p className="stat-value">{catalog.data.totalProfiles}</p>
              <p className="stat-label">Available Modules</p>
            </div>
            <div className="card stat-card">
              <p className="stat-value">{Object.keys(catalog.data.categories).length}</p>
              <p className="stat-label">Categories</p>
            </div>
            <div className="card stat-card">
              <p className="stat-value">{stats?.devices}</p>
              <p className="stat-label">In Use</p>
            </div>
            <div className="card stat-card">
              <p className="stat-value">
                {catalog.data.profiles.filter((p) => p.sourceModule).length}
              </p>
              <p className="stat-label">From SIMPL+</p>
            </div>
          </section>
          <div className="filter-bar" style={{ margin: "12px 0" }}>
            {Object.entries(catalog.data.categories)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([cat, info]) => (
                <Link key={cat} to={`/devices?category=${cat}`} className="filter-pill">
                  {cat} ({info.count})
                </Link>
              ))}
          </div>
        </>
      )}

      {/* Room cards */}
      <h2 style={{ marginBottom: 12 }}>Rooms</h2>
      <section className="card-grid">
        {data.rooms.map((room) => {
          const roomContract = contract.data!.rooms.find((r) => r.id === room.id);
          const joinCount = roomContract
            ? roomContract.joins.digital.length + roomContract.joins.analog.length + roomContract.joins.serial.length
            : 0;
          const minJoin = room.joinOffset + 1;
          const maxJoin = room.joinOffset + 100;

          return (
            <Link to={`/rooms/${room.id}`} className="card-link" key={room.id}>
              <div className="card clickable">
                <p className="label">{room.id}</p>
                <h2 style={{ margin: "0 0 8px" }}>{room.name}</h2>
                <p className="subhead" style={{ marginBottom: 10 }}>
                  Joins {minJoin}–{maxJoin} &middot; {Object.keys(room.devices).length} devices &middot; {joinCount} signals
                </p>
                <div className="badge-row">
                  {room.subsystems.map((sub) => (
                    <span key={sub} className={`pill pill--${subsystemColors[sub] ?? ""}`}>
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Scenes */}
      {data.scenes.length > 0 && (
        <>
          <h2 style={{ margin: "28px 0 12px" }}>Scenes</h2>
          <section className="card-grid">
            {data.scenes.map((scene) => (
              <div className="card" key={scene.id}>
                <p className="label">{scene.id}</p>
                <h2 style={{ margin: "0 0 4px" }}>{scene.name}</h2>
                <p className="subhead" style={{ marginBottom: 8 }}>
                  Rooms: {scene.rooms.join(", ")}
                </p>
                <ul className="scene-actions">
                  {Object.entries(scene.actions).map(([key, val]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {String(val)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}

      {/* Quick links */}
      <h2 style={{ margin: "28px 0 12px" }}>Quick Links</h2>
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <Link to="/joins" className="card-link">
          <div className="card clickable">
            <h3 style={{ margin: 0 }}>Join Map Browser</h3>
            <p className="subhead">Search and filter all joins</p>
          </div>
        </Link>
        <Link to="/devices" className="card-link">
          <div className="card clickable">
            <h3 style={{ margin: 0 }}>Device Library</h3>
            <p className="subhead">Browse device profiles</p>
          </div>
        </Link>
        <Link to="/joinlist" className="card-link">
          <div className="card clickable">
            <h3 style={{ margin: 0 }}>JoinList Editor</h3>
            <p className="subhead">Legacy JSON configuration</p>
          </div>
        </Link>
      </section>
    </div>
  );
}

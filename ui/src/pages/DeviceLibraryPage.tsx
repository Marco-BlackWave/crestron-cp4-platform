import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useDevices } from "../hooks/useDevices";
import { useSystemConfig } from "../hooks/useSystemConfig";

const protocolColors: Record<string, string> = {
  ir: "ir", serial: "serial-proto", ip: "ip", bacnet: "bacnet", modbus: "modbus",
  knx: "knx", artnet: "artnet", shelly: "shelly", pjlink: "pjlink",
};

export default function DeviceLibraryPage() {
  const { status, data: devices, error } = useDevices();
  const config = useSystemConfig();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());
  const [protoFilter, setProtoFilter] = useState<Set<string>>(new Set());

  useEffect(() => { document.title = "Device Library — CP4"; }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of devices) {
      counts[d.category] = (counts[d.category] || 0) + 1;
    }
    return counts;
  }, [devices]);

  const categories = useMemo(() => {
    return Object.keys(categoryCounts).sort();
  }, [categoryCounts]);

  const protocols = useMemo(() => {
    const protos = new Set<string>();
    for (const d of devices) {
      for (const p of Object.keys(d.protocols)) protos.add(p);
    }
    return Array.from(protos).sort();
  }, [devices]);

  // Determine which profileIds are in use
  const usedProfiles = useMemo(() => {
    if (!config.data) return new Set<string>();
    const used = new Set<string>();
    for (const room of config.data.rooms) {
      for (const dev of Object.values(room.devices)) {
        used.add(dev.profileId);
      }
    }
    return used;
  }, [config.data]);

  const filtered = useMemo(() => {
    let list = devices;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        d.manufacturer.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
      );
    }
    if (catFilter.size > 0) {
      list = list.filter((d) => catFilter.has(d.category));
    }
    if (protoFilter.size > 0) {
      list = list.filter((d) =>
        Object.keys(d.protocols).some((p) => protoFilter.has(p))
      );
    }
    return list;
  }, [devices, search, catFilter, protoFilter]);

  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };

  if (status === "loading") {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" />
        <div className="card-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card skeleton skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page-content">
        <h1>Device Library</h1>
        <div className="card error" role="alert">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Device Library</h1>
          <p className="subhead">{filtered.length} of {devices.length} device profiles</p>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search manufacturer, model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-group">
          <span className="filter-group-label">Category</span>
          {categories.map((c) => (
            <button
              key={c}
              className={`filter-pill ${catFilter.has(c) ? "filter-pill--active" : ""}`}
              onClick={() => toggleFilter(catFilter, c, setCatFilter)}
            >
              {c} ({categoryCounts[c]})
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Protocol</span>
          {protocols.map((p) => (
            <button
              key={p}
              className={`filter-pill ${protoFilter.has(p) ? "filter-pill--active" : ""}`}
              onClick={() => toggleFilter(protoFilter, p, setProtoFilter)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h2>No Devices Found</h2>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <section className="card-grid">
          {filtered.map((device) => (
            <Link to={`/devices/${device.id}`} className="card-link" key={device.id}>
              <div className="card clickable">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <span className={`pill pill--${device.category === "display" ? "av" : device.category}`}>
                    {device.category}
                  </span>
                  {usedProfiles.has(device.id) && (
                    <span className="pill pill--input" style={{ fontSize: 11 }}>In Use</span>
                  )}
                </div>
                <h3 style={{ margin: "0 0 2px" }}>{device.manufacturer}</h3>
                <p className="subhead" style={{ marginBottom: 10 }}>{device.model}</p>
                <div className="badge-row">
                  {Object.keys(device.protocols).map((p) => (
                    <span key={p} className={`pill pill--${protocolColors[p] ?? ""}`}>{p}</span>
                  ))}
                  {device.sourceModule && (
                    <span className="pill pill--generated" title={device.sourceModule}>SIMPL+</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

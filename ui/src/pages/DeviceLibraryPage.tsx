import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useDevices } from "../hooks/useDevices";
import { useSystemConfig } from "../hooks/useSystemConfig";
import DeviceFilterSidebar from "../components/DeviceFilterSidebar";
import AppliedFilters from "../components/AppliedFilters";

type SortKey = "manufacturer" | "model" | "category" | "protocols" | "commands";
type SortDir = "asc" | "desc";

const protocolColors: Record<string, string> = {
  ir: "ir", serial: "serial-proto", ip: "ip", bacnet: "bacnet", modbus: "modbus",
  knx: "knx", artnet: "artnet", shelly: "shelly", pjlink: "pjlink",
};

const categoryColors: Record<string, string> = {
  audio: "av", display: "av", dsp: "av", matrix: "av", media: "av",
  lighting: "lighting", shade: "shades", shades: "shades",
  hvac: "hvac", security: "security",
};

const capabilityLabels: Record<string, string> = {
  discretePower: "discrete-power",
  volumeControl: "volume",
  inputSelect: "input-select",
  feedback: "feedback",
};

const PAGE_SIZE = 50;

export default function DeviceLibraryPage() {
  const { status, data: devices, error } = useDevices();
  const config = useSystemConfig();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedProtocols, setSelectedProtocols] = useState<Set<string>>(new Set());
  const [selectedManufacturers, setSelectedManufacturers] = useState<Set<string>>(new Set());
  const [selectedCapabilities, setSelectedCapabilities] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("manufacturer");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => { document.title = "Device Library — CP4"; }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedCategories, selectedProtocols, selectedManufacturers, selectedCapabilities]);

  const toggleSet = useCallback((setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const usedProfiles = useMemo(() => {
    if (!config.data) return new Set<string>();
    const used = new Set<string>();
    for (const room of config.data.rooms)
      for (const dev of Object.values(room.devices)) used.add(dev.profileId);
    return used;
  }, [config.data]);

  const getCmdCount = (d: typeof devices[0]) => {
    let total = 0;
    for (const cfg of Object.values(d.protocols)) {
      const cmds = (cfg as Record<string, unknown>)?.commands;
      if (cmds) total += Object.keys(cmds as Record<string, unknown>).length;
    }
    return total;
  };

  const deviceSearchIndex = useMemo(() => {
    return devices.map((d) => {
      const parts = [
        d.id, d.manufacturer, d.model, d.category,
        ...Object.keys(d.protocols),
        d.sourceModule ?? "",
      ];
      for (const [k, v] of Object.entries(d.capabilities)) {
        if (v === true && capabilityLabels[k]) parts.push(capabilityLabels[k]);
      }
      for (const cfg of Object.values(d.protocols)) {
        const cmds = (cfg as Record<string, unknown>)?.commands;
        if (cmds) parts.push(...Object.keys(cmds as Record<string, string>));
      }
      return parts.join(" ").toLowerCase();
    });
  }, [devices]);

  const filtered = useMemo(() => {
    let list = devices;
    let indices = devices.map((_, i) => i);

    if (search) {
      const q = search.toLowerCase();
      indices = indices.filter((i) => deviceSearchIndex[i].includes(q));
      list = indices.map((i) => devices[i]);
    } else {
      list = devices;
    }

    if (selectedCategories.size > 0)
      list = list.filter((d) => selectedCategories.has(d.category));
    if (selectedProtocols.size > 0)
      list = list.filter((d) => Object.keys(d.protocols).some((p) => selectedProtocols.has(p)));
    if (selectedManufacturers.size > 0)
      list = list.filter((d) => selectedManufacturers.has(d.manufacturer));
    if (selectedCapabilities.size > 0)
      list = list.filter((d) =>
        [...selectedCapabilities].every((cap) => (d.capabilities as Record<string, unknown>)[cap] === true)
      );
    return list;
  }, [devices, deviceSearchIndex, search, selectedCategories, selectedProtocols, selectedManufacturers, selectedCapabilities]);

  const facetCounts = useMemo(() => {
    const catMap: Record<string, number> = {};
    const protoMap: Record<string, number> = {};
    const mfrMap: Record<string, number> = {};
    const capMap: Record<string, number> = {};

    for (const d of devices) {
      catMap[d.category] = (catMap[d.category] || 0) + 1;
      for (const p of Object.keys(d.protocols)) protoMap[p] = (protoMap[p] || 0) + 1;
      mfrMap[d.manufacturer] = (mfrMap[d.manufacturer] || 0) + 1;
      for (const [k, v] of Object.entries(d.capabilities)) {
        if (v === true) capMap[k] = (capMap[k] || 0) + 1;
      }
    }

    const sort = (m: Record<string, number>) =>
      Object.entries(m).sort((a, b) => b[1] - a[1]);

    return {
      categories: sort(catMap),
      protocols: sort(protoMap),
      manufacturers: sort(mfrMap),
      capabilities: sort(capMap).filter(([k]) =>
        ["discretePower", "volumeControl", "inputSelect", "feedback"].includes(k)
      ),
    };
  }, [devices]);

  const sorted = useMemo(() => {
    const mult = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "manufacturer": return mult * a.manufacturer.localeCompare(b.manufacturer);
        case "model": return mult * a.model.localeCompare(b.model);
        case "category": return mult * a.category.localeCompare(b.category);
        case "protocols": return mult * (Object.keys(a.protocols).join(",").localeCompare(Object.keys(b.protocols).join(",")));
        case "commands": return mult * (getCmdCount(a) - getCmdCount(b));
        default: return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  const visible = sorted.slice(0, visibleCount);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return " \u2195";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  };

  const hasFilters = selectedCategories.size + selectedProtocols.size + selectedManufacturers.size + selectedCapabilities.size > 0;

  const clearAll = () => {
    setSelectedCategories(new Set());
    setSelectedProtocols(new Set());
    setSelectedManufacturers(new Set());
    setSelectedCapabilities(new Set());
    setSearch("");
  };

  if (status === "loading") {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8 }} />
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
          <p className="subhead">
            {filtered.length === devices.length
              ? `${devices.length} device profiles`
              : `${filtered.length} of ${devices.length} profiles`}
          </p>
        </div>
        <Link to="/devices/new" className="button primary">+ New Device</Link>
      </div>

      <div className="device-library-layout">
        <DeviceFilterSidebar
          counts={facetCounts}
          selectedCategories={selectedCategories}
          selectedProtocols={selectedProtocols}
          selectedManufacturers={selectedManufacturers}
          selectedCapabilities={selectedCapabilities}
          onToggleCategory={(v) => toggleSet(setSelectedCategories, v)}
          onToggleProtocol={(v) => toggleSet(setSelectedProtocols, v)}
          onToggleManufacturer={(v) => toggleSet(setSelectedManufacturers, v)}
          onToggleCapability={(v) => toggleSet(setSelectedCapabilities, v)}
        />

        <div className="device-library-main">
          <div className="device-library-search">
            <input
              className="search-input"
              type="text"
              placeholder="Search anything — model, protocol, command, capability..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {(hasFilters || search) && (
            <AppliedFilters
              categories={selectedCategories}
              protocols={selectedProtocols}
              manufacturers={selectedManufacturers}
              capabilities={selectedCapabilities}
              onRemoveCategory={(v) => toggleSet(setSelectedCategories, v)}
              onRemoveProtocol={(v) => toggleSet(setSelectedProtocols, v)}
              onRemoveManufacturer={(v) => toggleSet(setSelectedManufacturers, v)}
              onRemoveCapability={(v) => toggleSet(setSelectedCapabilities, v)}
              onClearAll={clearAll}
            />
          )}

          {filtered.length === 0 ? (
            <div className="empty-state">
              <h2>No Devices Found</h2>
              <p>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              <div className="device-table-wrap">
                <table className="device-table">
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort("manufacturer")} style={{ minWidth: 140 }}>
                        Manufacturer{sortIcon("manufacturer")}
                      </th>
                      <th onClick={() => toggleSort("model")} style={{ minWidth: 180 }}>
                        Model{sortIcon("model")}
                      </th>
                      <th onClick={() => toggleSort("category")} style={{ minWidth: 90 }}>
                        Category{sortIcon("category")}
                      </th>
                      <th onClick={() => toggleSort("protocols")} style={{ minWidth: 100 }}>
                        Protocols{sortIcon("protocols")}
                      </th>
                      <th onClick={() => toggleSort("commands")} style={{ minWidth: 60, textAlign: "right" }}>
                        Cmds{sortIcon("commands")}
                      </th>
                      <th style={{ width: 60 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((device) => {
                      const cmdCount = getCmdCount(device);
                      return (
                        <tr
                          key={device.id}
                          className="device-row"
                          onClick={() => navigate(`/devices/${device.id}/edit`)}
                          style={{ cursor: "pointer" }}
                        >
                          <td className="device-mfr">{device.manufacturer}</td>
                          <td>
                            <span className="device-model">{device.model}</span>
                            {device.sourceModule && (
                              <span className="pill pill--simpl" title={device.sourceModule}>S+</span>
                            )}
                          </td>
                          <td>
                            <span className={`pill pill--${categoryColors[device.category] ?? ""}`}>
                              {device.category}
                            </span>
                          </td>
                          <td>
                            <span className="proto-list">
                              {Object.keys(device.protocols).map((p) => (
                                <span key={p} className={`proto-tag proto-tag--${protocolColors[p] ?? ""}`}>{p}</span>
                              ))}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {cmdCount > 0 ? cmdCount : <span style={{ color: "var(--text-faint)" }}>&mdash;</span>}
                          </td>
                          <td>
                            {usedProfiles.has(device.id) && (
                              <span className="status-dot status-dot--active" title="In use in project" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {visibleCount < filtered.length && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <button
                    className="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  >
                    Show more ({filtered.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

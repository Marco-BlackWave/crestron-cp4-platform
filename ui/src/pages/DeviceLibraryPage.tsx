import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useDevices } from "../hooks/useDevices";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { TreeView, type TreeNode } from "../components/TreeView";
import { ContextMenu, type ContextMenuItem } from "../components/ContextMenu";
import { useContextMenu } from "../hooks/useContextMenu";

const protocolColors: Record<string, string> = {
  ir: "ir", serial: "serial-proto", ip: "ip", bacnet: "bacnet", modbus: "modbus",
  knx: "knx", artnet: "artnet", shelly: "shelly", pjlink: "pjlink",
};

export default function DeviceLibraryPage() {
  const { status, data: devices, error } = useDevices();
  const config = useSystemConfig();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());
  const [protoFilter, setProtoFilter] = useState<Set<string>>(new Set());
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const { menuPos, openMenu, closeMenu } = useContextMenu();
  const [contextDevice, setContextDevice] = useState<string | null>(null);

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

  // Build tree: Category → Manufacturer → Model
  const treeNodes = useMemo(() => {
    const catMap = new Map<string, Map<string, typeof devices>>();
    for (const d of devices) {
      if (!catMap.has(d.category)) catMap.set(d.category, new Map());
      const mfrMap = catMap.get(d.category)!;
      if (!mfrMap.has(d.manufacturer)) mfrMap.set(d.manufacturer, []);
      mfrMap.get(d.manufacturer)!.push(d);
    }

    const nodes: TreeNode<{ deviceId?: string }>[] = [];
    for (const [cat, mfrMap] of Array.from(catMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const catChildren: TreeNode<{ deviceId?: string }>[] = [];
      for (const [mfr, devs] of Array.from(mfrMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
        const modelChildren: TreeNode<{ deviceId?: string }>[] = devs
          .sort((a, b) => a.model.localeCompare(b.model))
          .map((d) => ({
            id: `device:${d.id}`,
            label: d.model,
            badge: usedProfiles.has(d.id) ? "In Use" : undefined,
            data: { deviceId: d.id },
          }));
        catChildren.push({
          id: `mfr:${cat}:${mfr}`,
          label: mfr,
          badge: devs.length,
          children: modelChildren,
        });
      }
      nodes.push({
        id: `cat:${cat}`,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        badge: categoryCounts[cat],
        children: catChildren,
      });
    }
    return nodes;
  }, [devices, categoryCounts, usedProfiles]);

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
    // If a device is selected from the tree, show only that
    if (selectedDeviceId) {
      list = list.filter((d) => d.id === selectedDeviceId);
    }
    return list;
  }, [devices, search, catFilter, protoFilter, selectedDeviceId]);

  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };

  const handleTreeSelect = (node: TreeNode<{ deviceId?: string }>) => {
    if (node.data?.deviceId) {
      setSelectedDeviceId(node.data.deviceId);
    } else {
      setSelectedDeviceId(null);
    }
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
        <Link to="/devices/new" className="button primary">Create New Device</Link>
      </div>

      <div className="split-layout">
        {/* Left: Tree */}
        <div className="split-layout__tree">
          <div className="card" style={{ padding: 12 }}>
            <input
              className="search-input"
              type="text"
              placeholder="Search devices..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedDeviceId(null); }}
              style={{ width: "100%", marginBottom: 8 }}
            />
            <TreeView
              nodes={treeNodes}
              defaultExpanded={new Set(treeNodes.map((n) => n.id))}
              onSelect={handleTreeSelect}
              selectedId={selectedDeviceId ? `device:${selectedDeviceId}` : undefined}
              showControls
            />
          </div>
        </div>

        {/* Right: Detail or grid */}
        <div className="split-layout__detail">
          <div className="filter-bar">
            <div className="filter-group">
              <span className="filter-group-label">Category</span>
              {categories.map((c) => (
                <button
                  key={c}
                  className={`filter-pill ${catFilter.has(c) ? "filter-pill--active" : ""}`}
                  onClick={() => { toggleFilter(catFilter, c, setCatFilter); setSelectedDeviceId(null); }}
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
                  onClick={() => { toggleFilter(protoFilter, p, setProtoFilter); setSelectedDeviceId(null); }}
                >
                  {p}
                </button>
              ))}
            </div>

            {selectedDeviceId && (
              <button className="button" onClick={() => setSelectedDeviceId(null)} style={{ fontSize: 12, padding: "5px 12px" }}>
                Clear Selection
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <h2>No Devices Found</h2>
              <p>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <section className="card-grid">
              {filtered.map((device, i) => {
                const cmdCounts = Object.entries(device.protocols).map(([proto, cfg]) => {
                  const cmds = (cfg as Record<string, unknown>)?.commands;
                  const count = cmds ? Object.keys(cmds as Record<string, unknown>).length : 0;
                  return { proto, count };
                }).filter(c => c.count > 0);

                return (
                  <div
                    key={`${device.id}-${i}`}
                    className="card clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/devices/${device.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && navigate(`/devices/${device.id}`)}
                    onContextMenu={(e) => { setContextDevice(device.id); openMenu(e); }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                      <span className={`pill pill--${device.category === "display" ? "av" : device.category}`}>
                        {device.category}
                      </span>
                      {usedProfiles.has(device.id) && (
                        <span className="pill pill--input" style={{ fontSize: 11 }}>In Use</span>
                      )}
                    </div>
                    <h3 style={{ margin: "0 0 2px" }}>{device.manufacturer}</h3>
                    <p className="subhead" style={{ marginBottom: 4 }}>{device.model}</p>
                    {device.description && (
                      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                        {device.description}
                      </p>
                    )}
                    {cmdCounts.length > 0 && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
                        {cmdCounts.map(c => `${c.proto.toUpperCase()}: ${c.count} cmds`).join(" · ")}
                      </div>
                    )}
                    <div className="badge-row">
                      {Object.keys(device.protocols).map((p) => (
                        <span key={p} className={`pill pill--${protocolColors[p] ?? ""}`}>{p}</span>
                      ))}
                      {device.sourceModule && (
                        <span className="pill pill--generated" title={device.sourceModule}>SIMPL+</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <Link
                        to={`/devices/${device.id}/edit`}
                        className="button"
                        style={{ fontSize: 12, padding: "5px 10px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </div>

      <ContextMenu
        position={menuPos}
        onClose={closeMenu}
        items={[
          { label: "View Details", onClick: () => { if (contextDevice) navigate(`/devices/${contextDevice}`); } },
          { label: "Edit Profile", onClick: () => { if (contextDevice) navigate(`/devices/${contextDevice}/edit`); } },
          { label: "Copy Profile ID", onClick: () => { if (contextDevice) navigator.clipboard.writeText(contextDevice); } },
          { label: "", divider: true, onClick: () => {} },
          { label: "Delete", danger: true, onClick: () => {
            if (contextDevice && confirm(`Delete device profile "${contextDevice}"?`)) {
              fetch(`/api/devices/${contextDevice}`, { method: "DELETE" }).then(() => window.location.reload());
            }
          }},
        ]}
      />
    </div>
  );
}

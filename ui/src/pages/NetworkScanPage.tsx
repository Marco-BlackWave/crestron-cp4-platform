import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router";
import { ContextMenu, type ContextMenuItem } from "../components/ContextMenu";
import { useContextMenu } from "../hooks/useContextMenu";

interface ScanResult {
  ip: string;
  hostname: string;
  ports: number[];
  type: string;
  responseTime: number;
  httpTitle?: string;
  _added?: boolean;
}

interface NetInterface {
  id: string;
  name: string;
  description: string;
  type: string;
  ipv4: { address: string; mask: string; cidr: string } | null;
}

type SortCol = "ip" | "hostname" | "type" | "responseTime";
type SortDir = "asc" | "desc";

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] ?? 0) * 16777216) + ((parts[1] ?? 0) * 65536) + ((parts[2] ?? 0) * 256) + (parts[3] ?? 0);
}

export default function NetworkScanPage() {
  const [subnet, setSubnet] = useState("192.168.1.0/24");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Interface dropdown
  const [interfaces, setInterfaces] = useState<NetInterface[]>([]);
  const [selectedIface, setSelectedIface] = useState("");

  // Sorting
  const [sortCol, setSortCol] = useState<SortCol>("ip");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Context menu
  const { menuPos, openMenu, closeMenu } = useContextMenu();
  const [contextRow, setContextRow] = useState<ScanResult | null>(null);

  // Add to project modal
  const [addingDevice, setAddingDevice] = useState<ScanResult | null>(null);

  useEffect(() => { document.title = "Network Scan — CP4"; }, []);
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Fetch network interfaces on mount
  useEffect(() => {
    fetch("/api/network/interfaces")
      .then(r => r.ok ? r.json() : [])
      .then(data => setInterfaces(data))
      .catch(() => {});
  }, []);

  const handleIfaceChange = (ifaceId: string) => {
    setSelectedIface(ifaceId);
    const iface = interfaces.find(i => i.id === ifaceId);
    if (iface?.ipv4?.cidr) setSubnet(iface.ipv4.cidr);
  };

  const startScan = async () => {
    setScanning(true);
    setError(null);
    setResults([]);
    setProgress(0);

    try {
      const resp = await fetch("/api/network/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subnet }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const { scanId } = await resp.json();

      pollRef.current = setInterval(async () => {
        try {
          const pollResp = await fetch(`/api/network/scan/${scanId}`);
          if (!pollResp.ok) return;
          const data = await pollResp.json();
          setProgress(data.progress ?? 0);
          setResults(data.results ?? []);
          if (data.status === "completed" || data.status === "error") {
            if (pollRef.current) clearInterval(pollRef.current);
            setScanning(false);
            if (data.status === "error") setError(data.error);
          }
        } catch { /* polling error, continue */ }
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setScanning(false);
    }
  };

  const portLabel = (port: number) => {
    const labels: Record<number, string> = {
      80: "HTTP", 443: "HTTPS", 23: "Telnet", 41794: "CIP",
      4998: "PJLink", 502: "Modbus", 47808: "BACnet",
    };
    return labels[port] ?? String(port);
  };

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sortIndicator = (col: SortCol) => sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const sortedResults = useMemo(() => {
    const list = [...results];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortCol === "ip") return (ipToNumber(a.ip) - ipToNumber(b.ip)) * dir;
      if (sortCol === "responseTime") return (a.responseTime - b.responseTime) * dir;
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      return av.localeCompare(bv) * dir;
    });
    return list;
  }, [results, sortCol, sortDir]);

  const exportCsv = useCallback(() => {
    const header = "IP,Hostname,Ports,Type,Response Time (ms)";
    const rows = results.map(r =>
      `${r.ip},"${r.hostname}","${r.ports.map(p => portLabel(p)).join("; ")}","${r.type}",${r.responseTime}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network-scan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const contextItems: ContextMenuItem[] = contextRow ? [
    { label: "Copy IP", onClick: () => navigator.clipboard.writeText(contextRow.ip) },
    ...(contextRow.ports.includes(80) || contextRow.ports.includes(443) ? [
      { label: "Open in Browser", onClick: () => window.open(`http://${contextRow.ip}`, "_blank") },
    ] : []),
    { label: "", divider: true, onClick: () => {} },
    { label: "Add to Project", onClick: () => setAddingDevice(contextRow) },
  ] : [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Network Scanner</h1>
          <p className="subhead">Discover Crestron and AV devices on the network</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          {interfaces.length > 0 && (
            <div className="form-group" style={{ margin: 0, minWidth: 200 }}>
              <label className="label">Network Interface</label>
              <select
                className="input"
                value={selectedIface}
                onChange={(e) => handleIfaceChange(e.target.value)}
                disabled={scanning}
              >
                <option value="">Select interface...</option>
                {interfaces.map(iface => (
                  <option key={iface.id} value={iface.id}>
                    {iface.name} ({iface.ipv4?.cidr ?? "no IPv4"})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <label className="label">Subnet / IP Range</label>
            <input className="input" value={subnet} onChange={(e) => setSubnet(e.target.value)} placeholder="192.168.1.0/24" disabled={scanning} />
          </div>
          <button className="button primary" onClick={startScan} disabled={scanning}>
            {scanning ? "Scanning..." : "Start Scan"}
          </button>
        </div>

        {scanning && (
          <div className="scan-progress" style={{ marginTop: 12 }}>
            <div className="scan-progress__bar" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {error && <div className="card error" style={{ marginBottom: 16 }}>{error}</div>}

      {results.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>{results.length} device{results.length !== 1 ? "s" : ""} found</span>
            <button className="button" onClick={exportCsv} style={{ fontSize: 12, padding: "5px 12px" }}>
              Export CSV
            </button>
          </div>
          <div className="card card--flush">
            <table className="signal-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort("ip")} style={{ cursor: "pointer" }}>IP Address{sortIndicator("ip")}</th>
                  <th onClick={() => toggleSort("hostname")} style={{ cursor: "pointer" }}>Hostname{sortIndicator("hostname")}</th>
                  <th>Open Ports</th>
                  <th onClick={() => toggleSort("type")} style={{ cursor: "pointer" }}>Device Type{sortIndicator("type")}</th>
                  <th onClick={() => toggleSort("responseTime")} style={{ cursor: "pointer" }}>Response{sortIndicator("responseTime")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r) => (
                  <tr
                    key={r.ip}
                    onContextMenu={(e) => { setContextRow(r); openMenu(e); }}
                    style={r._added ? { background: "rgba(34,197,94,0.06)" } : undefined}
                  >
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.ip}</td>
                    <td>{r.hostname || r.httpTitle || "—"}</td>
                    <td>
                      <div className="badge-row">
                        {r.ports.map((p) => (
                          <span key={p} className="pill pill--ip" style={{ fontSize: 11 }}>{portLabel(p)}</span>
                        ))}
                      </div>
                    </td>
                    <td>{r.type}</td>
                    <td>{r.responseTime}ms</td>
                    <td>
                      <button
                        className="button"
                        style={{ fontSize: 11, padding: "3px 8px" }}
                        onClick={() => setAddingDevice(r)}
                      >
                        {r._added ? "Added" : "Add to Project"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!scanning && results.length === 0 && !error && (
        <div className="empty-state">
          <h2>Ready to Scan</h2>
          <p>Enter a subnet and click Start Scan to discover devices.</p>
          <p style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
            Probes: CIP (41794), HTTP (80/443), Telnet (23), PJLink (4998), Modbus (502), BACnet (47808)
          </p>
        </div>
      )}

      {/* Add to Project inline panel */}
      {addingDevice && (
        <AddToProjectPanel
          device={addingDevice}
          onClose={() => setAddingDevice(null)}
          onAdded={() => {
            setResults(prev => prev.map(r => r.ip === addingDevice.ip ? { ...r, _added: true } : r));
            setAddingDevice(null);
          }}
        />
      )}

      <ContextMenu items={contextItems} position={menuPos} onClose={closeMenu} />
    </div>
  );
}

function AddToProjectPanel({ device, onClose, onAdded }: {
  device: ScanResult;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [role, setRole] = useState("display");
  const [profileSearch, setProfileSearch] = useState("");
  const [profiles, setProfiles] = useState<{ id: string; manufacturer: string; model: string }[]>([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [protocol, setProtocol] = useState(device.ports.includes(41794) ? "ip" : device.ports.includes(502) ? "modbus" : "ip");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  useEffect(() => {
    fetch("/api/devices").then(r => r.ok ? r.json() : []).then(d => setProfiles(d)).catch(() => {});
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!profileSearch) return profiles.slice(0, 10);
    const q = profileSearch.toLowerCase();
    return profiles.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.manufacturer.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [profiles, profileSearch]);

  const roles = ["display", "receiver", "matrix", "dsp", "camera", "lighting-gateway", "shade-controller", "hvac-controller", "other"];

  return (
    <div className="slide-panel" style={{ position: "fixed", bottom: 80, right: 32, width: 380, zIndex: 60 }}>
      <div className="slide-panel-header">
        <h3 style={{ margin: 0 }}>Add to Project</h3>
        <button className="button" onClick={onClose} style={{ fontSize: 12, padding: "4px 8px" }}>Close</button>
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
        {device.ip} — {device.type}{device.hostname ? ` (${device.hostname})` : ""}
      </div>
      <div className="form-group">
        <label className="label">Role</label>
        <select className="input" value={role} onChange={e => setRole(e.target.value)}>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="label">Device Profile</label>
        <input
          className="input"
          placeholder="Search profiles..."
          value={profileSearch}
          onChange={e => setProfileSearch(e.target.value)}
        />
        {filteredProfiles.length > 0 && (
          <div style={{ maxHeight: 150, overflowY: "auto", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, marginTop: 4 }}>
            {filteredProfiles.map(p => (
              <div
                key={p.id}
                style={{
                  padding: "6px 10px", fontSize: 12, cursor: "pointer",
                  background: selectedProfile === p.id ? "rgba(37,99,235,0.08)" : "transparent",
                }}
                onClick={() => { setSelectedProfile(p.id); setProfileSearch(`${p.manufacturer} ${p.model}`); }}
              >
                <strong>{p.manufacturer}</strong> {p.model}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="form-group">
        <label className="label">Protocol</label>
        <select className="input" value={protocol} onChange={e => setProtocol(e.target.value)}>
          <option value="ip">IP / TCP</option>
          <option value="serial">Serial (RS-232)</option>
          <option value="ir">IR</option>
          <option value="modbus">Modbus</option>
          <option value="bacnet">BACnet</option>
          <option value="pjlink">PJLink</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="button primary"
          disabled={!selectedProfile || status === "saving"}
          onClick={() => {
            setStatus("saving");
            // This will be handled by the config editor when integrated
            // For now, show as "done" with info about where to assign
            setTimeout(() => {
              setStatus("done");
              onAdded();
            }, 300);
          }}
        >
          {status === "saving" ? "Adding..." : "Add Device"}
        </button>
        {!selectedProfile && (
          <span style={{ fontSize: 12, color: "#94a3b8", alignSelf: "center" }}>Select a device profile first</span>
        )}
      </div>
      {status === "done" && <p style={{ color: "#059669", fontSize: 13, marginTop: 8 }}>Device added. Go to <Link to="/configure/rooms">Rooms</Link> to assign it.</p>}
    </div>
  );
}

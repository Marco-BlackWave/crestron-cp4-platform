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
  mac?: string;
  vendor?: string;
  isCrestron?: boolean;
  crestronModel?: string;
  _added?: boolean;
}

interface NetInterface {
  id: string;
  name: string;
  description: string;
  type: string;
  ipv4: { address: string; mask: string; cidr: string } | null;
}

type SortCol = "ip" | "hostname" | "type" | "responseTime" | "vendor";
type SortDir = "asc" | "desc";
type FilterTab = "all" | "crestron" | "av" | "other";

// Known AV device types for classification
const AV_TYPES = new Set([
  "Crestron", "Extron", "Biamp DSP", "QSC DSP", "Shure Audio",
  "Atlona", "Lutron", "AMX/Harman", "Denon/Marantz", "PJLink Projector",
  "Modbus Device", "BACnet Device", "Shelly IoT",
]);

const PORT_INFO: Record<number, { label: string; desc: string; color: string }> = {
  41794: { label: "CIP",      desc: "Crestron Control",          color: "#2563eb" },
  80:    { label: "HTTP",     desc: "Web Server",                color: "#059669" },
  443:   { label: "HTTPS",    desc: "Secure Web Server",         color: "#059669" },
  8080:  { label: "HTTP-Alt", desc: "Alternate Web Server",      color: "#059669" },
  22:    { label: "SSH",      desc: "Secure Shell",              color: "#6366f1" },
  23:    { label: "Telnet",   desc: "Telnet / Serial-over-IP",   color: "#d97706" },
  4998:  { label: "PJLink",   desc: "Projector Control",         color: "#7c3aed" },
  502:   { label: "Modbus",   desc: "Modbus TCP/IP",             color: "#be185d" },
  47808: { label: "BACnet",   desc: "BACnet/IP",                 color: "#ca8a04" },
};

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] ?? 0) * 16777216) + ((parts[1] ?? 0) * 65536) + ((parts[2] ?? 0) * 256) + (parts[3] ?? 0);
}

function isCrestronDevice(r: ScanResult): boolean {
  return !!r.isCrestron
    || r.type === "Crestron"
    || (r.vendor ?? "").toLowerCase().includes("crestron")
    || r.ports.includes(41794)
    || (r.hostname ?? "").toLowerCase().includes("crestron")
    || (r.httpTitle ?? "").toLowerCase().includes("crestron");
}

function isAVDevice(r: ScanResult): boolean {
  return AV_TYPES.has(r.type) || isCrestronDevice(r);
}

function autoDetectRole(r: ScanResult): string {
  if (r.ports.includes(41794)) return "processor";
  if (r.ports.includes(4998)) return "display";
  const t = (r.type ?? "").toLowerCase();
  if (t.includes("dsp") || t.includes("audio")) return "dsp";
  if (t.includes("matrix")) return "matrix";
  if (t.includes("lutron") || t.includes("lighting")) return "lighting-gateway";
  if (t.includes("denon") || t.includes("marantz") || t.includes("receiver")) return "receiver";
  if (t.includes("bacnet") || t.includes("hvac")) return "hvac-controller";
  if (t.includes("shade")) return "shade-controller";
  if (t.includes("projector") || t.includes("display")) return "display";
  if (t.includes("camera")) return "camera";
  return "other";
}

function autoDetectProtocol(r: ScanResult): string {
  if (r.ports.includes(41794)) return "ip";
  if (r.ports.includes(4998)) return "pjlink";
  if (r.ports.includes(502)) return "modbus";
  if (r.ports.includes(47808)) return "bacnet";
  return "ip";
}

function autoSearchHint(r: ScanResult): string {
  const parts: string[] = [];
  if (r.vendor) parts.push(r.vendor);
  if (r.crestronModel) parts.push(r.crestronModel);
  if (parts.length === 0 && r.httpTitle) parts.push(r.httpTitle);
  return parts.join(" ");
}

export default function NetworkScanPage() {
  const [subnet, setSubnet] = useState("192.168.1.0/24");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [interfaces, setInterfaces] = useState<NetInterface[]>([]);
  const [selectedIface, setSelectedIface] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("ip");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [expandedIp, setExpandedIp] = useState<string | null>(null);

  const { menuPos, openMenu, closeMenu } = useContextMenu();
  const [contextRow, setContextRow] = useState<ScanResult | null>(null);
  const [addingDevice, setAddingDevice] = useState<ScanResult | null>(null);

  useEffect(() => { document.title = "Network Scan — CP4"; }, []);
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    fetch("/api/network/interfaces")
      .then(r => r.ok ? r.json() : [])
      .then((data: NetInterface[]) => {
        setInterfaces(data);
        if (data.length > 0) {
          const best = data.find(i => i.type === "Ethernet") ?? data[0];
          setSelectedIface(best.id);
          if (best.ipv4?.cidr) setSubnet(best.ipv4.cidr);
        }
      })
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
    setExpandedIp(null);

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

  // ── Sorting ──
  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sortIndicator = (col: SortCol) => sortCol === col ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";

  // ── Counts ──
  const counts = useMemo(() => {
    const c = { total: results.length, crestron: 0, av: 0, other: 0 };
    for (const r of results) {
      if (isCrestronDevice(r)) c.crestron++;
      else if (isAVDevice(r)) c.av++;
      else c.other++;
    }
    return c;
  }, [results]);

  // ── Filtered + Sorted ──
  const sortedResults = useMemo(() => {
    let list = results;
    if (filterTab === "crestron") list = list.filter(isCrestronDevice);
    else if (filterTab === "av") list = list.filter(r => isAVDevice(r) && !isCrestronDevice(r));
    else if (filterTab === "other") list = list.filter(r => !isAVDevice(r));

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      // Always sort Crestron first
      const aCrest = isCrestronDevice(a) ? 0 : 1;
      const bCrest = isCrestronDevice(b) ? 0 : 1;
      if (aCrest !== bCrest) return aCrest - bCrest;

      if (sortCol === "ip") return (ipToNumber(a.ip) - ipToNumber(b.ip)) * dir;
      if (sortCol === "responseTime") return (a.responseTime - b.responseTime) * dir;
      if (sortCol === "vendor") return ((a.vendor ?? "").localeCompare(b.vendor ?? "")) * dir;
      const av = (a as Record<string, unknown>)[sortCol] as string ?? "";
      const bv = (b as Record<string, unknown>)[sortCol] as string ?? "";
      return av.localeCompare(bv) * dir;
    });
  }, [results, sortCol, sortDir, filterTab]);

  // ── Export CSV ──
  const exportCsv = useCallback(() => {
    const header = "IP,Hostname,MAC,Vendor,Ports,Type,Crestron,Response Time (ms),HTTP Title";
    const rows = results.map(r =>
      `${r.ip},"${r.hostname}","${r.mac ?? ""}","${r.vendor ?? ""}","${r.ports.map(p => PORT_INFO[p]?.label ?? String(p)).join("; ")}","${r.type}",${isCrestronDevice(r)},${r.responseTime},"${r.httpTitle ?? ""}"`
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
    ...(contextRow.mac ? [{ label: "Copy MAC", onClick: () => navigator.clipboard.writeText(contextRow.mac!) }] : []),
    ...(contextRow.ports.includes(80) || contextRow.ports.includes(443) ? [
      { label: "Open in Browser", onClick: () => window.open(`http://${contextRow.ip}`, "_blank") },
    ] : []),
    { label: "", divider: true, onClick: () => {} },
    { label: "Add to Project", onClick: () => setAddingDevice(contextRow) },
  ] : [];

  const selectedIf = interfaces.find(i => i.id === selectedIface);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Network Scanner</h1>
          <p className="subhead">Discover Crestron and AV devices on the network</p>
        </div>
      </div>

      {/* ── Scan Controls ── */}
      <div className="card ns-controls">
        <div className="ns-controls__row">
          {interfaces.length > 0 && (
            <div className="ns-field">
              <label className="de-label">Network Interface</label>
              <select className="de-input" value={selectedIface} onChange={(e) => handleIfaceChange(e.target.value)} disabled={scanning}>
                <option value="">Select interface...</option>
                {interfaces.map(iface => (
                  <option key={iface.id} value={iface.id}>
                    {iface.name} ({iface.ipv4?.cidr ?? "no IPv4"})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="ns-field ns-field--grow">
            <label className="de-label">Subnet / IP Range</label>
            <input className="de-input" value={subnet} onChange={(e) => setSubnet(e.target.value)} placeholder="192.168.1.0/24" disabled={scanning} />
          </div>
          <button className="button primary ns-scan-btn" onClick={startScan} disabled={scanning}>
            {scanning ? "Scanning..." : "Start Scan"}
          </button>
        </div>

        {/* Interface details */}
        {selectedIf && (
          <div className="ns-iface-info">
            <span>{selectedIf.description}</span>
            <span className="ns-iface-info__sep">|</span>
            <span>{selectedIf.type}</span>
            {selectedIf.ipv4 && (
              <>
                <span className="ns-iface-info__sep">|</span>
                <span className="ns-iface-info__mono">{selectedIf.ipv4.address}</span>
                <span className="ns-iface-info__sep">/</span>
                <span className="ns-iface-info__mono">{selectedIf.ipv4.mask}</span>
              </>
            )}
          </div>
        )}

        {scanning && (
          <div className="scan-progress" style={{ marginTop: 12 }}>
            <div className="scan-progress__bar" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {error && <div className="card error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Summary Cards ── */}
      {results.length > 0 && (
        <div className="ns-summary">
          <button className={`ns-summary-card${filterTab === "all" ? " ns-summary-card--active" : ""}`} onClick={() => setFilterTab("all")}>
            <span className="ns-summary-card__value">{counts.total}</span>
            <span className="ns-summary-card__label">Total</span>
          </button>
          <button className={`ns-summary-card ns-summary-card--crestron${filterTab === "crestron" ? " ns-summary-card--active" : ""}`} onClick={() => setFilterTab("crestron")}>
            <span className="ns-summary-card__value">{counts.crestron}</span>
            <span className="ns-summary-card__label">Crestron</span>
          </button>
          <button className={`ns-summary-card ns-summary-card--av${filterTab === "av" ? " ns-summary-card--active" : ""}`} onClick={() => setFilterTab("av")}>
            <span className="ns-summary-card__value">{counts.av}</span>
            <span className="ns-summary-card__label">AV Devices</span>
          </button>
          <button className={`ns-summary-card ns-summary-card--other${filterTab === "other" ? " ns-summary-card--active" : ""}`} onClick={() => setFilterTab("other")}>
            <span className="ns-summary-card__value">{counts.other}</span>
            <span className="ns-summary-card__label">Other</span>
          </button>
        </div>
      )}

      {/* ── Results Table ── */}
      {results.length > 0 && (
        <>
          <div className="ns-results-bar">
            <span className="ns-results-count">
              {sortedResults.length} device{sortedResults.length !== 1 ? "s" : ""}
              {filterTab !== "all" && ` (${filterTab})`}
            </span>
            <button className="button" onClick={exportCsv} style={{ fontSize: 12, padding: "5px 12px" }}>
              Export CSV
            </button>
          </div>

          <div className="ns-table-wrap">
            <table className="ns-table">
              <thead>
                <tr>
                  <th style={{ width: 4 }}></th>
                  <th onClick={() => toggleSort("ip")} className="ns-th--sort">IP Address{sortIndicator("ip")}</th>
                  <th onClick={() => toggleSort("hostname")} className="ns-th--sort">Name{sortIndicator("hostname")}</th>
                  <th>MAC Address</th>
                  <th onClick={() => toggleSort("vendor")} className="ns-th--sort">Vendor{sortIndicator("vendor")}</th>
                  <th>Services</th>
                  <th onClick={() => toggleSort("type")} className="ns-th--sort">Type{sortIndicator("type")}</th>
                  <th onClick={() => toggleSort("responseTime")} className="ns-th--sort" style={{ textAlign: "right" }}>Latency{sortIndicator("responseTime")}</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r) => {
                  const crestron = isCrestronDevice(r);
                  const isExpanded = expandedIp === r.ip;
                  return (
                    <tr key={r.ip} className="ns-table-group">
                      <td colSpan={9} style={{ padding: 0 }}>
                        {/* Main row */}
                        <div
                          className={`ns-row${crestron ? " ns-row--crestron" : ""}${isExpanded ? " ns-row--expanded" : ""}${r._added ? " ns-row--added" : ""}`}
                          onClick={() => setExpandedIp(isExpanded ? null : r.ip)}
                          onContextMenu={(e) => { setContextRow(r); openMenu(e); }}
                        >
                          <div className="ns-row__indicator">
                            {crestron && <span className="ns-crestron-dot" title="Crestron Device" />}
                          </div>
                          <div className="ns-row__ip">{r.ip}</div>
                          <div className="ns-row__name">
                            {r.hostname || r.httpTitle || "\u2014"}
                            {r.crestronModel && (
                              <span className="ns-model-tag">{r.crestronModel}</span>
                            )}
                          </div>
                          <div className="ns-row__mac">{r.mac || "\u2014"}</div>
                          <div className="ns-row__vendor">
                            {r.vendor ? (
                              <span className={`ns-vendor-badge${crestron ? " ns-vendor-badge--crestron" : ""}`}>
                                {r.vendor}
                              </span>
                            ) : "\u2014"}
                          </div>
                          <div className="ns-row__ports">
                            {r.ports.map((p) => {
                              const info = PORT_INFO[p];
                              return (
                                <span key={p} className="ns-port-pill" style={info ? { borderColor: info.color, color: info.color } : {}}>
                                  {info?.label ?? String(p)}
                                </span>
                              );
                            })}
                          </div>
                          <div className="ns-row__type">
                            {crestron ? (
                              <span className="ns-type-badge ns-type-badge--crestron">
                                {r.crestronModel || r.type}
                              </span>
                            ) : (
                              <span className="ns-type-badge">{r.type}</span>
                            )}
                          </div>
                          <div className="ns-row__latency">{r.responseTime}ms</div>
                          <div className="ns-row__actions">
                            <button
                              className="button"
                              style={{ fontSize: 10, padding: "2px 8px" }}
                              onClick={(e) => { e.stopPropagation(); setAddingDevice(r); }}
                            >
                              {r._added ? "\u2713" : "+"}
                            </button>
                          </div>
                        </div>

                        {/* Expanded detail panel */}
                        {isExpanded && (
                          <div className={`ns-detail${crestron ? " ns-detail--crestron" : ""}`}>
                            <div className="ns-detail__grid">
                              {/* Network info */}
                              <div className="ns-detail__section">
                                <h4 className="ns-detail__title">Network</h4>
                                <dl className="ns-detail__dl">
                                  <dt>IP Address</dt>
                                  <dd className="ns-detail__mono">{r.ip}</dd>
                                  <dt>MAC Address</dt>
                                  <dd className="ns-detail__mono">{r.mac || "Not resolved"}</dd>
                                  <dt>Vendor (OUI)</dt>
                                  <dd>{r.vendor || "Unknown"}</dd>
                                  <dt>Latency</dt>
                                  <dd>{r.responseTime}ms</dd>
                                </dl>
                              </div>

                              {/* Identity */}
                              <div className="ns-detail__section">
                                <h4 className="ns-detail__title">Identity</h4>
                                <dl className="ns-detail__dl">
                                  <dt>Hostname</dt>
                                  <dd>{r.hostname || "Not resolved"}</dd>
                                  <dt>Device Type</dt>
                                  <dd>
                                    {crestron ? (
                                      <span className="ns-type-badge ns-type-badge--crestron">{r.type}</span>
                                    ) : r.type}
                                  </dd>
                                  {r.crestronModel && (
                                    <>
                                      <dt>Crestron Model</dt>
                                      <dd><strong>{r.crestronModel}</strong></dd>
                                    </>
                                  )}
                                  {r.httpTitle && (
                                    <>
                                      <dt>HTTP Title</dt>
                                      <dd>{r.httpTitle}</dd>
                                    </>
                                  )}
                                  <dt>Crestron</dt>
                                  <dd>{crestron ? <span className="ns-yes">Yes</span> : "No"}</dd>
                                </dl>
                              </div>

                              {/* Services */}
                              <div className="ns-detail__section">
                                <h4 className="ns-detail__title">Open Services</h4>
                                {r.ports.length > 0 ? (
                                  <div className="ns-detail__services">
                                    {r.ports.map(p => {
                                      const info = PORT_INFO[p];
                                      return (
                                        <div key={p} className="ns-service-row">
                                          <span className="ns-service-port" style={info ? { color: info.color } : {}}>{p}</span>
                                          <span className="ns-service-label">{info?.label ?? "TCP"}</span>
                                          <span className="ns-service-desc">{info?.desc ?? `Port ${p}`}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="ns-detail__empty">No open ports detected</p>
                                )}
                              </div>
                            </div>

                            {/* Quick actions */}
                            <div className="ns-detail__actions">
                              <button className="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(r.ip); }}>
                                Copy IP
                              </button>
                              {r.mac && (
                                <button className="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(r.mac!); }}>
                                  Copy MAC
                                </button>
                              )}
                              {(r.ports.includes(80) || r.ports.includes(443)) && (
                                <button className="button" onClick={(e) => { e.stopPropagation(); window.open(`http://${r.ip}`, "_blank"); }}>
                                  Open Web UI
                                </button>
                              )}
                              <button className="button primary" onClick={(e) => { e.stopPropagation(); setAddingDevice(r); }}>
                                Add to Project
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Empty State ── */}
      {!scanning && results.length === 0 && !error && (
        <div className="ns-empty">
          <div className="ns-empty__icon">SCAN</div>
          <h2>Ready to Scan</h2>
          <p>Enter a subnet and click Start Scan to discover devices.</p>
          <div className="ns-empty__probes">
            <span>Probes:</span>
            {Object.entries(PORT_INFO).map(([port, info]) => (
              <span key={port} className="ns-port-pill" style={{ borderColor: info.color, color: info.color }}>
                {info.label} ({port})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Add to Project Panel ── */}
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
  const detectedRole = autoDetectRole(device);
  const detectedProtocol = autoDetectProtocol(device);
  const [role, setRole] = useState(detectedRole);
  const [profileSearch, setProfileSearch] = useState(autoSearchHint(device));
  const [profiles, setProfiles] = useState<{ id: string; manufacturer: string; model: string }[]>([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [protocol, setProtocol] = useState(detectedProtocol);
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

  const roles = ["processor", "display", "receiver", "matrix", "dsp", "camera", "lighting-gateway", "shade-controller", "hvac-controller", "other"];

  const crestron = isCrestronDevice(device);

  return (
    <div className="slide-panel" style={{ position: "fixed", bottom: 80, right: 32, width: 380, zIndex: 60 }}>
      <div className="slide-panel-header">
        <h3 style={{ margin: 0 }}>Add to Project</h3>
        <button className="button" onClick={onClose} style={{ fontSize: 12, padding: "4px 8px" }}>Close</button>
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
        <span className="ns-detail__mono">{device.ip}</span>
        {" \u2014 "}
        {crestron ? <span className="ns-type-badge ns-type-badge--crestron">{device.type}</span> : device.type}
        {device.crestronModel && <span style={{ marginLeft: 6, fontWeight: 600 }}>{device.crestronModel}</span>}
        {device.hostname ? ` (${device.hostname})` : ""}
      </div>
      {device.mac && (
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
          MAC: <span className="ns-detail__mono">{device.mac}</span>
          {device.vendor && <> | {device.vendor}</>}
        </div>
      )}
      <div className="form-group">
        <label className="label">Role{role === detectedRole && detectedRole !== "other" ? " (auto-detected)" : ""}</label>
        <select className="input" value={role} onChange={e => setRole(e.target.value)}>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="label">Device Profile</label>
        <input className="input" placeholder="Search profiles..." value={profileSearch} onChange={e => setProfileSearch(e.target.value)} />
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
        <label className="label">Protocol{protocol === detectedProtocol && detectedProtocol !== "ip" ? " (auto-detected)" : ""}</label>
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
            setTimeout(() => { setStatus("done"); onAdded(); }, 300);
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

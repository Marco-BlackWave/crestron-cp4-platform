import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";
import {
  testSftpAuth,
  getDeployPreview,
  startDeploy,
  getDeployStatus,
  cancelDeploy,
  verifyDeploy,
  restartProgram,
  type SftpCredentials,
  type AuthTestResult,
  type FilePreview,
  type DeployStatus,
  type VerifyResult,
  type RestartResult,
} from "../api/deployApi";

const STEPS = [
  { label: "Pre-flight", num: 1 },
  { label: "Connect", num: 2 },
  { label: "Preview", num: 3 },
  { label: "Transfer", num: 4 },
  { label: "Verify", num: 5 },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// --- Network scan types ---
interface ScanResult {
  ip: string;
  hostname: string;
  ports: number[];
  type: string;
  responseTime: number;
  httpTitle?: string;
}

interface NetInterface {
  id: string;
  name: string;
  description: string;
  type: string;
  ipv4: { address: string; mask: string; cidr: string } | null;
}

const PORT_LABELS: Record<number, string> = {
  80: "HTTP", 443: "HTTPS", 23: "Telnet", 41794: "CIP",
  4998: "PJLink", 502: "Modbus", 47808: "BACnet",
};

export default function DeployPage() {
  const { draft, loadStatus, loadFromServer, validationErrors, isDirty, save, saveStatus } = useConfigEditor();
  const [step, setStep] = useState(1);

  // Step 2: Connect state
  const [selectedProcId, setSelectedProcId] = useState("");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [authTesting, setAuthTesting] = useState(false);
  const [authResult, setAuthResult] = useState<AuthTestResult | null>(null);

  // Step 2: Network discovery state
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [netInterfaces, setNetInterfaces] = useState<NetInterface[]>([]);
  const [selectedIface, setSelectedIface] = useState("");
  const [subnet, setSubnet] = useState("192.168.1.0/24");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<"all" | "crestron">("crestron");
  const scanPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 3: Preview state
  const [previewFiles, setPreviewFiles] = useState<FilePreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Step 4: Transfer state
  const [deployId, setDeployId] = useState<string | null>(null);
  const [deployStatus, setDeployStatus] = useState<DeployStatus | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 5: Verify state
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [restartResult, setRestartResult] = useState<RestartResult | null>(null);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => { document.title = "Deploy — Configure — CP4"; }, []);

  useEffect(() => {
    if (!draft && loadStatus === "idle") loadFromServer();
  }, [draft, loadStatus, loadFromServer]);

  // Fetch network interfaces on mount (for discovery panel)
  useEffect(() => {
    fetch("/api/network/interfaces")
      .then(r => r.ok ? r.json() : [])
      .then(data => setNetInterfaces(data))
      .catch(() => {});
  }, []);

  // Auto-fill IP from selected processor
  useEffect(() => {
    if (!selectedProcId || !draft) return;
    const proc = draft.system.processors?.find((p) => p.id === selectedProcId);
    if (proc?.eiscIpAddress) {
      setIp(proc.eiscIpAddress);
    }
    setAuthResult(null);
  }, [selectedProcId, draft]);

  // Poll deploy status
  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await getDeployStatus(id);
        setDeployStatus(status);
        if (status.status === "completed" || status.status === "error" || status.status === "cancelled") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          if (status.status === "completed") {
            setStep(5);
          }
          if (status.status === "error") {
            setTransferError(status.error || "Transfer failed");
          }
        }
      } catch {
        // polling failed, keep trying
      }
    }, 500);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (scanPollRef.current) clearInterval(scanPollRef.current);
    };
  }, []);

  const creds: SftpCredentials = { ip, port, username, password };
  const processors = draft?.system.processors ?? [];

  // --- Network discovery handlers ---

  const handleIfaceChange = (ifaceId: string) => {
    setSelectedIface(ifaceId);
    const iface = netInterfaces.find(i => i.id === ifaceId);
    if (iface?.ipv4?.cidr) setSubnet(iface.ipv4.cidr);
  };

  const handleStartScan = async () => {
    setScanning(true);
    setScanError(null);
    setScanResults([]);
    setScanProgress(0);

    try {
      const resp = await fetch("/api/network/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subnet }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text);
      }
      const { scanId } = await resp.json();

      scanPollRef.current = setInterval(async () => {
        try {
          const pollResp = await fetch(`/api/network/scan/${scanId}`);
          if (!pollResp.ok) return;
          const data = await pollResp.json();
          setScanProgress(data.progress ?? 0);
          setScanResults(data.results ?? []);
          if (data.status === "completed" || data.status === "error") {
            if (scanPollRef.current) clearInterval(scanPollRef.current);
            scanPollRef.current = null;
            setScanning(false);
            if (data.status === "error") setScanError(data.error);
          }
        } catch { /* polling error, continue */ }
      }, 1000);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed");
      setScanning(false);
    }
  };

  const handleCancelScan = () => {
    if (scanPollRef.current) clearInterval(scanPollRef.current);
    scanPollRef.current = null;
    setScanning(false);
  };

  const filteredScanResults = useMemo(() => {
    if (deviceFilter === "crestron") {
      return scanResults.filter(r => r.type === "Crestron" || r.ports.includes(41794));
    }
    return scanResults;
  }, [scanResults, deviceFilter]);

  const handlePickDevice = (device: ScanResult) => {
    setIp(device.ip);
    setAuthResult(null);
    setDiscoveryOpen(false);
  };

  // --- Auth / Deploy handlers ---

  const handleTestAuth = async () => {
    setAuthTesting(true);
    setAuthResult(null);
    try {
      const result = await testSftpAuth(creds);
      setAuthResult(result);
    } catch (e: unknown) {
      setAuthResult({ success: false, serverInfo: null, message: e instanceof Error ? e.message : "Auth failed" });
    }
    setAuthTesting(false);
  };

  const handleLoadPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await getDeployPreview();
      setPreviewFiles(result.files);
    } catch (e: unknown) {
      setPreviewError(e instanceof Error ? e.message : "Preview failed");
    }
    setPreviewLoading(false);
  };

  const handleStartDeploy = async () => {
    setTransferError(null);
    try {
      const result = await startDeploy(creds);
      setDeployId(result.deployId);
      startPolling(result.deployId);
    } catch (e: unknown) {
      setTransferError(e instanceof Error ? e.message : "Deploy failed");
    }
  };

  const handleCancel = async () => {
    if (deployId) {
      try { await cancelDeploy(deployId); } catch { /* ignore */ }
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleVerify = async () => {
    if (!deployId) return;
    setVerifying(true);
    try {
      const result = await verifyDeploy(deployId, creds);
      setVerifyResult(result);
    } catch (e: unknown) {
      setVerifyResult({ success: false, files: [], error: e instanceof Error ? e.message : "Verify failed" });
    }
    setVerifying(false);
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      const result = await restartProgram({ ip, username, password });
      setRestartResult(result);
    } catch (e: unknown) {
      setRestartResult({ success: false, output: e instanceof Error ? e.message : "Restart failed" });
    }
    setRestarting(false);
  };

  const handleReset = () => {
    setStep(1);
    setAuthResult(null);
    setPreviewFiles([]);
    setPreviewError(null);
    setDeployId(null);
    setDeployStatus(null);
    setTransferError(null);
    setVerifyResult(null);
    setRestartResult(null);
  };

  if (!draft) {
    return (
      <div>
        <h2>No Configuration Loaded</h2>
        <p className="subhead">Go to <Link to="/configure">Configure</Link> to load or create a project.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Deploy to Processor</h1>
          <p className="subhead">Transfer configuration files to your CP4 via SFTP</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="deploy-steps">
        {STEPS.map((s, i) => (
          <div key={s.num} style={{ display: "flex", alignItems: "center", flex: 1, gap: 4 }}>
            <div
              className={`deploy-step ${step === s.num ? "deploy-step--active" : ""} ${step > s.num ? "deploy-step--done" : ""}`}
              style={{ flex: 1 }}
            >
              <span className="deploy-step__number">
                {step > s.num ? "\u2713" : s.num}
              </span>
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <span className={`deploy-step__connector ${step > s.num ? "deploy-step__connector--done" : ""}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Bodies */}
      <div className="deploy-body">
        {/* Step 1: Pre-flight */}
        {step === 1 && (
          <div className="card">
            <h2 style={{ margin: "0 0 16px", fontSize: 16 }}>Pre-flight Checks</h2>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span className={`deploy-status-dot ${validationErrors.length === 0 ? "deploy-status-dot--done" : "deploy-status-dot--error"}`} />
              <span style={{ fontWeight: 600, color: validationErrors.length === 0 ? "#22c55e" : "#ef4444" }}>
                {validationErrors.length === 0 ? "Configuration valid" : `${validationErrors.length} validation error${validationErrors.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            {validationErrors.length > 0 && (
              <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
                {validationErrors.map((err, i) => (
                  <li key={i} style={{ color: "#ef4444", fontSize: 13 }}>{err}</li>
                ))}
              </ul>
            )}

            {isDirty && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span className="deploy-status-dot deploy-status-dot--error" />
                <span style={{ color: "#f59e0b", fontWeight: 600 }}>Unsaved changes</span>
                <button
                  className="button primary"
                  style={{ marginLeft: 8 }}
                  onClick={save}
                  disabled={saveStatus === "saving" || validationErrors.length > 0}
                >
                  {saveStatus === "saving" ? "Saving..." : "Save Now"}
                </button>
              </div>
            )}

            {!isDirty && validationErrors.length === 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span className="deploy-status-dot deploy-status-dot--done" />
                <span style={{ color: "#22c55e", fontWeight: 600 }}>Configuration saved and ready</span>
              </div>
            )}

            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>
              Project: <strong>{draft.projectId}</strong> | Rooms: <strong>{draft.rooms.length}</strong> | Processors: <strong>{processors.length}</strong>
            </div>

            <div className="deploy-actions">
              <button
                className="button primary"
                disabled={isDirty || validationErrors.length > 0}
                onClick={() => setStep(2)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Connect */}
        {step === 2 && (
          <div className="card">
            <h2 style={{ margin: "0 0 16px", fontSize: 16 }}>SFTP Connection</h2>

            <div className="deploy-cred-form">
              <div className="form-group">
                <label className="label">Processor</label>
                <select
                  className="input"
                  value={selectedProcId}
                  onChange={(e) => setSelectedProcId(e.target.value)}
                >
                  <option value="">Select processor...</option>
                  {processors.map((p) => (
                    <option key={p.id} value={p.id}>{p.id} ({p.processor})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">IP Address</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    type="text"
                    value={ip}
                    onChange={(e) => { setIp(e.target.value); setAuthResult(null); }}
                    placeholder="192.168.1.100"
                    style={{ flex: 1 }}
                  />
                  <button
                    className={`button ${discoveryOpen ? "primary" : ""}`}
                    onClick={() => setDiscoveryOpen(!discoveryOpen)}
                    style={{ whiteSpace: "nowrap", fontSize: 12 }}
                    title="Discover Crestron devices on the network"
                  >
                    {discoveryOpen ? "Close Scanner" : "Discover"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Port</label>
                <input
                  className="input"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value) || 22)}
                />
              </div>

              <div className="form-group">
                <label className="label">Username</label>
                <input
                  className="input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="form-group form-group--full">
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthResult(null); }}
                  placeholder="Enter password"
                />
              </div>
            </div>

            {/* --- Network Discovery Panel --- */}
            {discoveryOpen && (
              <div className="deploy-discovery" style={{
                margin: "0 0 20px",
                padding: 16,
                background: "#0f172a",
                borderRadius: 12,
                border: "1px solid #1e293b",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>Network Discovery</h3>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Find Crestron processors on your LAN
                  </span>
                </div>

                {/* Interface + Subnet + Scan button */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
                  {netInterfaces.length > 0 && (
                    <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
                      <label className="label" style={{ fontSize: 11 }}>Network Interface</label>
                      <select
                        className="input"
                        value={selectedIface}
                        onChange={(e) => handleIfaceChange(e.target.value)}
                        disabled={scanning}
                        style={{ fontSize: 12 }}
                      >
                        <option value="">Select interface...</option>
                        {netInterfaces.map(iface => (
                          <option key={iface.id} value={iface.id}>
                            {iface.name} ({iface.ipv4?.cidr ?? "no IPv4"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group" style={{ flex: 1, margin: 0, minWidth: 140 }}>
                    <label className="label" style={{ fontSize: 11 }}>Subnet</label>
                    <input
                      className="input"
                      value={subnet}
                      onChange={(e) => setSubnet(e.target.value)}
                      placeholder="192.168.1.0/24"
                      disabled={scanning}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                  {!scanning ? (
                    <button className="button primary" onClick={handleStartScan} style={{ fontSize: 12 }}>
                      Scan
                    </button>
                  ) : (
                    <button className="button" onClick={handleCancelScan} style={{ fontSize: 12, color: "#ef4444" }}>
                      Stop
                    </button>
                  )}
                </div>

                {/* Scan progress */}
                {scanning && (
                  <div className="scan-progress" style={{ marginBottom: 8 }}>
                    <div className="scan-progress__bar" style={{ width: `${scanProgress}%` }} />
                  </div>
                )}

                {scanError && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{scanError}</p>}

                {/* Filter + Results count */}
                {scanResults.length > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {filteredScanResults.length} device{filteredScanResults.length !== 1 ? "s" : ""}
                        {deviceFilter === "crestron" ? " (Crestron only)" : ""}
                      </span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className={`button ${deviceFilter === "crestron" ? "primary" : ""}`}
                          style={{ fontSize: 11, padding: "3px 10px" }}
                          onClick={() => setDeviceFilter("crestron")}
                        >
                          Crestron
                        </button>
                        <button
                          className={`button ${deviceFilter === "all" ? "primary" : ""}`}
                          style={{ fontSize: 11, padding: "3px 10px" }}
                          onClick={() => setDeviceFilter("all")}
                        >
                          All
                        </button>
                      </div>
                    </div>

                    {/* Results table */}
                    <div style={{ maxHeight: 240, overflowY: "auto" }}>
                      <table className="signal-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th>IP Address</th>
                            <th>Hostname</th>
                            <th>Ports</th>
                            <th>Type</th>
                            <th>Ping</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredScanResults.map((r) => (
                            <tr
                              key={r.ip}
                              style={r.ip === ip ? { background: "rgba(37,99,235,0.1)" } : undefined}
                            >
                              <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{r.ip}</td>
                              <td style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                                {r.hostname || r.httpTitle || "—"}
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                  {r.ports.map((p) => (
                                    <span key={p} className="pill pill--ip" style={{ fontSize: 10, padding: "1px 5px" }}>
                                      {PORT_LABELS[p] ?? p}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <span style={{
                                  color: r.type === "Crestron" ? "#22c55e" : "#94a3b8",
                                  fontWeight: r.type === "Crestron" ? 600 : 400,
                                }}>
                                  {r.type}
                                </span>
                              </td>
                              <td>{r.responseTime}ms</td>
                              <td>
                                <button
                                  className="button primary"
                                  style={{ fontSize: 10, padding: "2px 8px" }}
                                  onClick={() => handlePickDevice(r)}
                                >
                                  {r.ip === ip ? "Selected" : "Use"}
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredScanResults.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: 16 }}>
                                {deviceFilter === "crestron"
                                  ? "No Crestron devices found. Try \"All\" filter or check the subnet."
                                  : "No devices found on this subnet."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {!scanning && scanResults.length === 0 && !scanError && (
                  <p style={{ fontSize: 12, color: "#475569", margin: "8px 0 0", textAlign: "center" }}>
                    Select a network interface or enter a subnet, then click Scan.
                  </p>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="button"
                onClick={handleTestAuth}
                disabled={!ip || !username || !password || authTesting}
              >
                {authTesting ? "Testing..." : "Test SFTP Connection"}
              </button>
            </div>

            {authResult && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                <span className={`deploy-status-dot ${authResult.success ? "deploy-status-dot--done" : "deploy-status-dot--error"}`} />
                <span style={{ fontSize: 13, fontWeight: 600, color: authResult.success ? "#22c55e" : "#ef4444" }}>
                  {authResult.success ? authResult.message : `Failed: ${authResult.message}`}
                </span>
              </div>
            )}

            {authResult?.success && authResult.serverInfo && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Server: {authResult.serverInfo}
              </div>
            )}

            <div className="deploy-actions">
              <button className="button" onClick={() => setStep(1)}>Back</button>
              <button
                className="button primary"
                disabled={!authResult?.success}
                onClick={() => { setStep(3); handleLoadPreview(); }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="card">
            <h2 style={{ margin: "0 0 16px", fontSize: 16 }}>Deployment Preview</h2>

            {previewLoading && <p style={{ color: "#94a3b8" }}>Loading file preview...</p>}
            {previewError && <p style={{ color: "#ef4444" }}>{previewError}</p>}

            {previewFiles.length > 0 && (
              <>
                <div className="deploy-file-row" style={{ fontWeight: 700, color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <span>File</span>
                  <span>Target Path</span>
                  <span>Size</span>
                  <span>SHA-256</span>
                </div>
                {previewFiles.map((f) => (
                  <div key={f.name} className="deploy-file-row">
                    <span style={{ fontWeight: 600 }}>{f.name}</span>
                    <code style={{ fontSize: 12, color: "#94a3b8" }}>{f.targetPath}</code>
                    <span>{formatBytes(f.sizeBytes)}</span>
                    <code style={{ fontSize: 11, color: "#64748b" }}>{f.contentHash.slice(0, 12)}...</code>
                  </div>
                ))}

                <div style={{ marginTop: 16, fontSize: 13, color: "#94a3b8" }}>
                  Total: <strong>{previewFiles.length} files</strong>, <strong>{formatBytes(previewFiles.reduce((s, f) => s + f.sizeBytes, 0))}</strong>
                </div>
              </>
            )}

            <div className="deploy-actions">
              <button className="button" onClick={() => setStep(2)}>Back</button>
              <button
                className="button primary"
                disabled={previewFiles.length === 0 || previewLoading}
                onClick={() => { setStep(4); handleStartDeploy(); }}
              >
                Deploy
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Transfer */}
        {step === 4 && (
          <div className="card">
            <h2 style={{ margin: "0 0 16px", fontSize: 16 }}>Transferring Files</h2>

            {deployStatus && (
              <>
                <div className="deploy-overall-progress">
                  <div
                    className={`deploy-overall-progress__bar ${deployStatus.status === "completed" ? "deploy-overall-progress__bar--done" : ""}`}
                    style={{ width: `${deployStatus.progress}%` }}
                  />
                </div>

                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
                  Status: <strong style={{ color: deployStatus.status === "completed" ? "#22c55e" : deployStatus.status === "error" ? "#ef4444" : "#93c5fd" }}>
                    {deployStatus.status}
                  </strong>
                  {deployStatus.progress > 0 && ` — ${deployStatus.progress}%`}
                </div>

                {deployStatus.files.map((f) => (
                  <div key={f.name} className="deploy-file-row deploy-file-row--transfer">
                    <span className={`deploy-status-dot deploy-status-dot--${f.status}`} />
                    <span style={{ fontWeight: 600 }}>{f.name}</span>
                    <div className="deploy-file-progress">
                      <div
                        className={`deploy-file-progress__bar ${f.status === "done" ? "deploy-file-progress__bar--done" : ""} ${f.status === "error" ? "deploy-file-progress__bar--error" : ""}`}
                        style={{ width: f.totalBytes > 0 ? `${Math.min(100, (f.bytesTransferred / f.totalBytes) * 100)}%` : "0%" }}
                      />
                    </div>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      {formatBytes(f.bytesTransferred)} / {formatBytes(f.totalBytes)}
                    </span>
                  </div>
                ))}
              </>
            )}

            {transferError && (
              <p style={{ color: "#ef4444", marginTop: 12 }}>{transferError}</p>
            )}

            <div className="deploy-actions">
              {deployStatus?.status === "transferring" || deployStatus?.status === "preparing" ? (
                <button className="button" style={{ color: "#ef4444" }} onClick={handleCancel}>Cancel</button>
              ) : deployStatus?.status === "error" || deployStatus?.status === "cancelled" ? (
                <>
                  <button className="button" onClick={() => setStep(3)}>Back</button>
                  <button className="button primary" onClick={() => { handleStartDeploy(); }}>Retry</button>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Step 5: Verify & Finish */}
        {step === 5 && (
          <div className="card">
            <h2 style={{ margin: "0 0 16px", fontSize: 16 }}>Verify & Finish</h2>

            <div className="deploy-summary">
              <div className="deploy-summary-card">
                <h4>Status</h4>
                <div className="value value--success">Deployed</div>
              </div>
              <div className="deploy-summary-card">
                <h4>Files</h4>
                <div className="value">{deployStatus?.files.length ?? 0}</div>
              </div>
              <div className="deploy-summary-card">
                <h4>Target</h4>
                <div className="value">{ip}</div>
              </div>
              <div className="deploy-summary-card">
                <h4>Completed</h4>
                <div className="value" style={{ fontSize: 13 }}>
                  {deployStatus?.completedAt ? new Date(deployStatus.completedAt).toLocaleTimeString() : "—"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <button
                className="button"
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Verify Files on Processor"}
              </button>
              <button
                className="button"
                onClick={handleRestart}
                disabled={restarting}
                style={{ color: "#f59e0b" }}
              >
                {restarting ? "Restarting..." : "Restart SIMPL# Program"}
              </button>
            </div>

            {verifyResult && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Verification Results</h3>
                {verifyResult.error && <p style={{ color: "#ef4444", fontSize: 13 }}>{verifyResult.error}</p>}
                {verifyResult.files.length > 0 && (
                  <>
                    <div className="deploy-verify-row" style={{ fontWeight: 700, color: "#94a3b8", fontSize: 12, textTransform: "uppercase" }}>
                      <span>File</span>
                      <span>Path</span>
                      <span>Exists</span>
                      <span>Size Match</span>
                    </div>
                    {verifyResult.files.map((f) => (
                      <div key={f.name} className="deploy-verify-row">
                        <span style={{ fontWeight: 600 }}>{f.name}</span>
                        <code style={{ fontSize: 12, color: "#94a3b8" }}>{f.remotePath}</code>
                        <span className={f.exists ? "deploy-check" : "deploy-cross"}>{f.exists ? "\u2713" : "\u2717"}</span>
                        <span className={f.sizeMatch ? "deploy-check" : "deploy-cross"}>
                          {f.sizeMatch ? "\u2713" : `\u2717 (${formatBytes(f.remoteSize)} vs ${formatBytes(f.expectedSize)})`}
                        </span>
                      </div>
                    ))}
                    <div style={{ marginTop: 12 }}>
                      <span className={`deploy-status-dot ${verifyResult.success ? "deploy-status-dot--done" : "deploy-status-dot--error"}`} />
                      <span style={{ marginLeft: 8, fontWeight: 600, color: verifyResult.success ? "#22c55e" : "#ef4444" }}>
                        {verifyResult.success ? "All files verified successfully" : "Verification failed — some files don't match"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {restartResult && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Program Restart</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`deploy-status-dot ${restartResult.success ? "deploy-status-dot--done" : "deploy-status-dot--error"}`} />
                  <span style={{ fontWeight: 600, color: restartResult.success ? "#22c55e" : "#ef4444" }}>
                    {restartResult.success ? "Program restart command sent" : "Restart failed"}
                  </span>
                </div>
                {restartResult.output && (
                  <pre style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, padding: 12, background: "#0f172a", borderRadius: 8 }}>
                    {restartResult.output}
                  </pre>
                )}
              </div>
            )}

            <div className="deploy-actions">
              <button className="button primary" onClick={handleReset}>Deploy Again</button>
              <Link to="/configure/export" className="button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Back to Export
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

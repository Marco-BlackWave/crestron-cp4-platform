import { useState } from "react";
import { analyzeXpanel, prepareXpanelPackage, type XpanelAnalyzeResponse, type XpanelPrepareResponse } from "../api/xpanelFidelityApi";

export default function XPanelFidelityPage() {
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [runBuild, setRunBuild] = useState(true);
  const [processorIp, setProcessorIp] = useState("192.168.23.135");
  const [processorPort, setProcessorPort] = useState("41794");
  const [ipid, setIpid] = useState("0x03");
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<XpanelAnalyzeResponse | null>(null);
  const [prepareResult, setPrepareResult] = useState<XpanelPrepareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setError(null);
    setAnalyzeLoading(true);
    try {
      const result = await analyzeXpanel();
      setAnalyzeResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analyze request failed.");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handlePrepare = async () => {
    setError(null);
    setPrepareLoading(true);
    try {
      const parsedPort = Number.parseInt(processorPort, 10);
      const result = await prepareXpanelPackage({
        runBuild,
        processorIp: processorIp.trim() || undefined,
        processorPort: Number.isFinite(parsedPort) ? parsedPort : 41794,
        ipid: ipid.trim() || "0x03",
      });
      setPrepareResult(result);
      setLivePreviewUrl(result.liveLaunchUrl || result.livePreviewUrl || "/xpanel/live/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Prepare request failed.");
    } finally {
      setPrepareLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>XPanel Fidelity</h1>
          <p className="subhead">Analyze external XPanel source and prepare a package with generated join bridge artifacts.</p>
          <p className="subhead" style={{ marginTop: 6, color: "var(--warning)", fontWeight: 700 }}>
            XPanel workflow only. This page does not produce native iPad/iPhone Crestron app packages.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="label">Actions</p>
        <p className="subhead" style={{ marginBottom: 10 }}>
          Native mobile requirements such as App ID, panel registration, and Smart Graphics/CH5 packaging are out of scope for this route.
        </p>
        <div className="form-row" style={{ marginBottom: 10 }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="label">Processor IP</label>
            <input className="input" value={processorIp} onChange={(e) => setProcessorIp(e.target.value)} placeholder="192.168.23.135" />
          </div>
          <div className="form-group" style={{ width: 140, marginBottom: 0 }}>
            <label className="label">Port</label>
            <input className="input" value={processorPort} onChange={(e) => setProcessorPort(e.target.value)} placeholder="41794" />
          </div>
          <div className="form-group" style={{ width: 140, marginBottom: 0 }}>
            <label className="label">IPID</label>
            <input className="input" value={ipid} onChange={(e) => setIpid(e.target.value)} placeholder="0x03" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="button" onClick={handleAnalyze} disabled={analyzeLoading || prepareLoading}>
            {analyzeLoading ? "Analyzing..." : "Analyze Source"}
          </button>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={runBuild} onChange={(e) => setRunBuild(e.target.checked)} />
            Run npm build during prepare
          </label>

          <button className="button primary" onClick={handlePrepare} disabled={prepareLoading || analyzeLoading}>
            {prepareLoading ? "Preparing..." : "Prepare Package"}
          </button>

          {livePreviewUrl && (
            <a className="button" href={livePreviewUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              Open Live 1:1
            </a>
          )}
        </div>

        {error && <p style={{ marginTop: 10, color: "var(--danger)", fontWeight: 600 }}>{error}</p>}
      </div>

      {analyzeResult && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="label">Analyze Result</p>
          <p className="subhead" style={{ marginBottom: 8 }}>
            Source: <strong>{analyzeResult.source.exists ? "found" : "missing"}</strong> · Files: <strong>{analyzeResult.source.candidateSourceFileCount}</strong>
          </p>
          <p className="subhead" style={{ marginBottom: 8 }}>
            Package root exists: <strong>{analyzeResult.package.exists ? "yes" : "no"}</strong> · Live dist exists: <strong>{analyzeResult.package.liveDistExists ? "yes" : "no"}</strong>
          </p>
          <p className="subhead" style={{ marginBottom: 8 }}>
            Join attrs: data-join <strong>{analyzeResult.joinAttributeCounts.dataJoin}</strong> · digital <strong>{analyzeResult.joinAttributeCounts.dataJoinDigital}</strong> · analog <strong>{analyzeResult.joinAttributeCounts.dataJoinAnalog}</strong> · serial <strong>{analyzeResult.joinAttributeCounts.dataJoinSerial}</strong>
          </p>
          <p className="subhead" style={{ marginBottom: 8 }}>
            Join contract: <strong>{analyzeResult.joinContract.available ? "ready" : "not ready"}</strong> · rooms <strong>{analyzeResult.joinContract.roomCount}</strong> · joins <strong>{analyzeResult.joinContract.joinCount}</strong>
          </p>

          {analyzeResult.joinContract.error && (
            <p style={{ color: "var(--warning)", fontWeight: 600, marginBottom: 8 }}>{analyzeResult.joinContract.error}</p>
          )}

          <div style={{ overflow: "auto" }}>
            <table className="signal-table">
              <thead>
                <tr>
                  <th>Key File</th>
                  <th>Exists</th>
                </tr>
              </thead>
              <tbody>
                {analyzeResult.source.keyChecks.map((item) => (
                  <tr key={item.key}>
                    <td>{item.key}</td>
                    <td>{item.exists ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="subhead" style={{ marginTop: 8 }}>{analyzeResult.note}</p>
        </div>
      )}

      {prepareResult && (
        <div className="card">
          <p className="label">Prepare Result</p>
          <p className="subhead" style={{ marginBottom: 8 }}>
            Package path: <strong>{prepareResult.package}</strong>
          </p>
          <p className="subhead" style={{ marginBottom: 8 }}>
            Artifacts generated: <strong>{prepareResult.artifacts.length}</strong>
          </p>
          <p className="subhead" style={{ marginBottom: 8 }}>
            Live URL: <strong>{prepareResult.liveLaunchUrl}</strong>
          </p>

          {prepareResult.commands.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p className="label" style={{ marginBottom: 6 }}>Commands</p>
              {prepareResult.commands.map((cmd, idx) => (
                <div key={`${cmd.command}-${idx}`} style={{ marginBottom: 6, padding: 8, border: "1px solid var(--border-default)", borderRadius: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>{cmd.command} · exit {cmd.exitCode}</p>
                  {cmd.stderr && <p style={{ margin: "4px 0 0", color: "var(--warning)" }}>{cmd.stderr}</p>}
                </div>
              ))}
            </div>
          )}

          <div style={{ overflow: "auto", maxHeight: 340 }}>
            <table className="signal-table">
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {prepareResult.artifacts.map((artifact) => (
                  <tr key={artifact.relativePath}>
                    <td>{artifact.relativePath}</td>
                    <td>{artifact.sizeBytes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="subhead" style={{ marginTop: 8 }}>{prepareResult.note}</p>
        </div>
      )}

      {livePreviewUrl && (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="label">Live Pixel Preview (1:1)</p>
          <p className="subhead" style={{ marginBottom: 8 }}>
            The frame below renders the original built XPanel from <strong>/xpanel/live/</strong> without UI restyling.
          </p>
          <div style={{ overflow: "auto", border: "1px solid var(--border-default)", borderRadius: 8, background: "#000" }}>
            <iframe
              src={livePreviewUrl}
              title="XPanel Live Preview"
              style={{ width: 1280, height: 720, border: 0, display: "block" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

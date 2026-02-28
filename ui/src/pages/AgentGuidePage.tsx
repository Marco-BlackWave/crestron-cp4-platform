import { useState } from "react";
import { Link } from "react-router";
import { loadAttachmentAnalysis, type AttachmentAnalysisResponse } from "../api/attachmentAnalysisApi";

export default function AgentGuidePage() {
  const [analysis, setAnalysis] = useState<AttachmentAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadAttachmentAnalysis();
      setAnalysis(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Attachment analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>VS Code Agent Guide</h1>
          <p className="subhead">How to interact with Copilot in this app: plan, review, check, save, deploy.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="label">Recommended Flow</p>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>Open <strong>Configure → Scaffold</strong> and describe tasks/integrations/rooms.</li>
          <li>Generate scaffold and review assumptions in the report.</li>
          <li>Open <strong>Project</strong> to check blockers and room/device hierarchy.</li>
          <li>Open <strong>Validate</strong> to test signals and constrained value edits.</li>
          <li>Save in app, then deploy from <strong>Configure → Deploy</strong>.</li>
        </ol>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="label">Prompt Examples</p>
        <pre style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", background: "var(--bg-subtle)", padding: 12, borderRadius: 8 }}>
{`Scaffold project: 2 processors, 8 rooms, Sonos + Lutron, include technical rack
Review blockers and fix configuration warnings
Validate digital/analog joins for room marco and set safe defaults
Save config and prepare deploy pre-flight to 192.168.23.6`}
        </pre>
      </div>

      <div className="card">
        <p className="label">Direct Actions</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/configure/scaffold" className="button" style={{ textDecoration: "none" }}>Open Scaffold</Link>
          <Link to="/project" className="button" style={{ textDecoration: "none" }}>Open Project</Link>
          <Link to="/validate" className="button" style={{ textDecoration: "none" }}>Open Validate</Link>
          <Link to="/code" className="button" style={{ textDecoration: "none" }}>Open Code</Link>
          <Link to="/configure/deploy" className="button" style={{ textDecoration: "none" }}>Open Deploy</Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p className="label" style={{ margin: 0 }}>Attached Assets Analysis</p>
          <button className="button" onClick={runAnalysis} disabled={loading}>{loading ? "Analyzing..." : "Analyze Attachments"}</button>
        </div>

        {error && <p style={{ color: "var(--danger)", fontWeight: 600 }}>{error}</p>}

        {analysis && (
          <>
            <p className="subhead" style={{ marginBottom: 8 }}>
              SDK path: <strong>{analysis.sdk.exists ? "found" : "missing"}</strong> · XML libs: <strong>{analysis.sdk.xmlLibraries.length}</strong> · ZIP artifacts: <strong>{analysis.sdk.zipArtifacts.length}</strong>
            </p>
            <p className="subhead" style={{ marginBottom: 8 }}>
              CH5 notes: <strong>{analysis.ch5ReleaseNotes.exists ? "found" : "missing"}</strong> · SDK-CD PDF: <strong>{analysis.sdkCdPdf.exists ? "found" : "missing"}</strong>
            </p>

            <div style={{ overflow: "auto" }}>
              <table className="signal-table">
                <thead>
                  <tr>
                    <th>XML Library</th>
                    <th>Members</th>
                    <th>Size (bytes)</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.sdk.xmlLibraries.slice(0, 12).map((file) => (
                    <tr key={file.path}>
                      <td>{file.name}</td>
                      <td>{file.memberCount}</td>
                      <td>{file.sizeBytes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="subhead" style={{ marginTop: 8 }}>{analysis.note}</p>
          </>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";
import { scaffoldSystemConfig } from "../api/scaffoldSystemConfig";
import { PROJECT_TEMPLATES } from "../data/projectTemplates";
import { parseProcessors, parseRooms, splitLines } from "../utils/scaffoldParser";

export default function ScaffoldPage() {
  const { setDraft, saveStatus, save, validationErrors, isDirty, draft } = useConfigEditor();

  const [systemName, setSystemName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [tasksRaw, setTasksRaw] = useState("");
  const [integrationsRaw, setIntegrationsRaw] = useState("");
  const [roomsRaw, setRoomsRaw] = useState("Living Room|av,lighting|standard\nEquipment Rack||technical");
  const [processorsRaw, setProcessorsRaw] = useState("main|CP4|0x03|127.0.0.2");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [report, setReport] = useState<{ taskCount: number; integrationCount: number; assumptions: string[] } | null>(null);

  const parsedRooms = useMemo(() => parseRooms(roomsRaw), [roomsRaw]);

  const parsedProcessors = useMemo(() => parseProcessors(processorsRaw), [processorsRaw]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const template = PROJECT_TEMPLATES.find((item) => item.id === id);
    if (!template) return;

    setSystemName(template.request.systemName);
    setProjectId(template.request.projectId ?? "");
    setTasksRaw((template.request.tasks ?? []).join("\n"));
    setIntegrationsRaw((template.request.integrations ?? []).join("\n"));

    const roomLines = (template.request.rooms ?? []).map((room) => {
      const subs = (room.subsystems ?? []).join(",");
      const type = room.roomType ?? "standard";
      const proc = room.processorId ?? "";
      return `${room.name} | ${subs} | ${type} | ${proc}`;
    });
    setRoomsRaw(roomLines.join("\n"));

    const procLines = (template.request.processors ?? []).map((proc) => {
      return `${proc.id ?? "main"} | ${proc.processor ?? "CP4"} | ${proc.eiscIpId ?? "0x03"} | ${proc.eiscIpAddress ?? "127.0.0.2"}`;
    });
    if (procLines.length > 0) setProcessorsRaw(procLines.join("\n"));
  };

  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await scaffoldSystemConfig({
        systemName: systemName.trim(),
        projectId: projectId.trim() || undefined,
        tasks: splitLines(tasksRaw),
        integrations: splitLines(integrationsRaw),
        rooms: parsedRooms,
        processors: parsedProcessors,
      });

      setDraft(result.config);
      setReport(result.report);
      setSuccess("Scaffold generated and loaded into the editor draft. Review and Save when ready.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate scaffold.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Task Scaffold</h1>
          <p className="subhead">Generate a baseline project from tasks, integrations, and room specs.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="label">Template Projects</p>
        <div className="form-row" style={{ marginBottom: 10 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label" htmlFor="sc-template">Select Template</label>
            <select id="sc-template" className="input" value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">Custom</option>
              {PROJECT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
            {templateId && (
              <p className="subhead" style={{ marginTop: 6 }}>
                {PROJECT_TEMPLATES.find((item) => item.id === templateId)?.description}
              </p>
            )}
          </div>
        </div>

        <p className="label">Project</p>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label" htmlFor="sc-system">System Name</label>
            <input id="sc-system" className="input" placeholder="Aurora Residence" value={systemName} onChange={(e) => setSystemName(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label" htmlFor="sc-project">Project ID (optional)</label>
            <input id="sc-project" className="input" placeholder="aurora-residence" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <p className="label">Tasks</p>
          <textarea
            className="editor"
            style={{ minHeight: 160 }}
            value={tasksRaw}
            onChange={(e) => setTasksRaw(e.target.value)}
            placeholder={"One task per line\nCreate lighting scenes\nAdd bedroom AV control"}
          />
        </div>

        <div className="card">
          <p className="label">Integrations</p>
          <textarea
            className="editor"
            style={{ minHeight: 160 }}
            value={integrationsRaw}
            onChange={(e) => setIntegrationsRaw(e.target.value)}
            placeholder={"One integration per line\nSonos\nLutron\nKNX"}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="label">Processors</p>
        <p className="subhead" style={{ marginBottom: 8 }}>Format: <strong>id | processor | eiscIpId | eiscIpAddress</strong></p>
        <textarea
          className="editor"
          style={{ minHeight: 110 }}
          value={processorsRaw}
          onChange={(e) => setProcessorsRaw(e.target.value)}
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="label">Rooms</p>
        <p className="subhead" style={{ marginBottom: 8 }}>Format: <strong>name | subsystems(comma) | roomType | processorId</strong></p>
        <textarea
          className="editor"
          style={{ minHeight: 170 }}
          value={roomsRaw}
          onChange={(e) => setRoomsRaw(e.target.value)}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button className="button primary" onClick={handleGenerate} disabled={loading || !systemName.trim()}>
            {loading ? "Generating..." : "Generate Scaffold"}
          </button>
          <Link to="/configure/rooms" className="button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Open Rooms
          </Link>
        </div>

        {success && <p style={{ margin: "10px 0 0", color: "var(--success)", fontWeight: 600 }}>{success}</p>}
        {error && <p style={{ margin: "10px 0 0", color: "var(--danger)", fontWeight: 600 }}>{error}</p>}
        {saveStatus === "saved" && <p style={{ margin: "10px 0 0", color: "var(--success)", fontWeight: 600 }}>Configuration saved.</p>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="label">Review / Check / Save</p>
        <p className="subhead" style={{ marginBottom: 10 }}>
          Draft: <strong>{draft ? "loaded" : "none"}</strong> · Dirty: <strong>{isDirty ? "yes" : "no"}</strong> · Validation errors: <strong>{validationErrors.length}</strong>
        </p>

        {validationErrors.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {validationErrors.slice(0, 6).map((item) => (
              <p key={item} style={{ margin: "0 0 4px", color: "var(--danger)", fontWeight: 600 }}>• {item}</p>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="button primary"
            onClick={save}
            disabled={!draft || !isDirty || validationErrors.length > 0 || saveStatus === "saving"}
          >
            {saveStatus === "saving" ? "Saving..." : "Save Draft to App"}
          </button>
          <Link to="/project" className="button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Review in Project Cockpit
          </Link>
          <Link to="/validate" className="button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Check in Validate
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="label">Use With Copilot in VS Code</p>
        <p className="subhead" style={{ marginBottom: 8 }}>Use short, structured prompts so Copilot can act end-to-end:</p>
        <pre style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", background: "var(--bg-subtle)", padding: 12, borderRadius: 8 }}>
{`1) "Scaffold project: 2 CP4 processors, 6 rooms, Sonos + Lutron integration"
2) "Review validation blockers and fix them"
3) "Save config and open Validate"
4) "Prepare deploy target and run pre-flight"`}
        </pre>
      </div>

      {report && (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="label">Generation Report</p>
          <p className="subhead" style={{ marginBottom: 8 }}>
            Tasks: <strong>{report.taskCount}</strong> · Integrations: <strong>{report.integrationCount}</strong>
          </p>
          {report.assumptions.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {report.assumptions.map((item) => (
                <li key={item} style={{ marginBottom: 4 }}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="subhead">No assumptions were required.</p>
          )}
        </div>
      )}
    </div>
  );
}

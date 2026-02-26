import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";
import { useProjects } from "../hooks/useProjects";
import { bootstrapProjectRepo, saveProject } from "../api/projectsApi";
import type { ProcessorType } from "../schema/systemConfigSchema";

const PROCESSOR_TYPES: ProcessorType[] = ["CP4", "CP3", "RMC4", "VC-4"];

export default function ConfigurePage() {
  const { draft, addProcessor, updateProcessor, removeProcessor } = useConfigEditor();

  const [showAddProc, setShowAddProc] = useState(false);
  const [newProcId, setNewProcId] = useState("");
  const [newProcType, setNewProcType] = useState<ProcessorType>("CP4");
  const [newProcEiscId, setNewProcEiscId] = useState("0x04");
  const [newProcEiscAddr, setNewProcEiscAddr] = useState("");
  const { projects, loading: projectsLoading, error: projectsError, refresh: refreshProjects, remove: removeProject, activate: activateProject, importJson } = useProjects();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [repoStatus, setRepoStatus] = useState<string | null>(null);

  useEffect(() => { document.title = "Configure — CP4"; }, []);

  const processors = draft?.system.processors ?? [];
  const roomsUsingProcessor = (procId: string) =>
    draft?.rooms.filter((r) => r.processorId === procId).length ?? 0;

  const handleSaveAsProject = async () => {
    if (!draft) return;
    try {
      await saveProject(draft);
      refreshProjects();
    } catch { /* error shown via projects hook */ }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        importJson(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportProject = (project: typeof projects[0]) => {
    const a = document.createElement("a");
    a.href = `/api/projects/${project.id}`;
    a.download = `${project.id}.json`;
    a.click();
  };

  const handleBootstrapRepo = async (projectId: string) => {
    setRepoStatus(null);
    try
    {
      const result = await bootstrapProjectRepo(projectId, { initializeGit: true });
      setRepoStatus(`${projectId}: ${result.repoPath} (${result.gitInitialized ? "git init ok" : result.gitMessage})`);
    }
    catch (e: unknown)
    {
      setRepoStatus(e instanceof Error ? e.message : "Failed to bootstrap repository");
    }
  };

  const handleAddProcessor = () => {
    if (!newProcId.trim()) return;
    addProcessor(newProcId.trim(), newProcType, newProcEiscId, newProcEiscAddr);
    setNewProcId("");
    setNewProcType("CP4");
    setNewProcEiscId("0x04");
    setNewProcEiscAddr("");
    setShowAddProc(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Configure System (Pro)</h1>
          <p className="subhead">Compact hardware-first configuration for experienced Crestron workflows.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Link to="/configure/studio" className="button primary" style={{ textDecoration: "none" }}>Open Studio</Link>
        <Link to="/configure/rooms" className="button" style={{ textDecoration: "none" }}>Rooms</Link>
        <Link to="/configure/sources" className="button" style={{ textDecoration: "none" }}>Sources</Link>
        <Link to="/configure/scenes" className="button" style={{ textDecoration: "none" }}>Scenes</Link>
        <Link to="/configure/scaffold" className="button" style={{ textDecoration: "none" }}>Scaffold</Link>
        <Link to="/validate" className="button" style={{ textDecoration: "none" }}>Validate</Link>
      </div>

      {draft && (
        <>
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            <p className="label">Current Project</p>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong>{draft.system.name}</strong>
              <span className="subhead">
                {draft.projectId} · {draft.rooms.length} room(s) · {draft.sources.length} source(s) · {draft.scenes.length} scene(s) · {processors.length} processor(s)
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <button className="button primary" onClick={handleSaveAsProject}>
              Save as Project
            </button>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 17 }}>Processors</h2>
              <button className="button" onClick={() => setShowAddProc(!showAddProc)}>
                {showAddProc ? "Cancel" : "+ Add Processor"}
              </button>
            </div>

            {showAddProc && (
              <div style={{ marginBottom: 10, display: "grid", gridTemplateColumns: "1.1fr 0.8fr 0.8fr 1fr auto", gap: 8 }}>
                <input className="input" placeholder="processor-id" value={newProcId} onChange={(e) => setNewProcId(e.target.value)} />
                <select className="input" value={newProcType} onChange={(e) => setNewProcType(e.target.value as ProcessorType)}>
                  {PROCESSOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input className="input" placeholder="0x04" value={newProcEiscId} onChange={(e) => setNewProcEiscId(e.target.value)} />
                <input className="input" placeholder="192.168.1.50" value={newProcEiscAddr} onChange={(e) => setNewProcEiscAddr(e.target.value)} />
                <button className="button primary" onClick={handleAddProcessor} disabled={!newProcId.trim() || !newProcEiscId || !newProcEiscAddr}>Add</button>
              </div>
            )}

            <div style={{ overflow: "auto" }}>
              <table className="signal-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>EISC IP-ID</th>
                    <th>EISC Address</th>
                    <th>Rooms</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {processors.map((proc) => {
                    const roomCount = roomsUsingProcessor(proc.id);
                    return (
                      <tr key={proc.id}>
                        <td style={{ fontWeight: 700 }}>{proc.id}</td>
                        <td>
                          <select className="input" value={proc.processor} onChange={(e) => updateProcessor(proc.id, { processor: e.target.value as ProcessorType })}>
                            {PROCESSOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="input" value={proc.eiscIpId} onChange={(e) => updateProcessor(proc.id, { eiscIpId: e.target.value })} />
                        </td>
                        <td>
                          <input className="input" value={proc.eiscIpAddress} onChange={(e) => updateProcessor(proc.id, { eiscIpAddress: e.target.value })} />
                        </td>
                        <td>{roomCount}</td>
                        <td>
                          <button className="button" disabled={processors.length <= 1 || roomCount > 0} onClick={() => removeProcessor(proc.id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 14, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Saved Projects</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleImportFile}
            />
            <button className="button" onClick={() => fileInputRef.current?.click()}>
              Import Project
            </button>
          </div>
        </div>

        {projectsError && (
          <div className="card error" style={{ marginBottom: 12 }}>{projectsError}</div>
        )}

        {repoStatus && <p className="subhead" style={{ marginBottom: 8 }}>{repoStatus}</p>}

        {projectsLoading && <p className="subhead">Loading projects...</p>}

        {!projectsLoading && projects.length === 0 && (
          <div style={{ textAlign: "center", color: "#64748b", padding: 12, border: "1px dashed var(--border-default)", borderRadius: 8 }}>
            <p>No saved projects yet.</p>
            <p style={{ fontSize: 13 }}>Save your current config as a project, or import a JSON file.</p>
          </div>
        )}

        {projects.length > 0 && (
          <div style={{ overflow: "auto" }}>
            <table className="signal-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Rooms</th>
                  <th>Modified</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td style={{ fontWeight: 700 }}>{project.name}</td>
                    <td>{project.id}</td>
                    <td>{project.rooms}</td>
                    <td>{new Date(project.modified).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="button primary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => activateProject(project.id)}>
                          Activate
                        </button>
                        <button className="button" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => handleExportProject(project)}>
                          Export
                        </button>
                        <button className="button" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => handleBootstrapRepo(project.id)}>
                          Repo
                        </button>
                        <button className="button danger" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => removeProject(project.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";
import { useProjects } from "../hooks/useProjects";
import { saveProject } from "../api/projectsApi";
import { ContextMenu } from "../components/ContextMenu";
import { useContextMenu } from "../hooks/useContextMenu";
import type { ProcessorType } from "../schema/systemConfigSchema";

const PROCESSOR_TYPES: ProcessorType[] = ["CP4", "CP3", "RMC4", "VC-4"];

export default function ConfigurePage() {
  const { draft, loadStatus, loadError, loadFromServer, addProcessor, updateProcessor, removeProcessor } = useConfigEditor();
  const navigate = useNavigate();

  const [showAddProc, setShowAddProc] = useState(false);
  const [newProcId, setNewProcId] = useState("");
  const [newProcType, setNewProcType] = useState<ProcessorType>("CP4");
  const [newProcEiscId, setNewProcEiscId] = useState("0x04");
  const [newProcEiscAddr, setNewProcEiscAddr] = useState("");
  const { menuPos: projMenuPos, openMenu: openProjMenu, closeMenu: closeProjMenu } = useContextMenu();
  const [contextProjectId, setContextProjectId] = useState<string | null>(null);
  const { menuPos: procMenuPos, openMenu: openProcMenu, closeMenu: closeProcMenu } = useContextMenu();
  const [contextProcId, setContextProcId] = useState<string | null>(null);
  const { projects, loading: projectsLoading, error: projectsError, refresh: refreshProjects, remove: removeProject, activate: activateProject, importJson } = useProjects();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = "Configure — CP4"; }, []);

  const handleEditCurrent = async () => {
    if (!draft) {
      await loadFromServer();
    }
    navigate("/configure/rooms");
  };

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
          <h1>Configure System</h1>
          <p className="subhead">Create or edit your system configuration</p>
        </div>
      </div>

      <div className="grid" style={{ maxWidth: 640 }}>
        <div
          className="card clickable"
          onClick={handleEditCurrent}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleEditCurrent()}
        >
          <p className="label">Edit</p>
          <h2 style={{ margin: "0 0 8px" }}>Edit Current Configuration</h2>
          <p className="subhead">
            Load the existing SystemConfig.json and modify rooms, devices, sources, and scenes.
          </p>
          {loadStatus === "error" && (
            <p style={{ color: "#b91c1c", marginTop: 8, fontSize: 13 }}>{loadError}</p>
          )}
        </div>

        <div
          className="card clickable"
          onClick={() => navigate("/configure/wizard")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/configure/wizard")}
        >
          <p className="label">New</p>
          <h2 style={{ margin: "0 0 8px" }}>Start New Project</h2>
          <p className="subhead">
            Create a new project from scratch with the setup wizard.
          </p>
        </div>
      </div>

      {draft && (
        <>
          <div className="card" style={{ marginTop: 24, maxWidth: 640 }}>
            <p className="label">Current Project</p>
            <h3 style={{ margin: "0 0 4px" }}>{draft.system.name}</h3>
            <p className="subhead">
              {draft.projectId} — {draft.rooms.length} room{draft.rooms.length !== 1 ? "s" : ""},
              {" "}{draft.sources.length} source{draft.sources.length !== 1 ? "s" : ""},
              {" "}{draft.scenes.length} scene{draft.scenes.length !== 1 ? "s" : ""},
              {" "}{processors.length} processor{processors.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Save as Project */}
          <div style={{ marginTop: 16, maxWidth: 640 }}>
            <button className="button primary" onClick={handleSaveAsProject}>
              Save as Project
            </button>
          </div>

          {/* Processors Section */}
          <div style={{ marginTop: 24, maxWidth: 640 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Processors</h2>
              <button className="button" onClick={() => setShowAddProc(!showAddProc)}>
                {showAddProc ? "Cancel" : "+ Add Processor"}
              </button>
            </div>

            {showAddProc && (
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>New Processor</h3>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="label">Processor ID</label>
                    <input className="input" placeholder="bedroom-proc" value={newProcId} onChange={(e) => setNewProcId(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="label">Type</label>
                    <select className="input" value={newProcType} onChange={(e) => setNewProcType(e.target.value as ProcessorType)}>
                      {PROCESSOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="label">EISC IP-ID</label>
                    <input className="input" placeholder="0x04" value={newProcEiscId} onChange={(e) => setNewProcEiscId(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="label">EISC IP Address</label>
                    <input className="input" placeholder="192.168.1.50" value={newProcEiscAddr} onChange={(e) => setNewProcEiscAddr(e.target.value)} />
                  </div>
                </div>
                <button className="button primary" onClick={handleAddProcessor} disabled={!newProcId.trim() || !newProcEiscId || !newProcEiscAddr}>
                  Add Processor
                </button>
              </div>
            )}

            {processors.map((proc) => {
              const roomCount = roomsUsingProcessor(proc.id);
              return (
                <div key={proc.id} className="card" style={{ marginBottom: 8 }} onContextMenu={(e) => { setContextProcId(proc.id); openProcMenu(e); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <strong>{proc.id}</strong>
                        <span className="pill" style={{ fontSize: 11 }}>{proc.processor}</span>
                      </div>
                      <p className="subhead" style={{ margin: 0 }}>
                        EISC {proc.eiscIpId} @ {proc.eiscIpAddress} — {roomCount} room{roomCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {processors.length > 1 && roomCount === 0 && (
                      <button className="button" style={{ fontSize: 12 }} onClick={() => removeProcessor(proc.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Projects Section */}
      <div style={{ marginTop: 32, maxWidth: 640 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Saved Projects</h2>
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

        {projectsLoading && <p className="subhead">Loading projects...</p>}

        {!projectsLoading && projects.length === 0 && (
          <div className="card" style={{ textAlign: "center", color: "#64748b", padding: 24 }}>
            <p>No saved projects yet.</p>
            <p style={{ fontSize: 13 }}>Save your current config as a project, or import a JSON file.</p>
          </div>
        )}

        {projects.map((project) => (
          <div
            key={project.id}
            className="card"
            style={{ marginBottom: 8 }}
            onContextMenu={(e) => { setContextProjectId(project.id); openProjMenu(e); }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <strong>{project.name}</strong>
                  <span className="pill" style={{ fontSize: 11 }}>{project.rooms} room{project.rooms !== 1 ? "s" : ""}</span>
                </div>
                <p className="subhead" style={{ margin: 0 }}>
                  {project.id} — Modified {new Date(project.modified).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="button primary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => activateProject(project.id)}>
                  Activate
                </button>
                <button className="button" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => handleExportProject(project)}>
                  Export
                </button>
                <button className="button danger" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => removeProject(project.id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ContextMenu
        position={projMenuPos}
        onClose={closeProjMenu}
        items={[
          { label: "Activate", onClick: () => { if (contextProjectId) activateProject(contextProjectId); } },
          { label: "Export", onClick: () => { if (contextProjectId) { const p = projects.find(x => x.id === contextProjectId); if (p) handleExportProject(p); } } },
          { label: "", divider: true, onClick: () => {} },
          { label: "Delete", danger: true, onClick: () => { if (contextProjectId) removeProject(contextProjectId); } },
        ]}
      />
      <ContextMenu
        position={procMenuPos}
        onClose={closeProcMenu}
        items={[
          { label: "Edit", onClick: () => { /* processor editing is inline */ } },
          { label: "", divider: true, onClick: () => {} },
          { label: "Remove", danger: true, onClick: () => { if (contextProcId) removeProcessor(contextProcId); } },
        ]}
      />
    </div>
  );
}

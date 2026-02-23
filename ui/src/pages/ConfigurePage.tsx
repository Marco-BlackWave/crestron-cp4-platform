import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";

export default function ConfigurePage() {
  const { draft, loadStatus, loadError, loadFromServer, setProjectInfo, setEisc } = useConfigEditor();
  const navigate = useNavigate();

  useEffect(() => { document.title = "Configure — CP4"; }, []);

  const handleEditCurrent = async () => {
    if (!draft) {
      await loadFromServer();
    }
    navigate("/configure/rooms");
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Configure System</h1>
          <p className="subhead">Create or edit your CP4 system configuration</p>
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
        <div className="card" style={{ marginTop: 24, maxWidth: 640 }}>
          <p className="label">Current Project</p>
          <h3 style={{ margin: "0 0 4px" }}>{draft.system.name}</h3>
          <p className="subhead">
            {draft.projectId} — {draft.rooms.length} room{draft.rooms.length !== 1 ? "s" : ""},
            {" "}{draft.sources.length} source{draft.sources.length !== 1 ? "s" : ""},
            {" "}{draft.scenes.length} scene{draft.scenes.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

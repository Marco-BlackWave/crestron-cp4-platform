import { useEffect } from "react";
import { NavLink, Outlet } from "react-router";
import { ConfigEditorProvider, useConfigEditor } from "../hooks/useConfigEditor";

const tabs = [
  { to: "/configure", label: "Project", end: true },
  { to: "/configure/rooms", label: "Rooms" },
  { to: "/configure/sources", label: "Sources" },
  { to: "/configure/scenes", label: "Scenes" },
  { to: "/configure/export", label: "Export" },
];

function SaveBanner() {
  const { isDirty, saveStatus, saveError, save, discard, validationErrors } = useConfigEditor();

  if (!isDirty && saveStatus !== "saved" && saveStatus !== "error") return null;

  return (
    <div className={`save-banner ${saveStatus === "error" ? "save-banner--error" : ""}`}>
      <div className="save-banner-content">
        {isDirty && (
          <>
            <span>
              Unsaved changes
              {validationErrors.length > 0 && (
                <span className="save-banner-errors"> — {validationErrors.length} validation error{validationErrors.length !== 1 ? "s" : ""}</span>
              )}
            </span>
            <div className="save-banner-actions">
              <button className="button" onClick={discard} disabled={saveStatus === "saving"}>Discard</button>
              <button
                className="button primary"
                onClick={save}
                disabled={saveStatus === "saving" || validationErrors.length > 0}
              >
                {saveStatus === "saving" ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        )}
        {!isDirty && saveStatus === "saved" && <span className="save-banner-success">Configuration saved</span>}
        {saveStatus === "error" && saveError && <span className="save-banner-error-msg">{saveError}</span>}
      </div>
    </div>
  );
}

function UnsavedChangesGuard() {
  const { isDirty } = useConfigEditor();

  // Warn on browser tab close / refresh when dirty
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return null;
}

function DraftRecovery() {
  const { draft, setDraft, loadStatus } = useConfigEditor();

  useEffect(() => {
    if (draft || loadStatus !== "idle") return;
    const saved = localStorage.getItem("configEditor-draft");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.schemaVersion) {
        setDraft(parsed);
      }
    } catch {
      localStorage.removeItem("configEditor-draft");
    }
  }, [draft, loadStatus, setDraft]);

  return null;
}

function ConfigureLayoutInner() {
  return (
    <div className="page-content">
      <UnsavedChangesGuard />
      <DraftRecovery />
      <nav className="config-tabs">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `config-tab ${isActive ? "config-tab--active" : ""}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
      <SaveBanner />
    </div>
  );
}

export default function ConfigureLayout() {
  return (
    <ConfigEditorProvider>
      <ConfigureLayoutInner />
    </ConfigEditorProvider>
  );
}

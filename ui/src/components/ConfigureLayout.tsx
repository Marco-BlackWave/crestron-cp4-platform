import { useEffect, useState, useCallback } from "react";
import { NavLink, Outlet } from "react-router";
import { ConfigEditorProvider, useConfigEditor } from "../hooks/useConfigEditor";
import JsonSidebarPanel from "./JsonSidebarPanel";

const tabs = [
  { to: "/configure", label: "Project", end: true },
  { to: "/configure/rooms", label: "Rooms" },
  { to: "/configure/sources", label: "Sources" },
  { to: "/configure/scenes", label: "Scenes" },
  { to: "/configure/export", label: "Export" },
  { to: "/configure/deploy", label: "Deploy" },
];

function SaveBanner() {
  const { isDirty, saveStatus, saveError, save, discard, validationErrors, undo, redo, canUndo, canRedo } = useConfigEditor();

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
              <button className="button" onClick={undo} disabled={!canUndo || saveStatus === "saving"} title="Undo (Ctrl+Z)">Undo</button>
              <button className="button" onClick={redo} disabled={!canRedo || saveStatus === "saving"} title="Redo (Ctrl+Shift+Z)">Redo</button>
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

function UndoRedoKeyboard() {
  const { undo, redo, canUndo, canRedo } = useConfigEditor();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    if (e.key === "z" && !e.shiftKey && canUndo) {
      e.preventDefault();
      undo();
    } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
      if (canRedo) {
        e.preventDefault();
        redo();
      }
    }
  }, [undo, redo, canUndo, canRedo]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return null;
}

function ConfigureLayoutInner() {
  const [jsonOpen, setJsonOpen] = useState(false);

  return (
    <div className="page-content">
      <UnsavedChangesGuard />
      <DraftRecovery />
      <UndoRedoKeyboard />
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
        <button
          className={`config-tab json-sidebar-toggle ${jsonOpen ? "config-tab--active" : ""}`}
          onClick={() => setJsonOpen((v) => !v)}
          style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer" }}
        >
          &lt;&gt; JSON
        </button>
      </nav>
      <div style={jsonOpen ? { marginRight: 400 } : undefined}>
        <Outlet />
      </div>
      <JsonSidebarPanel open={jsonOpen} onClose={() => setJsonOpen(false)} />
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

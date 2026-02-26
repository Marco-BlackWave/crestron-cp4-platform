import React from "react";

export function ProjectExporter() {
  return (
    <div style={{ padding: 16 }}>
      <p style={{ margin: 0, opacity: 0.7 }}>ProjectExporter placeholder</p>
    </div>
  );
}

export function ProjectExportButton() {
  return (
    <button
      type="button"
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.08)",
        color: "white",
      }}
    >
      Export Project
    </button>
  );
}

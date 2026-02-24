import { useState, useMemo } from "react";
import { useConfigEditor } from "../hooks/useConfigEditor";
import JsonEditor from "./JsonEditor";

interface JsonSidebarPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function JsonSidebarPanel({ open, onClose }: JsonSidebarPanelProps) {
  const { draft } = useConfigEditor();
  const [copied, setCopied] = useState(false);

  const jsonText = useMemo(
    () => (draft ? JSON.stringify(draft, null, 2) : ""),
    [draft]
  );

  const handleCopy = async () => {
    if (!jsonText) return;
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`json-sidebar ${open ? "json-sidebar--open" : ""}`}>
      <div className="json-sidebar-header">
        <h3 style={{ margin: 0, fontSize: 14 }}>&lt;&gt; Live JSON</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="button" style={{ fontSize: 12, padding: "6px 10px" }} onClick={handleCopy} disabled={!jsonText}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="button" style={{ fontSize: 12, padding: "6px 10px" }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="json-sidebar-body">
        {jsonText ? (
          <JsonEditor value={jsonText} readOnly dark height="100%" />
        ) : (
          <p style={{ color: "#94a3b8", padding: 16, margin: 0 }}>No config loaded</p>
        )}
      </div>
    </div>
  );
}

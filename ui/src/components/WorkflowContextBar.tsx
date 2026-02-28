import { Link } from "react-router";

interface WorkflowContextBarProps {
  current: "code" | "validate";
  projectName?: string;
  roomCount?: number;
  deviceCount?: number;
  signalCount?: number;
}

export default function WorkflowContextBar({
  current,
  projectName,
  roomCount,
  deviceCount,
  signalCount,
}: WorkflowContextBarProps) {
  return (
    <div className="workflow-context-bar">
      <div>
        <p className="label" style={{ marginBottom: 4 }}>Workflow Context</p>
        <p className="subhead" style={{ margin: 0 }}>
          {projectName || "Project"}
          {roomCount !== undefined && ` · ${roomCount} rooms`}
          {deviceCount !== undefined && ` · ${deviceCount} devices`}
          {signalCount !== undefined && ` · ${signalCount} signals`}
        </p>
      </div>
      <div className="workflow-context-links">
        <Link to="/project" className="button" style={{ textDecoration: "none" }}>Project</Link>
        <Link to="/configure" className="button" style={{ textDecoration: "none" }}>Configure</Link>
        <Link to="/code" className={`button ${current === "code" ? "primary" : ""}`} style={{ textDecoration: "none" }}>Code</Link>
        <Link to="/validate" className={`button ${current === "validate" ? "primary" : ""}`} style={{ textDecoration: "none" }}>Validate</Link>
        <Link to="/configure/deploy" className="button" style={{ textDecoration: "none" }}>Deploy</Link>
      </div>
    </div>
  );
}

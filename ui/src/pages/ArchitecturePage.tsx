import { useEffect } from "react";
import ArchitectureOverview from "../components/ArchitectureOverview";

export default function ArchitecturePage() {
  useEffect(() => { document.title = "System Architecture — CP4"; }, []);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>System Architecture</h1>
          <p className="subhead">Visual overview of the full system structure</p>
        </div>
      </div>
      <ArchitectureOverview />
    </div>
  );
}

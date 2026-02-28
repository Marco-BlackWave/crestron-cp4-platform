import { useEffect } from "react";
import { useSystemConfig } from "../hooks/useSystemConfig";

export default function ScenesPage() {
  const config = useSystemConfig();

  useEffect(() => { document.title = "Scenes — CP4"; }, []);

  if (config.status === "loading") {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" />
        <div className="card-grid">
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
        </div>
      </div>
    );
  }

  if (config.status === "error") {
    return (
      <div className="page-content">
        <h1>Scenes</h1>
        <div className="card error" role="alert">{config.error}</div>
      </div>
    );
  }

  const scenes = config.data?.scenes ?? [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Scenes</h1>
          <p className="subhead">{scenes.length} scene{scenes.length !== 1 ? "s" : ""} configured</p>
        </div>
      </div>

      {scenes.length === 0 ? (
        <div className="empty-state">
          <h2>No Scenes</h2>
          <p>No scenes are configured in the system.</p>
        </div>
      ) : (
        <section className="card-grid">
          {scenes.map((scene) => (
            <div className="card" key={scene.id}>
              <p className="label">{scene.id}</p>
              <h2 style={{ margin: "0 0 8px" }}>{scene.name}</h2>
              <p className="subhead" style={{ marginBottom: 12 }}>
                Target: {scene.rooms.join(", ")}
              </p>

              <h4 style={{ margin: "0 0 6px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                Actions
              </h4>
              <ul className="scene-actions">
                {Object.entries(scene.actions).map(([key, value]) => {
                  let display: string;
                  if (key === "lighting") {
                    display = typeof value === "number" ? `${value}%` : String(value);
                  } else if (key === "shades") {
                    display = String(value);
                  } else if (key === "av" && value === "off") {
                    display = "Power Off";
                  } else if (key === "source") {
                    display = String(value);
                  } else {
                    display = String(value);
                  }

                  return (
                    <li key={key}>
                      <strong>{key}:</strong> {display}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

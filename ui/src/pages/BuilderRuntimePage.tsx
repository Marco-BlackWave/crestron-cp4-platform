import { useEffect, useMemo, useState } from "react";
import { loadBuilderProject, type BuilderPage, type BuilderProject } from "../api/loadBuilderProject";

function resolveAsset(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  const normalized = path.replace(/^\.\//, "").replace(/^\//, "");
  return `/builder-import/${normalized}`;
}

export default function BuilderRuntimePage() {
  const [project, setProject] = useState<BuilderProject | null>(null);
  const [pageId, setPageId] = useState<string>("");
  const [zoom, setZoom] = useState<number>(70);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const loaded = await loadBuilderProject();
        if (cancelled) return;
        setProject(loaded);
        setPageId(loaded.pages[0]?.id ?? "");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load builder project.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const activePage: BuilderPage | null = useMemo(() => {
    if (!project) return null;
    return project.pages.find((p) => p.id === pageId) ?? project.pages[0] ?? null;
  }, [project, pageId]);

  return (
    <div className="page-content builder-runtime-page">
      <div className="page-header">
        <div>
          <h1>Builder Runtime</h1>
          <p className="subhead">Live runtime view for your Crestron UI Builder export.</p>
        </div>
      </div>

      <div className="builder-runtime-shell">
        <aside className="card builder-runtime-sidebar">
          <div className="builder-runtime-sidebar__title">Project Tree</div>
          {loading && <p className="subhead">Loading builder export...</p>}
          {error && (
            <div className="builder-runtime-empty">
              <p style={{ marginTop: 0 }}><strong>Builder export not loaded</strong></p>
              <p style={{ marginBottom: 8 }}>{error}</p>
              <p style={{ marginBottom: 0 }}>
                Expected folder: <code>ui/public/builder-import/</code>
              </p>
            </div>
          )}

          {!loading && !error && project && (
            <>
              <p className="subhead" style={{ marginBottom: 10 }}>{project.name}</p>
              <div className="builder-runtime-page-list">
                {project.pages.map((p) => (
                  <button
                    key={p.id}
                    className={`button ${activePage?.id === p.id ? "button--active" : ""}`}
                    onClick={() => setPageId(p.id)}
                    style={{ justifyContent: "flex-start" }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        <section className="card builder-runtime-stage">
          <div className="builder-runtime-toolbar">
            <label className="label" htmlFor="builder-zoom">Zoom</label>
            <input
              id="builder-zoom"
              className="input"
              type="number"
              min={25}
              max={150}
              value={zoom}
              onChange={(e) => setZoom(Math.max(25, Math.min(150, Number.parseInt(e.target.value || "70", 10) || 70)))}
              style={{ width: 80 }}
            />
            <span className="subhead">%</span>
          </div>

          {!activePage && !loading && !error && (
            <p className="subhead">No page selected.</p>
          )}

          {activePage && (
            <div className="builder-runtime-canvas-wrap">
              <div
                className="builder-runtime-canvas"
                style={{
                  width: activePage.width,
                  height: activePage.height,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top left",
                  backgroundImage: activePage.backgroundImage ? `url(${resolveAsset(activePage.backgroundImage)})` : undefined,
                }}
              >
                {activePage.elements.map((el) => (
                  <div
                    key={el.id}
                    className="builder-runtime-element"
                    style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
                    title={`${el.type} ${el.name ?? ""}`.trim()}
                  >
                    <div className="builder-runtime-element__type">{el.type}</div>
                    <div className="builder-runtime-element__name">{el.label || el.name || el.id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

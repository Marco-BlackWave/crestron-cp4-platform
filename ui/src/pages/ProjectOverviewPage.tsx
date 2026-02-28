import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { useJoinContract } from "../hooks/useJoinContract";

type HealthLevel = "good" | "warn" | "bad";
type IssueLevel = "blocker" | "warning";

interface OverviewIssue {
  id: string;
  level: IssueLevel;
  message: string;
  actionLabel: string;
  to: string;
}

export default function ProjectOverviewPage() {
  const config = useSystemConfig();
  const contract = useJoinContract();

  useEffect(() => {
    document.title = "Project Overview — CP4";
  }, []);

  const summary = useMemo(() => {
    if (!config.data || !contract.data) return null;

    const processors = config.data.system.processors && config.data.system.processors.length > 0
      ? config.data.system.processors
      : [
        {
          id: "main",
          processor: config.data.processor,
          eiscIpId: config.data.system.eiscIpId ?? "0x03",
          eiscIpAddress: config.data.system.eiscIpAddress ?? "127.0.0.2",
        },
      ];

    const rooms = config.data.rooms.length;
    const roomDevices = config.data.rooms.reduce((sum, room) => sum + Object.keys(room.devices).length, 0);
    const joins = contract.data.rooms.reduce((sum, room) => {
      return sum + room.joins.digital.length + room.joins.analog.length + room.joins.serial.length;
    }, 0);

    const issues: OverviewIssue[] = [];

    if (rooms === 0) {
      issues.push({
        id: "rooms-empty",
        level: "blocker",
        message: "No rooms configured yet.",
        actionLabel: "Open Rooms",
        to: "/configure/rooms",
      });
    }

    if (roomDevices === 0) {
      issues.push({
        id: "devices-empty",
        level: "blocker",
        message: "No devices assigned to rooms.",
        actionLabel: "Assign Devices",
        to: "/configure/rooms",
      });
    }

    if (config.data.sources.length === 0) {
      issues.push({
        id: "sources-empty",
        level: "warning",
        message: "No sources defined yet.",
        actionLabel: "Add Sources",
        to: "/configure/sources",
      });
    }

    if (config.data.scenes.length === 0) {
      issues.push({
        id: "scenes-empty",
        level: "warning",
        message: "No scenes configured yet.",
        actionLabel: "Create Scenes",
        to: "/configure/scenes",
      });
    }

    const orphanRooms = config.data.rooms.filter((room) => Object.keys(room.devices).length === 0);
    if (orphanRooms.length > 0) {
      issues.push({
        id: "rooms-orphan",
        level: "warning",
        message: `${orphanRooms.length} room(s) have no devices yet.`,
        actionLabel: "Review Rooms",
        to: "/configure/rooms",
      });
    }

    const blockerCount = issues.filter((issue) => issue.level === "blocker").length;
    const warningCount = issues.filter((issue) => issue.level === "warning").length;
    const health: HealthLevel = blockerCount > 0 ? "bad" : warningCount > 0 ? "warn" : "good";

    const contractRooms = contract.data?.rooms ?? [];

    const roomHierarchy = config.data.rooms.map((room) => {
      const roomContract = contractRooms.find((entry) => entry.id === room.id);
      const joinCounts = {
        digital: roomContract?.joins.digital.length ?? 0,
        analog: roomContract?.joins.analog.length ?? 0,
        serial: roomContract?.joins.serial.length ?? 0,
      };
      const totalJoins = joinCounts.digital + joinCounts.analog + joinCounts.serial;

      const devices = Object.entries(room.devices).map(([id, device]) => ({
        id,
        profileId: device.profileId,
        protocol: device.protocol,
      }));

      return {
        id: room.id,
        name: room.name,
        processorId: room.processorId ?? processors[0].id,
        subsystems: room.subsystems,
        devices,
        joinCounts,
        totalJoins,
        joinRange: `${room.joinOffset + 1}-${room.joinOffset + 100}`,
      };
    });

    return {
      processors: processors.length,
      processorMap: processors,
      rooms,
      roomDevices,
      joins,
      scenes: config.data.scenes.length,
      sources: config.data.sources.length,
      issues,
      blockerCount,
      warningCount,
      health,
      roomHierarchy,
      projectId: config.data.projectId,
      systemName: config.data.system.name,
      processorType: config.data.processor,
    };
  }, [config.data, contract.data]);

  if (config.status === "loading" || contract.status === "loading") {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" />
        <div className="grid">
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
        </div>
      </div>
    );
  }

  if (config.status === "error") {
    return (
      <div className="page-content">
        <h1>Project Overview</h1>
        <div className="card error" role="alert">{config.error}</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="page-content">
        <h1>Project Overview</h1>
        <div className="empty-state">
          <h2>No project data</h2>
          <p>Load or create a project to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>{summary.systemName}</h1>
          <p className="subhead">
            Project {summary.projectId} · {summary.processorType} · {summary.processors} processor(s)
          </p>
        </div>
        <Link to="/configure" className="button primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Open Configure
        </Link>
      </div>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <div className="card stat-card">
          <p className="stat-value">{summary.rooms}</p>
          <p className="stat-label">Rooms</p>
        </div>
        <div className="card stat-card">
          <p className="stat-value">{summary.roomDevices}</p>
          <p className="stat-label">Devices</p>
        </div>
        <div className="card stat-card">
          <p className="stat-value">{summary.joins}</p>
          <p className="stat-label">Room Joins</p>
        </div>
        <div className="card stat-card">
          <p className="stat-value">{summary.sources}</p>
          <p className="stat-label">Sources</p>
        </div>
        <div className="card stat-card">
          <p className="stat-value">{summary.scenes}</p>
          <p className="stat-label">Scenes</p>
        </div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "stretch" }}>
        <div className="card">
          <p className="label">Project Health</p>
          <h2 style={{ marginBottom: 12 }}>
            {summary.health === "bad" ? "Blocked" : summary.health === "warn" ? "Needs Attention" : "Ready to Code"}
          </h2>

          <p className="subhead" style={{ marginBottom: 12 }}>
            {summary.blockerCount} blocker(s), {summary.warningCount} warning(s)
          </p>

          {summary.issues.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {summary.issues.map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: issue.level === "blocker" ? "var(--danger-soft)" : "var(--warning-soft)",
                  }}
                >
                  <span style={{ fontWeight: 600, color: issue.level === "blocker" ? "var(--danger)" : "var(--warning)" }}>
                    {issue.message}
                  </span>
                  <Link to={issue.to} className="button" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
                    {issue.actionLabel}
                  </Link>
                </div>
              ))}
            </div>
          )}

          {summary.issues.length === 0 && (
            <p className="subhead">Configuration baseline is complete. You can proceed to coding and validation.</p>
          )}
        </div>

        <div className="card">
          <p className="label">Next Action</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link to="/configure/studio" className="button" style={{ textDecoration: "none", textAlign: "center" }}>Open SIMPL+ Studio</Link>
            <Link to="/configure/scaffold" className="button" style={{ textDecoration: "none", textAlign: "center" }}>Generate from Tasks</Link>
            <Link to="/configure/rooms" className="button" style={{ textDecoration: "none", textAlign: "center" }}>Assign Room Devices</Link>
            <Link to="/logic" className="button" style={{ textDecoration: "none", textAlign: "center" }}>Open Coding Workspace</Link>
            <Link to="/debug" className="button" style={{ textDecoration: "none", textAlign: "center" }}>Validate Signals</Link>
            <Link to="/configure/deploy" className="button" style={{ textDecoration: "none", textAlign: "center" }}>Deploy to Processor</Link>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="page-header" style={{ marginBottom: 12 }}>
          <div>
            <p className="label">System Hierarchy</p>
            <h2 style={{ margin: 0 }}>Processors → Rooms → Devices / Joins</h2>
          </div>
          <Link to="/configure/rooms" className="button" style={{ textDecoration: "none" }}>
            Edit Rooms
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {summary.processorMap.map((processor) => {
            const procRooms = summary.roomHierarchy.filter((room) => room.processorId === processor.id);

            return (
              <details key={processor.id} open style={{ border: "1px solid var(--border-default)", borderRadius: 12, padding: 10 }}>
                <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--text-heading)" }}>
                  {processor.id} ({processor.processor}) · {procRooms.length} room(s) · {processor.eiscIpId} @ {processor.eiscIpAddress}
                </summary>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                  {procRooms.map((room) => (
                    <div
                      key={room.id}
                      style={{
                        border: "1px solid var(--border-default)",
                        borderRadius: 10,
                        padding: 10,
                        background: "var(--bg-muted)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div>
                          <strong>{room.name}</strong>
                          <span className="subhead" style={{ marginLeft: 8 }}>
                            ({room.id}) · joins {room.joinRange}
                          </span>
                        </div>
                        <Link to={`/configure/rooms/${room.id}`} className="button" style={{ textDecoration: "none" }}>
                          Open Room
                        </Link>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        {room.subsystems.map((sub) => (
                          <span key={sub} className={`pill pill--${sub}`}>{sub}</span>
                        ))}
                      </div>

                      <p className="subhead" style={{ marginBottom: 6 }}>
                        Devices: {room.devices.length} · Joins: {room.totalJoins} (D {room.joinCounts.digital} / A {room.joinCounts.analog} / S {room.joinCounts.serial})
                      </p>

                      {room.devices.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {room.devices.map((device) => (
                            <span key={device.id} className="pill" title={device.profileId}>
                              {device.id} · {device.protocol}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: "var(--warning)", fontWeight: 600 }}>No devices assigned.</p>
                      )}
                    </div>
                  ))}

                  {procRooms.length === 0 && (
                    <p className="subhead" style={{ margin: 0 }}>No rooms assigned to this processor.</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <Link to="/configure/studio" className="card-link">
          <div className="card clickable">
            <h3 style={{ margin: "0 0 4px" }}>SIMPL+ Studio</h3>
            <p className="subhead">Project tree + drag/drop devices + SIMPL+/C# full editor.</p>
          </div>
        </Link>
        <Link to="/configure/scaffold" className="card-link">
          <div className="card clickable">
            <h3 style={{ margin: "0 0 4px" }}>Scaffold from Tasks</h3>
            <p className="subhead">Turn task/spec lists into a generated baseline project draft.</p>
          </div>
        </Link>
        <Link to="/configure" className="card-link">
          <div className="card clickable">
            <h3 style={{ margin: "0 0 4px" }}>Configure Hardware</h3>
            <p className="subhead">Processors, rooms, sources, scenes, and join offsets.</p>
          </div>
        </Link>
        <Link to="/logic" className="card-link">
          <div className="card clickable">
            <h3 style={{ margin: "0 0 4px" }}>Code Logic</h3>
            <p className="subhead">SIMPL+/logic authoring workspace and module iteration.</p>
          </div>
        </Link>
        <Link to="/debug" className="card-link">
          <div className="card clickable">
            <h3 style={{ margin: "0 0 4px" }}>Validate Runtime</h3>
            <p className="subhead">Inspect join activity and verify signal behavior.</p>
          </div>
        </Link>
        <Link to="/configure/deploy" className="card-link">
          <div className="card clickable">
            <h3 style={{ margin: "0 0 4px" }}>Deploy</h3>
            <p className="subhead">Transfer files, verify processor state, and restart program.</p>
          </div>
        </Link>
      </section>
    </div>
  );
}

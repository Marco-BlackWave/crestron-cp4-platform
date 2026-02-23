import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { useJoinContract } from "../hooks/useJoinContract";
import { JoinContractEntry } from "../schema/joinContractSchema";

const subsystemColors: Record<string, string> = {
  av: "av", lighting: "lighting", shades: "shades", hvac: "hvac", security: "security",
};

const protocolColors: Record<string, string> = {
  ir: "ir", serial: "serial-proto", ip: "ip", bacnet: "bacnet", modbus: "modbus",
};

const typeColors: Record<string, string> = { digital: "digital", analog: "analog", serial: "serial" };
const dirColors: Record<string, string> = { input: "input", output: "output" };

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const config = useSystemConfig();
  const contract = useJoinContract();

  const room = useMemo(() =>
    config.data?.rooms.find((r) => r.id === id) ?? null,
    [config.data, id]
  );

  const roomContract = useMemo(() =>
    contract.data?.rooms.find((r) => r.id === id) ?? null,
    [contract.data, id]
  );

  useEffect(() => {
    document.title = room ? `${room.name} — CP4` : "Room — CP4";
  }, [room]);

  // Flatten room joins for the scoped table
  const roomJoins = useMemo(() => {
    if (!roomContract) return [];
    const result: (JoinContractEntry & { type: string })[] = [];
    for (const type of ["digital", "analog", "serial"] as const) {
      for (const entry of roomContract.joins[type]) {
        result.push({ ...entry, type });
      }
    }
    return result.sort((a, b) => a.join - b.join);
  }, [roomContract]);

  // Resolve source names
  const sourceNames = useMemo(() => {
    if (!room || !config.data) return [];
    return room.sources.map((sid) => {
      const src = config.data!.sources.find((s) => s.id === sid);
      return src ? src.name : sid;
    });
  }, [room, config.data]);

  if (config.status === "loading" || contract.status === "loading") {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="page-content">
        <h1>Room Not Found</h1>
        <div className="card error">Room "{id}" does not exist in the system configuration.</div>
        <Link to="/" className="button" style={{ display: "inline-block", marginTop: 16 }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const minJoin = room.joinOffset + 1;
  const maxJoin = room.joinOffset + 100;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="label">{room.id}</p>
          <h1 style={{ margin: "0 0 4px" }}>{room.name}</h1>
          <p className="subhead">
            Join range: {minJoin}–{maxJoin} &middot; Offset: {room.joinOffset}
          </p>
          <div className="badge-row" style={{ marginTop: 8 }}>
            {room.subsystems.map((sub) => (
              <span key={sub} className={`pill pill--${subsystemColors[sub] ?? ""}`}>{sub}</span>
            ))}
          </div>
        </div>
        <Link to="/" className="button">Back</Link>
      </div>

      {/* Subsystem panels */}
      <h2 style={{ marginBottom: 12 }}>Subsystems</h2>
      {room.subsystems.map((sub) => {
        // Find device for this subsystem role
        // Mapping: av→display+audio, lighting→lighting, shades→shades, hvac→hvac, security→security
        const deviceRoles: Record<string, string[]> = {
          av: ["display", "audio"],
          lighting: ["lighting"],
          shades: ["shades"],
          hvac: ["hvac"],
          security: ["security"],
        };
        const roles = deviceRoles[sub] ?? [sub];
        const assignedDevices = roles
          .filter((role) => room.devices[role])
          .map((role) => ({ role, ref: room.devices[role] }));

        return (
          <div key={sub} className="subsystem-panel">
            <h3>
              <span className={`pill pill--${subsystemColors[sub] ?? ""}`}>{sub}</span>
            </h3>
            {assignedDevices.length > 0 ? (
              assignedDevices.map(({ role, ref }) => (
                <div key={role} style={{ marginBottom: 8 }}>
                  <p>
                    <strong style={{ textTransform: "capitalize" }}>{role}:</strong>{" "}
                    <Link to={`/devices/${ref.profileId}`} style={{ color: "#2563eb" }}>
                      {ref.profileId}
                    </Link>
                  </p>
                  <p>
                    Protocol: <span className={`pill pill--${protocolColors[ref.protocol] ?? ""}`}>{ref.protocol}</span>
                    {ref.address && <> &middot; {ref.address}</>}
                    {ref.port && <> &middot; {ref.port}</>}
                    {ref.objectId != null && <> &middot; Object ID: {ref.objectId}</>}
                  </p>
                </div>
              ))
            ) : (
              <p style={{ color: "#94a3b8" }}>No device assigned.</p>
            )}
          </div>
        );
      })}

      {/* Sources */}
      {sourceNames.length > 0 && (
        <>
          <h2 style={{ margin: "24px 0 12px" }}>Sources</h2>
          <div className="badge-row">
            {sourceNames.map((name) => (
              <span key={name} className="pill">{name}</span>
            ))}
          </div>
        </>
      )}

      {/* Scoped join table */}
      <h2 style={{ margin: "24px 0 12px" }}>
        Join Map ({roomJoins.length} signals)
      </h2>
      <section className="card" style={{ overflow: "auto" }}>
        {roomJoins.length === 0 ? (
          <div className="empty-state">
            <h2>No Joins</h2>
            <p>No join contract data available for this room.</p>
          </div>
        ) : (
          <table className="join-table">
            <thead>
              <tr>
                <th>Join</th>
                <th>Name</th>
                <th>Type</th>
                <th>Direction</th>
              </tr>
            </thead>
            <tbody>
              {roomJoins.map((j) => (
                <tr key={`${j.type}-${j.join}`}>
                  <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{j.join}</td>
                  <td>{j.name}</td>
                  <td><span className={`pill pill--${typeColors[j.type] ?? ""}`}>{j.type}</span></td>
                  <td><span className={`pill pill--${dirColors[j.direction] ?? ""}`}>{j.direction}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

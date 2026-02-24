import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router";
import { useDevice } from "../hooks/useDevices";
import { useSystemConfig } from "../hooks/useSystemConfig";

const protocolColors: Record<string, string> = {
  ir: "ir", serial: "serial-proto", ip: "ip", bacnet: "bacnet", modbus: "modbus",
};

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { status, data: device, error } = useDevice(id);
  const config = useSystemConfig();

  useEffect(() => {
    document.title = device ? `${device.manufacturer} ${device.model} — CP4` : "Device — CP4";
  }, [device]);

  // Find rooms using this device
  const usage = useMemo(() => {
    if (!config.data || !id) return [];
    const rooms: { roomId: string; roomName: string; role: string; protocol: string }[] = [];
    for (const room of config.data.rooms) {
      for (const [role, ref] of Object.entries(room.devices)) {
        if (ref.profileId === id) {
          rooms.push({ roomId: room.id, roomName: room.name, role, protocol: ref.protocol });
        }
      }
    }
    return rooms;
  }, [config.data, id]);

  if (status === "loading") {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (status === "error" || !device) {
    return (
      <div className="page-content">
        <h1>Device Not Found</h1>
        <div className="card error" role="alert">{error ?? `Device "${id}" not found.`}</div>
        <Link to="/devices" className="button" style={{ display: "inline-block", marginTop: 16 }}>
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="label">{device.category}</p>
          <h1 style={{ margin: "0 0 4px" }}>{device.manufacturer} {device.model}</h1>
          <div className="badge-row" style={{ marginTop: 8 }}>
            {Object.keys(device.protocols).map((p) => (
              <span key={p} className={`pill pill--${protocolColors[p] ?? ""}`}>{p}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/devices/${id}/edit`} className="button primary">Edit</Link>
          <Link to="/devices" className="button">Back</Link>
        </div>
      </div>

      {/* Capabilities */}
      <h2 style={{ marginBottom: 12 }}>Capabilities</h2>
      <div className="cap-grid" style={{ marginBottom: 24 }}>
        {[
          { key: "discretePower", label: "Discrete Power" },
          { key: "volumeControl", label: "Volume Control" },
          { key: "inputSelect", label: "Input Select" },
          { key: "feedback", label: "Feedback" },
        ].map(({ key, label }) => {
          const val = device.capabilities[key as keyof typeof device.capabilities];
          return (
            <div key={key} className={`cap-item ${val ? "cap--true" : "cap--false"}`}>
              <div className="cap-icon">{val ? "✓" : "—"}</div>
              {label}
            </div>
          );
        })}
        {(device.capabilities.warmupMs ?? 0) > 0 && (
          <div className="cap-item cap--true">
            <div className="cap-icon">⏱</div>
            Warmup: {device.capabilities.warmupMs}ms
          </div>
        )}
        {(device.capabilities.cooldownMs ?? 0) > 0 && (
          <div className="cap-item cap--true">
            <div className="cap-icon">⏱</div>
            Cooldown: {device.capabilities.cooldownMs}ms
          </div>
        )}
      </div>

      {/* Protocol sections */}
      {Object.entries(device.protocols).map(([proto, settings]) => {
        if (!settings || typeof settings !== "object") return null;
        const s = settings as Record<string, unknown>;
        const commands = (s.commands ?? {}) as Record<string, string>;
        const commandEntries = Object.entries(commands);

        return (
          <section key={proto} className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <span className={`pill pill--${protocolColors[proto] ?? ""}`}>{proto}</span>
              Protocol
            </h2>

            {/* Serial settings */}
            {s.baudRate != null && (
              <p style={{ fontSize: 14, color: "#475569", marginBottom: 12 }}>
                {String(s.baudRate)} baud, {String(s.dataBits ?? 8)}/{String(s.parity ?? "N")}/{String(s.stopBits ?? 1)}
              </p>
            )}

            {/* IP settings */}
            {s.port != null && s.baudRate == null && (
              <p style={{ fontSize: 14, color: "#475569", marginBottom: 12 }}>
                Port: {String(s.port)}{s.type ? ` (${String(s.type)})` : ""}
              </p>
            )}

            {/* Driver file */}
            {s.driverFile != null && (
              <p style={{ fontSize: 14, color: "#475569", marginBottom: 12 }}>
                Driver: <code className="mono">{String(s.driverFile)}</code>
              </p>
            )}

            {/* Commands table */}
            {commandEntries.length > 0 ? (
              <table className="command-table">
                <thead>
                  <tr><th>Command</th><th>Value</th></tr>
                </thead>
                <tbody>
                  {commandEntries.map(([cmd, val]) => (
                    <tr key={cmd}>
                      <td>{cmd}</td>
                      <td><code className="mono">{val}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "#94a3b8", fontSize: 14 }}>No commands defined for this protocol.</p>
            )}
          </section>
        );
      })}

      {/* Usage */}
      <h2 style={{ marginBottom: 12 }}>Used In</h2>
      {usage.length > 0 ? (
        <section className="card-grid">
          {usage.map((u) => (
            <Link to={`/rooms/${u.roomId}`} className="card-link" key={`${u.roomId}-${u.role}`}>
              <div className="card clickable">
                <p className="label">{u.role}</p>
                <h3 style={{ margin: "0 0 4px" }}>{u.roomName}</h3>
                <span className={`pill pill--${protocolColors[u.protocol] ?? ""}`}>{u.protocol}</span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="card">
          <p style={{ color: "#94a3b8", margin: 0 }}>Not used in any room.</p>
        </div>
      )}
    </div>
  );
}

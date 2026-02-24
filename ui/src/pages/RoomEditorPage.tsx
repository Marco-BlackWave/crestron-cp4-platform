import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";
import { useDevices } from "../hooks/useDevices";
import type { DeviceRef, Subsystem } from "../schema/systemConfigSchema";
import type { DeviceProfile } from "../schema/deviceProfileSchema";

const ALL_SUBSYSTEMS: Subsystem[] = ["av", "lighting", "shades", "hvac", "security"];

const protocolColors: Record<string, string> = {
  ir: "ir", serial: "serial-proto", ip: "ip", bacnet: "bacnet", modbus: "modbus",
};

/** Given active subsystems, compute which device roles are needed */
function rolesForSubsystems(subsystems: string[]): { role: string; label: string; category: string }[] {
  const roles: { role: string; label: string; category: string }[] = [];
  if (subsystems.includes("av")) {
    roles.push({ role: "display", label: "Display", category: "display" });
    roles.push({ role: "audio", label: "Audio Receiver", category: "receiver" });
    roles.push({ role: "projector", label: "Projector", category: "display" });
    roles.push({ role: "dsp", label: "DSP / Audio Processor", category: "dsp" });
    roles.push({ role: "matrix", label: "Video Matrix Switcher", category: "matrix" });
    roles.push({ role: "media", label: "Media Player", category: "media" });
  }
  if (subsystems.includes("lighting")) {
    roles.push({ role: "lighting", label: "Lighting Controller", category: "lighting" });
  }
  if (subsystems.includes("shades")) {
    roles.push({ role: "shades", label: "Shade Controller", category: "shades" });
  }
  if (subsystems.includes("hvac")) {
    roles.push({ role: "hvac", label: "Thermostat / HVAC", category: "hvac" });
  }
  if (subsystems.includes("security")) {
    roles.push({ role: "security", label: "Security Panel", category: "security" });
  }
  // Infrastructure roles (always available)
  roles.push({ role: "gateway", label: "Gateway / Bridge", category: "gateway" });
  return roles;
}

function DevicePicker({ devices, category, onSelect, onCancel }: {
  devices: DeviceProfile[];
  category: string;
  onSelect: (profile: DeviceProfile, protocol: string) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    let list = devices;
    // Prefer matching category but show all if no exact match
    const catMatches = list.filter((d) => d.category === category);
    if (catMatches.length > 0) list = catMatches;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) => d.manufacturer.toLowerCase().includes(q) || d.model.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 20);
  }, [devices, category, search]);

  return (
    <div className="slide-panel">
      <div className="slide-panel-header">
        <h3 style={{ margin: 0 }}>Select Device</h3>
        <button className="button" onClick={onCancel}>Cancel</button>
      </div>
      <input
        className="search-input"
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Search devices..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      {filtered.length === 0 ? (
        <p className="subhead">No matching devices found.</p>
      ) : (
        <div className="picker-list">
          {filtered.map((d) => (
            <div key={d.id} className="picker-item">
              <div>
                <strong>{d.manufacturer}</strong> — {d.model}
                <div className="badge-row" style={{ marginTop: 4 }}>
                  <span className={`pill pill--${d.category === "display" ? "av" : d.category}`}>{d.category}</span>
                  {Object.keys(d.protocols).map((p) => (
                    <span key={p} className={`pill pill--${protocolColors[p] ?? ""}`}>{p}</span>
                  ))}
                </div>
              </div>
              <div className="picker-item-actions">
                {Object.keys(d.protocols).map((p) => (
                  <button key={p} className="button" onClick={() => onSelect(d, p)}>
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionForm({ protocol, onSave, onCancel }: {
  protocol: string;
  onSave: (conn: Partial<DeviceRef>) => void;
  onCancel: () => void;
}) {
  const [port, setPort] = useState("");
  const [address, setAddress] = useState("");
  const [portNum, setPortNum] = useState("");
  const [objectId, setObjectId] = useState("");

  const handleSave = () => {
    const conn: Partial<DeviceRef> = {};
    if (protocol === "ir" || protocol === "serial") conn.port = port;
    if (protocol === "ip" || protocol === "bacnet" || protocol === "modbus") conn.address = address;
    if (portNum) conn.port = portNum;
    if (objectId) conn.objectId = parseInt(objectId, 10);
    onSave(conn);
  };

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <h4 style={{ margin: "0 0 12px" }}>Connection Settings ({protocol.toUpperCase()})</h4>

      {protocol === "ir" && (
        <div className="form-group">
          <label className="label">IR Port</label>
          <select className="input" value={port} onChange={(e) => setPort(e.target.value)}>
            <option value="">Select port...</option>
            {Array.from({ length: 8 }, (_, i) => `IR-${i + 1}`).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      {protocol === "serial" && (
        <div className="form-group">
          <label className="label">COM Port</label>
          <select className="input" value={port} onChange={(e) => setPort(e.target.value)}>
            <option value="">Select port...</option>
            {Array.from({ length: 6 }, (_, i) => `COM-${i + 1}`).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      {(protocol === "ip" || protocol === "bacnet" || protocol === "modbus" || protocol === "knx" || protocol === "shelly" || protocol === "pjlink") && (
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="label">IP Address</label>
            <input className="input" placeholder="192.168.1.50" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Port (optional)</label>
            <input className="input" type="number" placeholder="23" value={portNum} onChange={(e) => setPortNum(e.target.value)} />
          </div>
        </div>
      )}

      {(protocol === "bacnet" || protocol === "modbus") && (
        <div className="form-group">
          <label className="label">Object/Address ID</label>
          <input className="input" type="number" placeholder="1" value={objectId} onChange={(e) => setObjectId(e.target.value)} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="button" onClick={onCancel}>Cancel</button>
        <button className="button primary" onClick={handleSave}>Assign Device</button>
      </div>
    </div>
  );
}

export default function RoomEditorPage() {
  const { id } = useParams<{ id: string }>();
  const {
    draft, loadStatus, loadFromServer,
    updateRoom, removeRoom, toggleSubsystem,
    assignDevice, removeDevice, toggleRoomSource,
  } = useConfigEditor();
  const { data: devices } = useDevices();

  const [pickerRole, setPickerRole] = useState<string | null>(null);
  const [pickerCategory, setPickerCategory] = useState("");
  const [pendingDevice, setPendingDevice] = useState<{ profileId: string; protocol: string; role: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [customRole, setCustomRole] = useState("");

  useEffect(() => { document.title = `Room Editor — CP4`; }, []);

  useEffect(() => {
    if (!draft && loadStatus === "idle") loadFromServer();
  }, [draft, loadStatus, loadFromServer]);

  const room = useMemo(() => draft?.rooms.find((r) => r.id === id), [draft, id]);

  useEffect(() => {
    if (room) setNameValue(room.name);
  }, [room]);

  if (!draft || !room) {
    return (
      <div>
        <Link to="/configure/rooms">&larr; Back to Rooms</Link>
        <h2>Room not found</h2>
      </div>
    );
  }

  const isTechnical = room.roomType === "technical";
  const roles = isTechnical ? [] : rolesForSubsystems(room.subsystems);
  // For technical rooms, show existing devices by their role key
  const technicalDeviceKeys = isTechnical ? Object.keys(room.devices) : [];

  const handleDeviceSelect = (profile: DeviceProfile, protocol: string) => {
    if (!pickerRole) return;
    setPendingDevice({ profileId: profile.id, protocol, role: pickerRole });
    setPickerRole(null);
  };

  const handleConnectionSave = (conn: Partial<DeviceRef>) => {
    if (!pendingDevice) return;
    assignDevice(room.id, pendingDevice.role, {
      profileId: pendingDevice.profileId,
      protocol: pendingDevice.protocol as DeviceRef["protocol"],
      ...conn,
    });
    setPendingDevice(null);
  };

  const handleNameSave = () => {
    if (nameValue.trim() && nameValue.trim() !== room.name) {
      updateRoom(room.id, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  return (
    <div>
      <Link to="/configure/rooms" style={{ display: "inline-block", marginBottom: 16, color: "#2563eb", textDecoration: "none" }}>
        &larr; Back to Rooms
      </Link>

      <div className="help-text">
        Each room is allocated <strong>100 joins</strong> (digital, analog, and serial) starting at the room's offset.
        Toggle <strong>subsystems</strong> to define room capabilities. Each subsystem adds device roles and join signals.
      </div>

      <div className="page-header">
        <div style={{ flex: 1 }}>
          {editingName ? (
            <div className="form-row" style={{ marginBottom: 0 }}>
              <input
                className="input"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                onBlur={handleNameSave}
                autoFocus
              />
              <button className="button primary" onClick={handleNameSave}>Save</button>
            </div>
          ) : (
            <h1 onClick={() => setEditingName(true)} style={{ cursor: "pointer" }} title="Click to edit">
              {room.name}
            </h1>
          )}
          <p className="subhead">
            <code>{room.id}</code> — Joins {room.joinOffset + 1}–{room.joinOffset + 100}
          </p>
        </div>
      </div>

      {/* Processor Assignment */}
      {(draft.system.processors?.length ?? 0) > 1 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Processor</h2>
          <select
            className="input"
            style={{ maxWidth: 300 }}
            value={room.processorId ?? ""}
            onChange={(e) => updateRoom(room.id, { processorId: e.target.value } as never)}
          >
            {(draft.system.processors ?? []).map((proc) => (
              <option key={proc.id} value={proc.id}>
                {proc.id} ({proc.processor}) — EISC {proc.eiscIpId}
              </option>
            ))}
          </select>
        </section>
      )}

      {/* Subsystems */}
      {isTechnical ? (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>
            Room Type <span className="pill pill--technical" style={{ marginLeft: 8 }}>Equipment</span>
          </h2>
          <p className="subhead">Equipment room — no subsystems. Devices are assigned by custom role.</p>
        </section>
      ) : (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Subsystems</h2>
          <div className="badge-row">
            {ALL_SUBSYSTEMS.map((sub) => (
              <button
                key={sub}
                className={`pill pill--${sub} ${room.subsystems.includes(sub) ? "pill--checked" : "pill--unchecked"}`}
                onClick={() => toggleSubsystem(room.id, sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Devices */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Devices</h2>
        {isTechnical ? (
          <>
            {technicalDeviceKeys.length > 0 && (
              <div className="card-grid">
                {technicalDeviceKeys.map((roleKey) => {
                  const device = room.devices[roleKey];
                  return (
                    <div key={roleKey} className="card">
                      <p className="label">{roleKey}</p>
                      <h3 style={{ margin: "0 0 4px" }}>{device.profileId}</h3>
                      <div className="badge-row" style={{ marginBottom: 8 }}>
                        <span className={`pill pill--${protocolColors[device.protocol] ?? ""}`}>{device.protocol}</span>
                        {device.port && <span className="pill">{device.port}</span>}
                        {device.address && <span className="pill">{device.address}</span>}
                      </div>
                      <button className="button" onClick={() => removeDevice(room.id, roleKey)} style={{ fontSize: 13 }}>
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="form-row" style={{ marginTop: 12, maxWidth: 400 }}>
              <input
                className="input"
                placeholder="Custom role name (e.g. network-switch)"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
              />
              <button
                className="button primary"
                disabled={!customRole.trim()}
                onClick={() => { setPickerRole(customRole.trim()); setPickerCategory(""); setCustomRole(""); }}
              >
                Assign
              </button>
            </div>
          </>
        ) : roles.length === 0 ? (
          <p className="subhead">Enable subsystems above to see device roles.</p>
        ) : (
          <div>
            {roles.map(({ role: baseRole, label, category }) => {
              // Find all device keys matching this base role: "display", "display-2", "display-3", etc.
              const matchingKeys = Object.keys(room.devices).filter(
                (k) => k === baseRole || k.startsWith(`${baseRole}-`)
              );
              const nextKey = matchingKeys.length === 0
                ? baseRole
                : `${baseRole}-${matchingKeys.length + 1}`;

              return (
                <div key={baseRole} style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>
                    {label}
                    {matchingKeys.length > 1 && (
                      <span className="pill" style={{ marginLeft: 8, fontSize: 11 }}>
                        {matchingKeys.length}
                      </span>
                    )}
                  </h3>
                  <div className="card-grid">
                    {matchingKeys.map((roleKey) => {
                      const device = room.devices[roleKey];
                      return (
                        <div key={roleKey} className="card">
                          <p className="label">{roleKey}</p>
                          <h3 style={{ margin: "0 0 4px" }}>{device.profileId}</h3>
                          <div className="badge-row" style={{ marginBottom: 8 }}>
                            <span className={`pill pill--${protocolColors[device.protocol] ?? ""}`}>{device.protocol}</span>
                            {device.port && <span className="pill">{device.port}</span>}
                            {device.address && <span className="pill">{device.address}</span>}
                          </div>
                          <button className="button" onClick={() => removeDevice(room.id, roleKey)} style={{ fontSize: 13 }}>
                            Remove
                          </button>
                        </div>
                      );
                    })}
                    {/* Show "Assign" button for first device if none, or "Add Another" if some exist */}
                    <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 100 }}>
                      <button
                        className="button primary"
                        onClick={() => {
                          const key = matchingKeys.length === 0 ? baseRole : nextKey;
                          setPickerRole(key);
                          setPickerCategory(category);
                        }}
                      >
                        {matchingKeys.length === 0 ? "Assign Device" : `+ Add ${label}`}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Device Picker Panel */}
      {pickerRole && (
        <DevicePicker
          devices={devices}
          category={pickerCategory}
          onSelect={handleDeviceSelect}
          onCancel={() => setPickerRole(null)}
        />
      )}

      {/* Connection Form */}
      {pendingDevice && (
        <ConnectionForm
          protocol={pendingDevice.protocol}
          onSave={handleConnectionSave}
          onCancel={() => setPendingDevice(null)}
        />
      )}

      {/* Sources */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Sources</h2>
        {draft.sources.length === 0 ? (
          <p className="subhead">
            No sources defined. <Link to="/configure/sources">Add sources</Link> first.
          </p>
        ) : (
          <div className="badge-row" style={{ gap: 8 }}>
            {draft.sources.map((src) => {
              const active = room.sources.includes(src.id);
              return (
                <button
                  key={src.id}
                  className={`pill ${active ? "pill--checked pill--input" : "pill--unchecked"}`}
                  onClick={() => toggleRoomSource(room.id, src.id)}
                >
                  {src.name}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

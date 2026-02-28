import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { loadDevice } from "../api/loadDevices";
import { createDevice, updateDevice, cloneDevice, deleteDevice } from "../api/saveDevice";
import { useSystemConfig } from "../hooks/useSystemConfig";
import JsonEditor from "../components/JsonEditor";

const CATEGORIES = [
  "display", "audio", "receiver", "lighting", "shades", "hvac",
  "security", "matrix", "dsp", "media", "gateway",
];

const PROTOCOLS = ["ir", "serial", "ip", "bacnet", "modbus", "knx", "artnet", "shelly", "pjlink"];

const PROTOCOL_META: Record<string, { label: string; color: string; icon: string }> = {
  ir:      { label: "Infrared",   color: "#7c3aed", icon: "IR" },
  serial:  { label: "RS-232",     color: "#0d9488", icon: "RS" },
  ip:      { label: "TCP/IP",     color: "#2563eb", icon: "IP" },
  bacnet:  { label: "BACnet",     color: "#ca8a04", icon: "BA" },
  modbus:  { label: "Modbus",     color: "#be185d", icon: "MB" },
  knx:     { label: "KNX",        color: "#059669", icon: "KX" },
  artnet:  { label: "Art-Net",    color: "#7c3aed", icon: "AN" },
  shelly:  { label: "Shelly",     color: "#2563eb", icon: "SH" },
  pjlink:  { label: "PJLink",     color: "#dc2626", icon: "PJ" },
};

const CATEGORY_ICONS: Record<string, string> = {
  display: "TV", audio: "AU", receiver: "RX", lighting: "LT",
  shades: "SH", hvac: "HC", security: "SC", matrix: "MX",
  dsp: "DS", media: "MD", gateway: "GW",
};

interface CommandEntry {
  name: string;
  value: string;
}

interface ProtocolState {
  enabled: boolean;
  commands: CommandEntry[];
  port?: string;
  delimiter?: string;
  baudRate?: string;
  dataBits?: string;
  parity?: string;
  stopBits?: string;
  driverFile?: string;
  type?: string;
}

function emptyProtocolState(): ProtocolState {
  return { enabled: false, commands: [] };
}

export default function DeviceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const config = useSystemConfig();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<"form" | "json">("form");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [expandedProto, setExpandedProto] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Form state
  const [deviceId, setDeviceId] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("display");
  const [sourceModule, setSourceModule] = useState("");
  const [discretePower, setDiscretePower] = useState(false);
  const [volumeControl, setVolumeControl] = useState(false);
  const [inputSelect, setInputSelect] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [warmupMs, setWarmupMs] = useState("");
  const [cooldownMs, setCooldownMs] = useState("");
  const [protocols, setProtocols] = useState<Record<string, ProtocolState>>(
    Object.fromEntries(PROTOCOLS.map((p) => [p, emptyProtocolState()]))
  );

  useEffect(() => {
    document.title = isNew ? "New Device — CP4" : `Edit Device — CP4`;
  }, [isNew]);

  // Auto-clear success message
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  // Load device data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadDevice(id)
      .then((profile) => {
        setDeviceId(profile.id);
        setManufacturer(profile.manufacturer);
        setModel(profile.model);
        setCategory(profile.category);
        setSourceModule(profile.sourceModule ?? "");
        setDiscretePower(profile.capabilities.discretePower);
        setVolumeControl(profile.capabilities.volumeControl);
        setInputSelect(profile.capabilities.inputSelect);
        setFeedback(profile.capabilities.feedback);
        setWarmupMs(profile.capabilities.warmupMs?.toString() ?? "");
        setCooldownMs(profile.capabilities.cooldownMs?.toString() ?? "");

        const protoState: Record<string, ProtocolState> = {};
        for (const p of PROTOCOLS) {
          const existing = profile.protocols[p as keyof typeof profile.protocols];
          if (existing && typeof existing === "object") {
            const e = existing as Record<string, unknown>;
            const commands = e.commands
              ? Object.entries(e.commands as Record<string, string>).map(([name, value]) => ({ name, value }))
              : [];
            protoState[p] = {
              enabled: true,
              commands,
              port: e.port?.toString(),
              baudRate: e.baudRate?.toString(),
              dataBits: e.dataBits?.toString(),
              parity: e.parity?.toString(),
              stopBits: e.stopBits?.toString(),
              driverFile: e.driverFile?.toString(),
              type: e.type?.toString(),
            };
          } else {
            protoState[p] = emptyProtocolState();
          }
        }
        setProtocols(protoState);
        // Auto-expand first enabled protocol
        const firstEnabled = PROTOCOLS.find(p => protoState[p]?.enabled);
        if (firstEnabled) setExpandedProto(firstEnabled);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Room usage
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

  const enabledProtocols = PROTOCOLS.filter(p => protocols[p]?.enabled);
  const cmdTotal = enabledProtocols.reduce((sum, p) => sum + (protocols[p]?.commands.length ?? 0), 0);

  const buildProfile = () => {
    const protoObj: Record<string, unknown> = {};
    for (const [p, state] of Object.entries(protocols)) {
      if (!state.enabled) continue;
      const commands: Record<string, string> = {};
      for (const c of state.commands) {
        if (c.name.trim()) commands[c.name.trim()] = c.value;
      }
      const entry: Record<string, unknown> = {};
      if (Object.keys(commands).length > 0) entry.commands = commands;
      if (state.port) entry.port = parseInt(state.port, 10) || state.port;
      if (state.baudRate) entry.baudRate = parseInt(state.baudRate, 10);
      if (state.dataBits) entry.dataBits = parseInt(state.dataBits, 10);
      if (state.parity) entry.parity = state.parity;
      if (state.stopBits) entry.stopBits = parseInt(state.stopBits, 10);
      if (state.driverFile) entry.driverFile = state.driverFile;
      if (state.type) entry.type = state.type;
      protoObj[p] = entry;
    }

    const profile: Record<string, unknown> = {
      id: deviceId.trim(),
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      category,
      protocols: protoObj,
      capabilities: {
        discretePower,
        volumeControl,
        inputSelect,
        feedback,
        ...(warmupMs ? { warmupMs: parseInt(warmupMs, 10) } : {}),
        ...(cooldownMs ? { cooldownMs: parseInt(cooldownMs, 10) } : {}),
      },
    };
    if (sourceModule.trim()) profile.sourceModule = sourceModule.trim();
    return profile;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      let profile;
      if (mode === "json") {
        profile = JSON.parse(jsonText);
      } else {
        profile = buildProfile();
      }
      if (!profile.id || !profile.manufacturer || !profile.model) {
        throw new Error("ID, manufacturer, and model are required.");
      }
      if (isNew) {
        await createDevice(profile);
        setSuccess("Device created successfully.");
        navigate(`/devices/${profile.id}/edit`, { replace: true });
      } else {
        await updateDevice(id!, profile);
        setSuccess("Changes saved.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (!id) return;
    try {
      const result = await cloneDevice(id) as { id?: string };
      if (result.id) navigate(`/devices/${result.id}/edit`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Clone failed.");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteDevice(id);
      navigate("/devices");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const toggleProtocol = (p: string) => {
    setProtocols((prev) => {
      const next = { ...prev, [p]: { ...prev[p], enabled: !prev[p].enabled } };
      // Auto-expand when enabling
      if (!prev[p].enabled) setExpandedProto(p);
      return next;
    });
  };

  const addCommand = (p: string) => {
    setProtocols((prev) => ({
      ...prev,
      [p]: { ...prev[p], commands: [...prev[p].commands, { name: "", value: "" }] },
    }));
  };

  const updateCommand = (p: string, idx: number, field: "name" | "value", val: string) => {
    setProtocols((prev) => ({
      ...prev,
      [p]: {
        ...prev[p],
        commands: prev[p].commands.map((c, i) => i === idx ? { ...c, [field]: val } : c),
      },
    }));
  };

  const removeCommand = (p: string, idx: number) => {
    setProtocols((prev) => ({
      ...prev,
      [p]: { ...prev[p], commands: prev[p].commands.filter((_, i) => i !== idx) },
    }));
  };

  const updateProtoField = (p: string, field: string, val: string) => {
    setProtocols((prev) => ({ ...prev, [p]: { ...prev[p], [field]: val } }));
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" />
        <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
          <div className="skeleton" style={{ height: 200, flex: 2, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 200, flex: 1, borderRadius: 12 }} />
        </div>
        <div className="skeleton" style={{ height: 300, marginTop: 16, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="de-header">
        <div className="de-header__left">
          <Link to="/devices" className="de-back">Device Library</Link>
          <span className="de-back-sep">/</span>
          <span className="de-back-current">{isNew ? "New Device" : deviceId}</span>
        </div>
        <div className="de-header__actions">
          <div className="mode-toggle">
            <button
              className={`mode-toggle__btn${mode === "form" ? " mode-toggle__btn--active" : ""}`}
              onClick={() => setMode("form")}
            >Form</button>
            <button
              className={`mode-toggle__btn${mode === "json" ? " mode-toggle__btn--active" : ""}`}
              onClick={() => {
                setJsonText(JSON.stringify(buildProfile(), null, 2));
                setJsonError(null);
                setMode("json");
              }}
            >JSON</button>
          </div>
          {!isNew && (
            <button className="button" onClick={handleClone}>Clone</button>
          )}
          <button
            className="button primary"
            onClick={handleSave}
            disabled={saving || (mode === "json" && !!jsonError)}
          >
            {saving ? "Saving..." : isNew ? "Create Device" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Toast messages ── */}
      {success && <div className="de-toast de-toast--success">{success}</div>}
      {error && <div className="de-toast de-toast--error">{error} <button onClick={() => setError(null)} className="de-toast__close">x</button></div>}

      {mode === "json" ? (
        /* ── JSON mode ── */
        <div className="de-json-wrap">
          <JsonEditor
            value={jsonText}
            onChange={(v) => setJsonText(v)}
            onValidationError={setJsonError}
            height="600px"
          />
          {jsonError && (
            <div className="de-json-error">{jsonError}</div>
          )}
        </div>
      ) : (
        /* ── Form mode ── */
        <>
          {/* ── Identity + Summary row ── */}
          <div className="de-top-row">
            <div className="de-identity card">
              <div className="de-identity__icon" style={{ background: getCategoryColor(category) }}>
                {CATEGORY_ICONS[category] ?? "DV"}
              </div>
              <div className="de-identity__fields">
                <h2 className="de-identity__title">
                  {isNew ? "New Device" : `${manufacturer || "Device"} ${model || ""}`}
                </h2>
                <div className="de-form-grid">
                  <div className="de-field">
                    <label className="de-label">Device ID</label>
                    <input
                      className="de-input"
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                      disabled={!isNew}
                      placeholder="manufacturer-model"
                    />
                  </div>
                  <div className="de-field">
                    <label className="de-label">Category</label>
                    <select className="de-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="de-field">
                    <label className="de-label">Manufacturer</label>
                    <input className="de-input" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Sony" />
                  </div>
                  <div className="de-field">
                    <label className="de-label">Model</label>
                    <input className="de-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="XBR-65X900H" />
                  </div>
                  <div className="de-field de-field--full">
                    <label className="de-label">SIMPL+ Module</label>
                    <input className="de-input" value={sourceModule} onChange={(e) => setSourceModule(e.target.value)} placeholder="Optional .usp file name" />
                  </div>
                </div>
              </div>
            </div>

            <div className="de-summary card">
              <h3 className="de-section-title">Quick Stats</h3>
              <div className="de-stat-grid">
                <div className="de-stat">
                  <span className="de-stat__value">{enabledProtocols.length}</span>
                  <span className="de-stat__label">Protocols</span>
                </div>
                <div className="de-stat">
                  <span className="de-stat__value">{cmdTotal}</span>
                  <span className="de-stat__label">Commands</span>
                </div>
                <div className="de-stat">
                  <span className="de-stat__value">{[discretePower, volumeControl, inputSelect, feedback].filter(Boolean).length}</span>
                  <span className="de-stat__label">Capabilities</span>
                </div>
                <div className="de-stat">
                  <span className="de-stat__value">{usage.length}</span>
                  <span className="de-stat__label">Rooms</span>
                </div>
              </div>
              {usage.length > 0 && (
                <div className="de-usage-list">
                  {usage.map(u => (
                    <Link key={`${u.roomId}-${u.role}`} to={`/rooms/${u.roomId}`} className="de-usage-item">
                      {u.roomName} <span className="de-usage-role">{u.role}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Capabilities ── */}
          <div className="card de-section">
            <h3 className="de-section-title">Capabilities</h3>
            <div className="de-caps-grid">
              {([
                { key: "discretePower", label: "Discrete Power", desc: "Separate ON/OFF commands", val: discretePower, set: setDiscretePower },
                { key: "volumeControl", label: "Volume Control", desc: "Analog level control", val: volumeControl, set: setVolumeControl },
                { key: "inputSelect", label: "Input Select", desc: "Source switching", val: inputSelect, set: setInputSelect },
                { key: "feedback", label: "Feedback", desc: "Device reports state", val: feedback, set: setFeedback },
              ] as const).map(({ key, label, desc, val, set }) => (
                <button
                  key={key}
                  type="button"
                  className={`de-cap-card${val ? " de-cap-card--active" : ""}`}
                  onClick={() => set(!val)}
                >
                  <span className="de-cap-card__check">{val ? "\u2713" : ""}</span>
                  <span className="de-cap-card__label">{label}</span>
                  <span className="de-cap-card__desc">{desc}</span>
                </button>
              ))}
            </div>
            <div className="de-form-grid" style={{ marginTop: 16, maxWidth: 400 }}>
              <div className="de-field">
                <label className="de-label">Warmup (ms)</label>
                <input className="de-input" type="number" value={warmupMs} onChange={(e) => setWarmupMs(e.target.value)} placeholder="0" />
              </div>
              <div className="de-field">
                <label className="de-label">Cooldown (ms)</label>
                <input className="de-input" type="number" value={cooldownMs} onChange={(e) => setCooldownMs(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          {/* ── Protocols ── */}
          <div className="card de-section">
            <h3 className="de-section-title">Protocols &amp; Commands</h3>
            <p className="de-section-hint">Select which protocols this device supports, then add commands for each.</p>

            {/* Protocol toggle pills */}
            <div className="de-proto-toggles">
              {PROTOCOLS.map((p) => {
                const meta = PROTOCOL_META[p];
                const enabled = protocols[p]?.enabled;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`de-proto-pill${enabled ? " de-proto-pill--active" : ""}`}
                    style={enabled ? { borderColor: meta.color, color: meta.color } : {}}
                    onClick={() => toggleProtocol(p)}
                  >
                    <span className="de-proto-pill__icon" style={enabled ? { background: meta.color } : {}}>
                      {meta.icon}
                    </span>
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Expanded protocol cards */}
            {enabledProtocols.length === 0 && (
              <p className="de-empty-hint">No protocols enabled. Click a protocol above to add it.</p>
            )}

            {enabledProtocols.map(p => {
              const meta = PROTOCOL_META[p];
              const state = protocols[p];
              const isExpanded = expandedProto === p;

              return (
                <div key={p} className="de-proto-card" style={{ borderLeftColor: meta.color }}>
                  <button
                    type="button"
                    className="de-proto-card__header"
                    onClick={() => setExpandedProto(isExpanded ? null : p)}
                  >
                    <span className="de-proto-card__icon" style={{ background: meta.color }}>{meta.icon}</span>
                    <span className="de-proto-card__title">{meta.label}</span>
                    <span className="de-proto-card__count">{state.commands.length} cmd{state.commands.length !== 1 ? "s" : ""}</span>
                    <span className={`de-proto-card__chevron${isExpanded ? " de-proto-card__chevron--open" : ""}`}>
                      {"\u25B6"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="de-proto-card__body">
                      {/* Protocol-specific settings */}
                      <div className="de-proto-settings">
                        {(p === "ir") && (
                          <div className="de-field">
                            <label className="de-label">IR Driver File</label>
                            <input className="de-input" value={state.driverFile ?? ""} onChange={(e) => updateProtoField(p, "driverFile", e.target.value)} placeholder="Sony_XBR.ir" />
                          </div>
                        )}
                        {(p === "serial") && (
                          <div className="de-form-grid">
                            <div className="de-field">
                              <label className="de-label">Baud Rate</label>
                              <select className="de-input" value={state.baudRate ?? "9600"} onChange={(e) => updateProtoField(p, "baudRate", e.target.value)}>
                                {["1200", "2400", "4800", "9600", "19200", "38400", "57600", "115200"].map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                            </div>
                            <div className="de-field">
                              <label className="de-label">Data Bits</label>
                              <select className="de-input" value={state.dataBits ?? "8"} onChange={(e) => updateProtoField(p, "dataBits", e.target.value)}>
                                {["7", "8"].map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <div className="de-field">
                              <label className="de-label">Parity</label>
                              <select className="de-input" value={state.parity ?? "none"} onChange={(e) => updateProtoField(p, "parity", e.target.value)}>
                                {["none", "odd", "even"].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div className="de-field">
                              <label className="de-label">Stop Bits</label>
                              <select className="de-input" value={state.stopBits ?? "1"} onChange={(e) => updateProtoField(p, "stopBits", e.target.value)}>
                                {["1", "2"].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                        )}
                        {(["ip", "bacnet", "modbus", "pjlink"].includes(p)) && (
                          <div className="de-form-grid" style={{ maxWidth: 400 }}>
                            <div className="de-field">
                              <label className="de-label">Default Port</label>
                              <input className="de-input" type="number" value={state.port ?? ""} onChange={(e) => updateProtoField(p, "port", e.target.value)} placeholder="23" />
                            </div>
                            {(p === "ip") && (
                              <div className="de-field">
                                <label className="de-label">Type</label>
                                <select className="de-input" value={state.type ?? "tcp"} onChange={(e) => updateProtoField(p, "type", e.target.value)}>
                                  {["tcp", "udp"].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Command table */}
                      <div className="de-cmd-section">
                        <div className="de-cmd-header">
                          <span className="de-label">Commands</span>
                          <button type="button" className="button" style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => addCommand(p)}>
                            + Add
                          </button>
                        </div>

                        {state.commands.length === 0 ? (
                          <p className="de-empty-hint" style={{ margin: "8px 0" }}>
                            No commands yet. Click "+ Add" to define commands.
                          </p>
                        ) : (
                          <div className="de-cmd-table">
                            <div className="de-cmd-row de-cmd-row--header">
                              <span>Command Name</span>
                              <span>Value / Hex String</span>
                              <span></span>
                            </div>
                            {state.commands.map((cmd, idx) => (
                              <div key={idx} className="de-cmd-row">
                                <input
                                  className="de-input"
                                  placeholder="powerOn"
                                  value={cmd.name}
                                  onChange={(e) => updateCommand(p, idx, "name", e.target.value)}
                                />
                                <input
                                  className="de-input de-input--mono"
                                  placeholder="\\xFF\\x30..."
                                  value={cmd.value}
                                  onChange={(e) => updateCommand(p, idx, "value", e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="de-cmd-remove"
                                  onClick={() => removeCommand(p, idx)}
                                  title="Remove command"
                                >
                                  x
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Danger Zone ── */}
          {!isNew && (
            <div className="card de-section de-danger-zone">
              <h3 className="de-section-title" style={{ color: "#dc2626" }}>Danger Zone</h3>
              {!confirmDelete ? (
                <button className="button danger" onClick={() => setConfirmDelete(true)}>
                  Delete Device Profile
                </button>
              ) : (
                <div className="de-confirm-delete">
                  <p>Are you sure you want to delete <strong>{deviceId}</strong>? This cannot be undone.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="button danger" onClick={handleDelete}>Yes, Delete</button>
                    <button className="button" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getCategoryColor(cat: string): string {
  const colors: Record<string, string> = {
    display: "#2563eb", audio: "#7c3aed", receiver: "#0d9488",
    lighting: "#d97706", shades: "#059669", hvac: "#ea580c",
    security: "#dc2626", matrix: "#2563eb", dsp: "#7c3aed",
    media: "#0d9488", gateway: "#ca8a04",
  };
  return colors[cat] ?? "#64748b";
}

import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { loadDevice } from "../api/loadDevices";
import { createDevice, updateDevice, cloneDevice, deleteDevice } from "../api/saveDevice";
import JsonEditor from "../components/JsonEditor";

const CATEGORIES = ["display", "receiver", "lighting", "shades", "hvac", "security", "matrix", "dsp", "media", "gateway"];
const PROTOCOLS = ["ir", "serial", "ip", "bacnet", "modbus", "knx", "artnet", "shelly", "pjlink"];

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
  driverFile?: string;
}

function emptyProtocolState(): ProtocolState {
  return { enabled: false, commands: [] };
}

export default function DeviceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<"form" | "json">("form");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Form state
  const [deviceId, setDeviceId] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("display");
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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadDevice(id)
      .then((profile) => {
        setDeviceId(profile.id);
        setManufacturer(profile.manufacturer);
        setModel(profile.model);
        setCategory(profile.category);
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
              driverFile: e.driverFile?.toString(),
            };
          } else {
            protoState[p] = emptyProtocolState();
          }
        }
        setProtocols(protoState);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

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
      if (state.driverFile) entry.driverFile = state.driverFile;
      protoObj[p] = entry;
    }

    return {
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
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const profile = buildProfile();
      if (!profile.id || !profile.manufacturer || !profile.model) {
        throw new Error("ID, manufacturer, and model are required.");
      }
      if (isNew) {
        await createDevice(profile);
        setSuccess("Device created.");
        navigate(`/devices/${profile.id}/edit`, { replace: true });
      } else {
        await updateDevice(id!, profile);
        setSuccess("Device saved.");
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
      if (result.id) {
        navigate(`/devices/${result.id}/edit`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Clone failed.");
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Delete this device profile?")) return;
    try {
      await deleteDevice(id);
      navigate("/devices");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const toggleProtocol = (p: string) => {
    setProtocols((prev) => ({
      ...prev,
      [p]: { ...prev[p], enabled: !prev[p].enabled },
    }));
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
        commands: prev[p].commands.map((c, i) =>
          i === idx ? { ...c, [field]: val } : c
        ),
      },
    }));
  };

  const removeCommand = (p: string, idx: number) => {
    setProtocols((prev) => ({
      ...prev,
      [p]: {
        ...prev[p],
        commands: prev[p].commands.filter((_, i) => i !== idx),
      },
    }));
  };

  const updateProtoField = (p: string, field: string, val: string) => {
    setProtocols((prev) => ({
      ...prev,
      [p]: { ...prev[p], [field]: val },
    }));
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>{isNew ? "Create Device Profile" : "Edit Device Profile"}</h1>
          <p className="subhead">{isNew ? "Define a new device for the library" : deviceId}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
          <Link to="/devices" className="button">Back to Library</Link>
        </div>
      </div>

      {error && <div className="card error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <p style={{ color: "#059669", fontWeight: 600, marginBottom: 16 }}>{success}</p>}

      {mode === "json" ? (
        <div className="card" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
          <JsonEditor
            value={jsonText}
            onChange={(v) => setJsonText(v)}
            onValidationError={setJsonError}
            height="500px"
          />
          {jsonError && (
            <div style={{ padding: "8px 12px", background: "rgba(220,38,38,0.06)", color: "#dc2626", fontSize: 13 }}>
              {jsonError}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Basic info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16 }}>Basic Info</h2>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Device ID</label>
            <input className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} disabled={!isNew} placeholder="sony-xbr-65x900h" />
            {isNew && <p className="form-hint">Slug format, e.g. sony-xbr-65x900h</p>}
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Manufacturer</label>
            <input className="input" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Sony" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Model</label>
            <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="XBR-65X900H" />
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16 }}>Capabilities</h2>
        <div className="cap-grid">
          {[
            { key: "discretePower", label: "Discrete Power", val: discretePower, set: setDiscretePower },
            { key: "volumeControl", label: "Volume Control", val: volumeControl, set: setVolumeControl },
            { key: "inputSelect", label: "Input Select", val: inputSelect, set: setInputSelect },
            { key: "feedback", label: "Feedback", val: feedback, set: setFeedback },
          ].map(({ key, label, val, set }) => (
            <div
              key={key}
              className={`cap-item ${val ? "cap--true" : "cap--false"}`}
              style={{ cursor: "pointer" }}
              onClick={() => set(!val)}
            >
              <div className="cap-icon">{val ? "\u2713" : "\u2014"}</div>
              {label}
            </div>
          ))}
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Warmup (ms)</label>
            <input className="input" type="number" value={warmupMs} onChange={(e) => setWarmupMs(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Cooldown (ms)</label>
            <input className="input" type="number" value={cooldownMs} onChange={(e) => setCooldownMs(e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>

      {/* Protocols */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16 }}>Protocols</h2>
        <div className="badge-row" style={{ marginBottom: 16 }}>
          {PROTOCOLS.map((p) => (
            <button
              key={p}
              className={`pill ${protocols[p].enabled ? "pill--checked pill--ip" : "pill--unchecked"}`}
              onClick={() => toggleProtocol(p)}
              type="button"
            >
              {p}
            </button>
          ))}
        </div>

        {PROTOCOLS.filter((p) => protocols[p].enabled).map((p) => (
          <div key={p} className="protocol-section">
            <h3 style={{ margin: "0 0 12px", fontSize: 14, textTransform: "uppercase" }}>{p} Protocol</h3>

            {(p === "ip" || p === "bacnet" || p === "modbus" || p === "pjlink") && (
              <div className="form-group">
                <label className="label">Default Port</label>
                <input className="input" type="number" value={protocols[p].port ?? ""} onChange={(e) => updateProtoField(p, "port", e.target.value)} placeholder="23" style={{ maxWidth: 200 }} />
              </div>
            )}

            {p === "serial" && (
              <div className="form-group">
                <label className="label">Baud Rate</label>
                <input className="input" type="number" value={protocols[p].baudRate ?? ""} onChange={(e) => updateProtoField(p, "baudRate", e.target.value)} placeholder="9600" style={{ maxWidth: 200 }} />
              </div>
            )}

            {p === "ir" && (
              <div className="form-group">
                <label className="label">Driver File</label>
                <input className="input" value={protocols[p].driverFile ?? ""} onChange={(e) => updateProtoField(p, "driverFile", e.target.value)} placeholder="Sony XBR-65.ir" style={{ maxWidth: 300 }} />
              </div>
            )}

            <label className="label" style={{ marginTop: 8 }}>Commands</label>
            {protocols[p].commands.map((cmd, idx) => (
              <div key={idx} className="command-editor-row">
                <input className="input" placeholder="Command name" value={cmd.name} onChange={(e) => updateCommand(p, idx, "name", e.target.value)} />
                <input className="input" placeholder="Command value" value={cmd.value} onChange={(e) => updateCommand(p, idx, "value", e.target.value)} />
                <button className="button" onClick={() => removeCommand(p, idx)} style={{ fontSize: 12, padding: "6px 10px" }}>X</button>
              </div>
            ))}
            <button className="button" onClick={() => addCommand(p)} style={{ fontSize: 12, marginTop: 4 }}>+ Add Command</button>
          </div>
        ))}
      </div>

      </>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="button primary" onClick={() => {
          if (mode === "json") {
            try {
              const parsed = JSON.parse(jsonText);
              setDeviceId(parsed.id ?? "");
              setManufacturer(parsed.manufacturer ?? "");
              setModel(parsed.model ?? "");
              setCategory(parsed.category ?? "display");
              setDiscretePower(parsed.capabilities?.discretePower ?? false);
              setVolumeControl(parsed.capabilities?.volumeControl ?? false);
              setInputSelect(parsed.capabilities?.inputSelect ?? false);
              setFeedback(parsed.capabilities?.feedback ?? false);
              setWarmupMs(parsed.capabilities?.warmupMs?.toString() ?? "");
              setCooldownMs(parsed.capabilities?.cooldownMs?.toString() ?? "");
              // Rebuild protocol state from JSON
              const protoState: Record<string, ProtocolState> = {};
              for (const p of PROTOCOLS) {
                const existing = parsed.protocols?.[p];
                if (existing && typeof existing === "object") {
                  const commands = existing.commands
                    ? Object.entries(existing.commands as Record<string, string>).map(([name, value]) => ({ name, value }))
                    : [];
                  protoState[p] = { enabled: true, commands, port: existing.port?.toString(), baudRate: existing.baudRate?.toString(), driverFile: existing.driverFile?.toString() };
                } else {
                  protoState[p] = emptyProtocolState();
                }
              }
              setProtocols(protoState);
            } catch { /* validation error already shown */ }
          }
          handleSave();
        }} disabled={saving || (mode === "json" && !!jsonError)}>
          {saving ? "Saving..." : isNew ? "Create Device" : "Save Changes"}
        </button>
        {!isNew && (
          <>
            <button className="button" onClick={handleClone}>Clone</button>
            <button className="button danger" onClick={handleDelete}>Delete</button>
          </>
        )}
      </div>
    </div>
  );
}

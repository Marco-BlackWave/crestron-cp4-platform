import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";
import { createSystemConfig } from "../api/createSystemConfig";
import { saveSystemConfig } from "../api/saveSystemConfig";
import type { SystemConfig, Subsystem, RoomType, ProcessorType } from "../schema/systemConfigSchema";

const ALL_SUBSYSTEMS: Subsystem[] = ["av", "lighting", "shades", "hvac", "security"];
const PROCESSOR_TYPES: ProcessorType[] = ["CP4", "CP3", "RMC4", "VC-4"];

interface WizardRoom {
  name: string;
  subsystems: Subsystem[];
  roomType: RoomType;
  processorId: string;
}

interface WizardProcessor {
  id: string;
  processor: ProcessorType;
  eiscIpId: string;
  eiscIpAddress: string;
}

export default function WizardPage() {
  const navigate = useNavigate();
  const { setDraft } = useConfigEditor();

  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState("");
  const [systemName, setSystemName] = useState("");
  const [processors, setProcessors] = useState<WizardProcessor[]>([
    { id: "main", processor: "CP4", eiscIpId: "0x03", eiscIpAddress: "127.0.0.2" },
  ]);
  const [rooms, setRooms] = useState<WizardRoom[]>([{ name: "", subsystems: ["av", "lighting"], roomType: "standard", processorId: "main" }]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.title = "New Project — CP4"; }, []);

  const slug = projectId || systemName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Processor management
  const addProcessor = () => {
    const nextNum = processors.length + 1;
    const nextIpId = `0x${(2 + nextNum).toString(16).padStart(2, "0")}`;
    setProcessors([...processors, { id: "", processor: "CP4", eiscIpId: nextIpId, eiscIpAddress: "" }]);
  };
  const removeProcessor = (i: number) => {
    const proc = processors[i];
    setProcessors(processors.filter((_, idx) => idx !== i));
    // Reassign rooms from deleted processor to first
    setRooms(rooms.map((r) => r.processorId === proc.id ? { ...r, processorId: processors[0]?.id ?? "main" } : r));
  };
  const updateProcessor = (i: number, field: keyof WizardProcessor, value: string) => {
    const next = [...processors];
    next[i] = { ...next[i], [field]: value };
    // If the id changed, update room references
    if (field === "id") {
      const oldId = processors[i].id;
      setRooms(rooms.map((r) => r.processorId === oldId ? { ...r, processorId: value } : r));
    }
    setProcessors(next);
  };

  // Room management
  const addRoom = () => setRooms([...rooms, { name: "", subsystems: ["av", "lighting"], roomType: "standard", processorId: processors[0]?.id ?? "main" }]);
  const addEquipmentRoom = () => setRooms([...rooms, { name: "Equipment Rack", subsystems: [], roomType: "technical", processorId: processors[0]?.id ?? "main" }]);
  const removeRoom = (i: number) => setRooms(rooms.filter((_, idx) => idx !== i));
  const updateRoomName = (i: number, name: string) => {
    const next = [...rooms];
    next[i] = { ...next[i], name };
    setRooms(next);
  };
  const updateRoomProcessor = (i: number, processorId: string) => {
    const next = [...rooms];
    next[i] = { ...next[i], processorId };
    setRooms(next);
  };
  const toggleSub = (i: number, sub: Subsystem) => {
    const next = [...rooms];
    const r = next[i];
    const has = r.subsystems.includes(sub);
    next[i] = { ...r, subsystems: has ? r.subsystems.filter((s) => s !== sub) : [...r.subsystems, sub] };
    setRooms(next);
  };

  const canProceedStep1 = systemName.trim().length > 0 && processors.every((p) => p.id.trim().length > 0 && p.eiscIpAddress.trim().length > 0);
  const canProceedStep2 = rooms.length > 0 && rooms.every((r) => r.name.trim().length > 0);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const template = await createSystemConfig({
        projectId: slug || "new-project",
        systemName: systemName.trim(),
        rooms: rooms.map((r) => ({ name: r.name.trim() })),
      });
      // Apply subsystem selections, processor assignments, and multi-processor config
      const configWithSubs = {
        ...template,
        system: {
          ...template.system,
          eiscIpId: processors[0]?.eiscIpId ?? "0x03",
          eiscIpAddress: processors[0]?.eiscIpAddress ?? "127.0.0.2",
          processors: processors.map((p) => ({
            id: p.id,
            processor: p.processor,
            eiscIpId: p.eiscIpId,
            eiscIpAddress: p.eiscIpAddress,
          })),
        },
        rooms: template.rooms.map((r, i) => ({
          ...r,
          processorId: rooms[i]?.processorId ?? processors[0]?.id ?? "main",
          roomType: rooms[i]?.roomType ?? "standard",
          subsystems: rooms[i]?.roomType === "technical" ? [] : (rooms[i]?.subsystems ?? (["av", "lighting"] as Subsystem[])),
        })),
      };
      const finalConfig = configWithSubs as SystemConfig;
      setDraft(finalConfig);
      // Auto-save to server immediately
      try {
        await saveSystemConfig(finalConfig);
      } catch {
        // Non-fatal: config is still in draft, user can save manually
      }
      navigate("/configure/rooms");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>New Project Wizard</h1>
          <p className="subhead">Step {step} of 3</p>
        </div>
      </div>

      <div className="wizard-progress">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`wizard-step ${s === step ? "wizard-step--active" : ""} ${s < step ? "wizard-step--done" : ""}`}>
            <div className="wizard-step-num">{s < step ? "\u2713" : s}</div>
            <span>{s === 1 ? "Basics" : s === 2 ? "Rooms" : "Review"}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card" style={{ maxWidth: 640 }}>
          <h2 style={{ margin: "0 0 16px" }}>Project Basics</h2>

          <div className="form-group">
            <label className="label" htmlFor="wiz-name">System Name</label>
            <input
              id="wiz-name"
              className="input"
              placeholder="Main Residence"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="wiz-pid">Project ID</label>
            <input
              id="wiz-pid"
              className="input"
              placeholder={slug || "auto-generated"}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
            <p className="form-hint">Leave blank to auto-generate from name: <code>{slug || "..."}</code></p>
          </div>

          {/* Processors */}
          <h3 style={{ fontSize: 15, margin: "20px 0 12px" }}>Processors</h3>
          {processors.map((proc, i) => (
            <div key={i} className="card" style={{ marginBottom: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="label">Processor {i + 1}</span>
                {processors.length > 1 && (
                  <button className="button" style={{ fontSize: 12 }} onClick={() => removeProcessor(i)}>Remove</button>
                )}
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">ID</label>
                  <input className="input" placeholder="main" value={proc.id} onChange={(e) => updateProcessor(i, "id", e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Type</label>
                  <select className="input" value={proc.processor} onChange={(e) => updateProcessor(i, "processor", e.target.value)}>
                    {PROCESSOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">EISC IP-ID</label>
                  <input className="input" value={proc.eiscIpId} onChange={(e) => updateProcessor(i, "eiscIpId", e.target.value)} />
                  <p className="form-hint">Hex address (e.g. 0x03)</p>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">EISC IP Address</label>
                  <input className="input" value={proc.eiscIpAddress} onChange={(e) => updateProcessor(i, "eiscIpAddress", e.target.value)} />
                  <p className="form-hint">127.0.0.2 for local, LAN IP for remote</p>
                </div>
              </div>
            </div>
          ))}
          <button className="button" onClick={addProcessor}>+ Add Processor</button>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button className="button primary" disabled={!canProceedStep1} onClick={() => setStep(2)}>
              Next: Rooms
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ maxWidth: 700 }}>
          <h2 style={{ margin: "0 0 16px" }}>Define Rooms</h2>

          {rooms.map((room, i) => (
            <div key={i} className="wizard-room-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="label">
                  Room {i + 1} Name
                  {room.roomType === "technical" && <span className="pill pill--technical" style={{ marginLeft: 8, fontSize: 10 }}>Equipment</span>}
                </label>
                <input
                  className="input"
                  placeholder={room.roomType === "technical" ? "Equipment Rack" : "Living Room"}
                  value={room.name}
                  onChange={(e) => updateRoomName(i, e.target.value)}
                />
              </div>
              {processors.length > 1 && (
                <div className="form-group">
                  <label className="label">Processor</label>
                  <select className="input" value={room.processorId} onChange={(e) => updateRoomProcessor(i, e.target.value)}>
                    {processors.map((p) => (
                      <option key={p.id} value={p.id}>{p.id} ({p.processor})</option>
                    ))}
                  </select>
                </div>
              )}
              {room.roomType !== "technical" && (
                <div className="form-group">
                  <label className="label">Subsystems</label>
                  <div className="badge-row">
                    {ALL_SUBSYSTEMS.map((sub) => (
                      <button
                        key={sub}
                        className={`pill pill--${sub} ${room.subsystems.includes(sub) ? "pill--checked" : "pill--unchecked"}`}
                        onClick={() => toggleSub(i, sub)}
                        type="button"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {room.roomType === "technical" && (
                <div className="form-group">
                  <label className="label">Type</label>
                  <p className="form-hint" style={{ marginTop: 0 }}>Equipment room — no subsystems</p>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <span className="pill" style={{ fontSize: 11 }}>Joins {i * 100 + 1}–{(i + 1) * 100}</span>
              </div>
              {rooms.length > 1 && (
                <button className="button" style={{ alignSelf: "flex-end" }} onClick={() => removeRoom(i)}>
                  Remove
                </button>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="button" onClick={addRoom}>+ Add Room</button>
            <button className="button" onClick={addEquipmentRoom}>+ Add Equipment Room</button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            <button className="button" onClick={() => setStep(1)}>Back</button>
            <button className="button primary" disabled={!canProceedStep2} onClick={() => setStep(3)}>
              Next: Review
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h2 style={{ margin: "0 0 16px" }}>Review & Create</h2>

          <table className="command-table" style={{ marginBottom: 16 }}>
            <tbody>
              <tr><td><strong>System Name</strong></td><td>{systemName}</td></tr>
              <tr><td><strong>Project ID</strong></td><td>{slug || "new-project"}</td></tr>
              <tr><td><strong>Processors</strong></td><td>{processors.length}</td></tr>
              <tr><td><strong>Rooms</strong></td><td>{rooms.length}</td></tr>
            </tbody>
          </table>

          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Processors</h3>
          {processors.map((proc, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong>{proc.id}</strong>
              <span className="pill" style={{ marginLeft: 8, fontSize: 11 }}>{proc.processor}</span>
              <span style={{ marginLeft: 8, color: "#64748b", fontSize: 13 }}>
                EISC {proc.eiscIpId} @ {proc.eiscIpAddress}
              </span>
            </div>
          ))}

          <h3 style={{ margin: "16px 0 8px", fontSize: 14 }}>Rooms</h3>
          {rooms.map((room, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong>{room.name}</strong>
              {room.roomType === "technical" && <span className="pill pill--technical" style={{ marginLeft: 8, fontSize: 11 }}>Equipment</span>}
              {processors.length > 1 && (
                <span className="pill" style={{ marginLeft: 8, fontSize: 11, background: "rgba(59,130,246,0.12)", color: "#2563eb" }}>
                  {room.processorId}
                </span>
              )}
              <span style={{ marginLeft: 8, color: "#64748b", fontSize: 13 }}>
                Joins {i * 100 + 1}–{(i + 1) * 100}
              </span>
              <div className="badge-row" style={{ marginTop: 4 }}>
                {room.roomType === "technical" ? (
                  <span className="pill pill--technical">No subsystems</span>
                ) : (
                  room.subsystems.map((sub) => (
                    <span key={sub} className={`pill pill--${sub}`}>{sub}</span>
                  ))
                )}
              </div>
            </div>
          ))}

          {error && <p style={{ color: "#b91c1c", marginTop: 12 }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            <button className="button" onClick={() => setStep(2)} disabled={creating}>Back</button>
            <button className="button primary" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

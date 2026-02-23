import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useConfigEditor } from "../hooks/useConfigEditor";
import { useApiKey } from "../hooks/useApiKey";
import { createSystemConfig } from "../api/createSystemConfig";
import type { Subsystem } from "../schema/systemConfigSchema";

const ALL_SUBSYSTEMS: Subsystem[] = ["av", "lighting", "shades", "hvac", "security"];

interface WizardRoom {
  name: string;
  subsystems: Subsystem[];
}

export default function WizardPage() {
  const navigate = useNavigate();
  const { setDraft } = useConfigEditor();
  const { apiKey } = useApiKey();

  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState("");
  const [systemName, setSystemName] = useState("");
  const [eiscIpId, setEiscIpId] = useState("0x03");
  const [eiscIpAddress, setEiscIpAddress] = useState("127.0.0.2");
  const [rooms, setRooms] = useState<WizardRoom[]>([{ name: "", subsystems: ["av", "lighting"] }]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.title = "New Project — CP4"; }, []);

  const slug = projectId || systemName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const addRoom = () => setRooms([...rooms, { name: "", subsystems: ["av", "lighting"] }]);
  const removeRoom = (i: number) => setRooms(rooms.filter((_, idx) => idx !== i));
  const updateRoomName = (i: number, name: string) => {
    const next = [...rooms];
    next[i] = { ...next[i], name };
    setRooms(next);
  };
  const toggleSub = (i: number, sub: Subsystem) => {
    const next = [...rooms];
    const r = next[i];
    const has = r.subsystems.includes(sub);
    next[i] = { ...r, subsystems: has ? r.subsystems.filter((s) => s !== sub) : [...r.subsystems, sub] };
    setRooms(next);
  };

  const canProceedStep1 = systemName.trim().length > 0;
  const canProceedStep2 = rooms.length > 0 && rooms.every((r) => r.name.trim().length > 0);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const template = await createSystemConfig(apiKey, {
        projectId: slug || "new-project",
        systemName: systemName.trim(),
        rooms: rooms.map((r) => ({ name: r.name.trim() })),
      });
      // Apply subsystem selections to the template
      const configWithSubs = {
        ...template,
        system: { ...template.system, eiscIpId, eiscIpAddress },
        rooms: template.rooms.map((r, i) => ({
          ...r,
          subsystems: rooms[i]?.subsystems ?? (["av", "lighting"] as Subsystem[]),
        })),
      };
      setDraft(configWithSubs as typeof template);
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
        <div className="card" style={{ maxWidth: 540 }}>
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

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label" htmlFor="wiz-eisc-id">EISC IP-ID</label>
              <input id="wiz-eisc-id" className="input" value={eiscIpId} onChange={(e) => setEiscIpId(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label" htmlFor="wiz-eisc-addr">EISC IP Address</label>
              <input id="wiz-eisc-addr" className="input" value={eiscIpAddress} onChange={(e) => setEiscIpAddress(e.target.value)} />
            </div>
          </div>

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
                <label className="label">Room {i + 1} Name</label>
                <input
                  className="input"
                  placeholder="Living Room"
                  value={room.name}
                  onChange={(e) => updateRoomName(i, e.target.value)}
                />
              </div>
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

          <button className="button" onClick={addRoom} style={{ marginTop: 12 }}>
            + Add Room
          </button>

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
              <tr><td><strong>EISC</strong></td><td>{eiscIpId} / {eiscIpAddress}</td></tr>
              <tr><td><strong>Rooms</strong></td><td>{rooms.length}</td></tr>
            </tbody>
          </table>

          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Rooms</h3>
          {rooms.map((room, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong>{room.name}</strong>
              <span style={{ marginLeft: 8, color: "#64748b", fontSize: 13 }}>
                Joins {i * 100 + 1}–{(i + 1) * 100}
              </span>
              <div className="badge-row" style={{ marginTop: 4 }}>
                {room.subsystems.map((sub) => (
                  <span key={sub} className={`pill pill--${sub}`}>{sub}</span>
                ))}
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

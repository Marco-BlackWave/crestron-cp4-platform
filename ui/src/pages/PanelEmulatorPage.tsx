import { useEffect, useMemo, useState } from "react";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { useSignalEngine } from "../hooks/useSignalEngine";
import { JoinMap } from "../simulator/JoinMap";

export default function PanelEmulatorPage() {
  const { data: config } = useSystemConfig();
  const { signals, pressButton, setAnalog, sendSerial } = useSignalEngine(config);
  const [selectedRoom, setSelectedRoom] = useState<string>("");

  useEffect(() => { document.title = "Panel Emulator — CP4"; }, []);

  const rooms = useMemo(() => config?.rooms ?? [], [config]);

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) setSelectedRoom(rooms[0].id);
  }, [rooms, selectedRoom]);

  const getSignalValue = (type: string, offset: number) => {
    const key = `${type}:${selectedRoom}:${offset}`;
    return signals.find((s) => s.key === key)?.value;
  };

  const fb = (offset: number) => getSignalValue("digital", offset) === true;
  const analogFb = (offset: number) => (getSignalValue("analog", offset) as number) ?? 0;
  const serialFb = (offset: number) => (getSignalValue("serial", offset) as string) ?? "";

  const [serialInput, setSerialInput] = useState("");
  const [disarmCode, setDisarmCode] = useState("");

  if (!config) {
    return <div className="page-content"><div className="empty-state"><h2>No Config Loaded</h2><p>Load a system config from Configure page first.</p></div></div>;
  }

  const proc = config.system?.processors?.[0];
  const room = rooms.find((r) => r.id === selectedRoom);
  const subs = room?.subsystems ?? [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Panel Emulator</h1>
          <p className="subhead">Simulate a Crestron touchpanel via EISC</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="input" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} style={{ minWidth: 200 }}>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <span className="eisc-card__status">
            <span className="eisc-card__dot eisc-card__dot--online" />
            {proc?.id ?? "main"} Online
          </span>
        </div>
      </div>

      <div className="panel-emu">
        {/* AV Controls */}
        {subs.includes("av") && (
          <div className="panel-section">
            <h3>AV Controls</h3>
            <div className="panel-buttons">
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.PowerToggle)}>
                <span className={`panel-btn__led${fb(JoinMap.Digital.PowerFeedback) ? " panel-btn__led--on" : ""}`} />
                Power
              </button>
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.SourceSelect1 + i - 1)}>
                  <span className={`panel-btn__led${fb(JoinMap.Digital.SourceFeedback1 + i - 1) ? " panel-btn__led--on" : ""}`} />
                  Src {i}
                </button>
              ))}
            </div>
            <div className="panel-buttons" style={{ marginTop: 8 }}>
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.VolumeUp)}>Vol+</button>
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.VolumeDown)}>Vol-</button>
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.MuteToggle)}>
                <span className={`panel-btn__led${fb(JoinMap.Digital.MuteFeedback) ? " panel-btn__led--on" : ""}`} />
                Mute
              </button>
            </div>
          </div>
        )}

        {/* Lighting */}
        {subs.includes("lighting") && (
          <div className="panel-section">
            <h3>Lighting</h3>
            <div className="panel-buttons">
              {[1, 2, 3, 4].map((i) => (
                <button key={i} className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.LightingScene1 + i - 1)}>
                  <span className={`panel-btn__led${fb(JoinMap.Digital.LightingSceneFb1 + i - 1) ? " panel-btn__led--on" : ""}`} />
                  Scene {i}
                </button>
              ))}
            </div>
            <div className="panel-slider" style={{ marginTop: 8 }}>
              <label>Level</label>
              <input type="range" min={0} max={65535} value={analogFb(JoinMap.Analog.LightingLevelFb)} onChange={(e) => setAnalog(selectedRoom, JoinMap.Analog.LightingSet, parseInt(e.target.value))} />
              <span className="panel-slider__value">{Math.round(analogFb(JoinMap.Analog.LightingLevelFb) / 655)}%</span>
            </div>
          </div>
        )}

        {/* Shades */}
        {subs.includes("shades") && (
          <div className="panel-section">
            <h3>Shades</h3>
            <div className="panel-buttons">
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.ShadeOpen)}>Open</button>
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.ShadeStop)}>Stop</button>
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.ShadeClose)}>Close</button>
            </div>
            <div className="panel-slider" style={{ marginTop: 8 }}>
              <label>Position</label>
              <input type="range" min={0} max={65535} value={analogFb(JoinMap.Analog.ShadePositionFb)} onChange={(e) => setAnalog(selectedRoom, JoinMap.Analog.ShadeSet, parseInt(e.target.value))} />
              <span className="panel-slider__value">{Math.round(analogFb(JoinMap.Analog.ShadePositionFb) / 655)}%</span>
            </div>
          </div>
        )}

        {/* HVAC */}
        {subs.includes("hvac") && (
          <div className="panel-section">
            <h3>HVAC</h3>
            <div className="panel-buttons">
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.HvacModeToggle)}>Mode</button>
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.HvacOnOff)}>On/Off</button>
            </div>
            <div className="panel-slider" style={{ marginTop: 8 }}>
              <label>Setpoint</label>
              <input type="range" min={0} max={65535} value={analogFb(JoinMap.Analog.TempSetpointFb)} onChange={(e) => setAnalog(selectedRoom, JoinMap.Analog.TempSetpointSet, parseInt(e.target.value))} />
              <span className="panel-slider__value">{Math.round(600 + analogFb(JoinMap.Analog.TempSetpointFb) * 300 / 65535) / 10}&deg;F</span>
            </div>
          </div>
        )}

        {/* Security */}
        {subs.includes("security") && (
          <div className="panel-section">
            <h3>Security</h3>
            <div className="panel-buttons">
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.SecurityArmAway)}>
                <span className={`panel-btn__led${fb(JoinMap.Digital.SecurityArmedAwayFb) ? " panel-btn__led--on" : ""}`} /> Away
              </button>
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.SecurityArmStay)}>
                <span className={`panel-btn__led${fb(JoinMap.Digital.SecurityArmedStayFb) ? " panel-btn__led--on" : ""}`} /> Stay
              </button>
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.SecurityArmNight)}>
                <span className={`panel-btn__led${fb(JoinMap.Digital.SecurityArmedNightFb) ? " panel-btn__led--on" : ""}`} /> Night
              </button>
              <button className="panel-btn" onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.SecurityDisarm)}>
                <span className={`panel-btn__led${fb(JoinMap.Digital.SecurityDisarmedFb) ? " panel-btn__led--on" : ""}`} /> Disarm
              </button>
              <button className="panel-btn panel-btn--active" style={{ background: "#dc2626" }} onMouseDown={() => pressButton(selectedRoom, JoinMap.Digital.SecurityPanic)}>Panic</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input className="input" placeholder="Disarm code" type="password" value={disarmCode} onChange={(e) => setDisarmCode(e.target.value)} style={{ maxWidth: 140 }} />
              <button className="button" onClick={() => { sendSerial(selectedRoom, JoinMap.Serial.SecurityDisarmCode, disarmCode); pressButton(selectedRoom, JoinMap.Digital.SecurityDisarm); }}>Send</button>
            </div>
          </div>
        )}

        {/* Feedback Display */}
        <div className="panel-section">
          <h3>Feedback</h3>
          <div className="panel-feedback">
            <div className="panel-fb-item">
              <span className="panel-fb-item__label">Power</span>
              <span className="panel-fb-item__value">{fb(JoinMap.Digital.PowerFeedback) ? "ON" : "OFF"}</span>
            </div>
            <div className="panel-fb-item">
              <span className="panel-fb-item__label">Mute</span>
              <span className="panel-fb-item__value">{fb(JoinMap.Digital.MuteFeedback) ? "MUTED" : "OFF"}</span>
            </div>
            <div className="panel-fb-item">
              <span className="panel-fb-item__label">Volume</span>
              <span className="panel-fb-item__value">{Math.round(analogFb(JoinMap.Analog.VolumeLevelFb) / 655)}%</span>
            </div>
            <div className="panel-fb-item">
              <span className="panel-fb-item__label">Source</span>
              <span className="panel-fb-item__value">{serialFb(JoinMap.Serial.SourceName) || "—"}</span>
            </div>
            <div className="panel-fb-item">
              <span className="panel-fb-item__label">Room</span>
              <span className="panel-fb-item__value">{serialFb(JoinMap.Serial.RoomName) || "—"}</span>
            </div>
            <div className="panel-fb-item">
              <span className="panel-fb-item__label">HVAC</span>
              <span className="panel-fb-item__value">{serialFb(JoinMap.Serial.HvacMode) || "—"}</span>
            </div>
            <div className="panel-fb-item">
              <span className="panel-fb-item__label">Temp</span>
              <span className="panel-fb-item__value">{Math.round(600 + analogFb(JoinMap.Analog.TempCurrent) * 300 / 65535) / 10}&deg;F</span>
            </div>
            <div className="panel-fb-item">
              <span className="panel-fb-item__label">Security</span>
              <span className="panel-fb-item__value">{serialFb(JoinMap.Serial.SecurityStatus) || "—"}</span>
            </div>
            <div className="panel-fb-item">
              <span className="panel-fb-item__label">Status</span>
              <span className="panel-fb-item__value">{serialFb(JoinMap.Serial.StatusText) || "—"}</span>
            </div>
          </div>
        </div>

        {/* Serial I/O */}
        <div className="panel-section">
          <h3>Serial I/O</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Serial string..." value={serialInput} onChange={(e) => setSerialInput(e.target.value)} />
            <button className="button primary" onClick={() => { sendSerial(selectedRoom, JoinMap.Serial.SecurityDisarmCode, serialInput); setSerialInput(""); }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

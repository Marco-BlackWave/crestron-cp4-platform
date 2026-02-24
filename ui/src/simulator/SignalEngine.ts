/**
 * Signal Simulator Engine — TypeScript reimplementation of the Crestron
 * signal registry + join binding + EISC state.
 */

export type SigType = "digital" | "analog" | "serial";
export type SigValue = boolean | number | string;

export interface SimSignal {
  key: string;
  type: SigType;
  joinNumber: number;
  direction: "input" | "output";
  roomId: string | null;
  name: string;
  value: SigValue;
  lastChanged: number;
}

export interface EiscState {
  processorId: string;
  online: boolean;
  digitalInputs: Map<number, boolean>;
  digitalOutputs: Map<number, boolean>;
  analogInputs: Map<number, number>;
  analogOutputs: Map<number, number>;
  serialInputs: Map<number, string>;
  serialOutputs: Map<number, string>;
}

export type SignalListener = (signal: SimSignal) => void;

interface RoomDef {
  id: string;
  joinOffset: number;
  processorId: string;
  subsystems: string[];
  name: string;
}

interface SystemDef {
  processors: { id: string }[];
  rooms: RoomDef[];
}

function defaultValue(type: SigType): SigValue {
  switch (type) {
    case "digital": return false;
    case "analog": return 0;
    case "serial": return "";
  }
}

export class SignalEngine {
  private signals = new Map<string, SimSignal>();
  private eiscs = new Map<string, EiscState>();
  private keyListeners = new Map<string, Set<SignalListener>>();
  private anyListeners = new Set<SignalListener>();
  private _version = 0;

  get version() { return this._version; }

  initFromConfig(config: SystemDef): void {
    this.signals.clear();
    this.eiscs.clear();
    this.keyListeners.clear();
    this._version++;

    // Create EISC per processor
    for (const proc of config.processors) {
      this.eiscs.set(proc.id, {
        processorId: proc.id,
        online: true,
        digitalInputs: new Map(),
        digitalOutputs: new Map(),
        analogInputs: new Map(),
        analogOutputs: new Map(),
        serialInputs: new Map(),
        serialOutputs: new Map(),
      });
    }

    // Create signals for each room
    for (const room of config.rooms) {
      this.createRoomSignals(room);
    }

    // System signals
    this.createSystemSignals();
  }

  private createRoomSignals(room: RoomDef): void {
    const { joinOffset } = room;

    // Digital 0-70
    const digitalDefs: [number, string, "input" | "output"][] = [
      [0, "PowerToggle", "input"], [1, "PowerFeedback", "output"],
      [2, "SourceSelect1", "input"], [3, "SourceSelect2", "input"],
      [4, "SourceSelect3", "input"], [5, "SourceSelect4", "input"],
      [6, "SourceSelect5", "input"],
      [7, "SourceFb1", "output"], [8, "SourceFb2", "output"],
      [9, "SourceFb3", "output"], [10, "SourceFb4", "output"],
      [11, "SourceFb5", "output"],
      [12, "VolumeUp", "input"], [13, "VolumeDown", "input"],
      [14, "MuteToggle", "input"], [15, "MuteFeedback", "output"],
      [20, "LightScene1", "input"], [21, "LightScene2", "input"],
      [22, "LightScene3", "input"], [23, "LightScene4", "input"],
      [24, "LightSceneFb1", "output"], [25, "LightSceneFb2", "output"],
      [26, "LightSceneFb3", "output"], [27, "LightSceneFb4", "output"],
      [30, "ShadeOpen", "input"], [31, "ShadeClose", "input"], [32, "ShadeStop", "input"],
      [40, "HvacModeToggle", "input"], [41, "HvacOnOff", "input"],
      [50, "SecArmAway", "input"], [51, "SecArmStay", "input"],
      [52, "SecArmNight", "input"], [53, "SecDisarm", "input"],
      [54, "SecPanic", "input"], [55, "SecStatusReq", "input"],
      [56, "SecArmAwayFb", "output"], [57, "SecArmStayFb", "output"],
      [58, "SecArmNightFb", "output"], [59, "SecDisarmedFb", "output"],
      [60, "SecAlarmFb", "output"], [61, "SecTroubleFb", "output"],
      [62, "SecReadyFb", "output"],
      [63, "SecZone1Fb", "output"], [64, "SecZone2Fb", "output"],
      [65, "SecZone3Fb", "output"], [66, "SecZone4Fb", "output"],
      [67, "SecZone5Fb", "output"], [68, "SecZone6Fb", "output"],
      [69, "SecZone7Fb", "output"], [70, "SecZone8Fb", "output"],
    ];

    for (const [offset, name, dir] of digitalDefs) {
      const key = `digital:${room.id}:${offset}`;
      const join = joinOffset + offset + 1;
      this.signals.set(key, {
        key, type: "digital", joinNumber: join, direction: dir,
        roomId: room.id, name, value: false, lastChanged: 0,
      });
    }

    // Analog 0-8
    const analogDefs: [number, string, "input" | "output"][] = [
      [0, "VolumeLevelFb", "output"], [1, "VolumeSet", "input"],
      [2, "LightLevelFb", "output"], [3, "LightSet", "input"],
      [4, "ShadePosFb", "output"], [5, "ShadeSet", "input"],
      [6, "TempCurrent", "output"], [7, "TempSetpointSet", "input"],
      [8, "TempSetpointFb", "output"],
    ];

    for (const [offset, name, dir] of analogDefs) {
      const key = `analog:${room.id}:${offset}`;
      const join = joinOffset + offset + 1;
      this.signals.set(key, {
        key, type: "analog", joinNumber: join, direction: dir,
        roomId: room.id, name, value: 0, lastChanged: 0,
      });
    }

    // Serial 0-7
    const serialDefs: [number, string, "input" | "output"][] = [
      [0, "SourceName", "output"], [1, "RoomName", "output"],
      [2, "SceneName", "output"], [3, "HvacMode", "output"],
      [4, "StatusText", "output"],
      [5, "SecArmMode", "output"], [6, "SecStatus", "output"],
      [7, "SecDisarmCode", "input"],
    ];

    for (const [offset, name, dir] of serialDefs) {
      const key = `serial:${room.id}:${offset}`;
      const join = joinOffset + offset + 1;
      this.signals.set(key, {
        key, type: "serial", joinNumber: join, direction: dir,
        roomId: room.id, name, value: "", lastChanged: 0,
      });
    }

    // Set initial room name
    const rnKey = `serial:${room.id}:1`;
    const rn = this.signals.get(rnKey);
    if (rn) {
      rn.value = room.name;
      rn.lastChanged = Date.now();
    }
  }

  private createSystemSignals(): void {
    // System digital
    const sysDig: [number, string, "input" | "output"][] = [
      [0, "AllOff", "input"],
    ];
    for (let i = 1; i <= 10; i++) sysDig.push([i, `SceneTrigger${i}`, "input"]);
    for (let i = 11; i <= 20; i++) sysDig.push([i, `SceneFb${i - 10}`, "output"]);

    for (const [offset, name, dir] of sysDig) {
      const key = `digital:system:${offset}`;
      const join = 900 + offset + 1;
      this.signals.set(key, {
        key, type: "digital", joinNumber: join, direction: dir,
        roomId: null, name, value: false, lastChanged: 0,
      });
    }

    // System serial
    const sysSerial: [number, string, "input" | "output"][] = [
      [0, "SystemStatus", "output"], [1, "ActiveSceneName", "output"],
    ];
    for (const [offset, name, dir] of sysSerial) {
      const key = `serial:system:${offset}`;
      const join = 900 + offset + 1;
      this.signals.set(key, {
        key, type: "serial", joinNumber: join, direction: dir,
        roomId: null, name, value: "", lastChanged: 0,
      });
    }
  }

  /** Panel simulation: user presses button → fires input signal */
  setInput(type: SigType, roomId: string, offset: number, value: SigValue): void {
    const key = `${type}:${roomId}:${offset}`;
    this.setSignalValue(key, value);
  }

  /** Program feedback: subsystem updates output signal */
  setOutput(type: SigType, roomId: string, offset: number, value: SigValue): void {
    const key = `${type}:${roomId}:${offset}`;
    this.setSignalValue(key, value);
  }

  /** Set a signal by key */
  setSignalValue(key: string, value: SigValue): void {
    const signal = this.signals.get(key);
    if (!signal) return;
    signal.value = value;
    signal.lastChanged = Date.now();
    this._version++;
    this.notifyListeners(signal);
  }

  getSignal(key: string): SimSignal | undefined {
    return this.signals.get(key);
  }

  getAllSignals(): SimSignal[] {
    return Array.from(this.signals.values());
  }

  getEiscState(processorId: string): EiscState | undefined {
    return this.eiscs.get(processorId);
  }

  getAllEiscs(): EiscState[] {
    return Array.from(this.eiscs.values());
  }

  /** Subscribe to a specific signal key */
  onSignalChange(key: string, cb: SignalListener): () => void {
    if (!this.keyListeners.has(key)) {
      this.keyListeners.set(key, new Set());
    }
    this.keyListeners.get(key)!.add(cb);
    return () => { this.keyListeners.get(key)?.delete(cb); };
  }

  /** Subscribe to any signal change */
  onAnyChange(cb: SignalListener): () => void {
    this.anyListeners.add(cb);
    return () => { this.anyListeners.delete(cb); };
  }

  toggleConnection(processorId: string): void {
    const eisc = this.eiscs.get(processorId);
    if (eisc) {
      eisc.online = !eisc.online;
      this._version++;
    }
  }

  reset(): void {
    for (const signal of this.signals.values()) {
      signal.value = defaultValue(signal.type);
      signal.lastChanged = 0;
    }
    this._version++;
  }

  snapshot(): Record<string, SigValue> {
    const snap: Record<string, SigValue> = {};
    for (const [key, signal] of this.signals) {
      snap[key] = signal.value;
    }
    return snap;
  }

  restore(snap: Record<string, SigValue>): void {
    for (const [key, value] of Object.entries(snap)) {
      const signal = this.signals.get(key);
      if (signal) {
        signal.value = value;
        signal.lastChanged = Date.now();
      }
    }
    this._version++;
  }

  private notifyListeners(signal: SimSignal): void {
    const keySet = this.keyListeners.get(signal.key);
    if (keySet) {
      for (const cb of keySet) cb(signal);
    }
    for (const cb of this.anyListeners) cb(signal);
  }
}

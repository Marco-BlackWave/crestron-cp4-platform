/**
 * SIMPL Logic Element Simulator — TypeScript implementations of core SIMPL
 * logic elements that process signals.
 */

import type { SignalEngine } from "./SignalEngine";

export interface LogicElement {
  id: string;
  type: string;
  inputs: string[];
  outputs: string[];
  process(engine: SignalEngine): void;
}

let nextId = 1;
function genId(type: string) { return `${type}-${nextId++}`; }

/** AND gate — output high when ALL digital inputs are high */
export class AndGate implements LogicElement {
  id: string;
  type = "AND";
  inputs: string[];
  outputs: string[];

  constructor(inputs: string[], output: string) {
    this.id = genId("and");
    this.inputs = inputs;
    this.outputs = [output];
  }

  process(engine: SignalEngine) {
    const result = this.inputs.every((k) => engine.getSignal(k)?.value === true);
    engine.setSignalValue(this.outputs[0], result);
  }
}

/** OR gate — output high when ANY digital input is high */
export class OrGate implements LogicElement {
  id: string;
  type = "OR";
  inputs: string[];
  outputs: string[];

  constructor(inputs: string[], output: string) {
    this.id = genId("or");
    this.inputs = inputs;
    this.outputs = [output];
  }

  process(engine: SignalEngine) {
    const result = this.inputs.some((k) => engine.getSignal(k)?.value === true);
    engine.setSignalValue(this.outputs[0], result);
  }
}

/** NOT gate — inverts digital input */
export class NotGate implements LogicElement {
  id: string;
  type = "NOT";
  inputs: string[];
  outputs: string[];

  constructor(input: string, output: string) {
    this.id = genId("not");
    this.inputs = [input];
    this.outputs = [output];
  }

  process(engine: SignalEngine) {
    const val = engine.getSignal(this.inputs[0])?.value;
    engine.setSignalValue(this.outputs[0], val !== true);
  }
}

/** Buffer — pass-through when enable is high */
export class Buffer implements LogicElement {
  id: string;
  type = "Buffer";
  inputs: string[];
  outputs: string[];

  constructor(enable: string, data: string, output: string) {
    this.id = genId("buffer");
    this.inputs = [enable, data];
    this.outputs = [output];
  }

  process(engine: SignalEngine) {
    const enabled = engine.getSignal(this.inputs[0])?.value === true;
    if (enabled) {
      const val = engine.getSignal(this.inputs[1])?.value;
      if (val !== undefined) engine.setSignalValue(this.outputs[0], val);
    }
  }
}

/** Toggle — flip output state on rising edge of input */
export class Toggle implements LogicElement {
  id: string;
  type = "Toggle";
  inputs: string[];
  outputs: string[];
  private prevInput = false;

  constructor(trigger: string, output: string) {
    this.id = genId("toggle");
    this.inputs = [trigger];
    this.outputs = [output];
  }

  process(engine: SignalEngine) {
    const current = engine.getSignal(this.inputs[0])?.value === true;
    if (current && !this.prevInput) {
      const outVal = engine.getSignal(this.outputs[0])?.value === true;
      engine.setSignalValue(this.outputs[0], !outVal);
    }
    this.prevInput = current;
  }
}

/** Set/Reset Latch — SR flip-flop */
export class SetResetLatch implements LogicElement {
  id: string;
  type = "SR Latch";
  inputs: string[];
  outputs: string[];

  constructor(set: string, reset: string, output: string) {
    this.id = genId("sr");
    this.inputs = [set, reset];
    this.outputs = [output];
  }

  process(engine: SignalEngine) {
    const s = engine.getSignal(this.inputs[0])?.value === true;
    const r = engine.getSignal(this.inputs[1])?.value === true;
    if (s) engine.setSignalValue(this.outputs[0], true);
    else if (r) engine.setSignalValue(this.outputs[0], false);
  }
}

/** Interlock — mutual exclusion, last input wins */
export class Interlock implements LogicElement {
  id: string;
  type = "Interlock";
  inputs: string[];
  outputs: string[];

  constructor(inputs: string[], outputs: string[]) {
    this.id = genId("interlock");
    this.inputs = inputs;
    this.outputs = outputs;
  }

  process(engine: SignalEngine) {
    let activeIndex = -1;
    for (let i = 0; i < this.inputs.length; i++) {
      if (engine.getSignal(this.inputs[i])?.value === true) {
        activeIndex = i;
      }
    }
    for (let i = 0; i < this.outputs.length; i++) {
      engine.setSignalValue(this.outputs[i], i === activeIndex);
    }
  }
}

/** OneShot — pulse output on rising edge (simulated with timestamp) */
export class OneShot implements LogicElement {
  id: string;
  type = "OneShot";
  inputs: string[];
  outputs: string[];
  private durationMs: number;
  private prevInput = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(trigger: string, output: string, durationMs = 500) {
    this.id = genId("oneshot");
    this.inputs = [trigger];
    this.outputs = [output];
    this.durationMs = durationMs;
  }

  process(engine: SignalEngine) {
    const current = engine.getSignal(this.inputs[0])?.value === true;
    if (current && !this.prevInput) {
      engine.setSignalValue(this.outputs[0], true);
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        engine.setSignalValue(this.outputs[0], false);
        this.timer = null;
      }, this.durationMs);
    }
    this.prevInput = current;
  }
}

/** Analog Buffer — pass analog value when enabled */
export class AnalogBuffer implements LogicElement {
  id: string;
  type = "Analog Buffer";
  inputs: string[];
  outputs: string[];

  constructor(enable: string, analog: string, output: string) {
    this.id = genId("abuf");
    this.inputs = [enable, analog];
    this.outputs = [output];
  }

  process(engine: SignalEngine) {
    const enabled = engine.getSignal(this.inputs[0])?.value === true;
    if (enabled) {
      const val = engine.getSignal(this.inputs[1])?.value ?? 0;
      engine.setSignalValue(this.outputs[0], val);
    }
  }
}

/** Analog Ramp — ramp value up/down between 0-65535 */
export class AnalogRamp implements LogicElement {
  id: string;
  type = "Analog Ramp";
  inputs: string[];
  outputs: string[];
  private rate: number;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(rampUp: string, rampDown: string, output: string, rate = 1000) {
    this.id = genId("ramp");
    this.inputs = [rampUp, rampDown];
    this.outputs = [output];
    this.rate = rate;
  }

  process(engine: SignalEngine) {
    const up = engine.getSignal(this.inputs[0])?.value === true;
    const down = engine.getSignal(this.inputs[1])?.value === true;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (up || down) {
      this.interval = setInterval(() => {
        const current = (engine.getSignal(this.outputs[0])?.value as number) ?? 0;
        const delta = up ? this.rate : -this.rate;
        const next = Math.max(0, Math.min(65535, current + delta));
        engine.setSignalValue(this.outputs[0], next);
        if (next === 0 || next === 65535) {
          if (this.interval) clearInterval(this.interval);
          this.interval = null;
        }
      }, 100);
    }
  }
}

/** Analog Scaler — linear scale from input range to output range */
export class AnalogScaler implements LogicElement {
  id: string;
  type = "Analog Scaler";
  inputs: string[];
  outputs: string[];
  private inMin: number;
  private inMax: number;
  private outMin: number;
  private outMax: number;

  constructor(input: string, output: string, inMin = 0, inMax = 100, outMin = 0, outMax = 65535) {
    this.id = genId("scaler");
    this.inputs = [input];
    this.outputs = [output];
    this.inMin = inMin;
    this.inMax = inMax;
    this.outMin = outMin;
    this.outMax = outMax;
  }

  process(engine: SignalEngine) {
    const raw = (engine.getSignal(this.inputs[0])?.value as number) ?? 0;
    const normalized = (raw - this.inMin) / (this.inMax - this.inMin);
    const scaled = Math.round(this.outMin + normalized * (this.outMax - this.outMin));
    engine.setSignalValue(this.outputs[0], Math.max(this.outMin, Math.min(this.outMax, scaled)));
  }
}

/** Analog Sum — add multiple analog values */
export class AnalogSum implements LogicElement {
  id: string;
  type = "Analog Sum";
  inputs: string[];
  outputs: string[];

  constructor(inputs: string[], output: string) {
    this.id = genId("asum");
    this.inputs = inputs;
    this.outputs = [output];
  }

  process(engine: SignalEngine) {
    let sum = 0;
    for (const key of this.inputs) {
      sum += (engine.getSignal(key)?.value as number) ?? 0;
    }
    engine.setSignalValue(this.outputs[0], Math.min(65535, Math.max(0, sum)));
  }
}

/** Delay — delay a digital signal by time */
export class Delay implements LogicElement {
  id: string;
  type = "Delay";
  inputs: string[];
  outputs: string[];
  private delayMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(input: string, output: string, delayMs = 1000) {
    this.id = genId("delay");
    this.inputs = [input];
    this.outputs = [output];
    this.delayMs = delayMs;
  }

  process(engine: SignalEngine) {
    const val = engine.getSignal(this.inputs[0])?.value;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      engine.setSignalValue(this.outputs[0], val ?? false);
    }, this.delayMs);
  }
}

/** Oscillator — periodic pulse train when enabled */
export class Oscillator implements LogicElement {
  id: string;
  type = "Oscillator";
  inputs: string[];
  outputs: string[];
  private onMs: number;
  private offMs: number;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(enable: string, output: string, onMs = 500, offMs = 500) {
    this.id = genId("osc");
    this.inputs = [enable];
    this.outputs = [output];
    this.onMs = onMs;
    this.offMs = offMs;
  }

  process(engine: SignalEngine) {
    const enabled = engine.getSignal(this.inputs[0])?.value === true;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }

    if (enabled) {
      let on = true;
      engine.setSignalValue(this.outputs[0], true);
      this.interval = setInterval(() => {
        on = !on;
        engine.setSignalValue(this.outputs[0], on);
      }, on ? this.onMs : this.offMs);
    } else {
      engine.setSignalValue(this.outputs[0], false);
    }
  }
}

/** Serial Buffer — pass string when enabled */
export class SerialBuffer implements LogicElement {
  id: string;
  type = "Serial Buffer";
  inputs: string[];
  outputs: string[];

  constructor(enable: string, serial: string, output: string) {
    this.id = genId("sbuf");
    this.inputs = [enable, serial];
    this.outputs = [output];
  }

  process(engine: SignalEngine) {
    const enabled = engine.getSignal(this.inputs[0])?.value === true;
    if (enabled) {
      const val = engine.getSignal(this.inputs[1])?.value ?? "";
      engine.setSignalValue(this.outputs[0], val);
    }
  }
}

/** Crosspoint Router — NxM signal matrix routing */
export class CrosspointRouter implements LogicElement {
  id: string;
  type = "Crosspoint";
  inputs: string[];
  outputs: string[];
  private routing: Map<number, number> = new Map(); // output index → input index

  constructor(inputs: string[], outputs: string[]) {
    this.id = genId("xpoint");
    this.inputs = inputs;
    this.outputs = outputs;
  }

  setRoute(outputIdx: number, inputIdx: number) {
    this.routing.set(outputIdx, inputIdx);
  }

  process(engine: SignalEngine) {
    for (const [outIdx, inIdx] of this.routing) {
      if (outIdx < this.outputs.length && inIdx < this.inputs.length) {
        const val = engine.getSignal(this.inputs[inIdx])?.value;
        if (val !== undefined) engine.setSignalValue(this.outputs[outIdx], val);
      }
    }
  }
}

/** Registry of element types for the playground */
export const ELEMENT_TYPES = [
  "Buffer", "Toggle", "Interlock", "AND", "OR", "NOT",
  "OneShot", "Delay", "SR Latch", "Oscillator",
  "Analog Buffer", "Analog Ramp", "Analog Scaler", "Analog Sum",
  "Serial Buffer", "Crosspoint",
] as const;

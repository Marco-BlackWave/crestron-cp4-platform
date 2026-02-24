/**
 * Subsystem Simulator — TypeScript mock subsystems that respond to
 * signal changes, generating realistic feedback.
 */

import type { SignalEngine, SigType, SigValue } from "./SignalEngine";
import { JoinMap } from "./JoinMap";

export interface SubsystemSim {
  subsystemType: string;
  processSignal(roomId: string, type: SigType, offset: number, value: SigValue, engine: SignalEngine): void;
}

/** AV Subsystem Simulator */
export class AvSubsystemSim implements SubsystemSim {
  subsystemType = "av";
  private powerState = new Map<string, boolean>();
  private muteState = new Map<string, boolean>();
  private volumeLevel = new Map<string, number>();
  private activeSource = new Map<string, number>();

  processSignal(roomId: string, type: SigType, offset: number, value: SigValue, engine: SignalEngine): void {
    if (type !== "digital" || value !== true) return;

    switch (offset) {
      case JoinMap.Digital.PowerToggle: {
        const on = !(this.powerState.get(roomId) ?? false);
        this.powerState.set(roomId, on);
        engine.setOutput("digital", roomId, JoinMap.Digital.PowerFeedback, on);
        engine.setOutput("serial", roomId, JoinMap.Serial.StatusText, on ? "System On" : "System Off");
        break;
      }
      case JoinMap.Digital.VolumeUp: {
        const vol = Math.min(65535, (this.volumeLevel.get(roomId) ?? 32768) + 3277);
        this.volumeLevel.set(roomId, vol);
        engine.setOutput("analog", roomId, JoinMap.Analog.VolumeLevelFb, vol);
        break;
      }
      case JoinMap.Digital.VolumeDown: {
        const vol = Math.max(0, (this.volumeLevel.get(roomId) ?? 32768) - 3277);
        this.volumeLevel.set(roomId, vol);
        engine.setOutput("analog", roomId, JoinMap.Analog.VolumeLevelFb, vol);
        break;
      }
      case JoinMap.Digital.MuteToggle: {
        const muted = !(this.muteState.get(roomId) ?? false);
        this.muteState.set(roomId, muted);
        engine.setOutput("digital", roomId, JoinMap.Digital.MuteFeedback, muted);
        break;
      }
      default:
        if (offset >= JoinMap.Digital.SourceSelect1 && offset <= JoinMap.Digital.SourceSelect5) {
          const srcIdx = offset - JoinMap.Digital.SourceSelect1;
          this.activeSource.set(roomId, srcIdx);
          for (let i = 0; i < 5; i++) {
            engine.setOutput("digital", roomId, JoinMap.Digital.SourceFeedback1 + i, i === srcIdx);
          }
          const srcNames = ["HDMI 1", "HDMI 2", "HDMI 3", "Apple TV", "Sonos"];
          engine.setOutput("serial", roomId, JoinMap.Serial.SourceName, srcNames[srcIdx] ?? `Source ${srcIdx + 1}`);
        }
    }
  }
}

/** Lighting Subsystem Simulator */
export class LightingSubsystemSim implements SubsystemSim {
  subsystemType = "lighting";
  private sceneActive = new Map<string, number>();

  processSignal(roomId: string, type: SigType, offset: number, value: SigValue, engine: SignalEngine): void {
    if (type === "digital" && value === true) {
      if (offset >= JoinMap.Digital.LightingScene1 && offset <= JoinMap.Digital.LightingScene4) {
        const idx = offset - JoinMap.Digital.LightingScene1;
        this.sceneActive.set(roomId, idx);
        for (let i = 0; i < 4; i++) {
          engine.setOutput("digital", roomId, JoinMap.Digital.LightingSceneFb1 + i, i === idx);
        }
        const levels = [100, 75, 30, 0];
        engine.setOutput("analog", roomId, JoinMap.Analog.LightingLevelFb, Math.round(levels[idx] * 655));
        const names = ["Full", "Bright", "Dim", "Off"];
        engine.setOutput("serial", roomId, JoinMap.Serial.SceneName, names[idx]);
      }
    } else if (type === "analog" && offset === JoinMap.Analog.LightingSet) {
      engine.setOutput("analog", roomId, JoinMap.Analog.LightingLevelFb, value as number);
    }
  }
}

/** Shade Subsystem Simulator */
export class ShadeSubsystemSim implements SubsystemSim {
  subsystemType = "shades";

  processSignal(roomId: string, type: SigType, offset: number, value: SigValue, engine: SignalEngine): void {
    if (type === "digital" && value === true) {
      switch (offset) {
        case JoinMap.Digital.ShadeOpen:
          engine.setOutput("analog", roomId, JoinMap.Analog.ShadePositionFb, 65535);
          break;
        case JoinMap.Digital.ShadeClose:
          engine.setOutput("analog", roomId, JoinMap.Analog.ShadePositionFb, 0);
          break;
        case JoinMap.Digital.ShadeStop:
          break; // keep current position
      }
    } else if (type === "analog" && offset === JoinMap.Analog.ShadeSet) {
      engine.setOutput("analog", roomId, JoinMap.Analog.ShadePositionFb, value as number);
    }
  }
}

/** HVAC Subsystem Simulator */
export class HvacSubsystemSim implements SubsystemSim {
  subsystemType = "hvac";
  private modes = ["off", "heat", "cool", "auto"];
  private modeIdx = new Map<string, number>();
  private currentTemp = new Map<string, number>();

  processSignal(roomId: string, type: SigType, offset: number, value: SigValue, engine: SignalEngine): void {
    // Initialize current temp if not set
    if (!this.currentTemp.has(roomId)) {
      this.currentTemp.set(roomId, 720); // 72.0°F
      const scaled = (720 - 600) * 65535 / 300;
      engine.setOutput("analog", roomId, JoinMap.Analog.TempCurrent, Math.round(scaled));
      engine.setOutput("serial", roomId, JoinMap.Serial.HvacMode, "auto");
    }

    if (type === "digital" && value === true) {
      switch (offset) {
        case JoinMap.Digital.HvacModeToggle: {
          const idx = ((this.modeIdx.get(roomId) ?? 3) + 1) % this.modes.length;
          this.modeIdx.set(roomId, idx);
          engine.setOutput("serial", roomId, JoinMap.Serial.HvacMode, this.modes[idx]);
          break;
        }
        case JoinMap.Digital.HvacOnOff: {
          const current = this.modeIdx.get(roomId) ?? 3;
          const next = current === 0 ? 3 : 0;
          this.modeIdx.set(roomId, next);
          engine.setOutput("serial", roomId, JoinMap.Serial.HvacMode, this.modes[next]);
          break;
        }
      }
    } else if (type === "analog" && offset === JoinMap.Analog.TempSetpointSet) {
      engine.setOutput("analog", roomId, JoinMap.Analog.TempSetpointFb, value as number);
    }
  }
}

/** Security Subsystem Simulator */
export class SecuritySubsystemSim implements SubsystemSim {
  subsystemType = "security";

  processSignal(roomId: string, type: SigType, offset: number, value: SigValue, engine: SignalEngine): void {
    if (type !== "digital" || value !== true) return;

    const setArmFeedback = (mode: string) => {
      engine.setOutput("digital", roomId, JoinMap.Digital.SecurityArmedAwayFb, mode === "away");
      engine.setOutput("digital", roomId, JoinMap.Digital.SecurityArmedStayFb, mode === "stay");
      engine.setOutput("digital", roomId, JoinMap.Digital.SecurityArmedNightFb, mode === "night");
      engine.setOutput("digital", roomId, JoinMap.Digital.SecurityDisarmedFb, mode === "disarmed");
      engine.setOutput("serial", roomId, JoinMap.Serial.SecurityArmMode,
        mode === "disarmed" ? "Disarmed" : `Armed ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
      engine.setOutput("serial", roomId, JoinMap.Serial.SecurityStatus,
        mode === "disarmed" ? "Ready" : `Armed - ${mode}`);
      engine.setOutput("digital", roomId, JoinMap.Digital.SecurityReadyFb, mode === "disarmed");
    };

    switch (offset) {
      case JoinMap.Digital.SecurityArmAway:
        setArmFeedback("away");
        break;
      case JoinMap.Digital.SecurityArmStay:
        setArmFeedback("stay");
        break;
      case JoinMap.Digital.SecurityArmNight:
        setArmFeedback("night");
        break;
      case JoinMap.Digital.SecurityDisarm:
        setArmFeedback("disarmed");
        break;
      case JoinMap.Digital.SecurityPanic:
        engine.setOutput("digital", roomId, JoinMap.Digital.SecurityAlarmActiveFb, true);
        engine.setOutput("serial", roomId, JoinMap.Serial.SecurityStatus, "ALARM!");
        break;
    }
  }
}

/** Create all subsystem simulators */
export function createSubsystemSims(): SubsystemSim[] {
  return [
    new AvSubsystemSim(),
    new LightingSubsystemSim(),
    new ShadeSubsystemSim(),
    new HvacSubsystemSim(),
    new SecuritySubsystemSim(),
  ];
}

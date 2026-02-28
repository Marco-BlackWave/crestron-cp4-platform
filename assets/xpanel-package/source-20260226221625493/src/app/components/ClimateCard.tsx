import React, { useState } from "react";
import { GlassCard } from "./GlassCard";
import {
  ChevronUp,
  ChevronDown,
  Thermometer,
  Droplets,
  Clock,
  Wind,
  Snowflake,
  Flame,
  RefreshCw,
  Activity,
  History,
} from "lucide-react";
import { ClimateLogView } from "./ClimateLogView";

type CardSize = 1 | 2 | 3;

interface ClimateCardProps {
  cardSize?: CardSize;
}

const zones = [
  { name: "Living Room", temp: 22, humidity: 48, mode: "Cool" },
  { name: "Kitchen", temp: 21, humidity: 52, mode: "Auto" },
  { name: "Bedroom", temp: 20, humidity: 55, mode: "Heat" },
  { name: "Bathroom", temp: 24, humidity: 68, mode: "Cool" },
];

const schedule = [
  { time: "6:00 AM", temp: 20, label: "Wake" },
  { time: "9:00 AM", temp: 18, label: "Away" },
  { time: "5:00 PM", temp: 22, label: "Return" },
  { time: "10:00 PM", temp: 19, label: "Sleep" },
];

const modes = [
  { id: "cool" as const, label: "Cool", icon: Snowflake, color: "text-cyan-400" },
  { id: "heat" as const, label: "Heat", icon: Flame, color: "text-orange-400" },
  { id: "auto" as const, label: "Auto", icon: RefreshCw, color: "text-emerald-400" },
  { id: "fan" as const, label: "Fan", icon: Wind, color: "text-blue-300" },
];

function getHvacState(mode: string, setpoint: number, currentTemp: number) {
  if (mode === "fan") return { label: "Fan Only", color: "text-blue-300", icon: Wind };
  if (mode === "cool" && currentTemp > setpoint) return { label: "Cooling", color: "text-cyan-400", icon: Snowflake };
  if (mode === "heat" && currentTemp < setpoint) return { label: "Heating", color: "text-orange-400", icon: Flame };
  if (mode === "auto") {
    if (currentTemp > setpoint + 1) return { label: "Cooling", color: "text-cyan-400", icon: Snowflake };
    if (currentTemp < setpoint - 1) return { label: "Heating", color: "text-orange-400", icon: Flame };
  }
  return { label: "Idle", color: "text-white/30", icon: Activity };
}

export function ClimateCard({ cardSize = 1 }: ClimateCardProps) {
  const [temp, setTemp] = useState(21);
  const [mode, setMode] = useState<"cool" | "heat" | "auto" | "fan">("cool");
  const [showLog, setShowLog] = useState(false);

  const currentTemp = 23;
  const currentHumidity = 48;

  const hvacState = getHvacState(mode, temp, currentTemp);
  const HvacIcon = hvacState.icon;

  /* shared temp control header */
  const tempControl = (
    <>
      <div className="flex items-center gap-2">
        <Thermometer className="w-4 h-4 text-white/30" />
        <h3 className="text-white/60 text-xs tracking-widest uppercase">Climate</h3>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex flex-col">
          <span className="text-white/25 text-[8px] tracking-widest uppercase mb-1">Setpoint</span>
          <div className="flex items-end gap-1">
            <span
              className="text-white text-5xl tracking-tight"
              style={{ textShadow: "0 0 20px rgba(255,255,255,0.08)" }}
            >
              {temp}
            </span>
            <span className="text-white/50 text-xl mb-1.5">°C</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setTemp((t) => Math.min(t + 1, 35))}
            className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTemp((t) => Math.max(t - 1, 10))}
            className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  /* mode selector row */
  const modeSelector = (
    <div className="flex gap-1">
      {modes.map((m) => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[9px] transition-all ${
              active
                ? `bg-white/[0.08] ${m.color} border border-white/[0.12]`
                : "bg-white/[0.03] text-white/25 border border-white/[0.05] hover:bg-white/[0.06]"
            }`}
          >
            <Icon className="w-3 h-3" />
            {m.label}
          </button>
        );
      })}
    </div>
  );

  /* history button – same tier as mode buttons */
  const historyButton = (
    <button
      onClick={() => setShowLog(true)}
      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[9px] transition-all bg-blue-500/[0.15] text-blue-400 border border-blue-500/[0.25] hover:bg-blue-500/[0.25] hover:text-blue-300"
    >
      <History className="w-3 h-3" />
      History
    </button>
  );

  /* current readings strip */
  const currentReadings = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Thermometer className="w-3 h-3 text-white/25" />
        <span className="text-white/50 text-[11px]">{currentTemp}°C</span>
      </div>
      <div className="w-px h-3 bg-white/[0.08]" />
      <div className="flex items-center gap-1.5">
        <Droplets className="w-3 h-3 text-blue-400/50" />
        <span className="text-white/50 text-[11px]">{currentHumidity}%</span>
      </div>
      <div className="w-px h-3 bg-white/[0.08]" />
      <div className="flex items-center gap-1.5">
        <HvacIcon className={`w-3 h-3 ${hvacState.color} opacity-60`} />
        <span className={`text-[11px] ${hvacState.color} opacity-60`}>{hvacState.label}</span>
      </div>
    </div>
  );

  /* shared zone details */
  const zoneDetails = (
    <div className="space-y-2.5">
      <span className="text-white/30 text-[10px] tracking-widest uppercase">Zone Details</span>
      {zones.map((z) => (
        <div key={z.name} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
          <span className="text-white/50 text-xs">{z.name}</span>
          <div className="flex items-center gap-3">
            {cardSize === 3 && (
              <span className="text-white/20 text-[9px] bg-white/[0.04] px-1.5 py-0.5 rounded">{z.mode}</span>
            )}
            <div className="flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-white/20" />
              <span className="text-white/60 text-xs">{z.temp}°</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-400/40" />
              <span className="text-white/40 text-[10px]">{z.humidity}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  /* HVAC status footer */
  const dotColor =
    hvacState.label === "Idle"
      ? "rgba(255,255,255,0.2)"
      : hvacState.label === "Cooling"
        ? "#22d3ee"
        : hvacState.label === "Heating"
          ? "#fb923c"
          : "#93c5fd";

  const statusFooter = (
    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: dotColor,
            boxShadow: hvacState.label !== "Idle" ? `0 0 6px ${dotColor}` : "none",
          }}
        />
        <span className={`text-[11px] ${hvacState.color}`}>{hvacState.label}</span>
      </div>
      <button
        onClick={() => setShowLog(true)}
        className="flex items-center gap-1.5 text-white/25 hover:text-white/50 transition-colors"
      >
        <History className="w-3 h-3" />
        <span className="text-[10px]">History</span>
      </button>
    </div>
  );

  /* ── Log overlay ── */
  const logOverlay = showLog && (
    <div className="fixed inset-0 z-[9999] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => setShowLog(false)}
      />
      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-10 max-w-[1200px] w-full mx-auto">
        <ClimateLogView onBack={() => setShowLog(false)} />
      </div>
    </div>
  );

  /* ── Size 1 (S): Compact but full ── */
  if (cardSize === 1) {
    return (
      <>
        <GlassCard className="p-4 flex flex-col h-full">
          {tempControl}
          <div className="flex-1" />
          <div className="mb-2.5">{currentReadings}</div>
          <div className="mb-1.5">{modeSelector}</div>
          <div className="mb-3">{historyButton}</div>
          {/* Zone mini temps */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {zones.map((z) => (
              <div key={z.name} className="flex items-center justify-between">
                <span className="text-white/30 text-[10px] truncate">{z.name}</span>
                <span className="text-white/50 text-[10px]">{z.temp}°</span>
              </div>
            ))}
          </div>
          {/* Status footer */}
          <div className="pt-2">{statusFooter}</div>
        </GlassCard>
        {logOverlay}
      </>
    );
  }

  /* ── Size 2 (M): + actions + zone details ── */
  if (cardSize === 2) {
    return (
      <>
        <GlassCard className="p-4 flex flex-col h-full">
          {tempControl}
          <div className="flex-1" />
          <div className="mb-2.5">{currentReadings}</div>
          <div className="mb-1.5">{modeSelector}</div>
          <div className="mb-3">{historyButton}</div>
          <div>{zoneDetails}</div>
          <div className="mt-auto">{statusFooter}</div>
        </GlassCard>
        {logOverlay}
      </>
    );
  }

  /* ── Size 3 (L): + zone details + actions + schedule ── */
  return (
    <>
      <GlassCard className="p-4 flex flex-col h-full">
        {tempControl}
        <div className="flex-1" />
        <div className="mb-2.5">{currentReadings}</div>
        <div className="mb-1.5">{modeSelector}</div>
        <div className="mb-3">{historyButton}</div>
        <div>{zoneDetails}</div>
        {/* Schedule */}
        <div className="mt-4 space-y-1.5">
          <span className="text-white/30 text-[10px] tracking-widest uppercase">Today's Schedule</span>
          <div className="grid grid-cols-4 gap-1">
            {schedule.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.05]"
              >
                <Clock className="w-2.5 h-2.5 text-white/20 mb-0.5" />
                <span className="text-white/60 text-[10px]">{s.temp}°</span>
                <span className="text-white/25 text-[8px]">{s.label}</span>
                <span className="text-white/15 text-[7px]">{s.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto">{statusFooter}</div>
      </GlassCard>
      {logOverlay}
    </>
  );
}
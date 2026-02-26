import React, { useState, useRef, useCallback, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { Snowflake, Wind, Flame, Power, Droplets } from "lucide-react";

/* ─── Constants ─── */
const MIN_TEMP = 16;
const MAX_TEMP = 32;
const RANGE = MAX_TEMP - MIN_TEMP;
const ACTUAL_TEMP = 23; // mock ambient/actual temperature
const ACTUAL_HUMIDITY = 52; // mock humidity %

const START_ANGLE = 135; // bottom-left (SVG: 0°=right, CW)
const SWEEP = 270;
const END_ANGLE = START_ANGLE + SWEEP; // 405

type Mode = "cooling" | "airwaves" | "heating";

const MODES: { id: Mode; label: string; icon: typeof Snowflake }[] = [
  { id: "cooling", label: "Cool", icon: Snowflake },
  { id: "airwaves", label: "Fan", icon: Wind },
  { id: "heating", label: "Heat", icon: Flame },
];

const MODE_COLORS: Record<
  Mode,
  {
    primary: string;
    glow: string;
    gradStart: string;
    gradEnd: string;
    thumbGlow: string;
    bgActive: string;
    borderActive: string;
    textActive: string;
    shadowActive: string;
  }
> = {
  cooling: {
    primary: "#3b82f6",
    glow: "rgba(59,130,246,0.5)",
    gradStart: "rgba(96,165,250,0.9)",
    gradEnd: "rgba(37,99,235,1)",
    thumbGlow: "rgba(59,130,246,0.7)",
    bgActive: "bg-blue-500/80",
    borderActive: "border-blue-400/50",
    textActive: "text-white",
    shadowActive: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
  },
  heating: {
    primary: "#f97316",
    glow: "rgba(249,115,22,0.5)",
    gradStart: "rgba(251,191,36,0.9)",
    gradEnd: "rgba(234,88,12,1)",
    thumbGlow: "rgba(249,115,22,0.7)",
    bgActive: "bg-orange-500/80",
    borderActive: "border-orange-400/50",
    textActive: "text-white",
    shadowActive: "shadow-[0_0_20px_rgba(249,115,22,0.3)]",
  },
  airwaves: {
    primary: "#22c55e",
    glow: "rgba(34,197,94,0.5)",
    gradStart: "rgba(74,222,128,0.9)",
    gradEnd: "rgba(22,163,74,1)",
    thumbGlow: "rgba(34,197,94,0.7)",
    bgActive: "bg-green-500/80",
    borderActive: "border-green-400/50",
    textActive: "text-white",
    shadowActive: "shadow-[0_0_20px_rgba(34,197,94,0.3)]",
  },
};

/* ─── Helpers ─── */
function tempToAngle(t: number): number {
  return START_ANGLE + ((t - MIN_TEMP) / RANGE) * SWEEP;
}

function angleToXY(angle: number, r: number, cx: number, cy: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  a1: number,
  a2: number
): string {
  const start = angleToXY(a1, r, cx, cy);
  const end = angleToXY(a2, r, cx, cy);
  const sweep = a2 - a1;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function normalizeAngle(a: number): number {
  return ((a % 360) + 360) % 360;
}

/* ─── Component ─── */
export function AirConditionerCard({ cardSize = 1 }: { cardSize?: 1 | 2 | 3 }) {
  const [temp, setTemp] = useState(21);
  const enabled = true;
  const [mode, setMode] = useState<Mode>("cooling");
  const [isDragging, setIsDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // SVG dimensions scale with card size
  const SIZE = cardSize === 1 ? 210 : 284;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = cardSize === 1 ? 86 : 118;
  const TRACK_WIDTH = cardSize === 1 ? 4 : 5;
  const THUMB_R = cardSize === 1 ? 7 : 9;

  const colors = MODE_COLORS[mode];

  /* ── Calling / Idle logic ── */
  // Cooling calls when room is warmer than setpoint
  // Heating calls when room is cooler than setpoint
  // Fan always runs (no idle concept)
  const isCalling =
    mode === "cooling"
      ? ACTUAL_TEMP > temp
      : mode === "heating"
        ? ACTUAL_TEMP < temp
        : true; // fan always "on"

  const statusLabel =
    mode === "airwaves"
      ? "Fan"
      : isCalling
        ? mode === "cooling"
          ? "Cooling"
          : "Heating"
        : "Idle";

  // Angle positions
  const setAngle = tempToAngle(temp);
  const actualAngle = tempToAngle(
    Math.max(MIN_TEMP, Math.min(MAX_TEMP, ACTUAL_TEMP))
  );
  const setPos = angleToXY(setAngle, R, CX, CY);
  const actualPos = angleToXY(actualAngle, R, CX, CY);

  // Arc paths
  const bgArcPath = describeArc(CX, CY, R, START_ANGLE, END_ANGLE);
  const filledArcPath = describeArc(CX, CY, R, START_ANGLE, setAngle);

  /* ── Drag logic ── */
  const getAngleFromPointer = useCallback(
    (clientX: number, clientY: number): number | null => {
      if (!svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      angle = normalizeAngle(angle);

      let mappedAngle = angle;
      if (angle < START_ANGLE - 10) {
        mappedAngle = angle + 360;
      }
      if (mappedAngle < START_ANGLE) mappedAngle = START_ANGLE;
      if (mappedAngle > END_ANGLE) mappedAngle = END_ANGLE;

      return mappedAngle;
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      const angle = getAngleFromPointer(e.clientX, e.clientY);
      if (angle !== null) {
        const newTemp = Math.round(
          MIN_TEMP + ((angle - START_ANGLE) / SWEEP) * RANGE
        );
        setTemp(Math.max(MIN_TEMP, Math.min(MAX_TEMP, newTemp)));
      }
    },
    [enabled, getAngleFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const angle = getAngleFromPointer(e.clientX, e.clientY);
      if (angle !== null) {
        const newTemp = Math.round(
          MIN_TEMP + ((angle - START_ANGLE) / SWEEP) * RANGE
        );
        setTemp(Math.max(MIN_TEMP, Math.min(MAX_TEMP, newTemp)));
      }
    },
    [isDragging, getAngleFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const up = () => setIsDragging(false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [isDragging]);

  // Gradient IDs
  const gradId = `bezelGrad-${mode}`;
  const glowId = `bezelGlow-${mode}`;
  const thumbGlowId = `thumbGlow-${mode}`;

  // Should the arc pulse? Only when calling for cooling/heating
  const shouldPulse = enabled && isCalling && mode !== "airwaves";

  /* All sizes show the bezel — scaled by cardSize */
  const tstatZones = [
    { name: "Living Room", temp: 22, mode: "Cool" },
    { name: "Kitchen", temp: 21, mode: "Auto" },
    { name: "Bedroom", temp: 20, mode: "Heat" },
  ];

  return (
    <GlassCard className="p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Snowflake className="w-4 h-4 text-blue-400/60" />
          <h3 className="text-white/60 text-xs tracking-widest uppercase">Thermostat</h3>
        </div>
        <div
          className={`w-2 h-2 rounded-full transition-all ${
            enabled
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
              : "bg-white/30"
          }`}
        />
      </div>
      <p className="text-white/40 text-xs mb-3">Living Room</p>

      {/* Bezel */}
      <div className="flex items-center justify-center flex-1 min-h-0">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg
            ref={svgRef}
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className={`${enabled ? "cursor-pointer" : "opacity-40"}`}
            style={{ touchAction: "none" }}
            data-no-drag
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <defs>
              <linearGradient
                id={gradId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={colors.gradStart} />
                <stop offset="100%" stopColor={colors.gradEnd} />
              </linearGradient>
              <filter
                id={glowId}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter
                id={thumbGlowId}
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

            </defs>

            {/* Background arc track */}
            <path
              d={bgArcPath}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={TRACK_WIDTH}
              strokeLinecap="round"
            />

            {/* Filled arc — pulses when calling */}
            {enabled && (
              <path
                d={filledArcPath}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={TRACK_WIDTH}
                strokeLinecap="round"
                filter={`url(#${glowId})`}
                className={`${shouldPulse ? "tstat-pulse" : ""} ${isDragging ? "" : "transition-all duration-300"}`}
              />
            )}

            {/* Actual temperature white dot */}
            {enabled && (
              <circle
                cx={actualPos.x}
                cy={actualPos.y}
                r={3.5}
                fill="white"
                opacity={0.9}
              />
            )}

            {/* Draggable thumb */}
            {enabled && (
              <g
                className={isDragging ? "" : "transition-all duration-300"}
              >
                <circle
                  cx={setPos.x}
                  cy={setPos.y}
                  r={THUMB_R + 3}
                  fill={colors.thumbGlow}
                  opacity={isDragging ? 0.4 : 0.15}
                  filter={`url(#${thumbGlowId})`}
                />
                <circle
                  cx={setPos.x}
                  cy={setPos.y}
                  r={THUMB_R}
                  fill="rgba(15,18,30,0.85)"
                  stroke="white"
                  strokeWidth={2.5}
                />
                <circle
                  cx={setPos.x}
                  cy={setPos.y}
                  r={4}
                  fill={colors.primary}
                  opacity={0.7}
                />
              </g>
            )}
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Mode / status label with pulse when calling */}
            <div
              className={`flex items-center gap-1 ${cardSize === 1 ? "mb-1.5" : "mb-3"} ${shouldPulse ? "tstat-pulse" : ""}`}
            >
              {mode === "cooling" && (
                <Snowflake
                  className={cardSize === 1 ? "w-3 h-3" : "w-3.5 h-3.5"}
                  style={{ color: colors.primary, opacity: 0.7 }}
                />
              )}
              {mode === "heating" && (
                <Flame
                  className={cardSize === 1 ? "w-3 h-3" : "w-3.5 h-3.5"}
                  style={{ color: colors.primary, opacity: 0.7 }}
                />
              )}
              {mode === "airwaves" && (
                <Wind
                  className={cardSize === 1 ? "w-3 h-3" : "w-3.5 h-3.5"}
                  style={{ color: colors.primary, opacity: 0.7 }}
                />
              )}
              <span
                className={`${cardSize === 1 ? "text-[8px]" : "text-[10px]"} uppercase tracking-widest`}
                style={{
                  color:
                    !enabled
                      ? "rgba(255,255,255,0.2)"
                      : statusLabel === "Idle"
                        ? "rgba(255,255,255,0.3)"
                        : colors.primary,
                }}
              >
                {statusLabel}
              </span>
            </div>

            {/* Set temperature */}
            <div className="flex items-end gap-0.5">
              <span
                className={`${cardSize === 1 ? "text-3xl" : "text-5xl"} tracking-tight transition-colors ${
                  enabled ? "text-white" : "text-white/30"
                }`}
              >
                {temp}
              </span>
              <span className={`text-white/40 ${cardSize === 1 ? "text-base" : "text-xl"} mb-1`}>°C</span>
            </div>

            {/* Humidity */}
            <div className={`flex items-center gap-1 ${cardSize === 1 ? "mt-1.5" : "mt-2.5"}`}>
              <Droplets className={`${cardSize === 1 ? "w-2.5 h-2.5" : "w-3 h-3"} text-blue-400/50`} />
              <span className={`text-white/30 ${cardSize === 1 ? "text-[9px]" : "text-[11px]"}`}>
                {ACTUAL_HUMIDITY}%
              </span>
            </div>

            {/* Actual temperature readout */}
            <div className={`flex items-center gap-1 ${cardSize === 1 ? "mt-1" : "mt-1.5"}`}>
              <div
                className="w-1.5 h-1.5 rounded-full bg-white/70"
                style={{
                  boxShadow: "0 0 5px rgba(255,255,255,0.4)",
                }}
              />
              <span className={`text-white/25 ${cardSize === 1 ? "text-[8px]" : "text-[10px]"}`}>
                Room {ACTUAL_TEMP}°C
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="mt-2">
        <div className="flex gap-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            const isActive = mode === m.id;
            const mColors = MODE_COLORS[m.id];
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                disabled={!enabled}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${
                  isActive
                    ? `${mColors.bgActive} ${mColors.borderActive} ${mColors.textActive} ${mColors.shadowActive}`
                    : "bg-white/[0.06] border-white/10 text-white/40 hover:bg-white/[0.12] hover:text-white/70"
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[11px]">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom info strip */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Power className="w-3 h-3 text-white/20" />
          <span className="text-white/25 text-[10px]">
            {enabled
              ? isCalling && mode !== "airwaves"
                ? `${mode === "cooling" ? "Compressor" : "Furnace"} Running`
                : "System Idle"
              : "System Off"}
          </span>
        </div>
        <span className="text-white/15 text-[10px]">Drag bezel to adjust</span>
      </div>

      {/* Size 3: Zone breakdown */}
      {cardSize === 3 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
          <span className="text-white/30 text-[10px] tracking-widest uppercase">Zone Temperatures</span>
          {tstatZones.map((z) => (
            <div key={z.name} className="flex items-center justify-between py-1 border-b border-white/[0.04]">
              <span className="text-white/50 text-xs">{z.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-white/20 text-[9px] bg-white/[0.04] px-1.5 py-0.5 rounded">{z.mode}</span>
                <span className="text-white/60 text-xs">{z.temp}°C</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
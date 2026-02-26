import React, { useState, useRef, useCallback } from "react";
import { GlassCard } from "./GlassCard";
import { Sun, Palette } from "lucide-react";
import { GlassSlider } from "./ui/GlassSlider";

type CardSize = 1 | 2 | 3;

interface LightningControlCardProps {
  cardSize?: CardSize;
}

export function LightningControlCard({ cardSize = 1 }: LightningControlCardProps) {
  const enabled = true;
  const [colorPosition, setColorPosition] = useState(45);
  const [intensity, setIntensity] = useState(80);
  const colorRef = useRef<HTMLDivElement>(null);
  const [colorDragging, setColorDragging] = useState(false);

  /* ── Color picker pointer helpers ── */
  const pctFromPointer = useCallback(
    (clientX: number): number => {
      if (!colorRef.current) return colorPosition;
      const rect = colorRef.current.getBoundingClientRect();
      return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    },
    [colorPosition]
  );

  const onColorPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setColorDragging(true);
      setColorPosition(Math.round(pctFromPointer(e.clientX)));
    },
    [enabled, pctFromPointer]
  );

  const onColorPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!colorDragging) return;
      e.preventDefault();
      setColorPosition(Math.round(pctFromPointer(e.clientX)));
    },
    [colorDragging, pctFromPointer]
  );

  const onColorPointerUp = useCallback(() => {
    setColorDragging(false);
  }, []);

  const getColorFromPosition = (pos: number) => {
    if (pos < 20) return "#f97316";
    if (pos < 40) return "#f43f5e";
    if (pos < 60) return "#a855f7";
    if (pos < 80) return "#6366f1";
    return "#3b82f6";
  };

  const currentColor = getColorFromPosition(colorPosition);

  const presets = [
    { name: "Warm", color: "#f97316", pos: 10 },
    { name: "Rose", color: "#f43f5e", pos: 35 },
    { name: "Purple", color: "#a855f7", pos: 55 },
    { name: "Blue", color: "#3b82f6", pos: 90 },
  ];

  const roomZones = [
    { name: "Living Room", on: true, intensity: 80 },
    { name: "Kitchen", on: true, intensity: 60 },
    { name: "Bedroom", on: false, intensity: 0 },
    { name: "Hallway", on: true, intensity: 45 },
  ];

  /* shared header */
  const header = (
    <div className="flex items-center gap-2 mb-4">
      <Palette className="w-4 h-4 text-purple-400/60" />
      <h3 className="text-white/60 text-xs tracking-widest uppercase">Color Lab</h3>
    </div>
  );

  /* shared color picker — now draggable */
  const colorPicker = (
    <div className="mb-5">
      <span className="text-white/40 text-[10px] tracking-widest uppercase mb-3 block">Soft light</span>
      <div
        ref={colorRef}
        data-no-drag
        className={`relative rounded-full select-none ${!enabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
        style={{
          height: 20,
          touchAction: "none",
        }}
        onPointerDown={onColorPointerDown}
        onPointerMove={onColorPointerMove}
        onPointerUp={onColorPointerUp}
        onPointerCancel={onColorPointerUp}
      >
        {/* Gradient track */}
        <div
          className="absolute left-0 right-0 rounded-full"
          style={{
            top: 7,
            height: 6,
            background: "linear-gradient(to right, #f97316, #ef4444, #f43f5e, #ec4899, #a855f7, #6366f1, #3b82f6)",
          }}
        />
        {/* Thumb */}
        <div
          className="absolute rounded-full border-2 border-white"
          style={{
            width: 18,
            height: 18,
            top: 1,
            left: `calc(${colorPosition}% - 9px)`,
            backgroundColor: currentColor,
            boxShadow: `0 0 12px ${currentColor}80, 0 1px 4px rgba(0,0,0,0.4)`,
            transition: colorDragging ? "none" : "left 0.1s ease-out",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );

  /* shared intensity slider */
  const intensitySlider = (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 transition-colors" style={{ color: enabled ? "#60a5fa" : "rgba(255,255,255,0.3)" }} />
          <span className="text-white/60 text-xs">Intensity</span>
        </div>
        <span className={`text-sm transition-colors ${enabled ? "text-white" : "text-white/30"}`}>{intensity}%</span>
      </div>
      <GlassSlider
        value={intensity}
        onChange={setIntensity}
        disabled={!enabled}
        fillColor="rgba(59,130,246,0.9)"
        thumbGlow="rgba(59,130,246,0.45)"
        trackH={5}
      />
    </div>
  );

  /* ── Size 1 (S): Standard ── */
  if (cardSize === 1) {
    return (
      <GlassCard className="p-5 flex flex-col h-full">
        {header}
        {colorPicker}
        {intensitySlider}
      </GlassCard>
    );
  }

  /* ── Size 2 (M): + presets ── */
  if (cardSize === 2) {
    return (
      <GlassCard className="p-5 flex flex-col h-full">
        {header}
        {colorPicker}
        {intensitySlider}
        <div className="mt-auto pt-4 border-t border-white/[0.06]">
          <span className="text-white/30 text-[10px] tracking-widest uppercase block mb-2">Presets</span>
          <div className="flex gap-2">
            {presets.map((p) => (
              <button key={p.name} onClick={() => { setColorPosition(p.pos); }}
                className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all"
              >
                <div className="w-5 h-5 rounded-full" style={{ background: p.color, boxShadow: `0 0 10px ${p.color}50` }} />
                <span className="text-white/40 text-[9px]">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  /* ── Size 3 (L): + presets + room zones ── */
  return (
    <GlassCard className="p-5 flex flex-col h-full">
      {header}
      {colorPicker}
      {intensitySlider}
      <div className="mt-5 pt-3 border-t border-white/[0.06]">
        <span className="text-white/30 text-[10px] tracking-widest uppercase block mb-2">Presets</span>
        <div className="flex gap-2">
          {presets.map((p) => (
            <button key={p.name} onClick={() => { setColorPosition(p.pos); }}
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all"
            >
              <div className="w-5 h-5 rounded-full" style={{ background: p.color, boxShadow: `0 0 10px ${p.color}50` }} />
              <span className="text-white/40 text-[9px]">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2.5">
        <span className="text-white/30 text-[10px] tracking-widest uppercase">Room Zones</span>
        {roomZones.map((z) => (
          <div key={z.name} className="flex items-center justify-between py-1 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${z.on ? "bg-blue-400" : "bg-white/20"}`}
                style={z.on ? { boxShadow: `0 0 6px ${currentColor}60` } : {}}
              />
              <span className="text-white/50 text-xs">{z.name}</span>
            </div>
            <span className="text-white/30 text-[10px]">{z.on ? `${z.intensity}%` : "Off"}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
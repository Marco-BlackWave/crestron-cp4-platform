import React, { useState } from "react";
import { GlassCard } from "./GlassCard";
import { Lightbulb } from "lucide-react";
import { GlassSlider } from "./ui/GlassSlider";

type CardSize = 1 | 2 | 3;

interface LightingCardProps {
  cardSize?: CardSize;
}

export function LightingCard({ cardSize = 1 }: LightingCardProps) {
  const [brightness, setBrightness] = useState(75);
  const [scene, setScene] = useState("Evening");

  const dots = Array.from({ length: 16 }, (_, i) => i < Math.round((brightness / 100) * 16));
  const scenes = ["Evening", "Movie", "Bright", "Night"];
  const zones = [
    { name: "Living Room", pct: 85, on: true },
    { name: "Kitchen", pct: 60, on: true },
    { name: "Hallway", pct: 45, on: true },
    { name: "Bedroom", pct: 30, on: false },
    { name: "Bathroom", pct: 70, on: true },
  ];

  /* shared header block */
  const header = (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400/60" />
          <h3 className="text-white/60 text-xs tracking-widest uppercase">Lighting</h3>
        </div>
        <span className="text-white/30 text-[10px] ml-6 mt-1 block">Scene: {scene}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {dots.map((on, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
              on ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" : "bg-white/15"
            }`}
          />
        ))}
      </div>
    </div>
  );

  /* shared brightness readout + slider */
  const slider = (
    <>
      <div className="mt-4">
        <span className="text-white text-3xl">{brightness}%</span>
        <span className="text-white/50 text-sm ml-1.5">On</span>
      </div>
      <div className="mt-3">
        <GlassSlider
          value={brightness}
          onChange={setBrightness}
          fillColor="rgba(251,191,36,0.8)"
          thumbGlow="rgba(251,191,36,0.5)"
        />
      </div>
    </>
  );

  /* shared scene selector */
  const sceneSelector = (
    <div className="pt-3 border-t border-white/[0.06]">
      <span className="text-white/30 text-[10px] tracking-widest uppercase block mb-2">Scene</span>
      <div className="flex gap-1.5">
        {scenes.map((s) => (
          <button
            key={s}
            onClick={() => setScene(s)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] transition-all ${
              scene === s
                ? "bg-amber-500/25 text-amber-300 border border-amber-500/30"
                : "bg-white/[0.04] text-white/30 border border-white/[0.06] hover:bg-white/[0.08]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );

  /* shared zone bars */
  const zoneBars = (
    <div className="space-y-2.5">
      <span className="text-white/30 text-[10px] tracking-widest uppercase">Zones</span>
      {zones.slice(0, cardSize === 2 ? 4 : 5).map((z) => (
        <div key={z.name} className="flex items-center gap-3">
          <span className="text-white/50 text-xs w-24 shrink-0">{z.name}</span>
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-amber-400/70" style={{ width: `${z.pct}%` }} />
          </div>
          <span className="text-white/30 text-[10px] w-8 text-right">{z.pct}%</span>
        </div>
      ))}
    </div>
  );

  /* ── Size 1 (S): Standard card ── */
  if (cardSize === 1) {
    return (
      <GlassCard className="p-5 flex flex-col justify-between h-full">
        {header}
        {slider}
      </GlassCard>
    );
  }

  /* ── Size 2 (M): + zones + scene selector ── */
  if (cardSize === 2) {
    return (
      <GlassCard className="p-5 flex flex-col justify-between h-full">
        <div>
          {header}
          {slider}
          <div className="mt-5">{zoneBars}</div>
        </div>
        <div className="mt-4">{sceneSelector}</div>
      </GlassCard>
    );
  }

  /* ── Size 3 (L): + zones with individual sliders + scene + stats ── */
  return (
    <GlassCard className="p-5 flex flex-col justify-between h-full">
      <div>
        {header}
        {slider}
        {/* Per-zone individual controls */}
        <div className="mt-5 space-y-3">
          <span className="text-white/30 text-[10px] tracking-widest uppercase">Zone Controls</span>
          {zones.map((z) => (
            <div key={z.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Lightbulb
                    className="w-3 h-3"
                    style={{ color: z.on ? "rgba(251,191,36,0.7)" : "rgba(255,255,255,0.2)" }}
                  />
                  <span className="text-white/50 text-xs">{z.name}</span>
                </div>
                <span className="text-white/30 text-[10px]">{z.pct}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-amber-400/60" style={{ width: `${z.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {sceneSelector}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <span className="text-white/25 text-[10px]">5 zones active</span>
          <span className="text-amber-400/40 text-[10px]">Avg {Math.round(zones.reduce((a, z) => a + z.pct, 0) / zones.length)}%</span>
        </div>
      </div>
    </GlassCard>
  );
}
import React, { useState } from "react";
import { GlassCard } from "./GlassCard";
import { Zap } from "lucide-react";

type CardSize = 1 | 2 | 3;

interface PowerCardProps {
  cardSize?: CardSize;
}

const data = [
  { time: "6a", kWh: 8 },
  { time: "8a", kWh: 15 },
  { time: "10a", kWh: 22 },
  { time: "12p", kWh: 28 },
  { time: "2p", kWh: 32 },
  { time: "4p", kWh: 38 },
  { time: "6p", kWh: 45 },
];

const maxVal = 50;
const chartW = 280;
const padL = 30;
const padB = 20;
const plotW = chartW - padL;
const yTicks = [0, 15, 30, 45];

function buildPath(chartH: number) {
  const plotH = chartH - padB;
  const points = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * plotW,
    y: plotH - (d.kWh / maxVal) * plotH,
  }));

  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) / 3;
    const cpx2 = curr.x - (curr.x - prev.x) / 3;
    line += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const last = points[points.length - 1];
  const first = points[0];
  const area = `${line} L ${last.x} ${plotH} L ${first.x} ${plotH} Z`;
  return { line, area, plotH };
}

const stats = [
  { label: "Peak", value: "6.2 kW", sub: "2:30 PM" },
  { label: "Average", value: "3.8 kW", sub: "Today" },
  { label: "Cost", value: "$12.40", sub: "Est." },
];

const roomBreakdown = [
  { name: "Living Room", kWh: 14, pct: 31 },
  { name: "Kitchen", kWh: 11, pct: 24 },
  { name: "HVAC", kWh: 9, pct: 20 },
  { name: "Bedroom", kWh: 6, pct: 13 },
  { name: "Other", kWh: 5, pct: 12 },
];

export function PowerCard({ cardSize = 1 }: PowerCardProps) {
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const chartH = cardSize === 1 ? 120 : cardSize === 2 ? 150 : 180;
  const { line, area, plotH } = buildPath(chartH);
  const gradId = `powerGrad-${cardSize}`;

  /* shared header */
  const header = (
    <div className="flex items-start justify-between mb-1">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-amber-400/60" />
          <h3 className="text-white/60 text-xs tracking-widest uppercase">Power</h3>
        </div>
        <div className="flex items-end gap-1.5 mt-1">
          <span className="text-white text-2xl">45</span>
          <span className="text-white/50 text-sm mb-0.5">kWh Today</span>
        </div>
      </div>
      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
        <Zap className="w-4 h-4 text-emerald-400" />
      </div>
    </div>
  );

  /* shared chart SVG */
  const chart = (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ height: chartH + 20 }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="rgba(52, 211, 153, 0.4)" />
          <stop offset="95%" stopColor="rgba(52, 211, 153, 0)" />
        </linearGradient>
      </defs>
      {yTicks.map((v) => {
        const y = plotH - (v / maxVal) * plotH;
        return (
          <text key={v} x={padL - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9}>{v}</text>
        );
      })}
      {data.map((d, i) => {
        const x = padL + (i / (data.length - 1)) * plotW;
        return (
          <text key={d.time} x={x} y={chartH - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={9}>{d.time}</text>
        );
      })}
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke="rgba(52, 211, 153, 0.8)" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );

  /* ── Size 1 (S): Standard chart + period + stats ── */
  if (cardSize === 1) {
    return (
      <GlassCard className="p-5 flex flex-col h-full">
        {header}
        <div className="flex gap-1 mt-1 mb-1">
          {(["today", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider transition-all ${
                period === p
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/[0.04] text-white/30 border border-white/[0.06] hover:bg-white/[0.08]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="w-full overflow-hidden flex-1">{chart}</div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.06]">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <span className="text-white/30 text-[8px] uppercase tracking-wider block">{s.label}</span>
              <span className="text-white text-xs block mt-0.5">{s.value}</span>
              <span className="text-white/20 text-[8px]">{s.sub}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  /* ── Size 2 (M): + period selector + stats row ── */
  if (cardSize === 2) {
    return (
      <GlassCard className="p-5 flex flex-col h-full">
        {header}
        <div className="flex gap-1 mt-2 mb-2">
          {(["today", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-wider transition-all ${
                period === p
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/[0.04] text-white/30 border border-white/[0.06] hover:bg-white/[0.08]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="w-full overflow-hidden flex-1">{chart}</div>
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[0.06]">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <span className="text-white/30 text-[9px] uppercase tracking-wider block">{s.label}</span>
              <span className="text-white text-sm block mt-0.5">{s.value}</span>
              <span className="text-white/25 text-[9px]">{s.sub}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  /* ── Size 3 (L): + period + stats + room breakdown ── */
  return (
    <GlassCard className="p-5 flex flex-col h-full">
      {header}
      <div className="flex gap-1 mt-2 mb-2">
        {(["today", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-wider transition-all ${
              period === p
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/[0.04] text-white/30 border border-white/[0.06] hover:bg-white/[0.08]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="w-full overflow-hidden">{chart}</div>
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[0.06]">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <span className="text-white/30 text-[9px] uppercase tracking-wider block">{s.label}</span>
            <span className="text-white text-sm block mt-0.5">{s.value}</span>
            <span className="text-white/25 text-[9px]">{s.sub}</span>
          </div>
        ))}
      </div>
      {/* Room breakdown */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2.5">
        <span className="text-white/30 text-[10px] tracking-widest uppercase">By Room</span>
        {roomBreakdown.map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="text-white/50 text-xs w-24 shrink-0">{r.name}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400/60" style={{ width: `${r.pct}%` }} />
            </div>
            <span className="text-white/30 text-[10px] w-12 text-right">{r.kWh} kWh</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
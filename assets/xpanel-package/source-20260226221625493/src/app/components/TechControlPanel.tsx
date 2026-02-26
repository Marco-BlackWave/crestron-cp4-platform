import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sun, Battery, Home, Zap, Droplets, Wind, CloudRain,
  Timer, Gauge, ArrowUpRight, ArrowDownLeft, Activity, Leaf,
  CircuitBoard, Network, ShieldAlert, Search, ChevronDown,
  Server, Cable, AlertTriangle, Info, XCircle, CheckCircle2,
  Waves, Download, FileText, Table, X, Clock,
  ChevronLeft, ChevronRight, Bell, Mail, User, Plus, Trash2,
  Check,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/* ═══════════════════════════════════════════
   TESLA-STYLE TECH CONTROL PANEL
   ═══════════════════════════════════════════ */

function useLiveData() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 2000); return () => clearInterval(id); }, []);
  const solarKw = +(5.2 + Math.sin(tick * 0.3) * 1.8).toFixed(1);
  const homeKw = +(3.8 + Math.sin(tick * 0.2 + 1) * 0.9).toFixed(1);
  const batteryKw = +(solarKw - homeKw).toFixed(1);
  const gridKw = batteryKw < -1.5 ? +(-batteryKw - 1.5).toFixed(1) : 0;
  const batteryPct = Math.min(100, Math.max(5, 72 + Math.floor(Math.sin(tick * 0.1) * 15)));
  return { solarKw, homeKw, batteryKw, gridKw, batteryPct, tick };
}

function toSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;
  const n = pts.length, dx: number[] = [], dy: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i+1].x - pts[i].x); dy.push(pts[i+1].y - pts[i].y); m.push(dy[i] / dx[i]); }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i-1] * m[i] <= 0 ? 0 : (m[i-1] + m[i]) / 2);
  t.push(m[n - 2]);
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) { const s = dx[i] / 3; d += `C${pts[i].x + s},${pts[i].y + t[i] * s},${pts[i+1].x - s},${pts[i+1].y - t[i+1] * s},${pts[i+1].x},${pts[i+1].y}`; }
  return d;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5 ${className}`}>{children}</div>;
}
function Stat({ label, value, unit, color = "text-white" }: { label: string; value: string | number; unit: string; color?: string }) {
  return (<div className="flex flex-col"><span className="text-white/30 text-[10px] tracking-widest uppercase">{label}</span><div className="flex items-baseline gap-1 mt-0.5"><span className={`text-2xl tracking-tight ${color}`}>{value}</span><span className="text-white/30 text-xs">{unit}</span></div></div>);
}


const hvacZones = [
  { name: "Zone 1 \u2014 Main", temp: 22.4, target: 22, humidity: 48, fan: "Auto", active: true },
  { name: "Zone 2 \u2014 Bedrooms", temp: 21.1, target: 21, humidity: 52, fan: "Low", active: true },
  { name: "Zone 3 \u2014 Kitchen", temp: 23.8, target: 22, humidity: 45, fan: "Med", active: true },
  { name: "Zone 4 \u2014 Garage", temp: 18.2, target: 18, humidity: 60, fan: "Off", active: false },
];
const irrigationZones = [
  { name: "Front Lawn", moisture: 62, schedule: "6:00 AM", duration: "15 min", active: true, lastRun: "Today" },
  { name: "Garden Beds", moisture: 38, schedule: "6:30 AM", duration: "20 min", active: true, lastRun: "Today" },
  { name: "Side Yard", moisture: 71, schedule: "7:00 AM", duration: "10 min", active: false, lastRun: "Yesterday" },
  { name: "Backyard", moisture: 45, schedule: "6:15 AM", duration: "25 min", active: true, lastRun: "Today" },
  { name: "Drip Line", moisture: 55, schedule: "5:30 AM", duration: "30 min", active: true, lastRun: "Today" },
];
const batteryCells = [
  { id: "PW-1", capacity: 13.5, charged: 87, temp: 28, cycles: 342, status: "Charging" },
  { id: "PW-2", capacity: 13.5, charged: 72, temp: 27, cycles: 338, status: "Charging" },
  { id: "PW-3", capacity: 13.5, charged: 64, temp: 29, cycles: 356, status: "Standby" },
];
const solarStrings = [
  { id: "String A", panels: 12, power: 2.4, efficiency: 94, tilt: 30 },
  { id: "String B", panels: 12, power: 2.1, efficiency: 91, tilt: 30 },
  { id: "String C", panels: 8, power: 1.6, efficiency: 89, tilt: 25 },
];

/* ====== MAIN ====== */
export function TechControlPanel() {
  const live = useLiveData();
  const [activeTab, setActiveTab] = useState<"overview"|"hvac"|"solar"|"battery"|"irrigation"|"electrical"|"hydraulic"|"network"|"alarms">("overview");
  const [showScheduler, setShowScheduler] = useState(false);
  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Activity },
    { id: "solar" as const, label: "Solar PV", icon: Sun },
    { id: "battery" as const, label: "Battery", icon: Battery },
    { id: "hvac" as const, label: "HVAC", icon: Wind },
    { id: "irrigation" as const, label: "Irrigation", icon: Droplets },
    { id: "electrical" as const, label: "Electrical", icon: CircuitBoard },
    { id: "hydraulic" as const, label: "Hydraulic", icon: Waves },
    { id: "network" as const, label: "Network", icon: Network },
    { id: "alarms" as const, label: "Alarms", icon: ShieldAlert },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-white/90 text-lg tracking-tight">Tech Control Panel</h2><p className="text-white/30 text-xs mt-0.5">Energy &middot; Climate &middot; Water &middot; Infrastructure</p></div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-400 text-[10px] tracking-wide">ALL SYSTEMS NOMINAL</span></div>
      </div>
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
        {tabs.map((tab) => { const Icon = tab.icon; const active = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all flex-shrink-0 ${active ? "bg-white/[0.08] text-white border border-white/[0.1]" : "text-white/35 hover:text-white/55 hover:bg-white/[0.03] border border-transparent"}`}><Icon className="w-3.5 h-3.5" />{tab.label}</button>); })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {activeTab === "overview" && <OverviewTab live={live} />}
          {activeTab === "solar" && <SolarTab live={live} />}
          {activeTab === "battery" && <BatteryTab live={live} />}
          {activeTab === "hvac" && <HvacTab />}
          {activeTab === "irrigation" && <IrrigationTab onOpenSchedule={() => setShowScheduler(true)} />}
          {activeTab === "electrical" && <ElectricalTab />}
          {activeTab === "hydraulic" && <HydraulicTab />}
          {activeTab === "network" && <NetworkTab />}
          {activeTab === "alarms" && <AlarmsTab />}
        </motion.div>
      </AnimatePresence>
      {showScheduler && <SchedulerModal onClose={() => setShowScheduler(false)} />}
    </div>
  );
}

/* ============================
   OVERVIEW TAB - 100% PURE SVG
   ============================ */
function OverviewTab({ live }: { live: ReturnType<typeof useLiveData> }) {
  const isSolarActive = live.solarKw > 0.5;
  const isCharging = live.batteryKw > 0;
  const importing = live.gridKw > 0;
  const gridActive = importing || live.batteryKw > 0.5;
  const gridColor = importing ? "#f87171" : "#4ade80";

  /* Derived engineering telemetry */
  const solarV = +(370 + Math.sin(live.tick * 0.4) * 18).toFixed(0);
  const solarA = isSolarActive ? +(live.solarKw * 1000 / solarV).toFixed(1) : 0;
  const solarEff = isSolarActive ? +(91 + Math.sin(live.tick * 0.2) * 3.5).toFixed(1) : 0;
  const gridV = +(239.8 + Math.sin(live.tick * 0.15) * 1.2).toFixed(1);
  const gridHz = +(50.00 + Math.sin(live.tick * 0.3) * 0.03).toFixed(2);
  const gridPF = +(0.97 + Math.sin(live.tick * 0.25) * 0.02).toFixed(2);
  const batV = +(51.2 + (live.batteryPct / 100) * 3.6).toFixed(1);
  const batA = isCharging ? +(live.batteryKw * 1000 / batV / 3).toFixed(1) : 0;
  const batTemp = +(27 + Math.sin(live.tick * 0.1) * 2).toFixed(0);
  const homeA = +(live.homeKw * 1000 / gridV).toFixed(1);

  /* ── Professional schematic layout — orthogonal H/V only ── */
  const W = 640, H = 420;
  const NW = 164, NH = 82, NR = 8;

  const sol = { x: 320, y: 52 };
  const hom = { x: 320, y: 190 };
  const bat = { x: 135, y: 345 };
  const grd = { x: 505, y: 345 };
  const busY = 268;

  /* Pipe with animated flow + optional inline flow-rate label */
  const pipe = (
    key: string, pts: [number,number][], color: string, active: boolean,
    flowLabel?: string, lp?: { x: number; y: number }
  ) => {
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
    return (
      <g key={key}>
        <path d={d} fill="none" stroke={active ? color : "rgba(255,255,255,0.035)"} strokeWidth={active ? "1.5" : "1"} strokeOpacity={active ? 0.3 : 1} />
        {active && (
          <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"
            strokeDasharray="4 20" opacity="0.55">
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.8s" repeatCount="indefinite" />
          </path>
        )}
        {active && flowLabel && lp && (
          <g>
            <rect x={lp.x - 27} y={lp.y - 9} width="54" height="18" rx="3"
              fill="rgba(8,8,14,0.92)" stroke={color} strokeWidth="0.5" strokeOpacity="0.18" />
            <text x={lp.x} y={lp.y + 3.5} textAnchor="middle" fill={color} opacity="0.6"
              style={{ fontSize: 8.5, fontWeight: 600, fontFamily: "Inter", letterSpacing: 0.4 }}>{flowLabel}</text>
          </g>
        )}
      </g>
    );
  };

  /* Junction dot */
  const jDot = (x: number, y: number, color: string, active: boolean) => (
    <g>
      {active && <circle cx={x} cy={y} r="5" fill={color} opacity="0.07" />}
      <circle cx={x} cy={y} r="2.5" fill={active ? color : "rgba(255,255,255,0.06)"} opacity={active ? 0.5 : 1} />
    </g>
  );

  /* Professional node — all text contained inside rect */
  const schNode = (
    cx: number, cy: number,
    Icon: React.ComponentType<{className?: string; style?: React.CSSProperties}>,
    title: string, val: string, detail: string, status: string,
    color: string, active: boolean
  ) => {
    const x = cx - NW / 2, y = cy - NH / 2;
    return (
      <g>
        <rect x={x} y={y} width={NW} height={NH} rx={NR}
          fill="rgba(8,8,14,0.94)"
          stroke={active ? color : "rgba(255,255,255,0.05)"}
          strokeWidth={active ? "1.5" : "0.75"}
          strokeOpacity={active ? 0.35 : 1} />
        {/* Icon */}
        <foreignObject x={x + 10} y={y + 10} width="16" height="16" style={{ overflow: "visible" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16 }}>
            <Icon style={{ color: active ? color : "rgba(255,255,255,0.1)", width: 12, height: 12 }} />
          </div>
        </foreignObject>
        {/* Title */}
        <text x={x + 30} y={y + 22} fill="rgba(255,255,255,0.4)"
          style={{ fontSize: 10.5, fontWeight: 500, fontFamily: "Inter" }}>{title}</text>
        {/* Primary value */}
        <text x={x + NW - 10} y={y + 23} textAnchor="end" fill={active ? color : "rgba(255,255,255,0.18)"}
          style={{ fontSize: 16, fontWeight: 600, fontFamily: "Inter" }}>{val}</text>
        {/* Divider */}
        <line x1={x + 10} y1={y + 33} x2={x + NW - 10} y2={y + 33} stroke="rgba(255,255,255,0.035)" strokeWidth="0.5" />
        {/* Detail row */}
        <text x={x + 10} y={y + 49} fill="rgba(255,255,255,0.2)"
          style={{ fontSize: 8.5, fontWeight: 400, fontFamily: "Inter", letterSpacing: 0.3 }}>{detail}</text>
        {/* Status row */}
        <circle cx={x + 12} cy={y + NH - 16} r="2" fill={active ? color : "rgba(255,255,255,0.07)"} opacity={active ? 0.5 : 1} />
        <text x={x + 19} y={y + NH - 13} fill={active ? color : "rgba(255,255,255,0.1)"} opacity={active ? 0.4 : 1}
          style={{ fontSize: 7.5, fontWeight: 500, fontFamily: "Inter", letterSpacing: 1.5 }}>{status}</text>
      </g>
    );
  };

  /* ── Routing geometry ── */
  const rSH: [number,number][] = [[sol.x, sol.y + NH/2], [hom.x, hom.y - NH/2]];
  const rHBus: [number,number][] = [[hom.x, hom.y + NH/2], [hom.x, busY]];
  const rBusBat: [number,number][] = [[hom.x, busY], [bat.x, busY], [bat.x, bat.y - NH/2]];
  const rBusGrd: [number,number][] = [[hom.x, busY], [grd.x, busY], [grd.x, grd.y - NH/2]];

  /* Flow labels offset from pipes so they never overlap text */
  const shLP = { x: sol.x + 42, y: (sol.y + NH/2 + hom.y - NH/2) / 2 };
  const batLP = { x: (hom.x + bat.x) / 2, y: busY - 15 };
  const grdLP = { x: (hom.x + grd.x) / 2, y: busY - 15 };

  /* 24h energy chart data */
  const cW = 620, cH = 130, maxY = 8;
  const chartData = useMemo(() => Array.from({ length: 25 }, (_, i) => {
    const p = i < 6 || i > 20 ? 0 : Math.sin(((i - 6) / 14) * Math.PI) * 7.2;
    const c = 2.5 + Math.sin(((i - 8) / 16) * Math.PI) * 2.5;
    return { h: i, prod: +p.toFixed(1), cons: +c.toFixed(1) };
  }), []);
  const toP = (d: typeof chartData[0], k: "prod"|"cons") => ({ x: (d.h/24)*cW, y: cH - (d[k]/maxY)*cH });
  const prodL = toSmoothPath(chartData.map(d => toP(d,"prod")));
  const consL = toSmoothPath(chartData.map(d => toP(d,"cons")));
  const prodF = prodL + ` L${cW},${cH} L0,${cH} Z`;

  return (
    <div className="space-y-4">
      {/* ── Power Flow Schematic ── */}
      <Panel className="overflow-hidden pb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-[10px] tracking-widest uppercase">Power Flow Schematic</span>
            <span className="text-white/[0.08] text-[10px]">|</span>
            <span className="text-white/15 text-[10px]">{gridV}V · {gridHz}Hz · PF {gridPF}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isSolarActive ? "bg-emerald-400 animate-pulse" : "bg-white/10"}`} />
            <span className="text-white/15 text-[10px]">Live</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 420 }}>
          <defs>
            <radialGradient id="bg-glow" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.008)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#bg-glow)" />

          {/* Pipes with flow-rate annotations */}
          {pipe("sh", rSH, "#facc15", isSolarActive, `${live.solarKw} kW`, shLP)}
          {pipe("hbus", rHBus, "rgba(180,180,195,0.35)", isSolarActive || isCharging || gridActive)}
          {pipe("bat", rBusBat, "#4ade80", isCharging,
            isCharging ? `${Math.abs(live.batteryKw).toFixed(1)} kW` : undefined, batLP)}
          {pipe("grd", rBusGrd, gridColor, gridActive,
            gridActive ? `${live.gridKw} kW` : undefined, grdLP)}

          {/* Junctions */}
          {jDot(hom.x, busY, "rgba(180,180,195,0.45)", true)}
          {jDot(bat.x, busY, "#4ade80", isCharging)}
          {jDot(grd.x, busY, gridColor, gridActive)}

          {/* Nodes — all data inside */}
          {schNode(sol.x, sol.y, Sun, "Solar", `${live.solarKw} kW`,
            `${solarV}V · ${solarA}A · η ${solarEff}%`,
            isSolarActive ? "PRODUCING" : "OFFLINE", "#facc15", isSolarActive)}
          {schNode(hom.x, hom.y, Home, "Home", `${live.homeKw} kW`,
            `${gridV}V · ${homeA}A · ${(live.homeKw * 24 * 0.32).toFixed(0)}g CO₂/h`,
            "CONSUMING", "rgba(210,210,225,0.65)", true)}
          {schNode(bat.x, bat.y, Battery, "Battery", `${live.batteryPct}%`,
            `${batV}V · ${batA}A · ${batTemp}°C`,
            isCharging ? "CHARGING" : "STANDBY", "#4ade80", isCharging)}
          {schNode(grd.x, grd.y, Zap, "Grid", importing ? `${live.gridKw} kW` : "0.0 kW",
            `${gridV}V · ${gridHz}Hz · PF ${gridPF}`,
            importing ? "IMPORTING" : "IDLE", gridColor, gridActive)}
        </svg>
      </Panel>

      {/* ── KPI Strip — 6 columns ── */}
      <div className="grid grid-cols-6 gap-2">
        <Panel className="!p-3">
          <span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Daily Yield</span>
          <div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">34.7</span><span className="text-white/20 text-[10px]">kWh</span></div>
          <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-2.5 h-2.5 text-emerald-400/60" /><span className="text-emerald-400/40 text-[9px]">+12%</span></div>
        </Panel>
        <Panel className="!p-3">
          <span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Consumed</span>
          <div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">28.3</span><span className="text-white/20 text-[10px]">kWh</span></div>
          <div className="flex items-center gap-1 mt-1"><ArrowDownLeft className="w-2.5 h-2.5 text-blue-400/60" /><span className="text-blue-400/40 text-[9px]">-5%</span></div>
        </Panel>
        <Panel className="!p-3">
          <span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Self-Use</span>
          <div className="flex items-baseline gap-1"><span className="text-emerald-400/80 text-xl tracking-tight">92</span><span className="text-white/20 text-[10px]">%</span></div>
          <div className="mt-1.5 h-1 rounded-full bg-white/[0.04] overflow-hidden"><div className="h-full rounded-full bg-emerald-400/35" style={{ width: "92%" }} /></div>
        </Panel>
        <Panel className="!p-3">
          <span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Battery</span>
          <div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">{live.batteryPct}</span><span className="text-white/20 text-[10px]">%</span></div>
          <div className="mt-1.5 h-1 rounded-full bg-white/[0.04] overflow-hidden"><motion.div className="h-full rounded-full bg-emerald-400/35" animate={{ width: `${live.batteryPct}%` }} transition={{ duration: 1 }} /></div>
        </Panel>
        <Panel className="!p-3">
          <span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">CO₂ Saved</span>
          <div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">11.1</span><span className="text-white/20 text-[10px]">kg</span></div>
          <div className="flex items-center gap-1 mt-1"><Leaf className="w-2.5 h-2.5 text-emerald-400/60" /><span className="text-emerald-400/40 text-[9px]">Today</span></div>
        </Panel>
        <Panel className="!p-3">
          <span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Grid Feed</span>
          <div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">6.4</span><span className="text-white/20 text-[10px]">kWh</span></div>
          <span className="text-white/15 text-[9px] mt-1 block">$1.92 credit</span>
        </Panel>
      </div>

      {/* ── 24h Energy Profile ── */}
      <Panel>
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/25 text-[10px] tracking-widest uppercase">24-Hour Energy Profile</span>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5"><div className="w-5 h-[2px] rounded-full bg-yellow-400/60" /><span className="text-white/25 text-[10px]">Production</span></div>
            <div className="flex items-center gap-1.5"><div className="w-5 h-[2px] rounded-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(96,165,250,0.4) 0 3px, transparent 3px 6px)" }} /><span className="text-white/25 text-[10px]">Consumption</span></div>
          </div>
        </div>
        <svg viewBox={`-30 -5 ${cW + 40} ${cH + 28}`} className="w-full" style={{ maxHeight: 180 }}>
          <defs><linearGradient id="chart-prod-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#facc15" stopOpacity="0.18" /><stop offset="100%" stopColor="#facc15" stopOpacity="0.01" /></linearGradient></defs>
          {[0,2,4,6,8].map(v => (<g key={v}><line x1="0" y1={cH-(v/maxY)*cH} x2={cW} y2={cH-(v/maxY)*cH} stroke="rgba(255,255,255,0.03)" /><text x="-8" y={cH-(v/maxY)*cH+3} textAnchor="end" fill="rgba(255,255,255,0.12)" style={{fontSize:"8px",fontFamily:"Inter"}}>{v}</text></g>))}
          {[0,4,8,12,16,20,24].map(hr => (<text key={hr} x={(hr/24)*cW} y={cH+16} textAnchor="middle" fill="rgba(255,255,255,0.15)" style={{fontSize:"8px",fontFamily:"Inter"}}>{hr}:00</text>))}
          <path d={prodF} fill="url(#chart-prod-fill)" />
          <path d={prodL} fill="none" stroke="rgba(250,204,21,0.6)" strokeWidth="1.5" />
          <path d={consL} fill="none" stroke="rgba(96,165,250,0.35)" strokeWidth="1.5" strokeDasharray="5 3" />
          {(() => { const n=new Date().getHours()+new Date().getMinutes()/60, nx=(n/24)*cW; return (<g><line x1={nx} y1="0" x2={nx} y2={cH} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 4" /><circle cx={nx} cy={cH} r="3" fill="rgba(255,255,255,0.2)" /><text x={nx} y={cH+16} textAnchor="middle" fill="rgba(255,255,255,0.3)" style={{fontSize:"8px",fontFamily:"Inter"}}>Now</text></g>); })()}
        </svg>
      </Panel>
    </div>
  );
}

/* ====== SOLAR PV TAB ====== */
function SolarTab({ live }: { live: ReturnType<typeof useLiveData> }) {
  const totalPanels = solarStrings.reduce((a, s) => a + s.panels, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Panel className="col-span-2">
          <div className="flex items-center gap-2 mb-4"><Sun className="w-4 h-4 text-yellow-400/70" /><span className="text-white/40 text-[10px] tracking-widest uppercase">Photovoltaic Array</span></div>
          <div className="grid grid-cols-3 gap-6">
            <Stat label="Live Output" value={live.solarKw} unit="kW" color="text-yellow-400" />
            <Stat label="Peak Today" value="7.2" unit="kW" />
            <Stat label="Total Panels" value={totalPanels} unit="units" />
          </div>
          <div className="mt-6 grid grid-cols-16 gap-[3px]">
            {Array.from({ length: totalPanels }).map((_, i) => {
              const eff = 0.75 + Math.random() * 0.25;
              return (<motion.div key={i} className="aspect-[3/2] rounded-sm" style={{ background: `rgba(250,204,21,${0.08 + eff * 0.25})`, border: `1px solid rgba(250,204,21,${0.1 + eff * 0.15})` }} animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.05 }} />);
            })}
          </div>
        </Panel>
        <Panel>
          <span className="text-white/30 text-[10px] tracking-widest uppercase">Inverter Status</span>
          <div className="mt-4 space-y-4">
            <div><span className="text-white/40 text-xs">Efficiency</span><div className="flex items-baseline gap-1 mt-1"><span className="text-emerald-400 text-2xl">96.2</span><span className="text-white/30 text-xs">%</span></div></div>
            <div><span className="text-white/40 text-xs">Temperature</span><div className="flex items-baseline gap-1 mt-1"><span className="text-white text-2xl">42</span><span className="text-white/30 text-xs">&deg;C</span></div></div>
            <div><span className="text-white/40 text-xs">Frequency</span><div className="flex items-baseline gap-1 mt-1"><span className="text-white text-2xl">50.01</span><span className="text-white/30 text-xs">Hz</span></div></div>
            <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06]"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-emerald-400/70 text-[10px]">Grid-tied &middot; Exporting</span></div>
          </div>
        </Panel>
      </div>
      <Panel>
        <span className="text-white/30 text-[10px] tracking-widest uppercase">String Performance</span>
        <div className="mt-4 space-y-3">
          {solarStrings.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/[0.08] border border-yellow-400/[0.12] flex items-center justify-center"><Sun className="w-3.5 h-3.5 text-yellow-400/70" /></div>
                <div><span className="text-white/70 text-xs">{s.id}</span><span className="text-white/25 text-[10px] ml-2">{s.panels} panels &middot; {s.tilt}&deg; tilt</span></div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-white/70 text-sm">{s.power} kW</span>
                <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-yellow-400/50" style={{ width: `${s.efficiency}%` }} /></div>
                <span className="text-white/30 text-[10px] w-8 text-right">{s.efficiency}%</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      {/* ── 30-Day Yield History ── */}
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/25 text-[10px] tracking-widest uppercase">30-Day Solar Yield</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><div className="w-4 h-[2px] bg-yellow-400/60 rounded-full" /><span className="text-white/20 text-[9px]">Yield kWh</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-[2px] bg-yellow-400/20 rounded-full" /><span className="text-white/20 text-[9px]">Peak kW</span></div>
          </div>
        </div>
        <BarChart data={Array.from({length:30},(_,i)=>({label:`${i+1}`,v1:+(18+Math.sin(i*0.4)*12+Math.random()*5).toFixed(1),v2:+(5.2+Math.sin(i*0.3)*2).toFixed(1)}))} color1="rgba(250,204,21,0.35)" color2="rgba(250,204,21,0.12)" maxV={42} h={90} />
      </Panel>
    </div>
  );
}

/* ====== BATTERY TAB ====== */
function BatteryTab({ live }: { live: ReturnType<typeof useLiveData> }) {
  const totalCapacity = batteryCells.reduce((a, c) => a + c.capacity, 0);
  const totalStored = batteryCells.reduce((a, c) => a + (c.capacity * c.charged) / 100, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <Panel><Stat label="Total Capacity" value={totalCapacity.toFixed(1)} unit="kWh" /></Panel>
        <Panel><Stat label="Stored Energy" value={totalStored.toFixed(1)} unit="kWh" color="text-emerald-400" /></Panel>
        <Panel><Stat label="Power Flow" value={live.batteryKw > 0 ? `+${live.batteryKw}` : live.batteryKw.toString()} unit="kW" color={live.batteryKw > 0 ? "text-emerald-400" : "text-amber-400"} /></Panel>
        <Panel><Stat label="Backup Reserve" value="20" unit="%" /></Panel>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {batteryCells.map((cell) => (
          <Panel key={cell.id}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Battery className="w-4 h-4 text-emerald-400/60" /><span className="text-white/70 text-xs">{cell.id}</span></div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${cell.status === "Charging" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.04] text-white/30 border border-white/[0.06]"}`}>{cell.status}</span>
            </div>
            <div className="relative w-full h-32 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden mb-4">
              <motion.div className="absolute bottom-0 left-0 right-0 rounded-b-[10px]" style={{ background: "linear-gradient(to top, rgba(74,222,128,0.25), rgba(74,222,128,0.08))", borderTop: "1px solid rgba(74,222,128,0.2)" }} animate={{ height: `${cell.charged}%` }} transition={{ duration: 1.5, ease: "easeInOut" }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white text-3xl tracking-tight">{cell.charged}%</span>
                <span className="text-white/25 text-[10px] mt-0.5">{(cell.capacity * cell.charged / 100).toFixed(1)} kWh</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-white/25 text-[9px] tracking-wide uppercase">Temp</span><div className="flex items-baseline gap-0.5 mt-0.5"><span className="text-white/60 text-sm">{cell.temp}</span><span className="text-white/25 text-[10px]">&deg;C</span></div></div>
              <div><span className="text-white/25 text-[9px] tracking-wide uppercase">Cycles</span><div className="flex items-baseline gap-0.5 mt-0.5"><span className="text-white/60 text-sm">{cell.cycles}</span></div></div>
            </div>
          </Panel>
        ))}
      </div>
      <Panel>
        <div className="flex items-center justify-between mb-3"><span className="text-white/40 text-[10px] tracking-widest uppercase">Backup Reserve Level</span><span className="text-white/50 text-xs">20%</span></div>
        <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="absolute left-0 top-0 h-full rounded-full bg-blue-500/40" style={{ width: "20%" }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border-2 border-blue-400" style={{ left: "calc(20% - 6px)" }} />
        </div>
        <div className="flex justify-between mt-2"><span className="text-white/15 text-[9px]">0%</span><span className="text-white/15 text-[9px]">100%</span></div>
      </Panel>
      {/* 24h Battery SoC Trend */}
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/25 text-[10px] tracking-widest uppercase">24h State of Charge</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1"><div className="w-4 h-[2px] bg-emerald-400/50 rounded-full" /><span className="text-white/15 text-[9px]">SoC %</span></div>
            <div className="flex items-center gap-1"><div className="w-4 h-[2px] bg-yellow-400/30 rounded-full" /><span className="text-white/15 text-[9px]">Power kW</span></div>
          </div>
        </div>
        <LineChart lines={[
          {data:Array.from({length:25},(_,i)=>({x:i,y:45+Math.sin(i*0.15)*20+(i>6&&i<18?15:0)})),color:"rgba(74,222,128,0.5)"},
          {data:Array.from({length:25},(_,i)=>({x:i,y:i>6&&i<18?3+Math.sin(i*0.3)*2:-1-Math.sin(i*0.2)*0.5})),color:"rgba(250,204,21,0.3)"},
        ]} xLabels={["0:00","4:00","8:00","12:00","16:00","20:00","24:00"]} yMin={-3} yMax={100} yLabels={["0","25","50","75","100"]} h={100} fill="rgba(74,222,128,0.04)" />
      </Panel>
      {/* 7-Day Cycle History */}
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/25 text-[10px] tracking-widest uppercase">7-Day Energy Throughput</span>
          <span className="text-white/15 text-[9px]">kWh</span>
        </div>
        <BarChart data={[{label:"Mon",v1:28.4,v2:24.1},{label:"Tue",v1:32.1,v2:29.8},{label:"Wed",v1:26.5,v2:22.3},{label:"Thu",v1:35.2,v2:31.0},{label:"Fri",v1:30.8,v2:27.5},{label:"Sat",v1:22.1,v2:18.6},{label:"Sun",v1:19.4,v2:16.2}]} color1="rgba(74,222,128,0.3)" color2="rgba(96,165,250,0.15)" maxV={40} h={75} />
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1"><div className="w-3 h-[2px] bg-emerald-400/30 rounded-full" /><span className="text-white/15 text-[8px]">Charged</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-[2px] bg-blue-400/15 rounded-full" /><span className="text-white/15 text-[8px]">Discharged</span></div>
        </div>
      </Panel>
    </div>
  );
}

/* ====== HVAC TAB ====== */
function HvacTab() {
  const power = true;
  const [selectedZone, setSelectedZone] = useState(0);
  const zone = hvacZones[selectedZone];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Panel className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Wind className="w-4 h-4 text-cyan-400/60" /><span className="text-white/40 text-[10px] tracking-widest uppercase">Central HVAC System</span></div>
          </div>
          <svg viewBox="0 0 500 140" className="w-full" style={{ maxHeight: 160 }}>
            {/* AHU box */}
            <rect x="210" y="10" width="80" height="40" rx="6" fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.25)" strokeWidth="1" />
            <text x="250" y="34" textAnchor="middle" fill="rgba(6,182,212,0.7)" style={{ fontSize: "10px", fontFamily: "Inter" }}>AHU</text>
            {/* Trunk: AHU → bus */}
            <line x1={250} y1={50} x2={250} y2={68} stroke="rgba(6,182,212,0.2)" strokeWidth="1.5" />
            {/* Horizontal bus bar spanning all zones */}
            <line x1={80} y1={68} x2={440} y2={68} stroke="rgba(6,182,212,0.15)" strokeWidth="1.5" />
            {hvacZones.map((z, i) => {
              const x = 40 + i * 120; const cx = x + 40; const active = z.active && power;
              return (<g key={z.name}>
                {/* Vertical drop: bus → zone */}
                <line x1={cx} y1={68} x2={cx} y2={90} stroke={active ? "rgba(6,182,212,0.25)" : "rgba(255,255,255,0.06)"} strokeWidth="1.5" />
                {/* Junction dot on bus */}
                <circle cx={cx} cy={68} r={2} fill={active ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.08)"} />
                <rect x={x} y="90" width="80" height="44" rx="6" fill={selectedZone===i?"rgba(6,182,212,0.1)":"rgba(255,255,255,0.03)"} stroke={selectedZone===i?"rgba(6,182,212,0.3)":"rgba(255,255,255,0.06)"} strokeWidth="1" className="cursor-pointer" onClick={() => setSelectedZone(i)} />
                <text x={cx} y="108" textAnchor="middle" fill={active?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.2)"} style={{fontSize:"9px",fontFamily:"Inter"}}>{z.name.split("\u2014")[0].trim()}</text>
                <text x={cx} y="124" textAnchor="middle" fill={active?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.25)"} style={{fontSize:"12px",fontFamily:"Inter"}}>{z.temp}&deg;</text>
                {active && <circle cx={x+68} cy={96} r="3" fill="rgba(6,182,212,0.6)"><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" /></circle>}
              </g>);
            })}
          </svg>
        </Panel>
        <Panel>
          <span className="text-white/30 text-[10px] tracking-widest uppercase">{zone.name}</span>
          <div className="mt-4 space-y-4">
            <div><span className="text-white/30 text-[9px] uppercase">Current</span><div className="flex items-baseline gap-1 mt-0.5"><span className="text-white text-3xl tracking-tight">{zone.temp}</span><span className="text-white/30 text-sm">&deg;C</span></div></div>
            <div><span className="text-white/30 text-[9px] uppercase">Target</span><div className="flex items-baseline gap-1 mt-0.5"><span className="text-cyan-400 text-2xl">{zone.target}</span><span className="text-white/30 text-sm">&deg;C</span></div></div>
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]"><span className="text-white/30 text-[9px] uppercase">Humidity</span><span className="text-white/50 text-xs">{zone.humidity}%</span></div>
            <div className="flex items-center justify-between"><span className="text-white/30 text-[9px] uppercase">Fan</span><span className="text-white/50 text-xs">{zone.fan}</span></div>
            <div className="flex items-center justify-between"><span className="text-white/30 text-[9px] uppercase">Status</span><span className={`text-[10px] px-2 py-0.5 rounded-full ${zone.active?"bg-cyan-500/10 text-cyan-400 border border-cyan-500/20":"bg-white/[0.04] text-white/30 border border-white/[0.06]"}`}>{zone.active?"Active":"Off"}</span></div>
          </div>
        </Panel>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Panel><Stat label="Supply Air" value="14.2" unit="&deg;C" color="text-cyan-400" /></Panel>
        <Panel><Stat label="Return Air" value="22.8" unit="&deg;C" /></Panel>
        <Panel><Stat label="Filter Life" value="73" unit="%" /><div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-amber-400/50" style={{ width: "73%" }} /></div></Panel>
        <Panel><Stat label="Power Draw" value="2.4" unit="kW" /></Panel>
      </div>
      {/* 24h Zone Temperature History */}
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/25 text-[10px] tracking-widest uppercase">24h Temperature Trend — All Zones</span>
          <div className="flex items-center gap-3">
            {["Main","Bed","Kitchen","Garage"].map((z,i) => (<div key={z} className="flex items-center gap-1"><div className="w-3 h-[2px] rounded-full" style={{background:[`rgba(6,182,212,0.7)`,`rgba(139,92,246,0.5)`,`rgba(251,191,36,0.5)`,`rgba(255,255,255,0.15)`][i]}} /><span className="text-white/15 text-[8px]">{z}</span></div>))}
          </div>
        </div>
        <LineChart lines={[
          {data:Array.from({length:25},(_,i)=>({x:i,y:21.5+Math.sin(i*0.25)*1.2})),color:"rgba(6,182,212,0.7)"},
          {data:Array.from({length:25},(_,i)=>({x:i,y:20.8+Math.sin(i*0.3+1)*0.8})),color:"rgba(139,92,246,0.5)"},
          {data:Array.from({length:25},(_,i)=>({x:i,y:22.5+Math.sin(i*0.2+2)*1.5})),color:"rgba(251,191,36,0.5)"},
          {data:Array.from({length:25},(_,i)=>({x:i,y:17.8+Math.sin(i*0.15)*0.5})),color:"rgba(255,255,255,0.15)"},
        ]} xLabels={["0:00","4:00","8:00","12:00","16:00","20:00","24:00"]} yMin={16} yMax={25} yLabels={["16","18","20","22","24"]} h={100} />
      </Panel>
      {/* 7-Day Energy */}
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/25 text-[10px] tracking-widest uppercase">7-Day HVAC Energy</span>
          <span className="text-white/15 text-[9px]">kWh per day</span>
        </div>
        <BarChart data={[{label:"Mon",v1:18.2},{label:"Tue",v1:21.5},{label:"Wed",v1:19.8},{label:"Thu",v1:24.1},{label:"Fri",v1:22.3},{label:"Sat",v1:16.4},{label:"Sun",v1:15.1}]} color1="rgba(6,182,212,0.3)" maxV={28} h={70} />
      </Panel>
    </div>
  );
}

/* ====== IRRIGATION TAB ====== */
function IrrigationTab({ onOpenSchedule }: { onOpenSchedule: () => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <Panel><div className="flex items-center gap-2 mb-2"><Droplets className="w-3.5 h-3.5 text-blue-400/60" /><span className="text-white/30 text-[10px] tracking-widest uppercase">Total Usage</span></div><div className="flex items-baseline gap-1"><span className="text-white text-3xl tracking-tight">847</span><span className="text-white/30 text-sm">L</span></div><span className="text-white/20 text-[10px]">Today</span></Panel>
        <Panel><div className="flex items-center gap-2 mb-2"><Gauge className="w-3.5 h-3.5 text-blue-400/60" /><span className="text-white/30 text-[10px] tracking-widest uppercase">Pressure</span></div><div className="flex items-baseline gap-1"><span className="text-white text-3xl tracking-tight">3.2</span><span className="text-white/30 text-sm">bar</span></div><span className="text-emerald-400/50 text-[10px]">Normal</span></Panel>
        <Panel><div className="flex items-center gap-2 mb-2"><CloudRain className="w-3.5 h-3.5 text-blue-400/60" /><span className="text-white/30 text-[10px] tracking-widest uppercase">Weather</span></div><div className="flex items-baseline gap-1"><span className="text-white text-3xl tracking-tight">0</span><span className="text-white/30 text-sm">mm</span></div><span className="text-white/20 text-[10px]">No rain forecast</span></Panel>
        <Panel className="cursor-pointer hover:bg-white/[0.06] transition-all group" onClick={onOpenSchedule}><div className="flex items-center gap-2 mb-2"><Timer className="w-3.5 h-3.5 text-blue-400/40 group-hover:text-blue-400/70 transition-colors" /><span className="text-white/30 text-[10px] tracking-widest uppercase">Next Run</span></div><div className="flex items-baseline gap-1"><span className="text-white text-3xl tracking-tight">5:30</span><span className="text-white/30 text-sm">AM</span></div><span className="text-blue-400/30 text-[10px] group-hover:text-blue-400/60 transition-colors">Drip Line · Click to schedule</span></Panel>
      </div>
      <Panel>
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/40 text-[10px] tracking-widest uppercase">Irrigation Zones</span>
          <button onClick={onOpenSchedule} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400/70 text-[10px] hover:bg-blue-500/20 transition-all"><Clock className="w-3 h-3" />Schedule</button>
        </div>
        <div className="space-y-2">
          {irrigationZones.map((zone) => (
            <div key={zone.name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${zone.active?"bg-blue-500/10 border border-blue-500/20":"bg-white/[0.03] border border-white/[0.06]"}`}><Droplets className={`w-3.5 h-3.5 ${zone.active?"text-blue-400/70":"text-white/20"}`} /></div>
                <div><span className="text-white/70 text-xs">{zone.name}</span><div className="flex items-center gap-2 mt-0.5"><span className="text-white/25 text-[10px]">{zone.schedule}</span><span className="text-white/15">&middot;</span><span className="text-white/25 text-[10px]">{zone.duration}</span></div></div>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${zone.moisture}%`, background: zone.moisture<40?"rgba(251,191,36,0.6)":zone.moisture>65?"rgba(96,165,250,0.5)":"rgba(74,222,128,0.5)" }} /></div>
                  <span className={`text-[10px] w-7 text-right ${zone.moisture<40?"text-amber-400/70":"text-white/40"}`}>{zone.moisture}%</span>
                </div>
                <span className="text-white/20 text-[10px] w-16 text-right">{zone.lastRun}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${zone.active?"bg-emerald-400":"bg-white/15"}`} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <span className="text-white/40 text-[10px] tracking-widest uppercase mb-3 block">Weekly Water Usage</span>
        <svg viewBox="0 0 500 80" className="w-full" style={{ maxHeight: 100 }}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => {
            const val = [720,850,680,910,847,560,430][i]; const barH = (val/910)*60; const x = 20+i*68;
            return (<g key={day}><rect x={x} y={65-barH} width="40" height={barH} rx="4" fill={i===4?"rgba(96,165,250,0.35)":"rgba(96,165,250,0.12)"} stroke={i===4?"rgba(96,165,250,0.4)":"none"} strokeWidth="1" /><text x={x+20} y={60-barH} textAnchor="middle" fill="rgba(255,255,255,0.3)" style={{fontSize:"8px",fontFamily:"Inter"}}>{val}L</text><text x={x+20} y="78" textAnchor="middle" fill={i===4?"rgba(96,165,250,0.6)":"rgba(255,255,255,0.2)"} style={{fontSize:"9px",fontFamily:"Inter"}}>{day}</text></g>);
          })}
        </svg>
      </Panel>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ELECTRICAL PANEL TAB
   ═══════════════════════════════════════════ */
const breakerData: { id: number; name: string; amps: number; type: string; on: boolean; load: number; critical?: boolean }[] = [
  { id: 1, name: "Main Feed", amps: 100, type: "2P", on: true, load: 67, critical: true },
  { id: 2, name: "Kitchen", amps: 20, type: "1P", on: true, load: 42 },
  { id: 3, name: "Living Room", amps: 15, type: "1P", on: true, load: 28 },
  { id: 4, name: "Master Bedroom", amps: 15, type: "1P", on: true, load: 12 },
  { id: 5, name: "Bedrooms 2-3", amps: 15, type: "1P", on: true, load: 8 },
  { id: 6, name: "Bathrooms", amps: 20, type: "1P", on: true, load: 18 },
  { id: 7, name: "HVAC Compressor", amps: 40, type: "2P", on: true, load: 78, critical: true },
  { id: 8, name: "Water Heater", amps: 30, type: "2P", on: true, load: 55 },
  { id: 9, name: "Dryer", amps: 30, type: "2P", on: false, load: 0 },
  { id: 10, name: "Oven / Range", amps: 40, type: "2P", on: true, load: 0 },
  { id: 11, name: "Garage", amps: 20, type: "1P", on: true, load: 5 },
  { id: 12, name: "Outdoor / Pool", amps: 20, type: "1P", on: true, load: 15 },
  { id: 13, name: "EV Charger", amps: 50, type: "2P", on: true, load: 32, critical: true },
  { id: 14, name: "AV / Crestron", amps: 20, type: "1P", on: true, load: 22 },
  { id: 15, name: "Server Room", amps: 20, type: "1P", on: true, load: 45, critical: true },
  { id: 16, name: "Lighting Ctrl", amps: 15, type: "1P", on: true, load: 10 },
  { id: 17, name: "Laundry", amps: 20, type: "1P", on: true, load: 0 },
  { id: 18, name: "Spare", amps: 15, type: "1P", on: false, load: 0 },
];

function BreakerRow({ breaker: b, onToggle, right = false }: {
  breaker: typeof breakerData[0]; onToggle: () => void; right?: boolean;
}) {
  const loadColor = b.load > 70 ? "text-amber-400/70" : b.load > 40 ? "text-yellow-400/50" : "text-emerald-400/50";
  const barColor = b.load > 70 ? "bg-amber-400/50" : b.load > 40 ? "bg-yellow-400/30" : "bg-emerald-400/25";
  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-all ${right ? "flex-row-reverse" : ""}`}>
      <button onClick={onToggle} disabled={!!b.critical}
        className={`relative flex-shrink-0 w-8 h-14 rounded-md border transition-all ${
          b.on ? "bg-[rgba(8,8,14,0.85)] border-emerald-400/20" : "bg-[rgba(8,8,14,0.6)] border-white/[0.06]"
        } ${b.critical ? "cursor-not-allowed" : "cursor-pointer hover:border-white/20"}`}>
        <motion.div className={`absolute left-1 right-1 h-5 rounded-sm ${b.on ? "bg-white/15" : "bg-white/[0.06]"}`}
          animate={{ top: b.on ? 4 : 32 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} />
        <div className={`absolute ${b.on ? "bottom-1.5" : "top-1.5"} left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all ${
          b.on ? "bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]" : "bg-white/10"}`} />
      </button>
      <div className={`flex-1 min-w-0 ${right ? "text-right" : ""}`}>
        <div className={`flex items-center gap-2 ${right ? "flex-row-reverse" : ""}`}>
          <span className="text-white/60 text-xs truncate">{b.name}</span>
          {b.critical && <span className="text-amber-400/40 text-[8px] tracking-wider uppercase flex-shrink-0">LOCK</span>}
        </div>
        <div className={`flex items-center gap-2 mt-1 ${right ? "flex-row-reverse" : ""}`}>
          <span className="text-white/20 text-[9px]">{b.type} · {b.amps}A</span>
          {b.on && b.load > 0 && <span className={`text-[9px] ${loadColor}`}>{b.load}%</span>}
        </div>
        {b.on && (
          <div className={`mt-1.5 h-[3px] rounded-full bg-white/[0.04] overflow-hidden`} style={{ width: "100%" }}>
            <motion.div className={`h-full rounded-full ${barColor}`} initial={{ width: 0 }} animate={{ width: `${b.load}%` }} transition={{ duration: 0.8 }} />
          </div>
        )}
      </div>
      <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-white/[0.03] border border-white/[0.05]">
        <span className="text-white/20 text-[8px]">{b.id}</span>
      </div>
    </div>
  );
}

function ElectricalTab() {
  const [breakers, setBreakers] = useState(breakerData);
  const toggleBreaker = (id: number) => {
    setBreakers(prev => prev.map(b => b.id === id && !b.critical ? { ...b, on: !b.on, load: b.on ? 0 : breakerData.find(bd => bd.id === id)?.load || 0 } : b));
  };
  const totalLoad = breakers.filter(b => b.on).reduce((a, b) => a + (b.amps * b.load / 100), 0);
  const activeCount = breakers.filter(b => b.on).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Active</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">{activeCount}</span><span className="text-white/20 text-[10px]">/ {breakers.length}</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Total Load</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">{totalLoad.toFixed(0)}</span><span className="text-white/20 text-[10px]">A</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Main Rating</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">100</span><span className="text-white/20 text-[10px]">A</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Capacity</span><div className="flex items-baseline gap-1"><span className={`text-xl tracking-tight ${totalLoad > 80 ? "text-amber-400" : "text-emerald-400/80"}`}>{(100 - (totalLoad / 100) * 100).toFixed(0)}</span><span className="text-white/20 text-[10px]">%</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Tripped</span><div className="flex items-baseline gap-1"><span className="text-emerald-400/80 text-xl tracking-tight">0</span></div></Panel>
      </div>
      <Panel className="!p-0 overflow-hidden">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.04]">
          <div className="flex items-center gap-3"><CircuitBoard className="w-4 h-4 text-white/25" /><span className="text-white/30 text-[10px] tracking-widest uppercase">Distribution Panel — 18 Circuits</span></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400/60" /><span className="text-white/20 text-[9px]">On</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-white/10" /><span className="text-white/20 text-[9px]">Off</span></div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" /><span className="text-white/20 text-[9px]">Critical</span></div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/[0.03]">
          <div className="divide-y divide-white/[0.025]">
            {breakers.filter((_, i) => i % 2 === 0).map((b) => (
              <BreakerRow key={b.id} breaker={b} onToggle={() => toggleBreaker(b.id)} />
            ))}
          </div>
          <div className="divide-y divide-white/[0.025]">
            {breakers.filter((_, i) => i % 2 === 1).map((b) => (
              <BreakerRow key={b.id} breaker={b} onToggle={() => toggleBreaker(b.id)} right />
            ))}
          </div>
        </div>
      </Panel>
      {/* 7-Day Load History */}
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/25 text-[10px] tracking-widest uppercase">7-Day Load Profile</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1"><div className="w-4 h-[2px] bg-blue-400/50 rounded-full" /><span className="text-white/15 text-[9px]">Peak A</span></div>
            <div className="flex items-center gap-1"><div className="w-4 h-[2px] bg-blue-400/20 rounded-full" /><span className="text-white/15 text-[9px]">Avg A</span></div>
          </div>
        </div>
        <BarChart data={[{label:"Mon",v1:72,v2:48},{label:"Tue",v1:68,v2:45},{label:"Wed",v1:81,v2:52},{label:"Thu",v1:75,v2:50},{label:"Fri",v1:79,v2:51},{label:"Sat",v1:55,v2:35},{label:"Sun",v1:48,v2:32}]} color1="rgba(96,165,250,0.3)" color2="rgba(96,165,250,0.1)" maxV={100} h={80} />
      </Panel>
      {/* 24h Power Consumption */}
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/25 text-[10px] tracking-widest uppercase">24h Power Consumption</span>
          <span className="text-white/15 text-[9px]">kW</span>
        </div>
        <LineChart lines={[
          {data:Array.from({length:25},(_,i)=>({x:i,y:2.8+Math.sin(i*0.25)*1.5+Math.sin(i*0.5)*0.5})),color:"rgba(96,165,250,0.5)"},
        ]} xLabels={["0:00","4:00","8:00","12:00","16:00","20:00","24:00"]} yMin={0} yMax={6} yLabels={["0","2","4","6"]} h={90} fill="rgba(96,165,250,0.06)" />
      </Panel>
    </div>
  );
}

/* ═══════════════════════════════════════════
   NETWORK RACK TAB
   ═══════════════════════════════════════════ */
type PortInfo = { num: number; active: boolean; device?: string; ip?: string; speed: string; poe?: number };
type RackDevice = {
  id: string; name: string; model: string; u: number; type: "processor"|"switch"|"matrix"|"patch"|"ups"|"blank";
  ip?: string; status: "online"|"warning"|"offline"; ports?: { total: number; active: number };
  temp?: number; cpu?: number; uptime?: string; portDetails?: PortInfo[];
};
const mkPorts = (defs: [string,string,string,number?][], total: number): PortInfo[] => {
  const ps: PortInfo[] = [];
  for (let i = 1; i <= total; i++) {
    const d = defs.find(dd => dd[0] === String(i));
    ps.push(d ? { num: i, active: true, device: d[1], ip: d[2], speed: d[3] ? "10G" : "1G", poe: d[3] } : { num: i, active: false, speed: "1G" });
  }
  return ps;
};
const coreSwPorts = mkPorts([
  ["1","Crestron CP4","10.0.1.10"],["2","DM-MD8x8","10.0.1.11"],["3","DM-NVX Dir","10.0.1.12"],
  ["4","AV Switch Uplink","10.0.1.2",0],["5","IoT Switch Uplink","10.0.1.3",0],
  ["6","AP-Living","10.0.1.20",12],["7","AP-Kitchen","10.0.1.21",11],["8","AP-Master","10.0.1.22",8],
  ["9","AP-Garden","10.0.1.23",10],["10","NAS","10.0.1.50"],["11","Security NVR","10.0.1.51",18],
  ["12","Desktop Office","10.0.1.100"],["13","Printer","10.0.1.101"],["14","Sonos Port","10.0.1.60",4],
  ["15","Philips Hue Bridge","10.0.1.61",3],["16","Lutron Pro","10.0.1.62",2],
  ["17","Ring Doorbell","10.0.1.70",8],["18","Intercom","10.0.1.71",6],
  ["19","EV Charger","10.0.1.80"],["20","Pool Controller","10.0.1.81",5],
  ["21","Weather Station","10.0.1.82",3],["22","Spare",""],
], 28);
const avSwPorts = mkPorts([
  ["1","Projector LR","10.0.2.10"],["2","Projector Theater","10.0.2.11"],["3","Display Kitchen","10.0.2.12"],
  ["4","Display Master","10.0.2.13"],["5","DM-TX Living","10.0.2.20"],["6","DM-TX Theater","10.0.2.21"],
  ["7","DM-TX Office","10.0.2.22"],["8","DM-RX Living","10.0.2.30"],["9","DM-RX Theater","10.0.2.31"],
  ["10","Apple TV LR","10.0.2.40",4],["11","Apple TV Theater","10.0.2.41",4],["12","Apple TV Bed","10.0.2.42",4],
  ["13","Sonos Amp","10.0.2.50"],["14","Denon AVR","10.0.2.51"],
], 26);
const iotSwPorts = mkPorts([
  ["1","Shade Motor 1","10.0.3.10",3],["2","Shade Motor 2","10.0.3.11",3],["3","Shade Motor 3","10.0.3.12",3],
  ["4","Shade Motor 4","10.0.3.13",3],["5","Thermostat Main","10.0.3.20",2],["6","Thermostat Bed","10.0.3.21",2],
  ["7","Thermostat Kit","10.0.3.22",2],["8","Leak Sensor Kit","10.0.3.30",1],["9","Leak Sensor Bath","10.0.3.31",1],
  ["10","Motion Sensor Hall","10.0.3.40",2],["11","Motion Sensor Gar","10.0.3.41",2],
  ["12","Doorbell Rear","10.0.3.50",8],["13","Camera Patio","10.0.3.51",12],["14","Camera Drive","10.0.3.52",12],
  ["15","Camera Pool","10.0.3.53",12],["16","Irrigation Ctrl","10.0.3.60",4],
  ["17","Gate Controller","10.0.3.61",5],["18","Garage Door","10.0.3.62",3],
  ["19","Smoke Detector 1","10.0.3.70",1],["20","Smoke Detector 2","10.0.3.71",1],
  ["21","CO Detector","10.0.3.72",1],
], 24);
const patchPorts1: PortInfo[] = Array.from({ length: 24 }, (_, i) => ({
  num: i + 1, active: i < 18, speed: "1G",
  device: i < 18 ? [`CP4`, `DM-MD`, `DM-NVX`, `AV-SW`, `IoT-SW`, `AP-LR`, `AP-Kit`, `AP-Mst`, `AP-Grd`, `NAS`, `NVR`, `Desktop`, `Printer`, `Sonos`, `Hue`, `Lutron`, `Ring`, `Intercom`][i] : undefined,
}));
const patchPorts2: PortInfo[] = Array.from({ length: 24 }, (_, i) => ({
  num: i + 1, active: i < 16, speed: "1G",
  device: i < 16 ? [`Shade-1`, `Shade-2`, `Shade-3`, `Shade-4`, `Therm-M`, `Therm-B`, `Therm-K`, `Leak-Kit`, `Leak-Bath`, `Motion-H`, `Motion-G`, `Cam-Pat`, `Cam-Drv`, `Cam-Pool`, `Irrig`, `Gate`][i] : undefined,
}));
const dmMdPorts: PortInfo[] = Array.from({ length: 16 }, (_, i) => ({
  num: i + 1, active: i < 12, speed: "DM",
  device: i < 12 ? [`In-1 LR`, `In-2 Theater`, `In-3 Office`, `In-4 Kitchen`, `In-5 Master`, `In-6 Patio`, `In-7 Pool`, `In-8 Spare`, `Out-1 LR`, `Out-2 Theater`, `Out-3 Kitchen`, `Out-4 Master`][i] : undefined,
}));
const defaultRackDevices: RackDevice[] = [
  { id: "ups", name: "UPS", model: "APC Smart-UPS 1500", u: 2, type: "ups", status: "online", temp: 32, uptime: "142d 7h" },
  { id: "patch1", name: "Patch Panel", model: "Cat6A — 24 Port", u: 1, type: "patch", status: "online", ports: { total: 24, active: 18 }, portDetails: patchPorts1 },
  { id: "sw-core", name: "Core Switch", model: "Cisco SG350-28P", u: 1, type: "switch", ip: "10.0.1.1", status: "online", ports: { total: 28, active: 22 }, temp: 38, cpu: 12, portDetails: coreSwPorts },
  { id: "sw-av", name: "AV VLAN Switch", model: "Netgear M4250-26G4F", u: 1, type: "switch", ip: "10.0.1.2", status: "online", ports: { total: 26, active: 14 }, temp: 36, cpu: 8, portDetails: avSwPorts },
  { id: "cp4", name: "Crestron CP4", model: "CP4 Control Processor", u: 1, type: "processor", ip: "10.0.1.10", status: "online", temp: 42, cpu: 23, uptime: "89d 3h" },
  { id: "dm-md", name: "DM-MD8x8", model: "Crestron DigitalMedia", u: 2, type: "matrix", ip: "10.0.1.11", status: "online", ports: { total: 16, active: 12 }, temp: 40, portDetails: dmMdPorts },
  { id: "nvx", name: "DM-NVX Dir.", model: "Crestron DM-NVX-DIR-80", u: 1, type: "processor", ip: "10.0.1.12", status: "online", cpu: 15, temp: 39 },
  { id: "sw-iot", name: "IoT Switch", model: "UniFi USW-24-PoE", u: 1, type: "switch", ip: "10.0.1.3", status: "warning", ports: { total: 24, active: 21 }, temp: 44, cpu: 34, portDetails: iotSwPorts },
  { id: "patch2", name: "Patch Panel", model: "Cat6A — 24 Port", u: 1, type: "patch", status: "online", ports: { total: 24, active: 16 }, portDetails: patchPorts2 },
  { id: "blank", name: "", model: "", u: 1, type: "blank", status: "online" },
];

/* Rack port hover tooltip for inline rack ports */
function RackPortTooltip({ port, devType, rect }: { port: PortInfo; devType: string; rect: { x: number; y: number } }) {
  const isPatch = devType === "patch";
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="fixed z-[60] pointer-events-none"
      style={{ left: rect.x, top: rect.y - 8, transform: "translate(-50%, -100%)" }}>
      <div className="px-3 py-2 rounded-lg border border-white/[0.1] bg-[rgba(8,8,16,0.95)] shadow-xl min-w-[140px]">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-white/60 text-[10px]">Port {port.num}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white/20 text-[8px]">{isPatch ? "Patch" : port.speed}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${port.active ? "bg-emerald-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]" : "bg-white/10"}`} />
          </div>
        </div>
        {port.active && port.device ? (
          <>
            <p className="text-white/70 text-[10px]">{port.device}</p>
            {port.ip && <p className="text-white/25 text-[8px] font-mono mt-0.5">{port.ip}</p>}
            {port.poe !== undefined && port.poe > 0 && <div className="flex items-center gap-1 mt-1"><Zap className="w-2 h-2 text-amber-400/50" /><span className="text-amber-400/50 text-[8px]">PoE {port.poe}W</span></div>}
          </>
        ) : <p className="text-white/20 text-[8px]">{port.active ? "Connected" : "No link"}</p>}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-white/[0.1]" />
      </div>
    </motion.div>
  );
}

/* Inline 2-row port block for rack rows — right-justified, all squared */
function RackInlinePorts({ ports, devType, devId }: { ports: PortInfo[]; devType: string; devId: string }) {
  const [hovered, setHovered] = useState<{ port: PortInfo; rect: { x: number; y: number } } | null>(null);
  const isPatch = devType === "patch";
  const half = Math.ceil(ports.length / 2);
  const topRow = ports.slice(0, half);
  const bottomRow = ports.slice(half);

  const portClass = (p: PortInfo) => {
    if (isPatch) {
      return p.active
        ? "bg-cyan-500/25 border-cyan-400/30"
        : "bg-cyan-900/10 border-cyan-800/15";
    }
    if (p.active) {
      return p.poe
        ? "bg-emerald-400/30 border-emerald-400/25"
        : "bg-blue-400/20 border-blue-400/18";
    }
    return "bg-white/[0.02] border-white/[0.04]";
  };

  const handleEnter = (e: React.MouseEvent, p: PortInfo) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHovered({ port: p, rect: { x: r.left + r.width / 2, y: r.top } });
  };

  return (
    <>
      <div className="flex flex-col gap-[1px]">
        {[topRow, bottomRow].map((row, ri) => (
          <div key={ri} className="flex gap-[2px] justify-end">
            {row.map(p => (
              <div key={`${devId}-${ri}-${p.num}`}
                className={`w-[8px] h-[8px] rounded-[1px] border transition-all hover:scale-150 hover:z-10 cursor-default ${portClass(p)}`}
                onMouseEnter={(e) => handleEnter(e, p)}
                onMouseLeave={() => setHovered(null)} />
            ))}
          </div>
        ))}
      </div>
      <AnimatePresence>
        {hovered && <RackPortTooltip port={hovered.port} devType={devType} rect={hovered.rect} />}
      </AnimatePresence>
    </>
  );
}

/* Draggable rack row */
function RackDeviceRow({ dev, index, isSelected, onSelect, statusColor, statusGlow, moveDevice }: {
  dev: RackDevice; index: number; isSelected: boolean; onSelect: () => void;
  statusColor: (s: string) => string; statusGlow: (s: string) => string;
  moveDevice: (from: number, to: number) => void;
}) {
  const isBlank = dev.type === "blank";
  const h = dev.u * 44;
  const TypeIcon = dev.type === "processor" ? Server : dev.type === "switch" ? Network : dev.type === "matrix" ? Cable : dev.type === "ups" ? Battery : Cable;

  const ref = React.useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    if (isBlank) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    if (ref.current) ref.current.style.opacity = "0.4";
  };
  const handleDragEnd = () => { if (ref.current) ref.current.style.opacity = "1"; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const from = parseInt(e.dataTransfer.getData("text/plain"));
    if (!isNaN(from) && from !== index) moveDevice(from, index);
  };

  return (
    <div ref={ref} draggable={!isBlank} onDragStart={handleDragStart} onDragEnd={handleDragEnd}
      onDragOver={handleDragOver} onDrop={handleDrop}
      onClick={() => !isBlank && onSelect()}
      className={`relative flex items-stretch border-b border-white/[0.025] transition-all ${isBlank ? "opacity-30" : "cursor-pointer hover:bg-white/[0.02]"} ${isSelected ? "bg-white/[0.04]" : ""}`}
      style={{ height: h }}>
      <div className="w-8 flex-shrink-0 flex flex-col items-center justify-center border-r border-white/[0.03]">
        <span className="text-white/10 text-[8px]">{dev.u}U</span>
      </div>
      {!isBlank ? (
        <div className="flex-1 flex items-center px-3 gap-3">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor(dev.status)} ${statusGlow(dev.status)}`} />
          <div className="w-7 h-7 rounded bg-white/[0.03] border border-white/[0.05] flex items-center justify-center flex-shrink-0"><TypeIcon className="w-3.5 h-3.5 text-white/25" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2"><span className="text-white/55 text-xs truncate">{dev.name}</span><span className="text-white/15 text-[9px] truncate">{dev.model}</span></div>
            {dev.ip && <span className="text-white/15 text-[9px] font-mono">{dev.ip}</span>}
          </div>
          {/* Fixed-width right zone: temp | ports (right-aligned) | selected */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-[180px] flex items-center justify-end">
              {dev.portDetails && <RackInlinePorts ports={dev.portDetails} devType={dev.type} devId={dev.id} />}
            </div>
            <div className="w-[34px] text-right flex-shrink-0">
              {dev.temp !== undefined && <span className="text-white/40 text-[9px]">{dev.temp}°C</span>}
            </div>
            <div className="w-[3px] flex-shrink-0">
              {isSelected && <div className="w-0.5 h-6 rounded-full bg-blue-400/50" />}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center"><span className="text-white/[0.06] text-[9px] tracking-widest uppercase">Blank</span></div>
      )}
    </div>
  );
}

function NetworkTab() {
  const [selected, setSelected] = useState<string | null>("cp4");
  const [hoveredPort, setHoveredPort] = useState<PortInfo | null>(null);
  const [devices, setDevices] = useState<RackDevice[]>(() => {
    try {
      const saved = localStorage.getItem("rack-order");
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        const ordered: RackDevice[] = [];
        for (const id of ids) {
          const dev = defaultRackDevices.find(d => d.id === id);
          if (dev) ordered.push(dev);
        }
        // append any new devices not in saved order
        for (const dev of defaultRackDevices) {
          if (!ordered.find(d => d.id === dev.id)) ordered.push(dev);
        }
        return ordered;
      }
    } catch {}
    return defaultRackDevices;
  });
  const sel = devices.find(d => d.id === selected);
  const totalU = devices.reduce((a, d) => a + d.u, 0);
  const onlineCount = devices.filter(d => d.status === "online" && d.type !== "blank").length;
  const deviceCount = devices.filter(d => d.type !== "blank").length;
  const statusColor = (s: string) => s === "online" ? "bg-emerald-400" : s === "warning" ? "bg-amber-400" : "bg-red-400";
  const statusGlow = (s: string) => s === "online" ? "shadow-[0_0_6px_rgba(74,222,128,0.4)]" : s === "warning" ? "shadow-[0_0_6px_rgba(251,191,36,0.4)]" : "shadow-[0_0_6px_rgba(248,113,113,0.4)]";

  const moveDevice = (from: number, to: number) => {
    setDevices(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      try { localStorage.setItem("rack-order", JSON.stringify(next.map(d => d.id))); } catch {}
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Devices</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">{onlineCount}</span><span className="text-white/20 text-[10px]">/ {deviceCount}</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Rack Usage</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">{totalU}</span><span className="text-white/20 text-[10px]">/ 12U</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Uplink</span><div className="flex items-baseline gap-1"><span className="text-emerald-400/80 text-xl tracking-tight">1</span><span className="text-white/20 text-[10px]">Gbps</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">PoE Draw</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">186</span><span className="text-white/20 text-[10px]">W</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Warnings</span><div className="flex items-baseline gap-1"><span className={`text-xl tracking-tight ${devices.some(d=>d.status==="warning") ? "text-amber-400" : "text-emerald-400/80"}`}>{devices.filter(d=>d.status==="warning").length}</span></div></Panel>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Panel className="col-span-2 !p-0 overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-white/[0.03]">
            <div className="flex items-center gap-3"><Server className="w-4 h-4 text-white/20" /><span className="text-white/25 text-[10px] tracking-widest uppercase">Equipment Rack — 12U Cabinet</span></div>
          </div>
          <div className="px-3 py-2">
            {devices.map((dev, idx) => (
              <RackDeviceRow key={dev.id} dev={dev} index={idx} isSelected={selected === dev.id}
                onSelect={() => setSelected(dev.id)} statusColor={statusColor} statusGlow={statusGlow} moveDevice={moveDevice} />
            ))}
          </div>
        </Panel>
        <Panel>
          {sel && sel.type !== "blank" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/30 text-[10px] tracking-widest uppercase">{sel.name}</span>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${sel.status === "online" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${statusColor(sel.status)}`} />
                  <span className={`text-[9px] ${sel.status === "online" ? "text-emerald-400" : "text-amber-400"}`}>{sel.status.toUpperCase()}</span>
                </div>
              </div>
              <div><span className="text-white/20 text-[9px]">Model</span><p className="text-white/50 text-xs mt-0.5">{sel.model}</p></div>
              {sel.ip && <div><span className="text-white/20 text-[9px]">IP Address</span><p className="text-white/50 text-xs mt-0.5 font-mono">{sel.ip}</p></div>}
              <div className="grid grid-cols-2 gap-3">
                {sel.temp !== undefined && <div><span className="text-white/20 text-[9px]">Temp</span><div className="flex items-baseline gap-1 mt-0.5"><span className={`text-sm ${sel.temp > 42 ? "text-amber-400" : "text-white/60"}`}>{sel.temp}°C</span></div></div>}
                {sel.cpu !== undefined && <div><span className="text-white/20 text-[9px]">CPU</span><div className="flex items-baseline gap-1 mt-0.5"><span className="text-white/60 text-sm">{sel.cpu}%</span></div></div>}
              </div>
              {sel.uptime && <div><span className="text-white/20 text-[9px]">Uptime</span><p className="text-white/35 text-[10px] mt-0.5 font-mono">{sel.uptime}</p></div>}
              {/* Port grid with hover details */}
              {sel.portDetails && (
                <div className="pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/20 text-[9px] tracking-wider uppercase">{sel.type === "patch" ? "Patch Ports" : "Physical Ports"}</span>
                    <span className="text-white/15 text-[9px]">{sel.ports?.active}/{sel.ports?.total}</span>
                  </div>
                  <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.min(sel.portDetails.length, 12)}, 1fr)` }}>
                    {sel.portDetails.map(p => (
                      <div key={p.num} className="relative group"
                        onMouseEnter={() => setHoveredPort(p)} onMouseLeave={() => setHoveredPort(null)}>
                        <div className={`aspect-square flex items-center justify-center cursor-default transition-all border ${
                          sel.type === "patch"
                            ? (p.active
                              ? "bg-cyan-500/20 border-cyan-400/30 hover:bg-cyan-400/30 rounded-[2px]"
                              : "bg-cyan-900/8 border-cyan-800/12 hover:bg-cyan-900/15 rounded-[2px]")
                            : (p.active
                              ? p.poe ? "bg-emerald-400/15 border-emerald-400/25 hover:bg-emerald-400/25 rounded-[2px]" : "bg-blue-400/12 border-blue-400/20 hover:bg-blue-400/22 rounded-[2px]"
                              : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] rounded-[2px]")
                        }`}>
                          <span className={`text-[6px] ${p.active ? "text-white/40" : "text-white/10"}`}>{p.num}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Hover tooltip */}
                  {hoveredPort && (
                    <div className="mt-2 p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <span className="text-white/50 text-[10px]">Port {hoveredPort.num}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-white/15 text-[7px]">{sel.type === "patch" ? "Patch" : hoveredPort.speed}</span>
                          <div className={`w-1.5 h-1.5 rounded-full ${hoveredPort.active ? "bg-emerald-400" : "bg-white/10"}`} />
                        </div>
                      </div>
                      {hoveredPort.active && hoveredPort.device ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-white/60 text-[10px]">{hoveredPort.device}</p>
                          {hoveredPort.ip && <p className="text-white/25 text-[9px] font-mono">{hoveredPort.ip}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            {hoveredPort.poe !== undefined && hoveredPort.poe > 0 && <span className="text-emerald-400/50 text-[8px]">PoE {hoveredPort.poe}W</span>}
                          </div>
                        </div>
                      ) : <p className="text-white/15 text-[9px] mt-1">No device connected</p>}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {sel.type === "patch" ? (
                      <>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-cyan-500/20 border border-cyan-400/30" /><span className="text-white/15 text-[7px]">Patched</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-cyan-900/8 border border-cyan-800/12" /><span className="text-white/15 text-[7px]">Open</span></div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-emerald-400/15 border border-emerald-400/25" /><span className="text-white/15 text-[7px]">PoE</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-blue-400/12 border border-blue-400/20" /><span className="text-white/15 text-[7px]">Active</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-[1px] bg-white/[0.02] border border-white/[0.04]" /><span className="text-white/15 text-[7px]">Unused</span></div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/15"><Server className="w-8 h-8 mb-3 opacity-30" /><span className="text-[10px] tracking-widest uppercase">Select a device</span></div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ALARMS TAB
   ═══════════════════════════════════════════ */
type AlarmEntry = { id: string; ts: string; system: string; severity: "critical"|"warning"|"info"|"resolved"; message: string; source: string };
const alarmLog: AlarmEntry[] = [
  { id: "a1", ts: "2026-02-24 08:42:11", system: "Electrical", severity: "warning", message: "IoT Switch port 22 high PoE draw — 28.4W exceeds threshold", source: "SW-IOT / Port 22" },
  { id: "a2", ts: "2026-02-24 07:15:03", system: "HVAC", severity: "info", message: "Filter replacement reminder — 73% life remaining", source: "AHU-1" },
  { id: "a3", ts: "2026-02-24 06:30:00", system: "Irrigation", severity: "resolved", message: "Zone 2 moisture below threshold — auto-watering triggered", source: "Garden Beds Sensor" },
  { id: "a4", ts: "2026-02-23 22:18:45", system: "Network", severity: "resolved", message: "Crestron CP4 heartbeat lost for 4s — auto-recovered", source: "CP4 / 10.0.1.10" },
  { id: "a5", ts: "2026-02-23 19:05:12", system: "Electrical", severity: "resolved", message: "EV Charger breaker load spike to 92% — normalized", source: "Circuit 13" },
  { id: "a6", ts: "2026-02-23 14:30:00", system: "Solar", severity: "info", message: "String C efficiency dropped below 90% — cleaning recommended", source: "Inverter 1" },
  { id: "a7", ts: "2026-02-23 11:20:33", system: "Battery", severity: "resolved", message: "PW-3 cell temperature exceeded 31°C — fan speed increased", source: "Powerwall 3" },
  { id: "a8", ts: "2026-02-22 23:55:00", system: "Network", severity: "critical", message: "DM-MD8x8 matrix output 5 — no signal detected for 120s", source: "DM-MD / Out-5" },
  { id: "a9", ts: "2026-02-22 16:42:00", system: "HVAC", severity: "warning", message: "Zone 3 temperature 2.8°C above setpoint", source: "Kitchen Thermostat" },
  { id: "a10", ts: "2026-02-22 09:10:15", system: "Electrical", severity: "info", message: "Scheduled maintenance: Dryer breaker auto-test completed", source: "Circuit 9" },
  { id: "a11", ts: "2026-02-21 20:00:00", system: "Network", severity: "resolved", message: "AV VLAN switch firmware auto-updated to v4.2.1", source: "SW-AV / 10.0.1.2" },
  { id: "a12", ts: "2026-02-21 08:15:00", system: "Solar", severity: "resolved", message: "Morning production ramp — inverter grid-sync established", source: "Inverter 1" },
];

function exportPDF(data: AlarmEntry[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16); doc.setTextColor(40); doc.text("Alarm Report — Crestron Home Automation", 14, 18);
  doc.setFontSize(8); doc.setTextColor(120); doc.text(`Generated: ${new Date().toLocaleString()} · ${data.length} entries`, 14, 24);
  autoTable(doc, {
    startY: 30, head: [["Timestamp", "System", "Severity", "Message", "Source"]],
    body: data.map(a => [a.ts, a.system, a.severity.toUpperCase(), a.message, a.source]),
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 40], textColor: [200, 200, 220], fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 245, 248] },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 25 }, 2: { cellWidth: 20 }, 3: { cellWidth: "auto" }, 4: { cellWidth: 40 } },
  });
  doc.save("alarm-report.pdf");
}
function exportExcel(data: AlarmEntry[]) {
  const ws = XLSX.utils.json_to_sheet(data.map(a => ({ Timestamp: a.ts, System: a.system, Severity: a.severity, Message: a.message, Source: a.source })));
  ws["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 60 }, { wch: 25 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Alarms");
  XLSX.writeFile(wb, "alarm-report.xlsx");
}

const existingUsers = [
  { id: "u1", name: "John Mitchell", email: "john@home.local", role: "Owner" },
  { id: "u2", name: "Sarah Mitchell", email: "sarah@home.local", role: "Owner" },
  { id: "u3", name: "Tech Support", email: "support@installer.com", role: "Installer" },
  { id: "u4", name: "AV Integrator", email: "av@integrator.com", role: "Integrator" },
];

function AlarmsTab() {
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState<string>("all");
  const [filterSys, setFilterSys] = useState<string>("all");
  const [showNotifConfig, setShowNotifConfig] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportMenu2, setShowExportMenu2] = useState(false);
  const filtered = alarmLog.filter(a => {
    if (filterSev !== "all" && a.severity !== filterSev) return false;
    if (filterSys !== "all" && a.system !== filterSys) return false;
    if (search && !a.message.toLowerCase().includes(search.toLowerCase()) && !a.source.toLowerCase().includes(search.toLowerCase()) && !a.system.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const sevIcon = (s: string) => s === "critical" ? XCircle : s === "warning" ? AlertTriangle : s === "resolved" ? CheckCircle2 : Info;
  const sevColor = (s: string) => s === "critical" ? "text-red-400" : s === "warning" ? "text-amber-400" : s === "resolved" ? "text-emerald-400" : "text-blue-400";
  const sevBg = (s: string) => s === "critical" ? "bg-red-500/[0.08] border-red-500/15" : s === "warning" ? "bg-amber-500/[0.08] border-amber-500/15" : s === "resolved" ? "bg-emerald-500/[0.08] border-emerald-500/15" : "bg-blue-500/[0.08] border-blue-500/15";
  const activeCount = alarmLog.filter(a => a.severity === "critical" || a.severity === "warning").length;
  const systems = Array.from(new Set(alarmLog.map(a => a.system)));

  useEffect(() => {
    const handler = () => { setShowExportMenu(false); setShowExportMenu2(false); };
    if (showExportMenu || showExportMenu2) {
      const timer = setTimeout(() => document.addEventListener("click", handler), 0);
      return () => { clearTimeout(timer); document.removeEventListener("click", handler); };
    }
  }, [showExportMenu, showExportMenu2]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Active</span><div className="flex items-baseline gap-1"><span className={`text-xl tracking-tight ${activeCount > 0 ? "text-amber-400" : "text-emerald-400/80"}`}>{activeCount}</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Critical</span><div className="flex items-baseline gap-1"><span className={`text-xl tracking-tight ${alarmLog.filter(a=>a.severity==="critical").length > 0 ? "text-red-400" : "text-emerald-400/80"}`}>{alarmLog.filter(a=>a.severity==="critical").length}</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Warnings</span><div className="flex items-baseline gap-1"><span className={`text-xl tracking-tight ${alarmLog.filter(a=>a.severity==="warning").length > 0 ? "text-amber-400" : "text-emerald-400/80"}`}>{alarmLog.filter(a=>a.severity==="warning").length}</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Resolved</span><div className="flex items-baseline gap-1"><span className="text-emerald-400/80 text-xl tracking-tight">{alarmLog.filter(a=>a.severity==="resolved").length}</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Total Log</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">{alarmLog.length}</span></div></Panel>
      </div>
      <Panel className="!p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alarms, sources, systems..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 text-xs placeholder:text-white/15 outline-none focus:border-white/15 transition-all" />
          </div>
          <div className="relative">
            <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/50 text-xs outline-none cursor-pointer">
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="resolved">Resolved</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterSys} onChange={e => setFilterSys(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/50 text-xs outline-none cursor-pointer">
              <option value="all">All Systems</option>
              {systems.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
          </div>
          {/* Export dropdown */}
          <div className="relative">
            <button onClick={() => { setShowExportMenu(!showExportMenu); setShowExportMenu2(false); }}
              className="flex items-center gap-1.5 pl-3 pr-7 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/50 text-xs hover:bg-white/[0.06] transition-all cursor-pointer">
              <Download className="w-3 h-3" />Export
            </button>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
            <AnimatePresence>
              {showExportMenu && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg bg-[rgba(12,12,20,0.97)] border border-white/[0.08] shadow-xl shadow-black/40 overflow-hidden">
                  <button onClick={() => { exportPDF(filtered); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.06] transition-all">
                    <FileText className="w-3.5 h-3.5 text-red-400/70" />PDF Report
                  </button>
                  <div className="h-px bg-white/[0.04]" />
                  <button onClick={() => { exportExcel(filtered); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.06] transition-all">
                    <Table className="w-3.5 h-3.5 text-emerald-400/70" />Excel Sheet
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setShowNotifConfig(!showNotifConfig)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all ${showNotifConfig ? "bg-blue-500/[0.08] border border-blue-500/20 text-blue-400/80" : "bg-white/[0.03] border border-white/[0.06] text-white/40 hover:bg-white/[0.06]"}`}><Bell className="w-3 h-3" />Notify</button>
        </div>
      </Panel>

      {/* Notification config panel */}
      <AnimatePresence>
        {showNotifConfig && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
            <NotificationConfigPanel />
          </motion.div>
        )}
      </AnimatePresence>

      <Panel className="!p-0 overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between border-b border-white/[0.04]">
          <div className="flex items-center gap-3"><ShieldAlert className="w-4 h-4 text-white/20" /><span className="text-white/25 text-[10px] tracking-widest uppercase">Alarm History — {filtered.length} entries</span></div>
          <div className="relative">
            <button onClick={() => { setShowExportMenu2(!showExportMenu2); setShowExportMenu(false); }}
              className="flex items-center gap-1 pl-2 pr-5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-white/30 text-[9px] hover:bg-white/[0.06] transition-all cursor-pointer">
              <Download className="w-2.5 h-2.5" />Export
            </button>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white/15 pointer-events-none" />
            <AnimatePresence>
              {showExportMenu2 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-50 w-32 rounded-lg bg-[rgba(12,12,20,0.97)] border border-white/[0.08] shadow-xl shadow-black/40 overflow-hidden">
                  <button onClick={() => { exportPDF(filtered); setShowExportMenu2(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-white/50 hover:bg-white/[0.06] transition-all">
                    <FileText className="w-3 h-3 text-red-400/60" />PDF
                  </button>
                  <div className="h-px bg-white/[0.04]" />
                  <button onClick={() => { exportExcel(filtered); setShowExportMenu2(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-white/50 hover:bg-white/[0.06] transition-all">
                    <Table className="w-3 h-3 text-emerald-400/60" />Excel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="divide-y divide-white/[0.025] max-h-[480px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-white/15"><Search className="w-6 h-6 mb-2 opacity-30" /><span className="text-[10px] tracking-widest uppercase">No matching alarms</span></div>
          )}
          {filtered.map((alarm) => {
            const SevIcon = sevIcon(alarm.severity);
            return (
              <div key={alarm.id} className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.015] transition-all">
                <div className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded flex items-center justify-center border ${sevBg(alarm.severity)}`}>
                  <SevIcon className={`w-3 h-3 ${sevColor(alarm.severity)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] tracking-wider uppercase ${sevColor(alarm.severity)}`}>{alarm.severity}</span>
                    <span className="text-white/[0.08] text-[9px]">|</span>
                    <span className="text-white/25 text-[9px] tracking-wider uppercase">{alarm.system}</span>
                    <span className="text-white/[0.08] text-[9px]">|</span>
                    <span className="text-white/15 text-[9px] font-mono">{alarm.ts}</span>
                  </div>
                  <p className="text-white/50 text-xs mt-1 leading-relaxed">{alarm.message}</p>
                  <span className="text-white/15 text-[9px] font-mono mt-0.5 block">{alarm.source}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ═══════════════════════════════════════════
   REUSABLE PURE-SVG CHART COMPONENTS
   ═══════════════════════════════════════════ */
function BarChart({ data, color1, color2, maxV, h = 80 }: {
  data: { label: string; v1: number; v2?: number }[]; color1: string; color2?: string; maxV: number; h?: number;
}) {
  const W = 620, pad = 8;
  const bw = Math.min(28, (W - pad * 2) / data.length - 4);
  return (
    <svg viewBox={`0 0 ${W} ${h + 20}`} className="w-full" style={{ maxHeight: h + 40 }}>
      {[0, 0.5, 1].map(f => <line key={f} x1={pad} y1={h * (1 - f)} x2={W - pad} y2={h * (1 - f)} stroke="rgba(255,255,255,0.025)" />)}
      {data.map((d, i) => {
        const x = pad + i * ((W - pad * 2) / data.length) + ((W - pad * 2) / data.length - bw) / 2;
        const h1 = (d.v1 / maxV) * h;
        const h2 = d.v2 !== undefined ? (d.v2 / maxV) * h : 0;
        return (
          <g key={d.label}>
            <rect x={x} y={h - h1} width={bw} height={h1} rx="3" fill={color1} />
            {d.v2 !== undefined && color2 && <rect x={x + bw * 0.15} y={h - h2} width={bw * 0.7} height={h2} rx="2" fill={color2} />}
            <text x={x + bw / 2} y={h + 14} textAnchor="middle" fill="rgba(255,255,255,0.12)" style={{ fontSize: "7px", fontFamily: "Inter" }}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ lines, xLabels, yLabels, yMin, yMax, h = 100, fill }: {
  lines: { data: { x: number; y: number }[]; color: string }[];
  xLabels: string[]; yLabels?: string[]; yMin: number; yMax: number; h?: number; fill?: string;
}) {
  const W = 620, pad = 30;
  const cW = W - pad * 2, cH = h;
  const toX = (x: number) => pad + (x / (lines[0].data.length - 1)) * cW;
  const toY = (y: number) => cH - ((y - yMin) / (yMax - yMin)) * cH;
  return (
    <svg viewBox={`0 0 ${W} ${cH + 22}`} className="w-full" style={{ maxHeight: cH + 40 }}>
      {yLabels && yLabels.map((l, i) => {
        const y = cH - (i / (yLabels.length - 1)) * cH;
        return (<g key={l}><line x1={pad} y1={y} x2={W - pad} y2={y} stroke="rgba(255,255,255,0.025)" /><text x={pad - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.1)" style={{ fontSize: "7px", fontFamily: "Inter" }}>{l}</text></g>);
      })}
      {xLabels.map((l, i) => <text key={l} x={pad + (i / (xLabels.length - 1)) * cW} y={cH + 15} textAnchor="middle" fill="rgba(255,255,255,0.1)" style={{ fontSize: "7px", fontFamily: "Inter" }}>{l}</text>)}
      {lines.map((line, li) => {
        const path = toSmoothPath(line.data.map(d => ({ x: toX(d.x), y: toY(d.y) })));
        return (
          <g key={li}>
            {fill && li === 0 && <path d={path + ` L${toX(line.data[line.data.length - 1].x)},${cH} L${toX(line.data[0].x)},${cH} Z`} fill={fill} />}
            <path d={path} fill="none" stroke={line.color} strokeWidth="1.5" />
          </g>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════
   HYDRAULIC TAB
   ═══════════════════════════════════════════ */
const hydraulicZones = [
  { id: "main", name: "Main Supply", pressure: 3.2, flow: 18.5, temp: 14, status: "normal" as const },
  { id: "hot", name: "Hot Water", pressure: 2.8, flow: 6.2, temp: 58, status: "normal" as const },
  { id: "recirc", name: "Recirculation", pressure: 1.5, flow: 2.1, temp: 52, status: "normal" as const },
  { id: "kitchen", name: "Kitchen", pressure: 3.0, flow: 4.8, temp: 14, status: "normal" as const },
  { id: "bath-m", name: "Master Bath", pressure: 2.9, flow: 0, temp: 14, status: "idle" as const },
  { id: "bath-g", name: "Guest Bath", pressure: 2.8, flow: 0, temp: 14, status: "idle" as const },
  { id: "laundry", name: "Laundry", pressure: 3.1, flow: 0, temp: 14, status: "idle" as const },
  { id: "outdoor", name: "Outdoor / Pool", pressure: 2.5, flow: 8.2, temp: 28, status: "normal" as const },
];
const leakSensors = [
  { name: "Kitchen Floor", status: "dry" as const, battery: 92 },
  { name: "Master Bath", status: "dry" as const, battery: 87 },
  { name: "Laundry Room", status: "dry" as const, battery: 95 },
  { name: "Water Heater", status: "dry" as const, battery: 78 },
  { name: "Basement", status: "dry" as const, battery: 91 },
];

function HydraulicTab() {
  const dailyUsage = useMemo(() => [
    { label: "Mon", domestic: 420, irrigation: 720, pool: 180 },
    { label: "Tue", domestic: 380, irrigation: 0, pool: 160 },
    { label: "Wed", domestic: 410, irrigation: 680, pool: 175 },
    { label: "Thu", domestic: 450, irrigation: 0, pool: 190 },
    { label: "Fri", domestic: 390, irrigation: 847, pool: 170 },
    { label: "Sat", domestic: 520, irrigation: 560, pool: 220 },
    { label: "Sun", domestic: 480, irrigation: 430, pool: 200 },
  ], []);
  const totalToday = 390 + 847 + 170;
  const zoneActive = hydraulicZones.filter(z => z.status === "normal").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2">
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Today</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">{totalToday}</span><span className="text-white/20 text-[10px]">L</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Main Pressure</span><div className="flex items-baseline gap-1"><span className="text-emerald-400/80 text-xl tracking-tight">3.2</span><span className="text-white/20 text-[10px]">bar</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Flow Rate</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">18.5</span><span className="text-white/20 text-[10px]">L/min</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Hot Water</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">58</span><span className="text-white/20 text-[10px]">°C</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Active Zones</span><div className="flex items-baseline gap-1"><span className="text-white text-xl tracking-tight">{zoneActive}</span><span className="text-white/20 text-[10px]">/ {hydraulicZones.length}</span></div></Panel>
        <Panel className="!p-3"><span className="text-white/20 text-[9px] tracking-wider uppercase block mb-1">Leak Detect</span><div className="flex items-baseline gap-1"><span className="text-emerald-400/80 text-xl tracking-tight">OK</span></div></Panel>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Panel className="col-span-2 overflow-hidden">
          <div className="flex items-center gap-3 mb-3"><Waves className="w-4 h-4 text-blue-400/50" /><span className="text-white/25 text-[10px] tracking-widest uppercase">Hydraulic System Schematic</span></div>
          <svg viewBox="0 0 560 220" className="w-full" style={{ maxHeight: 240 }}>
            {/* Main supply */}
            <rect x="10" y="15" width="100" height="42" rx="6" fill="rgba(96,165,250,0.06)" stroke="rgba(96,165,250,0.2)" strokeWidth="1" />
            <text x="60" y="32" textAnchor="middle" fill="rgba(96,165,250,0.6)" style={{fontSize:"8px",fontFamily:"Inter"}}>Main Supply</text>
            <text x="60" y="48" textAnchor="middle" fill="rgba(255,255,255,0.4)" style={{fontSize:"11px",fontFamily:"Inter"}}>3.2 bar</text>
            {/* Water heater */}
            <rect x="160" y="15" width="100" height="42" rx="6" fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.15)" strokeWidth="1" />
            <text x="210" y="32" textAnchor="middle" fill="rgba(251,191,36,0.5)" style={{fontSize:"8px",fontFamily:"Inter"}}>Water Heater</text>
            <text x="210" y="48" textAnchor="middle" fill="rgba(255,255,255,0.4)" style={{fontSize:"11px",fontFamily:"Inter"}}>58°C</text>
            {/* Recirc pump */}
            <rect x="310" y="15" width="100" height="42" rx="6" fill="rgba(139,92,246,0.06)" stroke="rgba(139,92,246,0.15)" strokeWidth="1" />
            <text x="360" y="32" textAnchor="middle" fill="rgba(139,92,246,0.5)" style={{fontSize:"8px",fontFamily:"Inter"}}>Recirc Pump</text>
            <text x="360" y="48" textAnchor="middle" fill="rgba(255,255,255,0.4)" style={{fontSize:"11px",fontFamily:"Inter"}}>2.1 L/m</text>
            {/* Pool */}
            <rect x="460" y="15" width="90" height="42" rx="6" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.15)" strokeWidth="1" />
            <text x="505" y="32" textAnchor="middle" fill="rgba(6,182,212,0.5)" style={{fontSize:"8px",fontFamily:"Inter"}}>Pool</text>
            <text x="505" y="48" textAnchor="middle" fill="rgba(255,255,255,0.4)" style={{fontSize:"11px",fontFamily:"Inter"}}>28°C</text>
            {/* Pipes */}
            <path d="M 110 36 L 160 36" fill="none" stroke="rgba(96,165,250,0.12)" strokeWidth="2" />
            <path d="M 110 36 L 160 36" fill="none" stroke="rgba(96,165,250,0.35)" strokeWidth="2" strokeDasharray="4 12"><animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.5s" repeatCount="indefinite" /></path>
            <path d="M 260 36 L 310 36" fill="none" stroke="rgba(251,191,36,0.12)" strokeWidth="2" />
            <path d="M 260 36 L 310 36" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="2" strokeDasharray="4 12"><animate attributeName="stroke-dashoffset" from="0" to="-16" dur="2s" repeatCount="indefinite" /></path>
            {/* Bus */}
            <line x1="60" y1="57" x2="60" y2="90" stroke="rgba(96,165,250,0.1)" strokeWidth="2" />
            <line x1="60" y1="90" x2="490" y2="90" stroke="rgba(96,165,250,0.06)" strokeWidth="2" />
            {/* Zone branches */}
            {hydraulicZones.slice(3).map((z, i) => {
              const x = 60 + i * 88; const active = z.status === "normal";
              return (<g key={z.id}>
                <line x1={x} y1="90" x2={x} y2="115" stroke={active ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.03)"} strokeWidth="1.5" />
                {active && <line x1={x} y1="90" x2={x} y2="115" stroke="rgba(96,165,250,0.25)" strokeWidth="1.5" strokeDasharray="3 8"><animate attributeName="stroke-dashoffset" from="0" to="-11" dur="1.5s" repeatCount="indefinite" /></line>}
                <circle cx={x} cy="90" r="2.5" fill={active ? "rgba(96,165,250,0.25)" : "rgba(255,255,255,0.04)"} />
                <rect x={x-38} y="117" width="76" height="44" rx="5" fill={active ? "rgba(96,165,250,0.03)" : "rgba(255,255,255,0.01)"} stroke={active ? "rgba(96,165,250,0.1)" : "rgba(255,255,255,0.03)"} strokeWidth="0.75" />
                <text x={x} y="132" textAnchor="middle" fill={active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)"} style={{fontSize:"7.5px",fontFamily:"Inter"}}>{z.name}</text>
                <text x={x} y="146" textAnchor="middle" fill={active ? "rgba(96,165,250,0.45)" : "rgba(255,255,255,0.08)"} style={{fontSize:"9px",fontFamily:"Inter"}}>{z.flow > 0 ? `${z.flow} L/m` : "Idle"}</text>
                <text x={x} y="157" textAnchor="middle" fill="rgba(255,255,255,0.1)" style={{fontSize:"7px",fontFamily:"Inter"}}>{z.pressure} bar</text>
                <circle cx={x+28} cy={123} r="1.5" fill={active ? "rgba(74,222,128,0.45)" : "rgba(255,255,255,0.06)"} />
              </g>);
            })}
            {/* Legend */}
            <text x="15" y="210" fill="rgba(255,255,255,0.08)" style={{fontSize:"7px",fontFamily:"Inter"}}>Cold</text>
            <line x1="35" y1="208" x2="55" y2="208" stroke="rgba(96,165,250,0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x="65" y="210" fill="rgba(255,255,255,0.08)" style={{fontSize:"7px",fontFamily:"Inter"}}>Hot</text>
            <line x1="80" y1="208" x2="100" y2="208" stroke="rgba(251,191,36,0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        </Panel>
        <Panel>
          <div className="flex items-center gap-2 mb-3"><ShieldAlert className="w-3.5 h-3.5 text-emerald-400/40" /><span className="text-white/25 text-[10px] tracking-widest uppercase">Leak Detection</span></div>
          <div className="space-y-2">
            {leakSensors.map(s => (
              <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-white/[0.025] last:border-0">
                <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${s.status==="dry"?"bg-emerald-400/50":"bg-red-400"}`} /><span className="text-white/45 text-[10px]">{s.name}</span></div>
                <div className="flex items-center gap-2"><span className={`text-[9px] ${s.status==="dry"?"text-emerald-400/40":"text-red-400"}`}>{s.status.toUpperCase()}</span><span className="text-white/15 text-[8px]">{s.battery}%</span></div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.04]">
            <span className="text-white/20 text-[9px] tracking-wider uppercase block mb-2">Zone Summary</span>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-white/15 text-[8px]">Total Flow</span><p className="text-white/50 text-xs mt-0.5">39.7 L/min</p></div>
              <div><span className="text-white/15 text-[8px]">Avg Pressure</span><p className="text-white/50 text-xs mt-0.5">2.85 bar</p></div>
              <div><span className="text-white/15 text-[8px]">This Month</span><p className="text-white/50 text-xs mt-0.5">28,400 L</p></div>
              <div><span className="text-white/15 text-[8px]">vs Last Month</span><p className="text-emerald-400/50 text-xs mt-0.5">-8%</p></div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Zone table */}
      <Panel className="!p-0 overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b border-white/[0.03]"><span className="text-white/25 text-[10px] tracking-widest uppercase">All Hydraulic Zones</span></div>
        <div className="divide-y divide-white/[0.025]">
          {hydraulicZones.map(z => {
            const active = z.status === "normal";
            return (
              <div key={z.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-white/[0.015] transition-all">
                <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${active?"bg-emerald-400/50 shadow-[0_0_4px_rgba(74,222,128,0.3)]":"bg-white/10"}`} /><span className="text-white/55 text-xs">{z.name}</span></div>
                <div className="flex items-center gap-6">
                  <div className="text-right"><span className="text-white/15 text-[8px] block">Pressure</span><span className="text-white/40 text-[10px]">{z.pressure} bar</span></div>
                  <div className="text-right"><span className="text-white/15 text-[8px] block">Flow</span><span className={`text-[10px] ${active?"text-blue-400/50":"text-white/20"}`}>{z.flow>0?`${z.flow} L/min`:"\u2014"}</span></div>
                  <div className="text-right"><span className="text-white/15 text-[8px] block">Temp</span><span className={`text-[10px] ${z.temp>40?"text-amber-400/50":"text-white/30"}`}>{z.temp}°C</span></div>
                  <span className={`text-[9px] w-14 text-center px-1.5 py-0.5 rounded-full ${active?"bg-emerald-500/[0.08] text-emerald-400/60 border border-emerald-500/15":"bg-white/[0.03] text-white/20 border border-white/[0.05]"}`}>{z.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Panel>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/25 text-[10px] tracking-widest uppercase">7-Day Water Usage</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1"><div className="w-3 h-[2px] bg-blue-400/40 rounded-full" /><span className="text-white/15 text-[8px]">Domestic</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-[2px] bg-emerald-400/30 rounded-full" /><span className="text-white/15 text-[8px]">Irrigation</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-[2px] bg-cyan-400/25 rounded-full" /><span className="text-white/15 text-[8px]">Pool</span></div>
            </div>
          </div>
          <svg viewBox="0 0 500 100" className="w-full" style={{ maxHeight: 120 }}>
            {dailyUsage.map((d, i) => {
              const x = 20 + i * 68, maxH = 80, maxV = 1000;
              return (<g key={d.label}>
                <rect x={x} y={maxH-(d.domestic/maxV)*maxH} width="14" height={(d.domestic/maxV)*maxH} rx="2" fill="rgba(96,165,250,0.3)" />
                <rect x={x+16} y={maxH-(d.irrigation/maxV)*maxH} width="14" height={(d.irrigation/maxV)*maxH} rx="2" fill="rgba(74,222,128,0.2)" />
                <rect x={x+32} y={maxH-(d.pool/maxV)*maxH} width="14" height={(d.pool/maxV)*maxH} rx="2" fill="rgba(6,182,212,0.2)" />
                <text x={x+23} y="95" textAnchor="middle" fill="rgba(255,255,255,0.12)" style={{fontSize:"8px",fontFamily:"Inter"}}>{d.label}</text>
              </g>);
            })}
          </svg>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/25 text-[10px] tracking-widest uppercase">24h Pressure Trend</span>
            <span className="text-white/15 text-[9px]">bar</span>
          </div>
          <LineChart lines={[
            {data:Array.from({length:25},(_,i)=>({x:i,y:3.1+Math.sin(i*0.3)*0.3+Math.sin(i*0.7)*0.1})),color:"rgba(96,165,250,0.5)"},
            {data:Array.from({length:25},(_,i)=>({x:i,y:2.6+Math.sin(i*0.25+1)*0.2})),color:"rgba(251,191,36,0.3)"},
          ]} xLabels={["0:00","6:00","12:00","18:00","24:00"]} yMin={2} yMax={4} yLabels={["2.0","2.5","3.0","3.5","4.0"]} h={80} />
        </Panel>
      </div>
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/25 text-[10px] tracking-widest uppercase">12-Month Water Consumption</span>
          <span className="text-white/15 text-[9px]">m³</span>
        </div>
        <BarChart data={["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,i)=>({label:m,v1:+(22+Math.sin(i*0.5)*8+(i>4&&i<9?6:0)).toFixed(0)}))} color1="rgba(96,165,250,0.25)" maxV={40} h={80} />
      </Panel>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCHEDULER MODAL
   ═══════════════════════════════════════════ */
const scheduleData = [
  { zone: "Front Lawn", time: "06:00", days: [1,3,5], duration: 15, active: true },
  { zone: "Garden Beds", time: "06:30", days: [1,3,5], duration: 20, active: true },
  { zone: "Side Yard", time: "07:00", days: [2,4,6], duration: 10, active: false },
  { zone: "Backyard", time: "06:15", days: [1,2,3,4,5], duration: 25, active: true },
  { zone: "Drip Line", time: "05:30", days: [0,1,2,3,4,5,6], duration: 30, active: true },
];
const dayNames = ["S","M","T","W","T","F","S"];

function SchedulerModal({ onClose }: { onClose: () => void }) {
  const [schedules, setSchedules] = useState(scheduleData);
  const [calMonth, setCalMonth] = useState(1); // Feb 2026
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const firstDow = new Date(2026, calMonth, 1).getDay();
  const dim = daysInMonth[calMonth];

  const toggleDay = (idx: number, day: number) => {
    setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, days: s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day].sort() } : s));
  };
  const toggleActive = (idx: number) => {
    setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, active: !s.active } : s));
  };

  // Calendar: mark days that have scheduled runs
  const activeDays = new Set<number>();
  for (let d = 1; d <= dim; d++) {
    const dow = new Date(2026, calMonth, d).getDay();
    if (schedules.some(s => s.active && s.days.includes(dow))) activeDays.add(d);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-[780px] max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[rgba(12,12,20,0.97)] p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3"><Clock className="w-5 h-5 text-blue-400/50" /><span className="text-white/70 text-sm">Irrigation Schedule Manager</span></div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-all"><X className="w-3.5 h-3.5 text-white/30" /></button>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {/* Calendar */}
          <div className="col-span-2">
            <Panel>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCalMonth(m => Math.max(0, m - 1))} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/[0.06]"><ChevronLeft className="w-3 h-3 text-white/30" /></button>
                <span className="text-white/50 text-xs">{monthNames[calMonth]} 2026</span>
                <button onClick={() => setCalMonth(m => Math.min(11, m + 1))} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/[0.06]"><ChevronRight className="w-3 h-3 text-white/30" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map((d, i) => <div key={i} className="text-center text-white/15 text-[8px] py-1">{d}</div>)}
                {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: dim }).map((_, i) => {
                  const d = i + 1; const isToday = calMonth === 1 && d === 24; const hasRun = activeDays.has(d);
                  return (
                    <div key={d} className={`relative aspect-square rounded-md flex items-center justify-center text-[9px] transition-all ${
                      isToday ? "bg-blue-500/20 border border-blue-500/30 text-blue-400" :
                      hasRun ? "bg-blue-400/[0.06] text-white/40 border border-blue-400/[0.08]" :
                      "text-white/15 border border-transparent"}`}>
                      {d}
                      {hasRun && !isToday && <div className="absolute w-1 h-1 rounded-full bg-blue-400/40 mt-5" />}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.04]">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-blue-500/20 border border-blue-500/30" /><span className="text-white/15 text-[8px]">Today</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-blue-400/[0.06] border border-blue-400/[0.08]" /><span className="text-white/15 text-[8px]">Scheduled</span></div>
              </div>
            </Panel>
          </div>
          {/* Schedules */}
          <div className="col-span-3 space-y-2">
            {schedules.map((s, idx) => (
              <Panel key={s.zone} className="!p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(idx)} className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${s.active ? "bg-blue-500/30 border-blue-500/40" : "border-white/10"}`}>
                      {s.active && <Check className="w-2 h-2 text-blue-400" />}
                    </button>
                    <span className={`text-xs ${s.active ? "text-white/60" : "text-white/20"}`}>{s.zone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05]">
                      <Clock className="w-2.5 h-2.5 text-white/20" />
                      <span className="text-white/40 text-[10px] font-mono">{s.time}</span>
                    </div>
                    <span className="text-white/20 text-[9px]">{s.duration}min</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {dayNames.map((dn, di) => (
                    <button key={di} onClick={() => toggleDay(idx, di)}
                      className={`flex-1 py-1 rounded text-[8px] transition-all ${s.days.includes(di) ? "bg-blue-500/15 text-blue-400/70 border border-blue-500/20" : "bg-white/[0.02] text-white/15 border border-white/[0.04] hover:bg-white/[0.04]"}`}>{dn}</button>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   NOTIFICATION CONFIG PANEL
   ═══════════════════════════════════════════ */
type NotifRule = { userId: string; severities: string[]; systems: string[]; timing: string; delay?: number };
function NotificationConfigPanel() {
  const [rules, setRules] = useState<NotifRule[]>([
    { userId: "u1", severities: ["critical"], systems: ["all"], timing: "instant" },
    { userId: "u3", severities: ["critical", "warning"], systems: ["Network", "Electrical"], timing: "instant" },
    { userId: "u4", severities: ["critical", "warning"], systems: ["Network"], timing: "delay", delay: 5 },
  ]);
  const [addingUser, setAddingUser] = useState(false);
  const allSeverities = ["critical", "warning", "info", "resolved"];
  const allSystems = ["Electrical", "HVAC", "Solar", "Battery", "Irrigation", "Network", "Hydraulic"];
  const timingOptions = [
    { id: "instant", label: "Instant" },
    { id: "delay", label: "After delay" },
    { id: "daily", label: "Daily digest" },
    { id: "mixed", label: "Mixed" },
  ];

  const toggleSeverity = (idx: number, sev: string) => {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, severities: r.severities.includes(sev) ? r.severities.filter(s => s !== sev) : [...r.severities, sev] } : r));
  };
  const toggleSystem = (idx: number, sys: string) => {
    setRules(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      if (sys === "all") return { ...r, systems: ["all"] };
      const cur = r.systems.filter(s => s !== "all");
      return { ...r, systems: cur.includes(sys) ? cur.filter(s => s !== sys) : [...cur, sys] };
    }));
  };
  const setTiming = (idx: number, t: string) => setRules(prev => prev.map((r, i) => i === idx ? { ...r, timing: t } : r));
  const removeRule = (idx: number) => setRules(prev => prev.filter((_, i) => i !== idx));
  const addRule = (userId: string) => { setRules(prev => [...prev, { userId, severities: ["critical"], systems: ["all"], timing: "instant" }]); setAddingUser(false); };
  const sevDot = (s: string) => s === "critical" ? "bg-red-400" : s === "warning" ? "bg-amber-400" : s === "resolved" ? "bg-emerald-400" : "bg-blue-400";

  return (
    <Panel>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-blue-400/40" /><span className="text-white/30 text-[10px] tracking-widest uppercase">Notification Configuration</span></div>
        <button onClick={() => setAddingUser(!addingUser)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/[0.08] border border-blue-500/15 text-blue-400/60 text-[9px] hover:bg-blue-500/[0.15] transition-all"><Plus className="w-2.5 h-2.5" />Add User</button>
      </div>

      {addingUser && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-3">
          <div className="grid grid-cols-4 gap-2">
            {existingUsers.filter(u => !rules.some(r => r.userId === u.id)).map(u => (
              <button key={u.id} onClick={() => addRule(u.id)} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-all">
                <div className="w-7 h-7 rounded-full bg-blue-500/[0.08] border border-blue-500/15 flex items-center justify-center"><User className="w-3 h-3 text-blue-400/50" /></div>
                <div className="text-left"><span className="text-white/50 text-[10px] block">{u.name}</span><span className="text-white/15 text-[8px]">{u.role}</span></div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {rules.map((rule, idx) => {
          const user = existingUsers.find(u => u.id === rule.userId);
          if (!user) return null;
          return (
            <div key={`${rule.userId}-${idx}`} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500/[0.06] border border-blue-500/12 flex items-center justify-center"><User className="w-3 h-3 text-blue-400/40" /></div>
                  <div><span className="text-white/55 text-[10px] block">{user.name}</span><span className="text-white/20 text-[8px] flex items-center gap-1"><Mail className="w-2 h-2" />{user.email}</span></div>
                </div>
                <button onClick={() => removeRule(idx)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10 transition-all"><Trash2 className="w-3 h-3 text-white/15 hover:text-red-400/50" /></button>
              </div>
              {/* Severity toggles */}
              <div className="mb-2">
                <span className="text-white/15 text-[8px] tracking-wider uppercase block mb-1.5">Severity</span>
                <div className="flex gap-1">
                  {allSeverities.map(s => (
                    <button key={s} onClick={() => toggleSeverity(idx, s)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] transition-all ${rule.severities.includes(s) ? "bg-white/[0.06] border border-white/[0.1] text-white/50" : "bg-white/[0.01] border border-white/[0.03] text-white/15"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${sevDot(s)}`} />{s}
                    </button>
                  ))}
                </div>
              </div>
              {/* System toggles */}
              <div className="mb-2">
                <span className="text-white/15 text-[8px] tracking-wider uppercase block mb-1.5">Systems</span>
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => toggleSystem(idx, "all")}
                    className={`px-2 py-1 rounded text-[8px] transition-all ${rule.systems.includes("all") ? "bg-blue-500/10 border border-blue-500/20 text-blue-400/60" : "bg-white/[0.01] border border-white/[0.03] text-white/15"}`}>All</button>
                  {allSystems.map(s => (
                    <button key={s} onClick={() => toggleSystem(idx, s)}
                      className={`px-2 py-1 rounded text-[8px] transition-all ${rule.systems.includes(s) ? "bg-white/[0.06] border border-white/[0.1] text-white/50" : "bg-white/[0.01] border border-white/[0.03] text-white/15"}`}>{s}</button>
                  ))}
                </div>
              </div>
              {/* Timing */}
              <div>
                <span className="text-white/15 text-[8px] tracking-wider uppercase block mb-1.5">When</span>
                <div className="flex gap-1">
                  {timingOptions.map(t => (
                    <button key={t.id} onClick={() => setTiming(idx, t.id)}
                      className={`px-2.5 py-1 rounded text-[8px] transition-all ${rule.timing === t.id ? "bg-blue-500/10 border border-blue-500/20 text-blue-400/60" : "bg-white/[0.01] border border-white/[0.03] text-white/15"}`}>{t.label}</button>
                  ))}
                  {rule.timing === "delay" && (
                    <div className="flex items-center gap-1 ml-1">
                      <input type="number" value={rule.delay || 5} onChange={e => setRules(prev => prev.map((r, i) => i === idx ? { ...r, delay: +e.target.value } : r))}
                        className="w-10 px-1.5 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-white/50 text-[9px] text-center outline-none" min={1} max={60} />
                      <span className="text-white/15 text-[8px]">min</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
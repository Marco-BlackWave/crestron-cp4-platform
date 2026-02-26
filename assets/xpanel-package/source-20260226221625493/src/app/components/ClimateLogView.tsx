import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  Thermometer,
  Droplets,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Table,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, subDays, addDays, isToday, isFuture } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/* ─── Types ─── */
interface DataPoint {
  time: number; // minutes from midnight
  temp: number;
  humidity: number;
  setpoint: number;
  fanSpeed: number;
  hvacState: "cooling" | "cool_idle" | "heating" | "heat_idle" | "off";
}

/* ─── Zones ─── */
const ZONES = [
  { id: "living", label: "Living Room" },
  { id: "bedroom", label: "Bed Room" },
  { id: "kitchen", label: "Kitchen" },
  { id: "movie", label: "Movie Room" },
  { id: "garage", label: "Garage" },
];

/* ─── Time range presets ─── */
type RangePreset = "1h" | "6h" | "24h" | "7d" | "30d" | "custom";
const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: "1h", label: "Last Hour" },
  { id: "6h", label: "Last 6h" },
  { id: "24h", label: "24 Hours" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
];

/* ─── Seeded random for stable day data ─── */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateDayData(dateStr: string, zoneId: string): DataPoint[] {
  const seed =
    (dateStr + zoneId).split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 997;
  const rng = seededRandom(seed);
  const pts: DataPoint[] = [];

  // Zone-specific offsets
  const zoneOffset =
    zoneId === "bedroom" ? -1 : zoneId === "kitchen" ? 1.5 : zoneId === "garage" ? -3 : zoneId === "movie" ? -0.5 : 0;
  const humOffset =
    zoneId === "kitchen" ? 8 : zoneId === "garage" ? -10 : zoneId === "bedroom" ? 4 : 0;

  const baseTemp = 15.5 + rng() * 1.5 + zoneOffset;
  const peakBoost = 6 + rng() * 3;
  const humBase = 45 + rng() * 15 + humOffset;

  // Realistic setpoint schedule – only 3-4 changes per day (flat step function)
  const spSleep = 18 + Math.round(rng() * 2) * 0.5;
  const spWake = 20 + Math.round(rng() * 2) * 0.5;
  const spAway = 17 + Math.round(rng()) * 0.5;
  const spReturn = 21 + Math.round(rng() * 2) * 0.5;
  const schedBreaks = [
    { at: 0, sp: spSleep },
    { at: 390 + Math.round(rng() * 30), sp: spWake }, // ~6:30
    { at: 540 + Math.round(rng() * 20), sp: spAway }, // ~9:00
    { at: 1020 + Math.round(rng() * 30), sp: spReturn }, // ~17:00
    { at: 1320 + Math.round(rng() * 20), sp: spSleep }, // ~22:00
  ];

  for (let m = 0; m <= 1440; m += 5) {
    const h = m / 60;

    // Setpoint from schedule
    let setpoint = schedBreaks[0].sp;
    for (const sb of schedBreaks) {
      if (m >= sb.at) setpoint = sb.sp;
    }

    // Organic temperature curve
    let temp =
      baseTemp +
      peakBoost *
        Math.sin(Math.max(0, (h - 5) / 14) * Math.PI) *
        (h >= 5 && h <= 19 ? 1 : 0.15) +
      (rng() - 0.5) * 0.3;

    let humidity =
      humBase +
      15 * Math.sin(((h - 6) / 24) * Math.PI * 2) -
      (h >= 18 ? 10 * Math.min((h - 18) / 3, 1) : 0) +
      (rng() - 0.5) * 1.5;
    humidity = Math.max(12, Math.min(95, humidity));

    let fanSpeed = 0;
    if (h >= 6.5 && h < 22) fanSpeed = 30 + 40 * Math.sin(((h - 6.5) / 15.5) * Math.PI);

    let hvacState: DataPoint["hvacState"] = "off";
    if (h >= 6.5 && h < 17) {
      hvacState = temp > setpoint + 0.5 ? "cooling" : "cool_idle";
    } else if (h >= 17 && h < 22) {
      hvacState = temp < setpoint - 0.5 ? "heating" : "heat_idle";
    }

    pts.push({
      time: m,
      temp: Math.round(temp * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      setpoint: Math.round(setpoint * 10) / 10,
      fanSpeed: Math.round(fanSpeed),
      hvacState,
    });
  }
  return pts;
}

/* ─── Chart constants ─── */
const MARGIN = { top: 16, right: 52, bottom: 18, left: 48 };
const STATE_BAR_H = 6;
const STATE_GAP = 2;

const HVAC_COLORS: Record<string, string> = {
  cooling: "#3b82f6",
  cool_idle: "rgba(59,130,246,0.3)",
  heating: "#ef4444",
  heat_idle: "rgba(239,68,68,0.3)",
  off: "rgba(255,255,255,0.035)",
};

const HVAC_LABELS: Record<string, string> = {
  cooling: "Cooling",
  cool_idle: "Cool Idle",
  heating: "Heating",
  heat_idle: "Heat Idle",
  off: "Off",
};

function fmt(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/* ─── Toggle pill ─── */
function TogglePill({
  color,
  label,
  active,
  onToggle,
  dashed,
}: {
  color: string;
  label: string;
  active: boolean;
  onToggle: () => void;
  dashed?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] border transition-all ${
        active
          ? "bg-white/[0.08] border-white/[0.15] text-white/80"
          : "bg-transparent border-white/[0.06] text-white/20 line-through"
      }`}
    >
      <svg width="12" height="8">
        <line
          x1="0"
          y1="4"
          x2="12"
          y2="4"
          stroke={active ? color : "rgba(255,255,255,0.15)"}
          strokeWidth="2"
          strokeDasharray={dashed ? "3 2" : "none"}
        />
      </svg>
      {label}
    </button>
  );
}

/* ─── Export helpers ─── */
function exportClimatePDF(data: DataPoint[], label: string, zone: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text(`Climate Log — ${zone}`, 14, 18);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`${label} · Generated: ${new Date().toLocaleString()} · ${data.length} points`, 14, 24);
  autoTable(doc, {
    startY: 30,
    head: [["Time", "Temp (°C)", "Humidity (%)", "Setpoint (°C)", "Fan (%)", "HVAC"]],
    body: data
      .filter((_, i) => i % 6 === 0)
      .map((d) => [
        fmt(d.time),
        d.temp.toFixed(1),
        d.humidity.toFixed(0),
        d.setpoint.toFixed(1),
        String(d.fanSpeed),
        HVAC_LABELS[d.hvacState],
      ]),
    styles: { fontSize: 7, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 30, 40], textColor: [200, 200, 220], fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 245, 248] },
  });
  doc.save(`climate-${zone}-${label}.pdf`);
}

function exportClimateExcel(data: DataPoint[], label: string, zone: string) {
  const ws = XLSX.utils.json_to_sheet(
    data.map((d) => ({
      Time: fmt(d.time),
      "Temp (°C)": d.temp,
      "Humidity (%)": d.humidity,
      "Setpoint (°C)": d.setpoint,
      "Fan (%)": d.fanSpeed,
      HVAC: HVAC_LABELS[d.hvacState],
    }))
  );
  ws["!cols"] = [{ wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Climate");
  XLSX.writeFile(wb, `climate-${zone}-${label}.xlsx`);
}

/* ═══════════ MAIN ═══════════ */
interface ClimateLogViewProps {
  onBack: () => void;
}

export function ClimateLogView({ onBack }: ClimateLogViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(900);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [direction, setDirection] = useState(0);
  const [activeZone, setActiveZone] = useState("living");
  const [rangePreset, setRangePreset] = useState<RangePreset>("24h");
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState("00:00");
  const [customTo, setCustomTo] = useState("23:59");
  const containerRef = useRef<HTMLDivElement>(null);

  // Toggleable series
  const [showTemp, setShowTemp] = useState(true);
  const [showHumidity, setShowHumidity] = useState(true);
  const [showSetpoint, setShowSetpoint] = useState(true);
  const [showFan, setShowFan] = useState(true);
  const [showHvac, setShowHvac] = useState(true);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dateLabel = isToday(selectedDate)
    ? "Today"
    : format(selectedDate, "EEE, MMM d");
  const zoneLabel =
    ZONES.find((z) => z.id === activeZone)?.label ?? "Living Room";

  // Generate full day data
  const fullData = useMemo(
    () => generateDayData(dateStr, activeZone),
    [dateStr, activeZone]
  );

  // Filter by time range
  const data = useMemo(() => {
    if (rangePreset === "24h" || rangePreset === "7d" || rangePreset === "30d")
      return fullData;
    if (rangePreset === "custom") {
      const [fh, fm] = customFrom.split(":").map(Number);
      const [th, tm] = customTo.split(":").map(Number);
      const fromMin = (fh || 0) * 60 + (fm || 0);
      const toMin = (th || 23) * 60 + (tm || 59);
      return fullData.filter((d) => d.time >= fromMin && d.time <= toMin);
    }
    // 1h, 6h — show last N hours from "now" (simulated as 14:30)
    const nowMin = 14 * 60 + 30;
    const span = rangePreset === "1h" ? 60 : 360;
    return fullData.filter(
      (d) => d.time >= nowMin - span && d.time <= nowMin
    );
  }, [fullData, rangePreset, customFrom, customTo]);

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = () => setShowExportMenu(false);
    const timer = setTimeout(
      () => document.addEventListener("click", handler),
      0
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handler);
    };
  }, [showExportMenu]);

  // Responsive width
  const roRef = useRef<ResizeObserver | null>(null);
  const resizeObs = useCallback(
    (node: HTMLDivElement | null) => {
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      if (!node) return;
      (containerRef as React.MutableRefObject<HTMLDivElement>).current = node;
      const ro = new ResizeObserver((entries) => {
        for (const e of entries) setChartWidth(e.contentRect.width);
      });
      ro.observe(node);
      roRef.current = ro;
    },
    []
  );

  const W = chartWidth;
  const H = 340;
  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = H - MARGIN.top - MARGIN.bottom - STATE_BAR_H - STATE_GAP;

  // Data extents
  const timeMin = data.length > 0 ? data[0].time : 0;
  const timeMax = data.length > 0 ? data[data.length - 1].time : 1440;
  const timeSpan = Math.max(timeMax - timeMin, 1);

  // Auto-scale temp axis from data
  const allTemps = data.flatMap((d) => [d.temp, d.setpoint]);
  const tMin = Math.round(Math.min(...allTemps) - 0.5);
  const tMax = Math.round(Math.max(...allTemps) + 0.5);
  const TEMP_MIN = tMin;
  const TEMP_MAX = tMax;
  const HUM_MIN = 0;
  const HUM_MAX = 100;

  const xScale = useCallback(
    (m: number) => MARGIN.left + ((m - timeMin) / timeSpan) * plotW,
    [plotW, timeMin, timeSpan]
  );
  const yTemp = useCallback(
    (t: number) =>
      MARGIN.top + plotH - ((t - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * plotH,
    [plotH, TEMP_MIN, TEMP_MAX]
  );
  const yHum = useCallback(
    (h: number) =>
      MARGIN.top + plotH - ((h - HUM_MIN) / (HUM_MAX - HUM_MIN)) * plotH,
    [plotH]
  );

  // Paths
  const tempPath = useMemo(
    () =>
      data
        .map(
          (d, i) =>
            `${i === 0 ? "M" : "L"}${xScale(d.time).toFixed(1)},${yTemp(d.temp).toFixed(1)}`
        )
        .join(" "),
    [data, xScale, yTemp]
  );

  const humPath = useMemo(
    () =>
      data
        .map(
          (d, i) =>
            `${i === 0 ? "M" : "L"}${xScale(d.time).toFixed(1)},${yHum(d.humidity).toFixed(1)}`
        )
        .join(" "),
    [data, xScale, yHum]
  );

  const setpointPath = useMemo(() => {
    if (data.length === 0) return "";
    const segs: string[] = [];
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const x = xScale(d.time);
      const y = yTemp(d.setpoint);
      if (i === 0) {
        segs.push(`M${x.toFixed(1)},${y.toFixed(1)}`);
      } else {
        const prev = data[i - 1];
        if (Math.abs(d.setpoint - prev.setpoint) > 0.2) {
          segs.push(
            `L${x.toFixed(1)},${yTemp(prev.setpoint).toFixed(1)}`
          );
          segs.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
        } else {
          segs.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
        }
      }
    }
    return segs.join(" ");
  }, [data, xScale, yTemp]);

  const fanPath = useMemo(
    () =>
      data
        .map(
          (d, i) =>
            `${i === 0 ? "M" : "L"}${xScale(d.time).toFixed(1)},${yHum(d.fanSpeed).toFixed(1)}`
        )
        .join(" "),
    [data, xScale, yHum]
  );

  const hvacSegments = useMemo(() => {
    if (data.length === 0) return [];
    const segs: { x1: number; x2: number; state: string }[] = [];
    let cur = data[0].hvacState;
    let start = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i].hvacState !== cur || i === data.length - 1) {
        segs.push({
          x1: xScale(data[start].time),
          x2: xScale(data[i].time),
          state: cur,
        });
        cur = data[i].hvacState;
        start = i;
      }
    }
    return segs;
  }, [data, xScale]);

  // Hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || data.length === 0) return;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const time = timeMin + ((mx - MARGIN.left) / plotW) * timeSpan;
      if (time < timeMin || time > timeMax) {
        setHoverIdx(null);
        return;
      }
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < data.length; i++) {
        const dist = Math.abs(data[i].time - time);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setHoverIdx(closest);
    },
    [data, plotW, timeMin, timeMax, timeSpan]
  );

  const hoverData = hoverIdx !== null && hoverIdx < data.length ? data[hoverIdx] : null;

  // Axes ticks
  const timeLabels = useMemo(() => {
    const count = Math.min(9, Math.max(3, Math.floor(plotW / 80)));
    const step = timeSpan / count;
    const labels: number[] = [];
    for (let i = 0; i <= count; i++) {
      labels.push(Math.round(timeMin + i * step));
    }
    return labels;
  }, [plotW, timeMin, timeSpan]);

  const tempTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let t = TEMP_MIN; t <= TEMP_MAX; t++) {
      if (t % 2 === 0) ticks.push(t);
    }
    return ticks;
  }, [TEMP_MIN, TEMP_MAX]);

  const humTicks = [0, 25, 50, 75, 100];
  const stateBarY = MARGIN.top + plotH + STATE_GAP;

  /* Day nav */
  const goPrev = () => {
    setDirection(-1);
    setSelectedDate((d) => subDays(d, 1));
    setHoverIdx(null);
  };
  const goNext = () => {
    if (isFuture(addDays(selectedDate, 1))) return;
    setDirection(1);
    setSelectedDate((d) => addDays(d, 1));
    setHoverIdx(null);
  };
  const canGoNext = !isFuture(addDays(selectedDate, 1));

  /* Stats */
  const temps = data.map((d) => d.temp);
  const hums = data.map((d) => d.humidity);
  const avgTemp = data.length > 0 ? temps.reduce((s, v) => s + v, 0) / data.length : 0;
  const avgHum = data.length > 0 ? hums.reduce((s, v) => s + v, 0) / data.length : 0;
  const minTemp = data.length > 0 ? Math.min(...temps) : 0;
  const maxTemp = data.length > 0 ? Math.max(...temps) : 0;
  const minHum = data.length > 0 ? Math.min(...hums) : 0;
  const maxHum = data.length > 0 ? Math.max(...hums) : 0;

  /* HVAC runtime percentages */
  const coolCount = data.filter((d) => d.hvacState === "cooling").length;
  const heatCount = data.filter((d) => d.hvacState === "heating").length;
  const total = data.length || 1;
  const coolPct = Math.round((coolCount / total) * 100);
  const heatPct = Math.round((heatCount / total) * 100);
  const offPct = 100 - coolPct - heatPct;

  const rangeLabel =
    rangePreset === "custom"
      ? `${customFrom} – ${customTo}`
      : RANGE_PRESETS.find((r) => r.id === rangePreset)?.label ?? "24 Hours";

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:bg-white/[0.12] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <div>
            <h2 className="text-white text-base">Climate History</h2>
            <p className="text-white/30 text-[11px]">{zoneLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Range presets */}
          <div className="flex items-center rounded-lg border border-white/[0.08] overflow-hidden">
            {RANGE_PRESETS.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRangePreset(r.id);
                  setShowCustomRange(false);
                  setHoverIdx(null);
                }}
                className={`px-3 py-1.5 text-[10px] transition-all ${
                  rangePreset === r.id
                    ? "bg-blue-500/20 text-blue-400 border-r border-blue-500/20"
                    : "text-white/30 hover:text-white/50 hover:bg-white/[0.04] border-r border-white/[0.06]"
                } last:border-r-0`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => {
                setRangePreset("custom");
                setShowCustomRange(!showCustomRange);
              }}
              className={`px-2.5 py-1.5 transition-all ${
                rangePreset === "custom"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-white/30 hover:text-white/50 hover:bg-white/[0.04]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Day nav */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goPrev}
            className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <button
            onClick={() => {
              setDirection(0);
              setSelectedDate(new Date());
              setHoverIdx(null);
            }}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors min-w-[120px] justify-center"
          >
            <Clock className="w-3 h-3 text-white/30" />
            <AnimatePresence mode="wait">
              <motion.span
                key={dateStr}
                initial={{ opacity: 0, y: direction * 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -8 }}
                transition={{ duration: 0.2 }}
                className="text-white/60 text-[11px]"
              >
                {dateLabel}
              </motion.span>
            </AnimatePresence>
          </button>
          <motion.button
            whileHover={canGoNext ? { scale: 1.1 } : {}}
            whileTap={canGoNext ? { scale: 0.9 } : {}}
            onClick={goNext}
            className={`w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center transition-colors ${
              canGoNext
                ? "text-white/40 hover:text-white/70 hover:bg-white/[0.1]"
                : "text-white/10 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>

          {/* Export */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowExportMenu(!showExportMenu);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/50 text-[11px] hover:bg-white/[0.1] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </motion.button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 z-50 w-40 rounded-xl bg-[rgba(12,12,20,0.97)] border border-white/[0.1] shadow-2xl shadow-black/60 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-white/[0.06]">
                    <span className="text-white/25 text-[9px] tracking-widest uppercase">
                      {rangeLabel} · {zoneLabel}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      exportClimatePDF(data, rangeLabel, zoneLabel);
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.06] transition-all group"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-400/70 group-hover:text-red-400 transition-colors" />
                    <span className="group-hover:text-white/80 transition-colors">
                      PDF Report
                    </span>
                  </button>
                  <div className="h-px bg-white/[0.04] mx-3" />
                  <button
                    onClick={() => {
                      exportClimateExcel(data, rangeLabel, zoneLabel);
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.06] transition-all group"
                  >
                    <Table className="w-3.5 h-3.5 text-emerald-400/70 group-hover:text-emerald-400 transition-colors" />
                    <span className="group-hover:text-white/80 transition-colors">
                      Excel Sheet
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Custom time range picker ── */}
      <AnimatePresence>
        {showCustomRange && rangePreset === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
              <span className="text-white/30 text-[10px] tracking-widest uppercase">
                From
              </span>
              <input
                type="time"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setHoverIdx(null);
                }}
                className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/70 text-xs outline-none [color-scheme:dark]"
              />
              <span className="text-white/30 text-[10px] tracking-widest uppercase">
                To
              </span>
              <input
                type="time"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setHoverIdx(null);
                }}
                className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/70 text-xs outline-none [color-scheme:dark]"
              />
              {/* Quick suggestions */}
              <div className="flex gap-1.5 ml-2">
                {[
                  { label: "Morning", from: "06:00", to: "12:00" },
                  { label: "Afternoon", from: "12:00", to: "18:00" },
                  { label: "Evening", from: "18:00", to: "23:59" },
                  { label: "Night", from: "00:00", to: "06:00" },
                ].map((q) => (
                  <button
                    key={q.label}
                    onClick={() => {
                      setCustomFrom(q.from);
                      setCustomTo(q.to);
                      setHoverIdx(null);
                    }}
                    className={`px-2 py-1 rounded-md text-[9px] border transition-all ${
                      customFrom === q.from && customTo === q.to
                        ? "bg-blue-500/15 border-blue-500/25 text-blue-400"
                        : "bg-white/[0.03] border-white/[0.06] text-white/30 hover:bg-white/[0.06] hover:text-white/50"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {[
          {
            icon: Thermometer,
            label: "Avg Temp",
            value: `${avgTemp.toFixed(1)}°C`,
            color: "text-blue-400",
          },
          {
            icon: Droplets,
            label: "Avg Humidity",
            value: `${avgHum.toFixed(0)}%`,
            color: "text-cyan-400",
          },
          {
            icon: Thermometer,
            label: "Temp Range",
            value: `${minTemp.toFixed(1)}° – ${maxTemp.toFixed(1)}°`,
            color: "text-orange-400",
          },
          {
            icon: Droplets,
            label: "Humidity Range",
            value: `${minHum.toFixed(1)}% – ${maxHum.toFixed(0)}%`,
            color: "text-teal-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3 h-3 ${stat.color} opacity-50`} />
                <span className="text-white/30 text-[9px] tracking-widest uppercase">
                  {stat.label}
                </span>
              </div>
              <span className="text-white text-lg">{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* ── HVAC Runtime bar ── */}
      <div className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/30 text-[9px] tracking-widest uppercase">
            HVAC Runtime
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-blue-400 text-[10px]">
                Cooling {coolPct}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400 text-[10px]">
                Heating {heatPct}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-white/20" />
              <span className="text-white/30 text-[10px]">Off {offPct}%</span>
            </div>
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden flex">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${coolPct}%` }}
          />
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${heatPct}%` }}
          />
          <div
            className="h-full bg-white/10 transition-all"
            style={{ width: `${offPct}%` }}
          />
        </div>
      </div>

      {/* ── Chart card ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${dateStr}-${activeZone}-${rangePreset}-${customFrom}-${customTo}`}
          initial={{ opacity: 0, x: direction * 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -30 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="shrink-0"
        >
          <div
            ref={resizeObs}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4"
          >
            {/* Chart header + toggles */}
            <div className="flex items-center justify-between mb-3 shrink-0 flex-wrap gap-2">
              <span className="text-white/30 text-[9px] tracking-widest uppercase">
                Climate Data
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <TogglePill
                  color="#3b82f6"
                  label="Temperature"
                  active={showTemp}
                  onToggle={() => setShowTemp(!showTemp)}
                />
                <TogglePill
                  color="#22d3ee"
                  label="Humidity"
                  active={showHumidity}
                  onToggle={() => setShowHumidity(!showHumidity)}
                />
                <TogglePill
                  color="#fbbf24"
                  label="Setpoint"
                  active={showSetpoint}
                  onToggle={() => setShowSetpoint(!showSetpoint)}
                  dashed
                />
                <TogglePill
                  color="rgba(255,255,255,0.25)"
                  label="Fan Speed"
                  active={showFan}
                  onToggle={() => setShowFan(!showFan)}
                />
                <TogglePill
                  color="#3b82f6"
                  label="HVAC State"
                  active={showHvac}
                  onToggle={() => setShowHvac(!showHvac)}
                />
              </div>
            </div>

            {data.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                No data for selected range
              </div>
            ) : (
              <svg
                ref={svgRef}
                width={W}
                height={H}
                className="overflow-visible cursor-crosshair shrink-0"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <defs>
                  <linearGradient id="clTempG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="clHumG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                  <filter
                    id="glB"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur stdDeviation="3" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter
                    id="glC"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur stdDeviation="2.5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Grid */}
                {tempTicks.map((t) => (
                  <line
                    key={`tg-${t}`}
                    x1={MARGIN.left}
                    y1={yTemp(t)}
                    x2={W - MARGIN.right}
                    y2={yTemp(t)}
                    stroke="rgba(255,255,255,0.03)"
                  />
                ))}
                {timeLabels.map((m) => (
                  <line
                    key={`vg-${m}`}
                    x1={xScale(m)}
                    y1={MARGIN.top}
                    x2={xScale(m)}
                    y2={MARGIN.top + plotH}
                    stroke="rgba(255,255,255,0.03)"
                  />
                ))}

                {/* Fan speed area */}
                {showFan && (
                  <>
                    <path
                      d={
                        fanPath +
                        `L${xScale(timeMax).toFixed(1)},${yHum(0).toFixed(1)}L${xScale(timeMin).toFixed(1)},${yHum(0).toFixed(1)}Z`
                      }
                      fill="rgba(255,255,255,0.012)"
                    />
                    <path
                      d={fanPath}
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="1"
                    />
                  </>
                )}

                {/* Setpoint (dashed step) */}
                {showSetpoint && (
                  <path
                    d={setpointPath}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                    opacity="0.7"
                  />
                )}

                {/* Temp area + line */}
                {showTemp && (
                  <>
                    <path
                      d={
                        tempPath +
                        `L${xScale(timeMax).toFixed(1)},${yTemp(TEMP_MIN).toFixed(1)}L${xScale(timeMin).toFixed(1)},${yTemp(TEMP_MIN).toFixed(1)}Z`
                      }
                      fill="url(#clTempG)"
                    />
                    <path
                      d={tempPath}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      opacity="0.2"
                      filter="url(#glB)"
                    />
                    <path
                      d={tempPath}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {/* Humidity area + line */}
                {showHumidity && (
                  <>
                    <path
                      d={
                        humPath +
                        `L${xScale(timeMax).toFixed(1)},${yHum(HUM_MIN).toFixed(1)}L${xScale(timeMin).toFixed(1)},${yHum(HUM_MIN).toFixed(1)}Z`
                      }
                      fill="url(#clHumG)"
                    />
                    <path
                      d={humPath}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1.3"
                      opacity="0.55"
                    />
                  </>
                )}

                {/* HVAC state bar */}
                {showHvac &&
                  hvacSegments.map((seg, i) => (
                    <rect
                      key={i}
                      x={seg.x1}
                      y={stateBarY}
                      width={Math.max(seg.x2 - seg.x1, 1)}
                      height={STATE_BAR_H}
                      rx={3}
                      fill={HVAC_COLORS[seg.state]}
                    />
                  ))}

                {/* Left Y – Temp */}
                {tempTicks.map((t) => (
                  <text
                    key={`tl-${t}`}
                    x={MARGIN.left - 6}
                    y={yTemp(t) + 3}
                    textAnchor="end"
                    className="fill-white/20"
                    fontSize="9"
                  >
                    {t}°
                  </text>
                ))}
                {/* Right Y – Humidity */}
                {humTicks.map((h) => (
                  <text
                    key={`hl-${h}`}
                    x={W - MARGIN.right + 6}
                    y={yHum(h) + 3}
                    textAnchor="start"
                    className="fill-white/12"
                    fontSize="9"
                  >
                    {h}%
                  </text>
                ))}
                {/* X – Time */}
                {timeLabels.map((m) => (
                  <text
                    key={`xl-${m}`}
                    x={xScale(m)}
                    y={stateBarY + STATE_BAR_H + 12}
                    textAnchor="middle"
                    className="fill-white/18"
                    fontSize="9"
                  >
                    {fmt(m)}
                  </text>
                ))}

                {/* ── Hover ── */}
                {hoverData && (
                  <>
                    <line
                      x1={xScale(hoverData.time)}
                      y1={MARGIN.top}
                      x2={xScale(hoverData.time)}
                      y2={stateBarY + STATE_BAR_H}
                      stroke="rgba(255,255,255,0.12)"
                      strokeDasharray="3 2"
                    />
                    {showTemp && (
                      <circle
                        cx={xScale(hoverData.time)}
                        cy={yTemp(hoverData.temp)}
                        r={4.5}
                        fill="#3b82f6"
                        stroke="#0f172a"
                        strokeWidth="2.5"
                        filter="url(#glB)"
                      />
                    )}
                    {showHumidity && (
                      <circle
                        cx={xScale(hoverData.time)}
                        cy={yHum(hoverData.humidity)}
                        r={4}
                        fill="#22d3ee"
                        stroke="#0f172a"
                        strokeWidth="2.5"
                        filter="url(#glC)"
                      />
                    )}
                    {showSetpoint && (
                      <circle
                        cx={xScale(hoverData.time)}
                        cy={yTemp(hoverData.setpoint)}
                        r={3.5}
                        fill="#fbbf24"
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    )}
                    {/* Tooltip */}
                    {(() => {
                      const tx = xScale(hoverData.time);
                      const tooltipW = 170;
                      const visibleRows = [
                        showTemp && {
                          dot: "#3b82f6",
                          label: "Temperature",
                          val: `${hoverData.temp.toFixed(1)}°C`,
                        },
                        showHumidity && {
                          dot: "#22d3ee",
                          label: "Humidity",
                          val: `${hoverData.humidity.toFixed(1)}%`,
                        },
                        showSetpoint && {
                          dot: "#fbbf24",
                          label: "Setpoint",
                          val: `${hoverData.setpoint.toFixed(1)}°C`,
                        },
                        showFan && {
                          dot: "rgba(255,255,255,0.25)",
                          label: "Fan Speed",
                          val: `${hoverData.fanSpeed}%`,
                        },
                        showHvac && {
                          dot: HVAC_COLORS[hoverData.hvacState],
                          label: "State",
                          val: HVAC_LABELS[hoverData.hvacState],
                          isRect: true,
                        },
                      ].filter(Boolean) as {
                        dot: string;
                        label: string;
                        val: string;
                        isRect?: boolean;
                      }[];
                      const tooltipH = 32 + visibleRows.length * 18;
                      const flipX = tx + tooltipW + 20 > W;
                      const ttx = flipX
                        ? tx - tooltipW - 14
                        : tx + 14;
                      const tty = MARGIN.top;
                      return (
                        <g>
                          <rect
                            x={ttx - 1}
                            y={tty - 1}
                            width={tooltipW + 2}
                            height={tooltipH + 2}
                            rx={12}
                            fill="rgba(0,0,0,0.45)"
                          />
                          <rect
                            x={ttx}
                            y={tty}
                            width={tooltipW}
                            height={tooltipH}
                            rx={12}
                            fill="rgba(10,10,20,0.95)"
                            stroke="rgba(255,255,255,0.08)"
                          />
                          <text
                            x={ttx + 12}
                            y={tty + 18}
                            className="fill-white/90"
                            fontSize="12"
                            fontWeight="600"
                          >
                            {fmt(hoverData.time)}
                          </text>
                          <text
                            x={ttx + tooltipW - 12}
                            y={tty + 18}
                            textAnchor="end"
                            className="fill-white/25"
                            fontSize="9"
                          >
                            {format(selectedDate, "MMM d")}
                          </text>
                          <line
                            x1={ttx + 12}
                            y1={tty + 25}
                            x2={ttx + tooltipW - 12}
                            y2={tty + 25}
                            stroke="rgba(255,255,255,0.05)"
                          />
                          {visibleRows.map((r, i) =>
                            r.isRect ? (
                              <g key={r.label}>
                                <rect
                                  x={ttx + 14}
                                  y={tty + 34 + i * 18}
                                  width={8}
                                  height={8}
                                  rx={2}
                                  fill={r.dot}
                                />
                                <text
                                  x={ttx + 26}
                                  y={tty + 41 + i * 18}
                                  className="fill-white/40"
                                  fontSize="10"
                                >
                                  {r.label}
                                </text>
                                <text
                                  x={ttx + tooltipW - 12}
                                  y={tty + 41 + i * 18}
                                  textAnchor="end"
                                  className="fill-white/85"
                                  fontSize="10"
                                  fontWeight="500"
                                >
                                  {r.val}
                                </text>
                              </g>
                            ) : (
                              <g key={r.label}>
                                <circle
                                  cx={ttx + 16}
                                  cy={tty + 38 + i * 18}
                                  r={3.5}
                                  fill={r.dot}
                                />
                                <text
                                  x={ttx + 26}
                                  y={tty + 41 + i * 18}
                                  className="fill-white/40"
                                  fontSize="10"
                                >
                                  {r.label}
                                </text>
                                <text
                                  x={ttx + tooltipW - 12}
                                  y={tty + 41 + i * 18}
                                  textAnchor="end"
                                  className="fill-white/85"
                                  fontSize="10"
                                  fontWeight="500"
                                >
                                  {r.val}
                                </text>
                              </g>
                            )
                          )}
                        </g>
                      );
                    })()}
                  </>
                )}
              </svg>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Zone tabs ── */}
      <div className="shrink-0 flex items-center justify-center gap-1">
        {ZONES.map((z) => (
          <button
            key={z.id}
            onClick={() => {
              setActiveZone(z.id);
              setHoverIdx(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs transition-all ${
              activeZone === z.id
                ? "bg-white/[0.1] text-white border border-white/[0.15]"
                : "text-white/30 hover:text-white/50 hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            {z.label}
          </button>
        ))}
      </div>
    </div>
  );
}
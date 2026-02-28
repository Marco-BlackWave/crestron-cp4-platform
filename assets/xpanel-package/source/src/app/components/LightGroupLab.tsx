import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  RotateCcw, Lightbulb, Save, Plus, Trash2,
  Copy, MoreVertical, Power, X, Sun,
} from "lucide-react";
import { motion, AnimatePresence, animate } from "motion/react";

/* ═══════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════ */

interface Light {
  id: string;
  name: string;
  x: number;
  y: number;
  brightness: number;
  color: string;
  isOn: boolean;
  groupId: string | null;
}

interface Scene {
  id: string;
  name: string;
  lights: Light[];
  groupNames: Record<string, string>;
}

interface DragInfo {
  mode: "individual" | "group" | "peeled";
  lightId: string;
  groupId: string;
  originCenter: { x: number; y: number };
  offset: { x: number; y: number };
  didMove: boolean;
}

interface ProxTarget {
  targetId: string;
  dist: number;
}

interface FlashEffect {
  id: string;
  x: number;
  y: number;
  color: string;
  type: "merge" | "peel";
  ts: number;
  /** peel: origin point of the remaining group */
  ox?: number;
  oy?: number;
  /** peel: pre-generated fracture path d */
  fracture?: string;
}

interface ElasticBand {
  ox: number; oy: number;
  cx: number; cy: number;
  tension: number; /* 0..1 */
  color: string;
}

const CW = 800;
const CH = 450;
const MERGE_DIST = 80;
const PEEL_DIST = 100;
const TAP_THRESHOLD = 5;
const NODE = 42;

const COLORS = [
  { n: "Warm",   h: "#FBB724" },
  { n: "Soft",   h: "#FFD580" },
  { n: "Cool",   h: "#D4E4FF" },
  { n: "Day",    h: "#F0F0FF" },
  { n: "Red",    h: "#EF4444" },
  { n: "Blue",   h: "#3B82F6" },
  { n: "Green",  h: "#22C55E" },
  { n: "Purple", h: "#A855F7" },
];

const INIT: Light[] = [
  { id: "l1", name: "Ceiling",    x: 140, y: 120, brightness: 85, color: "#FBB724", isOn: true,  groupId: null },
  { id: "l2", name: "Sconce",     x: 340, y: 105, brightness: 70, color: "#FBB724", isOn: true,  groupId: null },
  { id: "l3", name: "Floor Lamp", x: 560, y: 130, brightness: 95, color: "#FFD580", isOn: true,  groupId: null },
  { id: "l4", name: "Strip LED",  x: 180, y: 320, brightness: 50, color: "#3B82F6", isOn: true,  groupId: null },
  { id: "l5", name: "Pendant",    x: 440, y: 300, brightness: 75, color: "#FBB724", isOn: true,  groupId: null },
  { id: "l6", name: "Spot",       x: 650, y: 310, brightness: 60, color: "#FBB724", isOn: false, groupId: null },
];

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}
function hex2rgb(hex: string) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}
function makeFracture(x1: number, y1: number, x2: number, y2: number): string {
  const steps = 10;
  const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
  const nx = -dy, ny = dx; // perpendicular
  const len = Math.sqrt(nx * nx + ny * ny) || 1;
  const ux = nx / len, uy = ny / len;
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i < steps; i++) {
    const jitter = (Math.random() - 0.5) * 22;
    d += ` L ${x1 + dx * i + ux * jitter} ${y1 + dy * i + uy * jitter}`;
  }
  d += ` L ${x2} ${y2}`;
  return d;
}

/* ═══════════════════════════════════════════════════════
   BRIGHTNESS SLIDER — arc-style
   ═══════════════════════════════════════════════════════ */

function ArcSlider({ value, color, onChange, disabled }: {
  value: number; color: string; onChange: (v: number) => void; disabled?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const active = useRef(false);
  const cbRef = useRef(onChange); cbRef.current = onChange;

  const SIZE = 200;
  const CX = SIZE / 2;
  const CY = SIZE / 2 + 10;
  const R = 80;
  const START_ANGLE = 220;
  const END_ANGLE = -40;
  const SWEEP = START_ANGLE - END_ANGLE;

  const angleToXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) };
  };

  const arcPath = (startDeg: number, endDeg: number) => {
    const s = angleToXY(startDeg);
    const e = angleToXY(endDeg);
    const sweep = startDeg - endDeg;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const valAngle = START_ANGLE - (value / 100) * SWEEP;
  const thumbPos = angleToXY(valAngle);
  const c = hex2rgb(color);

  const calc = useCallback((cx: number, cy: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = ((cx - rect.left) / rect.width) * SIZE;
    const py = ((cy - rect.top) / rect.height) * SIZE;
    const angle = Math.atan2(CY - py, px - CX) * (180 / Math.PI);
    let pct = ((START_ANGLE - angle) / SWEEP) * 100;
    pct = Math.max(0, Math.min(100, pct));
    cbRef.current(Math.round(pct));
  }, []);

  const down = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault(); e.stopPropagation();
    active.current = true;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    calc(e.clientX, e.clientY);
  }, [disabled, calc]);

  const move = useCallback((e: React.PointerEvent) => {
    if (active.current) calc(e.clientX, e.clientY);
  }, [calc]);

  const up = useCallback(() => { active.current = false; }, []);

  return (
    <div className="flex flex-col items-center">
      <svg ref={ref} viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}
        className="select-none" style={{ touchAction: "none", opacity: disabled ? 0.25 : 1, cursor: disabled ? "default" : "pointer" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {/* Track */}
        <path d={arcPath(START_ANGLE, END_ANGLE)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} strokeLinecap="round" />
        {/* Value */}
        {value > 0 && (
          <path d={arcPath(START_ANGLE, valAngle)} fill="none" stroke={`rgba(${c},0.7)`} strokeWidth={6} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px rgba(${c},0.3))` }} />
        )}
        {/* Glow behind thumb */}
        <circle cx={thumbPos.x} cy={thumbPos.y} r={16} fill={`rgba(${c},0.08)`} />
        {/* Thumb */}
        <circle cx={thumbPos.x} cy={thumbPos.y} r={9} fill="white"
          style={{ filter: `drop-shadow(0 0 8px rgba(${c},0.4)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))` }} />
        <circle cx={thumbPos.x} cy={thumbPos.y} r={4.5} fill={color} />
        {/* Center value */}
        <text x={CX} y={CY - 8} textAnchor="middle" fill="white" fontSize={36} fontWeight={600} style={{ fontFamily: "Inter, sans-serif" }}>
          {value}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={11} fontWeight={500} letterSpacing="0.1em"
          style={{ fontFamily: "Inter, sans-serif", textTransform: "uppercase" }}>
          Brightness
        </text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LEVEL SLIDER — linear (for members)
   ═══════════════════════════════════════════════════════ */

function LevelSlider({ value, color, onChange, disabled }: {
  value: number; color: string; onChange: (v: number) => void; disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const cb = useRef(onChange); cb.current = onChange;
  const calc = useCallback((cx: number) => {
    if (!ref.current) return 0;
    const { left, width } = ref.current.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(100, ((cx - left) / width) * 100)));
  }, []);
  const down = useCallback((e: React.PointerEvent) => {
    if (disabled) return; e.preventDefault(); e.stopPropagation();
    active.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    cb.current(calc(e.clientX));
  }, [disabled, calc]);
  const move = useCallback((e: React.PointerEvent) => { if (active.current) cb.current(calc(e.clientX)); }, [calc]);
  const up = useCallback(() => { active.current = false; }, []);
  const c = hex2rgb(color);
  return (
    <div ref={ref} className="relative h-8 flex items-center select-none"
      style={{ touchAction: "none", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.25 : 1 }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="absolute left-0 right-0 h-[5px] rounded-full bg-white/[0.06]" />
      <div className="absolute left-0 h-[5px] rounded-full" style={{
        width: `${value}%`,
        background: `linear-gradient(90deg, rgba(${c},0.4), rgba(${c},0.8))`,
      }} />
      <div className="absolute pointer-events-none" style={{ left: `${value}%`, top: "50%", transform: "translate(-50%,-50%)" }}>
        <div className="w-3.5 h-3.5 rounded-full bg-white" style={{
          boxShadow: `0 0 0 2px rgba(${c},0.3), 0 1px 4px rgba(0,0,0,0.4)`,
        }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LIGHT CONTROL POPUP — the majestic modal
   ═══════════════════════════════════════════════════════ */

function LightControlPopup({
  sel,
  lights,
  groups,
  gNames,
  onClose,
  onSetBri,
  onSetCol,
  onTogglePow,
  onToggleMember,
  onRename,
  onSetGName,
}: {
  sel: string;
  lights: Light[];
  groups: Map<string, Light[]>;
  gNames: Record<string, string>;
  onClose: () => void;
  onSetBri: (id: string, v: number) => void;
  onSetCol: (id: string, h: string) => void;
  onTogglePow: (id: string) => void;
  onToggleMember: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onSetGName: (gid: string, name: string) => void;
}) {
  const gm = groups.get(sel);
  const isGroup = !!gm;
  const light = !isGroup ? lights.find(l => l.id === sel) : null;

  const name = isGroup ? (gNames[sel] || "Group") : (light?.name || "Light");
  const bri = isGroup
    ? Math.round((gm?.reduce((s, l) => s + l.brightness, 0) || 0) / (gm?.length || 1))
    : (light?.brightness ?? 0);
  const color = isGroup ? (gm?.[0]?.color ?? "#FBB724") : (light?.color ?? "#FBB724");
  const isOn = isGroup ? (gm?.some(l => l.isOn) ?? false) : (light?.isOn ?? false);
  const members = isGroup ? gm! : light ? [light] : [];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(name); setEditing(false); }, [name]);
  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.select(), 30); }, [editing]);

  const c = hex2rgb(color);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-[380px] mx-4"
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="rounded-3xl overflow-hidden" style={{
          background: "linear-gradient(170deg, rgba(28,28,44,0.97), rgba(12,12,22,0.99))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 120px rgba(${c},${isOn ? 0.06 : 0})`,
        }}>

          {/* ── Top glow strip ── */}
          {isOn && (
            <div className="absolute top-0 left-0 right-0 h-px" style={{
              background: `linear-gradient(90deg, transparent, rgba(${c},0.4), transparent)`,
            }} />
          )}

          {/* ── Close button ── */}
          <button onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-all">
            <X className="w-4 h-4" />
          </button>

          {/* ── Header ── */}
          <div className="px-8 pt-8 pb-2">
            <div className="flex items-center gap-4">
              {/* Power orb */}
              <button onClick={() => onTogglePow(sel)}
                className="relative flex-shrink-0 transition-all"
                style={{ width: 52, height: 52 }}>
                <div className="absolute inset-0 rounded-2xl transition-all" style={{
                  background: isOn ? `rgba(${c},0.15)` : "rgba(255,255,255,0.04)",
                  border: isOn ? `1.5px solid rgba(${c},0.3)` : "1.5px solid rgba(255,255,255,0.08)",
                  boxShadow: isOn ? `0 0 20px rgba(${c},0.12)` : "none",
                }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Power className="w-5 h-5 transition-colors" style={{
                    color: isOn ? color : "rgba(255,255,255,0.2)",
                  }} />
                </div>
              </button>

              <div className="flex-1 min-w-0">
                {editing ? (
                  <input ref={inputRef} value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={() => {
                      const n = draft.trim() || name;
                      isGroup ? onSetGName(sel, n) : onRename(sel, n);
                      setEditing(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const n = draft.trim() || name;
                        isGroup ? onSetGName(sel, n) : onRename(sel, n);
                        setEditing(false);
                      }
                      if (e.key === "Escape") setEditing(false);
                    }}
                    className="bg-transparent outline-none text-white text-lg caret-amber-400 w-full" />
                ) : (
                  <h2 className="text-white/90 text-lg cursor-text hover:text-white transition-colors truncate"
                    onClick={() => setEditing(true)}>{name}</h2>
                )}
                <p className="text-white/20 text-[10px] mt-0.5 tracking-wider uppercase">
                  {isGroup ? `${members.length} lights` : "Individual Light"}
                  {isOn ? "" : " \u00b7 Off"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Arc brightness ── */}
          <div className="px-8 -mt-2">
            <ArcSlider value={bri} color={color}
              onChange={v => onSetBri(sel, v)}
              disabled={!isOn} />
          </div>

          {/* ── Color palette ── */}
          <div className="px-8 pb-2 -mt-4">
            <span className="text-white/20 text-[9px] tracking-[0.15em] uppercase mb-3 block">Color</span>
            <div className="flex justify-between gap-1">
              {COLORS.map(cl => {
                const act = color.toLowerCase() === cl.h.toLowerCase();
                return (
                  <button key={cl.h} onClick={() => onSetCol(sel, cl.h)}
                    className="flex flex-col items-center gap-1.5 group/swatch flex-1"
                    style={{ opacity: isOn ? 1 : 0.2 }}>
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full transition-all group-hover/swatch:scale-110" style={{
                        backgroundColor: cl.h,
                        transform: act ? "scale(1.15)" : "scale(1)",
                        boxShadow: act
                          ? `0 0 0 2.5px rgba(0,0,0,0.5), 0 0 0 4px ${cl.h}80, 0 0 16px ${cl.h}30`
                          : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                      }} />
                      {act && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white/80" />
                        </div>
                      )}
                    </div>
                    <span className={`tracking-wide transition-colors ${act ? "text-white/50" : "text-white/15 group-hover/swatch:text-white/30"}`}
                      style={{ fontSize: 8 }}>{cl.n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Group members ── */}
          {isGroup && members.length > 0 && (
            <div className="px-8 pb-6 pt-4">
              <div className="border-t border-white/[0.05] pt-4">
                <span className="text-white/20 text-[9px] tracking-[0.15em] uppercase mb-2.5 block">Members</span>
                <div className="space-y-0.5 max-h-[160px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
                  {members.map(m => {
                    const mc = hex2rgb(m.color);
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors group/member">
                        <div className="w-3 h-3 rounded-full flex-shrink-0 transition-all" style={{
                          backgroundColor: m.isOn ? m.color : "rgba(255,255,255,0.06)",
                          boxShadow: m.isOn ? `0 0 6px rgba(${mc},0.3)` : "none",
                        }} />
                        <span className={`text-xs flex-1 truncate ${m.isOn ? "text-white/60" : "text-white/20"}`}>{m.name}</span>
                        <span className="text-white/15 text-[10px] tabular-nums mr-2">{m.brightness}%</span>
                        <button onClick={(e) => { e.stopPropagation(); onToggleMember(m.id); }}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                            m.isOn
                              ? "text-emerald-400/60 bg-emerald-500/10 border border-emerald-500/20"
                              : "text-white/15 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
                          }`}>
                          <Power className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Non-group bottom padding */}
          {!isGroup && <div className="h-6" />}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════ */

export function LightGroupLab() {
  const [lights, setLights] = useState<Light[]>(INIT);
  const [gNames, setGNames] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([
    { id: "s1", name: "Evening Warm", lights: INIT.map(l => ({ ...l, brightness: 40 })), groupNames: {} },
    { id: "s2", name: "Full Bright", lights: INIT.map(l => ({ ...l, brightness: 100 })), groupNames: {} },
  ]);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [smenu, setSmenu] = useState<string | null>(null);
  const [editSceneId, setEditSceneId] = useState<string | null>(null);
  const [sceneDraft, setSceneDraft] = useState("");
  const [prox, setProx] = useState<ProxTarget | null>(null);
  const [flashEffects, setFlashEffects] = useState<FlashEffect[]>([]);
  const [bouncingIds, setBouncingIds] = useState<Set<string>>(new Set());
  const [elastic, setElastic] = useState<ElasticBand | null>(null);

  const cvRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const startRef = useRef({ x: 0, y: 0 });

  /* Auto-clean flash effects */
  useEffect(() => {
    if (flashEffects.length === 0) return;
    const t = setTimeout(() => setFlashEffects(p => p.filter(e => Date.now() - e.ts < 1200)), 1300);
    return () => clearTimeout(t);
  }, [flashEffects]);

  /* Auto-clear bounce */
  useEffect(() => {
    if (bouncingIds.size === 0) return;
    const t = setTimeout(() => setBouncingIds(new Set()), 500);
    return () => clearTimeout(t);
  }, [bouncingIds]);

  const groups = useMemo(() => {
    const m = new Map<string, Light[]>();
    lights.forEach(l => {
      if (l.groupId) {
        const a = m.get(l.groupId) || [];
        a.push(l);
        m.set(l.groupId, a);
      }
    });
    return m;
  }, [lights]);

  const toCV = useCallback((cx: number, cy: number) => {
    if (!cvRef.current) return { x: 0, y: 0 };
    const r = cvRef.current.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * CW, y: ((cy - r.top) / r.height) * CH };
  }, []);

  /* find nearest merge candidate */
  const findNearest = useCallback((movedId: string, mx: number, my: number): ProxTarget | null => {
    let cd = Infinity;
    let ct: string | null = null;
    lights.forEach(l => {
      if (l.id === movedId || l.groupId) return;
      const d = dist(mx, my, l.x, l.y);
      if (d < cd) { cd = d; ct = l.id; }
    });
    groups.forEach((m, gid) => {
      const moved = lights.find(l => l.id === movedId);
      if (moved?.groupId === gid) return;
      const d = dist(mx, my, m[0].x, m[0].y);
      if (d < cd) { cd = d; ct = gid; }
    });
    if (ct && cd < MERGE_DIST * 1.5) {
      return { targetId: ct, dist: cd };
    }
    return null;
  }, [lights, groups]);

  /* ── Emit flash ── */
  const emitFlash = useCallback((x: number, y: number, color: string, type: "merge" | "peel") => {
    setFlashEffects(p => [...p, { id: `f-${Date.now()}-${Math.random()}`, x, y, color, type, ts: Date.now() }]);
  }, []);

  /* ── Merge ── */
  const merge = useCallback((mid: string, tid: string, tg: boolean) => {
    const mv = lights.find(l => l.id === mid);
    if (!mv) return;

    let gid: string, cx: number, cy: number;
    if (tg) {
      gid = tid;
      const m = lights.filter(l => l.groupId === gid);
      cx = m[0]?.x ?? mv.x; cy = m[0]?.y ?? mv.y;
    } else {
      const t = lights.find(l => l.id === tid);
      if (!t) return;
      gid = mv.groupId || t.groupId || `g-${Date.now()}`;
      cx = (mv.x + t.x) / 2; cy = (mv.y + t.y) / 2;
    }

    if (!gNames[gid]) {
      const c = Object.keys(gNames).length + 1;
      setGNames(p => ({ ...p, [gid]: `Group ${c}` }));
    }

    // Spring animate positions toward merge point
    const ms = { x: mv.x, y: mv.y };
    animate(0, 1, {
      type: "spring", stiffness: 500, damping: 30,
      onUpdate: v => setLights(p => p.map(l => l.id === mid ? { ...l, x: ms.x + (cx - ms.x) * v, y: ms.y + (cy - ms.y) * v } : l)),
    });
    if (!tg) {
      const t = lights.find(l => l.id === tid)!;
      const ts = { x: t.x, y: t.y };
      animate(0, 1, {
        type: "spring", stiffness: 500, damping: 30,
        onUpdate: v => setLights(p => p.map(l => l.id === tid ? { ...l, x: ts.x + (cx - ts.x) * v, y: ts.y + (cy - ts.y) * v } : l)),
      });
    }

    setLights(prev => prev.map(l => (l.id === mid || l.id === tid) ? { ...l, groupId: gid } : l));

    // Visual feedback
    emitFlash(cx, cy, mv.color, "merge");
    setBouncingIds(new Set([gid]));
  }, [lights, gNames, emitFlash]);

  /* ── Pointer handlers ── */
  const pDown = useCallback((eid: string, ig: boolean, e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSmenu(null);
    const pos = toCV(e.clientX, e.clientY);
    startRef.current = pos;
    if (ig) {
      const m = groups.get(eid);
      if (!m?.length) return;
      dragRef.current = { mode: "group", lightId: m[m.length - 1].id, groupId: eid, originCenter: { x: m[0].x, y: m[0].y }, offset: { x: pos.x - m[0].x, y: pos.y - m[0].y }, didMove: false };
    } else {
      const l = lights.find(l => l.id === eid);
      if (!l) return;
      dragRef.current = { mode: "individual", lightId: eid, groupId: "", originCenter: { x: l.x, y: l.y }, offset: { x: pos.x - l.x, y: pos.y - l.y }, didMove: false };
    }
  }, [toCV, groups, lights]);

  const pMove = useCallback((e: React.PointerEvent) => {
    const dr = dragRef.current;
    if (!dr) return;
    const pos = toCV(e.clientX, e.clientY);
    const nx = Math.max(30, Math.min(CW - 30, pos.x - dr.offset.x));
    const ny = Math.max(30, Math.min(CH - 30, pos.y - dr.offset.y));
    if (!dr.didMove) {
      if (dist(pos.x, pos.y, startRef.current.x, startRef.current.y) < TAP_THRESHOLD) return;
      dr.didMove = true;
    }
    if (dr.mode === "group") {
      setLights(p => p.map(l => l.groupId === dr.groupId ? { ...l, x: dr.originCenter.x + (nx - dr.originCenter.x), y: dr.originCenter.y + (ny - dr.originCenter.y) } : l));
      const pullDist = dist(nx, ny, dr.originCenter.x, dr.originCenter.y);
      const tension = Math.min(1, pullDist / PEEL_DIST);
      const groupColor = lights.find(l => l.groupId === dr.groupId)?.color ?? "#FBB724";
      if (tension > 0.15) {
        setElastic({ ox: dr.originCenter.x, oy: dr.originCenter.y, cx: nx, cy: ny, tension, color: groupColor });
      } else {
        setElastic(null);
      }
      if (pullDist > PEEL_DIST) {
        const pid = dr.lightId;
        const oc = dr.originCenter;
        const peeledLight = lights.find(l => l.id === pid);
        setLights(p => {
          let u = p.map(l => {
            if (l.id === pid) return { ...l, groupId: null, x: nx, y: ny };
            if (l.groupId === dr.groupId) return { ...l, x: oc.x, y: oc.y };
            return l;
          });
          if (u.filter(l => l.groupId === dr.groupId).length <= 1) u = u.map(l => l.groupId === dr.groupId ? { ...l, groupId: null } : l);
          return u;
        });
        dragRef.current = { ...dr, mode: "peeled", didMove: true };
        setElastic(null);
        const peelColor = peeledLight?.color ?? "#FBB724";
        const fracturePath = makeFracture(oc.x, oc.y, nx, ny);
        // Single peel flash with fracture + origin data
        setFlashEffects(p => [...p, {
          id: `peel-${Date.now()}-${Math.random()}`, x: nx, y: ny, color: peelColor,
          type: "peel", ts: Date.now(), ox: oc.x, oy: oc.y, fracture: fracturePath,
        }]);
        setBouncingIds(new Set([pid, dr.groupId]));
      }
      setProx(null);
    } else {
      setLights(p => p.map(l => l.id === dr.lightId ? { ...l, x: nx, y: ny } : l));
      setProx(findNearest(dr.lightId, nx, ny));
    }
  }, [toCV, findNearest, lights, emitFlash]);

  const pUp = useCallback(() => {
    const dr = dragRef.current;
    dragRef.current = null;
    setProx(null);
    setElastic(null);
    if (!dr) return;
    if (!dr.didMove) {
      // TAP → open popup
      setSel(dr.mode === "group" ? dr.groupId : dr.lightId);
      return;
    }
    if (dr.mode === "individual" || dr.mode === "peeled") {
      const mv = lights.find(l => l.id === dr.lightId);
      if (!mv) return;
      let cd = Infinity;
      let ct: { id: string; ig: boolean } | null = null;
      lights.forEach(l => {
        if (l.id === mv.id || l.groupId) return;
        const v = dist(mv.x, mv.y, l.x, l.y);
        if (v < cd) { cd = v; ct = { id: l.id, ig: false }; }
      });
      groups.forEach((m, gid) => {
        if (gid === mv.groupId) return;
        const v = dist(mv.x, mv.y, m[0].x, m[0].y);
        if (v < cd) { cd = v; ct = { id: gid, ig: true }; }
      });
      if (ct && cd < MERGE_DIST) merge(mv.id, ct.id, ct.ig);
    }
  }, [lights, groups, merge]);

  /* ── Mutations for popup ── */
  const setBri = useCallback((id: string, v: number) => {
    setLights(s => {
      const isGrp = s.some(l => l.groupId === id);
      return s.map(l =>
        isGrp ? (l.groupId === id ? { ...l, brightness: v } : l)
               : (l.id === id ? { ...l, brightness: v } : l)
      );
    });
  }, []);

  const setCol = useCallback((id: string, h: string) => {
    setLights(s => {
      const isGrp = s.some(l => l.groupId === id);
      return s.map(l =>
        isGrp ? (l.groupId === id ? { ...l, color: h } : l)
               : (l.id === id ? { ...l, color: h } : l)
      );
    });
  }, []);

  const togglePow = useCallback((id: string) => {
    setLights(s => {
      const isGrp = s.some(l => l.groupId === id);
      if (isGrp) {
        const on = s.filter(l => l.groupId === id).some(l => l.isOn);
        return s.map(l => l.groupId === id ? { ...l, isOn: !on } : l);
      }
      return s.map(l => l.id === id ? { ...l, isOn: !l.isOn } : l);
    });
  }, []);

  const toggleMember = useCallback((id: string) => {
    setLights(s => s.map(l => l.id === id ? { ...l, isOn: !l.isOn } : l));
  }, []);

  const renameFn = useCallback((id: string, name: string) => {
    setLights(s => s.map(l => l.id === id ? { ...l, name } : l));
  }, []);

  const setGNameFn = useCallback((gid: string, name: string) => {
    setGNames(p => ({ ...p, [gid]: name }));
  }, []);

  /* ── Scene ops ── */
  const saveScene = useCallback(() => setScenes(p => [...p, { id: `s-${Date.now()}`, name: `Scene ${p.length + 1}`, lights: lights.map(l => ({ ...l })), groupNames: { ...gNames } }]), [lights, gNames]);
  const applyScene = useCallback((sc: Scene) => { setLights(sc.lights.map(l => ({ ...l }))); setGNames({ ...sc.groupNames }); setActiveScene(sc.id); setSel(null); }, []);
  const delScene = useCallback((id: string) => { setScenes(p => p.filter(s => s.id !== id)); if (activeScene === id) setActiveScene(null); setSmenu(null); }, [activeScene]);
  const dupScene = useCallback((id: string) => { setScenes(p => { const s = p.find(s => s.id === id); if (!s) return p; return [...p, { ...s, id: `s-${Date.now()}`, name: `${s.name} Copy`, lights: s.lights.map(l => ({ ...l })), groupNames: { ...s.groupNames } }]; }); setSmenu(null); }, []);
  const commitSceneRename = useCallback(() => { if (!editSceneId) return; setScenes(p => p.map(s => s.id === editSceneId ? { ...s, name: sceneDraft.trim() || s.name } : s)); setEditSceneId(null); }, [editSceneId, sceneDraft]);

  /* ═══════════════════════════════════════════════════════
     RENDER DATA
     ═══════════════════════════════════════════════════════ */

  const ungrouped = lights.filter(l => !l.groupId);
  const ge = Array.from(groups.entries()).map(([gid, m]) => ({
    gid, m, cx: m[0].x, cy: m[0].y,
    name: gNames[gid] || "Group",
    bri: Math.round(m.reduce((s, l) => s + l.brightness, 0) / m.length),
    on: m.some(l => l.isOn), color: m[0]?.color ?? "#FBB724",
  }));

  /* ═══════════════════════════════════════════════════════
     RENDER NODE
     ═══════════════════════════════════════════════════════ */

  const renderNode = (
    key: string, x: number, y: number, bri: number, isOn: boolean,
    label: string, count: number | null, eid: string, isGrp: boolean, color: string
  ) => {
    const dr = dragRef.current;
    const dragging = dr?.didMove &&
      ((dr.mode === "individual" && dr.lightId === eid) ||
       (dr.mode === "peeled" && dr.lightId === eid) ||
       (dr.mode === "group" && dr.groupId === eid));
    const c = hex2rgb(color);
    const b = isOn ? bri / 100 : 0;
    const isProxTarget = prox?.targetId === eid;
    const proxStrength = isProxTarget ? Math.max(0, 1 - (prox!.dist / (MERGE_DIST * 1.5))) : 0;
    const isBouncing = bouncingIds.has(eid);
    const lockReady = proxStrength > 0.65;
    const sz = NODE + 50 + proxStrength * 40;

    return (
      <div key={key} className="absolute" style={{
        left: `${(x / CW) * 100}%`, top: `${(y / CH) * 100}%`,
        transform: `translate(-50%,-50%) scale(${dragging ? 1.15 : isProxTarget ? 1 + proxStrength * 0.15 : 1})`,
        zIndex: dragging ? 50 : isBouncing ? 45 : 10,
        transition: dragging ? "none" : "left 100ms ease-out, top 100ms ease-out, transform 150ms ease",
        animation: isBouncing ? "nodeBounce 600ms cubic-bezier(0.22,1.2,0.36,1)" : "none",
      }}>
        {/* ── Fantasy: rotating sigil rings ── */}
        {isProxTarget && proxStrength > 0.15 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
              style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
              {/* Outer rune ring */}
              <circle cx={sz/2} cy={sz/2} r={sz/2 - 4} fill="none"
                stroke={`rgba(${c},${(0.08 + proxStrength * 0.3).toFixed(2)})`}
                strokeWidth={0.8} strokeDasharray="2 5 8 5"
                style={{ animation: "spinSlow 6s linear infinite", transformOrigin: "center" }} />
              {/* Inner sigil ring */}
              <circle cx={sz/2} cy={sz/2} r={NODE/2 + 8 + proxStrength * 6} fill="none"
                stroke={`rgba(${c},${(0.12 + proxStrength * 0.4).toFixed(2)})`}
                strokeWidth={1 + proxStrength} strokeDasharray="1 3.5"
                style={{ animation: "spinReverse 4s linear infinite", transformOrigin: "center" }} />
              {/* Cross cardinal marks */}
              {[0, 90, 180, 270].map(deg => {
                const r1 = sz/2 - 6, r2 = sz/2 - 14;
                const rad = deg * Math.PI / 180;
                return (
                  <line key={deg}
                    x1={sz/2 + Math.cos(rad) * r2} y1={sz/2 + Math.sin(rad) * r2}
                    x2={sz/2 + Math.cos(rad) * r1} y2={sz/2 + Math.sin(rad) * r1}
                    stroke={`rgba(${c},${(0.15 + proxStrength * 0.3).toFixed(2)})`} strokeWidth={1} strokeLinecap="round" />
                );
              })}
              {/* Diamond markers between cardinals */}
              {lockReady && [45, 135, 225, 315].map(deg => {
                const r = NODE/2 + 12 + proxStrength * 8;
                const rad = deg * Math.PI / 180;
                const px = sz/2 + Math.cos(rad) * r, py = sz/2 + Math.sin(rad) * r;
                return (
                  <polygon key={deg}
                    points={`${px},${py-3} ${px+2},${py} ${px},${py+3} ${px-2},${py}`}
                    fill={`rgba(${c},${(proxStrength * 0.5).toFixed(2)})`}
                    style={{ animation: "breathe 1.5s ease-in-out infinite" }} />
                );
              })}
            </svg>
          </div>
        )}

        {/* Mystic aura field */}
        {isProxTarget && proxStrength > 0.3 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full" style={{
              width: NODE + 35 + proxStrength * 30, height: NODE + 35 + proxStrength * 30,
              background: `radial-gradient(circle, rgba(${c},${(proxStrength * 0.08).toFixed(3)}) 0%, transparent 60%)`,
              animation: "breathe 2.5s ease-in-out infinite",
            }} />
          </div>
        )}

        {/* Lock-ready inner pulse */}
        {lockReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full" style={{
              width: NODE + 6, height: NODE + 6,
              border: `1.5px solid rgba(${c},${(proxStrength * 0.5).toFixed(2)})`,
              boxShadow: `0 0 12px rgba(${c},0.2)`,
              animation: "ringPulse 0.7s ease-in-out infinite",
            }} />
          </div>
        )}

        {lockReady && (
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ bottom: NODE + 14 }}>
            <span className="px-2.5 py-0.5 rounded-full whitespace-nowrap" style={{
              fontSize: 7, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase",
              color: `rgba(${c},0.85)`, background: `rgba(${c},0.1)`,
              border: `1px solid rgba(${c},0.2)`,
            }}>Release to bind</span>
          </div>
        )}

        {/* Dragged: levitation + aura */}
        {dragging && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-full" style={{
                width: NODE + 18, height: NODE + 18,
                background: "radial-gradient(circle, rgba(0,0,0,0.3) 0%, transparent 70%)",
                transform: "translateY(5px)",
              }} />
            </div>
            {isOn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full" style={{
                  width: NODE + 26, height: NODE + 26,
                  background: `radial-gradient(circle, rgba(${c},0.1) 0%, transparent 55%)`,
                  animation: "breathe 1.2s ease-in-out infinite",
                }} />
              </div>
            )}
          </>
        )}

        {/* Ambient glow */}
        {isOn && !dragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full" style={{
              width: NODE + 20 + b * 10, height: NODE + 20 + b * 10,
              background: `radial-gradient(circle, rgba(${c},${(b * 0.12).toFixed(2)}) 0%, transparent 70%)`,
            }} />
          </div>
        )}

        {/* ── The orb ── */}
        <div className="rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            width: NODE, height: NODE, touchAction: "none",
            background: isOn
              ? `radial-gradient(circle at 35% 35%, rgba(${c},${(0.4 + b * 0.5).toFixed(2)}), rgba(${c},${(0.15 + b * 0.25).toFixed(2)}))`
              : "rgba(255,255,255,0.03)",
            border: isOn ? `1.5px solid rgba(${c},${(0.3 + b * 0.4).toFixed(2)})` : "1.5px solid rgba(255,255,255,0.08)",
            boxShadow: isOn
              ? dragging
                ? `0 4px 20px rgba(${c},${(0.15 + b * 0.25).toFixed(2)}), 0 0 30px rgba(${c},0.08), inset 0 1px 1px rgba(255,255,255,0.15)`
                : `0 2px 12px rgba(${c},${(0.05 + b * 0.15).toFixed(2)}), inset 0 1px 1px rgba(255,255,255,0.1)`
              : "inset 0 1px 1px rgba(255,255,255,0.03)",
          }}
          onPointerDown={e => pDown(eid, isGrp, e)} onPointerMove={pMove} onPointerUp={pUp} onPointerCancel={pUp}
        >
          {isOn ? (
            <span className="pointer-events-none select-none tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.95)", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{bri}</span>
          ) : (
            <Sun className="w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(255,255,255,0.2)" }} />
          )}
        </div>

        {/* Group badge */}
        {count !== null && count > 1 && (
          <div className="absolute -top-1 -right-1.5 pointer-events-none px-[5px] py-px rounded-full border" style={{
            fontSize: 8, fontWeight: 600, backgroundColor: `rgba(${c},0.7)`, borderColor: `rgba(${c},0.9)`,
            color: "rgba(255,255,255,0.9)", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            animation: isBouncing ? "badgePop 400ms cubic-bezier(0.22,1.2,0.36,1)" : "none",
          }}>{count}</div>
        )}

        {/* Name label */}
        <div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center pointer-events-none" style={{ top: NODE + 6 }}>
          <span style={{ fontSize: 9, color: dragging ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)" }}>{label}</span>
        </div>
      </div>
    );
  };

  /* ── Fantasy Connector: ethereal tendrils + fairy dust ── */
  const renderConnector = () => {
    if (!prox || !dragRef.current?.didMove) return null;
    const dr = dragRef.current;
    const ml = lights.find(l => l.id === dr.lightId);
    if (!ml) return null;

    let tx: number, ty: number, tColor: string;
    const tg = groups.get(prox.targetId);
    if (tg) { tx = tg[0].x; ty = tg[0].y; tColor = tg[0].color; }
    else { const tl = lights.find(l => l.id === prox.targetId); if (!tl) return null; tx = tl.x; ty = tl.y; tColor = tl.color; }

    const c = hex2rgb(tColor);
    const s = Math.max(0, 1 - prox.dist / (MERGE_DIST * 1.5));
    const mx = (ml.x + tx) / 2, my = (ml.y + ty) / 2;
    // Three organic tendrils with different curvatures
    const tendrils = [
      { cy: my - 20 * s, w: 1.5 + s * 1.5, op: s * 0.6 },
      { cy: my + 15 * s, w: 1 + s, op: s * 0.4 },
      { cy: my - 8 * s - 10, w: 0.8 + s * 0.8, op: s * 0.3 },
    ];
    const mainPath = `M ${ml.x} ${ml.y} Q ${mx} ${tendrils[0].cy} ${tx} ${ty}`;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 3 }}
        viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none">
        <defs>
          <filter id="tendrilGlow">
            <feGaussianBlur stdDeviation={2 + s * 5} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <path id="mainTendril" d={mainPath} />
        </defs>

        {/* Aurora/nebula field between orbs */}
        {s > 0.25 && (
          <ellipse cx={mx} cy={my} rx={35 + s * 30} ry={22 + s * 18}
            fill={`rgba(${c},${(s * 0.05).toFixed(3)})`}
            style={{ animation: "breathe 3s ease-in-out infinite" }} />
        )}

        {/* Three organic tendrils */}
        {tendrils.map((t, i) => (
          <g key={i}>
            {/* Glow layer */}
            <path d={`M ${ml.x} ${ml.y} Q ${mx + (i - 1) * 12} ${t.cy} ${tx} ${ty}`}
              fill="none" stroke={`rgba(${c},${(t.op * 0.3).toFixed(2)})`}
              strokeWidth={t.w + 4} strokeLinecap="round" filter="url(#tendrilGlow)" />
            {/* Core tendril */}
            <path d={`M ${ml.x} ${ml.y} Q ${mx + (i - 1) * 12} ${t.cy} ${tx} ${ty}`}
              fill="none" stroke={`rgba(${c},${t.op.toFixed(2)})`}
              strokeWidth={t.w} strokeLinecap="round"
              strokeDasharray={i === 0 && s > 0.5 ? "none" : `${2 + s * 6} ${4 - s * 2}`}>
              {i > 0 && <animate attributeName="stroke-dashoffset" from="0" to={`${-20}`} dur={`${2 - i * 0.3}s`} repeatCount="indefinite" />}
            </path>
          </g>
        ))}

        {/* Fairy dust: glowing particles drifting along the path */}
        {s > 0.15 && Array.from({ length: Math.min(8, Math.floor(s * 10)) }, (_, i) => {
          const dur = 1.8 - s * 0.6;
          const delay = i * dur / Math.max(1, Math.floor(s * 10));
          return (
            <circle key={`dust-${i}`} r={0.8 + s * 1.2 + Math.random() * 0.5}
              fill={i % 3 === 0 ? "rgba(255,255,255,0.8)" : `rgba(${c},${(0.5 + s * 0.4).toFixed(2)})`}>
              <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${delay}s`}>
                <mpath href="#mainTendril" />
              </animateMotion>
              <animate attributeName="opacity" values="0;0.7;1;0.7;0" dur={`${dur}s`} repeatCount="indefinite" begin={`${delay}s`} />
            </circle>
          );
        })}

        {/* Midpoint summoning sigil when close */}
        {s > 0.6 && (
          <g style={{ animation: "spinSlow 5s linear infinite" }}>
            <circle cx={mx} cy={my} r={6 + s * 8} fill="none"
              stroke={`rgba(${c},${(s * 0.3).toFixed(2)})`} strokeWidth={0.8}
              strokeDasharray="2 3" />
            <circle cx={mx} cy={my} r={3 + s * 4} fill={`rgba(${c},${(s * 0.12).toFixed(2)})`}>
              <animate attributeName="r" values={`${3+s*4};${5+s*5};${3+s*4}`} dur="1.2s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    );
  };

  /* ── Fantasy Tether: magical chain during pre-peel ── */
  const renderElasticBand = () => {
    if (!elastic) return null;
    const { ox, oy, cx, cy, tension, color } = elastic;
    const c = hex2rgb(color);
    const midX = (ox + cx) / 2;
    const midY = (oy + cy) / 2 + 25 * (1 - tension);
    const pathD = `M ${ox} ${oy} Q ${midX} ${midY} ${cx} ${cy}`;
    // Rune marks along the chain
    const runeCount = Math.floor(3 + tension * 5);

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }}
        viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none">
        <defs>
          <filter id="chainGlow">
            <feGaussianBlur stdDeviation={1.5 + tension * 2} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Chain glow */}
        <path d={pathD} fill="none" stroke={`rgba(${c},${(0.06 + tension * 0.1).toFixed(2)})`}
          strokeWidth={4 + tension * 6} strokeLinecap="round" filter="url(#chainGlow)" />
        {/* Chain links — dashed line that stretches */}
        <path d={pathD} fill="none"
          stroke={`rgba(${c},${(0.25 + tension * 0.45).toFixed(2)})`}
          strokeWidth={Math.max(0.6, 2.5 - tension * 1.8)}
          strokeLinecap="round"
          strokeDasharray={`${3 - tension} ${2 + tension * 3}`}>
          <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="0.8s" repeatCount="indefinite" />
        </path>
        {/* Rune marks that appear along the chain */}
        {Array.from({ length: runeCount }, (_, i) => {
          const t = (i + 1) / (runeCount + 1);
          const px = (1-t)*(1-t)*ox + 2*(1-t)*t*midX + t*t*cx;
          const py = (1-t)*(1-t)*oy + 2*(1-t)*t*midY + t*t*cy;
          const vis = tension > 0.4 ? Math.min(1, (tension - 0.4) * 3) : 0;
          return vis > 0 ? (
            <g key={i}>
              <polygon
                points={`${px},${py-2.5} ${px+1.8},${py} ${px},${py+2.5} ${px-1.8},${py}`}
                fill={`rgba(${c},${(vis * 0.5).toFixed(2)})`}>
                <animate attributeName="opacity" values={`${vis*0.3};${vis};${vis*0.3}`} dur="0.6s" repeatCount="indefinite" begin={`${i*0.08}s`} />
              </polygon>
            </g>
          ) : null;
        })}
        {/* Strain label */}
        {tension > 0.6 && (
          <text x={midX} y={midY - 10} textAnchor="middle"
            fill={`rgba(${c},${(tension * 0.55).toFixed(2)})`}
            style={{ fontSize: 7, fontFamily: "Inter", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {tension > 0.9 ? "Breaking..." : "Pull to free"}
          </text>
        )}
      </svg>
    );
  };

  /* ═════════════════════════════════════════════════════════
     FANTASY EFFECTS LAYER
     ═══════════════════════════════════════════════════════ */
  const renderEffectsLayer = () => {
    if (flashEffects.length === 0) return null;
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 55 }}
        viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none">
        <defs>
          <filter id="fxGlow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="fxHeavyGlow"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {flashEffects.map(e => {
          const c = hex2rgb(e.color);
          if (e.type === "merge") {
            return (
              <g key={e.id}>
                {/* ── Summoning circle — rotating sigil that expands ── */}
                <circle cx={e.x} cy={e.y} fill="none"
                  stroke={`rgba(${c},0.5)`} strokeWidth={1.5} strokeDasharray="3 4 8 4"
                  style={{ transformOrigin: `${e.x}px ${e.y}px`, animation: "spinSlow 2s linear" }}>
                  <animate attributeName="r" from="8" to="55" dur="0.7s" fill="freeze" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="0.7s" fill="freeze" />
                  <animate attributeName="stroke-width" from="1.5" to="0.3" dur="0.7s" fill="freeze" />
                </circle>
                {/* Inner sigil ring */}
                <circle cx={e.x} cy={e.y} fill="none"
                  stroke={`rgba(${c},0.4)`} strokeWidth={1} strokeDasharray="1.5 3"
                  style={{ transformOrigin: `${e.x}px ${e.y}px`, animation: "spinReverse 1.5s linear" }}>
                  <animate attributeName="r" from="5" to="40" dur="0.6s" begin="0.05s" fill="freeze" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="0.6s" begin="0.05s" fill="freeze" />
                </circle>

                {/* Central flash — magical core */}
                <circle cx={e.x} cy={e.y} fill="rgba(255,255,255,0.9)">
                  <animate attributeName="r" from="4" to="22" dur="0.2s" fill="freeze" />
                  <animate attributeName="opacity" from="1" to="0" dur="0.25s" fill="freeze" />
                </circle>
                <circle cx={e.x} cy={e.y} fill={`rgba(${c},0.8)`} filter="url(#fxHeavyGlow)">
                  <animate attributeName="r" from="6" to="35" dur="0.4s" fill="freeze" />
                  <animate attributeName="opacity" from="0.7" to="0" dur="0.4s" fill="freeze" />
                </circle>

                {/* Spiral vortex particles — swirl INWARD then burst OUT */}
                {Array.from({ length: 16 }, (_, i) => {
                  const angle = (i * (360 / 16)) * Math.PI / 180;
                  const startR = 50 + Math.random() * 20;
                  const endR = 65 + Math.random() * 30;
                  const startX = e.x + Math.cos(angle) * startR;
                  const startY = e.y + Math.sin(angle) * startR;
                  const burstAngle = angle + (Math.random() - 0.5) * 0.8;
                  const endX = e.x + Math.cos(burstAngle) * endR;
                  const endY = e.y + Math.sin(burstAngle) * endR;
                  const sz = 1 + Math.random() * 2.5;
                  const isWhite = i % 4 === 0;
                  return (
                    <circle key={`v-${i}`} r={sz}
                      fill={isWhite ? "rgba(255,255,255,0.9)" : `rgba(${c},0.8)`}>
                      {/* Phase 1: spiral inward (0 → 0.25s) */}
                      <animate attributeName="cx" values={`${startX};${e.x};${endX}`} keyTimes="0;0.4;1" dur="0.7s" fill="freeze" />
                      <animate attributeName="cy" values={`${startY};${e.y};${endY}`} keyTimes="0;0.4;1" dur="0.7s" fill="freeze" />
                      <animate attributeName="opacity" values="0.3;1;1;0" keyTimes="0;0.3;0.6;1" dur="0.7s" fill="freeze" />
                      <animate attributeName="r" values={`${sz};${sz * 1.5};0`} keyTimes="0;0.4;1" dur="0.7s" fill="freeze" />
                    </circle>
                  );
                })}

                {/* Stardust settling — gentle sparkles drifting down */}
                {Array.from({ length: 10 }, (_, i) => {
                  const sx = e.x + (Math.random() - 0.5) * 60;
                  const sy = e.y + (Math.random() - 0.5) * 40;
                  return (
                    <circle key={`star-${i}`} cx={sx} cy={sy} r={0.8 + Math.random()}
                      fill="rgba(255,255,255,0.7)">
                      <animate attributeName="cy" from={`${sy}`} to={`${sy + 15 + Math.random() * 10}`} dur="1s" begin="0.3s" fill="freeze" />
                      <animate attributeName="opacity" values="0;0.8;0" dur="1s" begin="0.3s" fill="freeze" />
                    </circle>
                  );
                })}

                {/* Cardinal star rays */}
                {[0, 60, 120, 180, 240, 300].map((deg, i) => {
                  const rad = deg * Math.PI / 180;
                  return (
                    <line key={`ray-${i}`} x1={e.x} y1={e.y}
                      x2={e.x + Math.cos(rad) * (30 + Math.random() * 20)}
                      y2={e.y + Math.sin(rad) * (30 + Math.random() * 20)}
                      stroke={`rgba(${c},0.4)`} strokeWidth={0.6} strokeLinecap="round">
                      <animate attributeName="opacity" from="0.5" to="0" dur="0.4s" begin="0.05s" fill="freeze" />
                    </line>
                  );
                })}
              </g>
            );
          } else {
            /* ═══ PEEL: Crystal shatter ═══ */
            const ox = e.ox ?? e.x - 40, oy = e.oy ?? e.y;
            const bx = (e.x + ox) / 2, by = (e.y + oy) / 2;
            return (
              <g key={e.id}>
                {/* Fracture line — jagged lightning crack */}
                {e.fracture && (
                  <>
                    <path d={e.fracture} fill="none" stroke={`rgba(${c},0.5)`} strokeWidth={5}
                      strokeLinecap="round" filter="url(#fxHeavyGlow)">
                      <animate attributeName="opacity" from="0.5" to="0" dur="0.35s" fill="freeze" />
                    </path>
                    <path d={e.fracture} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={2}
                      strokeLinecap="round">
                      <animate attributeName="opacity" from="1" to="0" dur="0.45s" fill="freeze" />
                      <animate attributeName="stroke-width" from="2.5" to="0" dur="0.45s" fill="freeze" />
                    </path>
                  </>
                )}

                {/* Crystal shards — triangular fragments scattering */}
                {Array.from({ length: 12 }, (_, i) => {
                  const angle = (i * 30 + Math.random() * 20) * Math.PI / 180;
                  const speed = 18 + Math.random() * 32;
                  const ex = bx + Math.cos(angle) * speed;
                  const ey = by + Math.sin(angle) * speed;
                  const rot = Math.random() * 360;
                  const sz = 2 + Math.random() * 3;
                  // Triangle shard
                  const pts = `${bx},${by - sz} ${bx + sz * 0.7},${by + sz * 0.5} ${bx - sz * 0.7},${by + sz * 0.5}`;
                  const isGlass = i % 3 === 0;
                  return (
                    <polygon key={`shard-${i}`} points={pts}
                      fill={isGlass ? "rgba(255,255,255,0.6)" : `rgba(${c},0.5)`}
                      stroke={isGlass ? "rgba(255,255,255,0.3)" : `rgba(${c},0.3)`} strokeWidth={0.3}
                      style={{ transformOrigin: `${bx}px ${by}px` }}>
                      <animateTransform attributeName="transform" type="translate"
                        from="0 0" to={`${ex - bx} ${ey - by}`} dur="0.5s" fill="freeze" />
                      <animateTransform attributeName="transform" type="rotate" additive="sum"
                        from="0" to={`${rot}`} dur="0.5s" fill="freeze" />
                      <animate attributeName="opacity" from="0.8" to="0" dur="0.5s" fill="freeze" />
                    </polygon>
                  );
                })}

                {/* Snap rings at both endpoints */}
                <circle cx={e.x} cy={e.y} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5}
                  strokeDasharray="2 3">
                  <animate attributeName="r" from="4" to="35" dur="0.4s" fill="freeze" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="0.4s" fill="freeze" />
                </circle>
                <circle cx={ox} cy={oy} fill="none" stroke={`rgba(${c},0.4)`} strokeWidth={1}
                  strokeDasharray="2 3">
                  <animate attributeName="r" from="4" to="30" dur="0.45s" begin="0.05s" fill="freeze" />
                  <animate attributeName="opacity" from="0.4" to="0" dur="0.45s" begin="0.05s" fill="freeze" />
                </circle>

                {/* Ghost afterimage at break point */}
                <circle cx={bx} cy={by} r={NODE / 2} fill={`rgba(${c},0.15)`}
                  stroke={`rgba(${c},0.2)`} strokeWidth={0.5}>
                  <animate attributeName="r" from={`${NODE/2}`} to={`${NODE/2 + 8}`} dur="0.6s" fill="freeze" />
                  <animate attributeName="opacity" from="0.3" to="0" dur="0.6s" fill="freeze" />
                </circle>

                {/* Spark flickers along fracture */}
                {[0.15, 0.35, 0.55, 0.75, 0.9].map((t, i) => {
                  const sx = ox + (e.x - ox) * t + (Math.random() - 0.5) * 10;
                  const sy = oy + (e.y - oy) * t + (Math.random() - 0.5) * 10;
                  return (
                    <circle key={`flick-${i}`} cx={sx} cy={sy} r={1.5}
                      fill="rgba(255,255,255,0.9)">
                      <animate attributeName="opacity" values="1;0;0.8;0;0.5;0" dur="0.3s"
                        begin={`${i * 0.04}s`} fill="freeze" />
                      <animate attributeName="r" from="2" to="0" dur="0.4s" begin={`${i * 0.04}s`} fill="freeze" />
                    </circle>
                  );
                })}
              </g>
            );
          }
        })}
      </svg>
    );
  };

  /* ── Floating enchantment labels ── */
  const renderStatusLabels = () => (
    <AnimatePresence>
      {flashEffects.map(e => {
        const c = hex2rgb(e.color);
        const isMerge = e.type === "merge";
        return (
          <motion.div key={`label-${e.id}`} className="absolute pointer-events-none"
            style={{ left: `${(e.x / CW) * 100}%`, top: `${(e.y / CH) * 100}%`, transform: "translate(-50%,-50%)", zIndex: 70 }}
            initial={{ opacity: 1, y: 0, scale: 0.7 }}
            animate={{ opacity: 0, y: -40, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <span className="px-3 py-1 rounded-full whitespace-nowrap" style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
              color: isMerge ? `rgba(${c},1)` : "rgba(255,255,255,0.8)",
              background: isMerge ? `rgba(${c},0.15)` : "rgba(255,255,255,0.06)",
              border: `1px solid ${isMerge ? `rgba(${c},0.3)` : "rgba(255,255,255,0.12)"}`,
              boxShadow: isMerge ? `0 0 14px rgba(${c},0.2)` : "0 0 8px rgba(255,255,255,0.08)",
            }}>
              {isMerge ? "Bound" : "Unbound"}
            </span>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */

  return (
    <div className="w-full max-w-[1280px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-white text-xl">Light Group Lab</h2>
          <p className="text-white/25 text-xs mt-0.5">
            Tap to control &middot; Drag to merge &middot; Pull away to split
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] tracking-wider uppercase">
          Experimental
        </span>
      </div>

      {/* ── Canvas Card ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="relative w-2 h-2">
              <div className="absolute inset-0 rounded-full bg-emerald-400" />
              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
            </div>
            <span className="text-white/20 text-[10px] tracking-widest uppercase">Live Canvas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/15 text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
              {groups.size > 0 ? `${groups.size} group${groups.size > 1 ? "s" : ""}` : "No groups"}
            </span>
            <button onClick={() => { setLights(INIT.map(l => ({ ...l }))); setGNames({}); setSel(null); }}
              className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.08] transition-all">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div ref={cvRef} className="relative w-full select-none"
          style={{ aspectRatio: `${CW}/${CH}`, minHeight: 260 }}
          onClick={() => { setSmenu(null); }}>

          {/* Dark bg with subtle grid */}
          <div className="absolute inset-0 rounded-b-2xl overflow-hidden pointer-events-none" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            backgroundColor: "rgba(6,6,12,0.7)",
          }} />

          {/* Elastic rubber band (pre-peel) */}
          {renderElasticBand()}

          {/* Energy beam connector */}
          {renderConnector()}

          {/* Canvas flash on merge */}
          <AnimatePresence>
            {flashEffects.filter(e => e.type === "merge").map(e => {
              const c = hex2rgb(e.color);
              return (
                <motion.div key={`flash-${e.id}`} className="absolute inset-0 pointer-events-none rounded-b-2xl overflow-hidden" style={{ zIndex: 1 }}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}>
                  <div className="w-full h-full" style={{
                    background: `radial-gradient(circle at ${(e.x / CW) * 100}% ${(e.y / CH) * 100}%, rgba(${c},0.15) 0%, transparent 50%)`,
                  }} />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Nodes layer */}
          <div className="relative w-full h-full" style={{ zIndex: 4 }}>
            {ungrouped.map(l => renderNode(l.id, l.x, l.y, l.brightness, l.isOn, l.name, null, l.id, false, l.color))}
            {ge.map(g => renderNode(g.gid, g.cx, g.cy, g.bri, g.on, g.name, g.m.length, g.gid, true, g.color))}
          </div>

          {/* Particle effects + labels */}
          {renderEffectsLayer()}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 60 }}>
            {renderStatusLabels()}
          </div>

          {/* Fantasy Keyframes */}
          <style>{`
            @keyframes nodeBounce {
              0% { transform: translate(-50%,-50%) scale(1); }
              15% { transform: translate(-50%,-50%) scale(1.35); }
              35% { transform: translate(-50%,-50%) scale(0.88); }
              55% { transform: translate(-50%,-50%) scale(1.12); }
              75% { transform: translate(-50%,-50%) scale(0.96); }
              100% { transform: translate(-50%,-50%) scale(1); }
            }
            @keyframes spinSlow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes spinReverse {
              from { transform: rotate(360deg); }
              to { transform: rotate(0deg); }
            }
            @keyframes ringPulse {
              0%, 100% { transform: scale(1); opacity: 0.3; }
              50% { transform: scale(1.1); opacity: 0.7; }
            }
            @keyframes breathe {
              0%, 100% { transform: scale(1); opacity: 0.6; }
              50% { transform: scale(1.12); opacity: 1; }
            }
            @keyframes badgePop {
              0% { transform: scale(0.3); }
              50% { transform: scale(1.4); }
              100% { transform: scale(1); }
            }
          `}</style>
        </div>
      </div>

      {/* ── Scenes ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-white/40" />
            </div>
            <div>
              <h3 className="text-white/70 text-xs">Scenes</h3>
              <p className="text-white/20 text-[10px] mt-0.5">Save and recall lighting presets</p>
            </div>
          </div>
          <span className="text-white/15 text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
            {scenes.length} saved
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
          {scenes.map(s => {
            const act = activeScene === s.id;
            return (
              <div key={s.id} className="shrink-0 relative">
                <button onClick={() => applyScene(s)}
                  className={`w-[120px] rounded-xl border p-2.5 text-left transition-all ${
                    act ? "bg-white/[0.08] border-amber-500/35" : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]"
                  }`}>
                  <div className="w-full h-8 rounded-lg bg-black/30 mb-2 relative overflow-hidden">
                    {s.lights.slice(0, 6).map(l => (
                      <div key={l.id} className="absolute w-1.5 h-1.5 rounded-full" style={{
                        left: `${(l.x / CW) * 100}%`, top: `${(l.y / CH) * 100}%`,
                        backgroundColor: l.isOn ? l.color : "rgba(255,255,255,0.1)",
                        boxShadow: l.isOn ? `0 0 3px ${l.color}50` : "none",
                      }} />
                    ))}
                  </div>
                  {editSceneId === s.id ? (
                    <input autoFocus value={sceneDraft} onChange={e => setSceneDraft(e.target.value)} onBlur={commitSceneRename}
                      onKeyDown={e => { if (e.key === "Enter") commitSceneRename(); if (e.key === "Escape") setEditSceneId(null); }}
                      onClick={e => e.stopPropagation()} className="w-full bg-transparent outline-none text-white/60 text-[10px] caret-amber-400" />
                  ) : (
                    <span className="text-white/40 text-[10px] truncate block"
                      onDoubleClick={e => { e.stopPropagation(); setEditSceneId(s.id); setSceneDraft(s.name); }}>{s.name}</span>
                  )}
                </button>
                <button onClick={e => { e.stopPropagation(); setSmenu(smenu === s.id ? null : s.id); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/40 flex items-center justify-center text-white/25 hover:text-white/50 transition-colors">
                  <MoreVertical className="w-3 h-3" />
                </button>
                {smenu === s.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSmenu(null)} />
                    <div className="absolute top-7 right-0 z-50 rounded-xl border border-white/[0.08] bg-[rgba(12,12,20,0.97)] shadow-xl py-1 min-w-[120px]">
                      <button onClick={() => { setEditSceneId(s.id); setSceneDraft(s.name); setSmenu(null); }}
                        className="w-full px-3 py-1.5 text-left text-white/50 text-[10px] hover:bg-white/[0.06] transition-colors">Rename</button>
                      <button onClick={() => dupScene(s.id)}
                        className="w-full px-3 py-1.5 text-left text-white/50 text-[10px] hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors">
                        <Copy className="w-2.5 h-2.5" /> Duplicate</button>
                      <button onClick={() => delScene(s.id)}
                        className="w-full px-3 py-1.5 text-left text-red-400/70 text-[10px] hover:bg-red-500/10 flex items-center gap-1.5 transition-colors">
                        <Trash2 className="w-2.5 h-2.5" /> Delete</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2.5">
          <button onClick={saveScene}
            className="flex-1 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400/70 text-[10px] flex items-center justify-center gap-1.5 hover:bg-blue-500/20 transition-colors">
            <Save className="w-3 h-3" /> Save Current
          </button>
          <button onClick={() => setScenes(p => [...p, { id: `s-${Date.now()}`, name: "New Scene", lights: INIT.map(l => ({ ...l })), groupNames: {} }])}
            className="flex-1 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/25 text-[10px] flex items-center justify-center gap-1.5 hover:bg-white/[0.06] hover:text-white/40 transition-colors">
            <Plus className="w-3 h-3" /> New Scene
          </button>
        </div>
      </div>

      {/* ── Majestic Light Control Popup ── */}
      <AnimatePresence>
        {sel && (
          <LightControlPopup
            key={sel}
            sel={sel}
            lights={lights}
            groups={groups}
            gNames={gNames}
            onClose={() => setSel(null)}
            onSetBri={setBri}
            onSetCol={setCol}
            onTogglePow={togglePow}
            onToggleMember={toggleMember}
            onRename={renameFn}
            onSetGName={setGNameFn}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Rewind,
  FastForward,
  Power,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Home,
  Grid3X3,
  Settings,
  Plus,
  X,
} from "lucide-react";

/* ═══════════════════════════════════════════════
   BeoRemote One — Bang & Olufsen
   Authentic shape, OLED touchscreen, configurable sources
   ═══════════════════════════════════════════════ */

type Direction = "up" | "down" | "left" | "right" | null;

function getSwipeDir(dx: number, dy: number, threshold = 16): Direction {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < threshold) return null;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle >= -45 && angle < 45) return "right";
  if (angle >= 45 && angle < 135) return "down";
  if (angle >= -135 && angle < -45) return "up";
  return "left";
}

/* ── Theme palettes ── */
const THEMES = {
  black: {
    body: "linear-gradient(178deg, #222225 0%, #18181B 30%, #111114 60%, #0D0D10 100%)",
    bodyInner: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.5)",
    bodyShadow: "0 30px 60px rgba(0,0,0,0.55), 0 12px 24px rgba(0,0,0,0.35)",
    rail: "linear-gradient(180deg, #2A2A2E 0%, #1E1E22 50%, #19191C 100%)",
    railBorder: "rgba(255,255,255,0.06)",
    grip: "linear-gradient(178deg, #141417 0%, #0E0E11 100%)",
    gripEdge: "rgba(255,255,255,0.03)",
    btnBg: "linear-gradient(180deg, #2C2C30 0%, #222226 100%)",
    btnBgPress: "linear-gradient(180deg, #18181B 0%, #1E1E22 100%)",
    btnShadow:
      "inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 3px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.03)",
    btnShadowPress: "inset 0 2px 4px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(0,0,0,0.2)",
    text: "#B8B8BC",
    textDim: "#606064",
    navBg: "linear-gradient(180deg, #28282C 0%, #1E1E22 100%)",
    navCenter: "linear-gradient(180deg, #333336 0%, #26262A 100%)",
    logo: "rgba(255,255,255,0.10)",
  },
  silver: {
    body: "linear-gradient(178deg, #EAEAED 0%, #D5D5D9 30%, #C8C8CC 60%, #BFBFC3 100%)",
    bodyInner: "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.08)",
    bodyShadow: "0 30px 60px rgba(0,0,0,0.22), 0 12px 24px rgba(0,0,0,0.14)",
    rail: "linear-gradient(180deg, #D8D8DC 0%, #CCCCD0 50%, #C4C4C8 100%)",
    railBorder: "rgba(0,0,0,0.08)",
    grip: "linear-gradient(178deg, #C4C4C8 0%, #B4B4B8 100%)",
    gripEdge: "rgba(0,0,0,0.05)",
    btnBg: "linear-gradient(180deg, #1E1E22 0%, #161619 100%)",
    btnBgPress: "linear-gradient(180deg, #111114 0%, #1A1A1D 100%)",
    btnShadow:
      "inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 3px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(0,0,0,0.12)",
    btnShadowPress: "inset 0 2px 4px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(0,0,0,0.08)",
    text: "#D0D0D4",
    textDim: "#888890",
    navBg: "linear-gradient(180deg, #222226 0%, #1A1A1E 100%)",
    navCenter: "linear-gradient(180deg, #2E2E32 0%, #222226 100%)",
    logo: "rgba(0,0,0,0.18)",
  },
} as const;

type BeoTheme = keyof typeof THEMES;

/* ── Source type for the LCD ── */
interface BeoSource {
  id: string;
  label: string;
  icon?: string;
}

const ALL_SOURCES: BeoSource[] = [
  { id: "tv", label: "TV", icon: "📺" },
  { id: "music", label: "MUSIC", icon: "🎵" },
  { id: "netradio", label: "NET RADIO", icon: "📻" },
  { id: "nmusic", label: "N.MUSIC", icon: "🎶" },
  { id: "spotify", label: "SPOTIFY", icon: "🎧" },
  { id: "aaux", label: "A.AUX", icon: "🔌" },
  { id: "hdmi1", label: "HDMI 1", icon: "🖥" },
  { id: "hdmi2", label: "HDMI 2", icon: "🖥" },
  { id: "homemedia", label: "HOMEMEDIA", icon: "🏠" },
  { id: "radio", label: "RADIO", icon: "📡" },
  { id: "airplay", label: "AIRPLAY", icon: "📲" },
  { id: "bluetooth", label: "BLUETOOTH", icon: "🔵" },
  { id: "vinyl", label: "VINYL", icon: "💿" },
  { id: "standby", label: "STANDBY", icon: "⏻" },
];

const DEFAULT_SOURCE_IDS = ["tv", "music", "netradio", "nmusic", "spotify", "aaux", "hdmi1"];

/* ── Small rectangular B&O button ── */
function BeoBtn({
  children,
  label,
  onPress,
  theme,
  accent,
}: {
  children: React.ReactNode;
  label: string;
  onPress?: () => void;
  theme: (typeof THEMES)[BeoTheme];
  accent?: string;
}) {
  const [p, setP] = useState(false);
  return (
    <button
      aria-label={label}
      className="relative flex items-center justify-center select-none"
      style={{
        width: 46,
        height: 34,
        borderRadius: 4,
        background: p ? theme.btnBgPress : theme.btnBg,
        boxShadow: p ? theme.btnShadowPress : theme.btnShadow,
        transform: p ? "scale(0.94)" : "scale(1)",
        transition: "all 0.08s",
        color: accent || theme.text,
      }}
      onPointerDown={() => setP(true)}
      onPointerUp={() => {
        setP(false);
        onPress?.();
      }}
      onPointerLeave={() => setP(false)}
    >
      {children}
    </button>
  );
}

/* ── Color dot button ── */
function ColorDot({
  color,
  label,
  onPress,
  theme,
}: {
  color: string;
  label: string;
  onPress?: () => void;
  theme: (typeof THEMES)[BeoTheme];
}) {
  const [p, setP] = useState(false);
  return (
    <button
      aria-label={label}
      className="relative flex items-center justify-center select-none"
      style={{
        width: 30,
        height: 30,
        borderRadius: 4,
        background: p ? theme.btnBgPress : theme.btnBg,
        boxShadow: p ? theme.btnShadowPress : theme.btnShadow,
        transform: p ? "scale(0.90)" : "scale(1)",
        transition: "all 0.08s",
      }}
      onPointerDown={() => setP(true)}
      onPointerUp={() => {
        setP(false);
        onPress?.();
      }}
      onPointerLeave={() => setP(false)}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 5px ${color}50`,
        }}
      />
    </button>
  );
}

/* ═══ Main Component ═══ */
export function BeoRemoteOne({
  onCommand,
  className = "",
  aesthetic = "black",
}: {
  onCommand?: (command: string) => void;
  className?: string;
  aesthetic?: BeoTheme;
}) {
  const t = THEMES[aesthetic];

  const fire = useCallback(
    (cmd: string) => onCommand?.(cmd),
    [onCommand]
  );

  /* ── Source list state ── */
  const [sourceIds, setSourceIds] = useState<string[]>(DEFAULT_SOURCE_IDS);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [volume, setVolume] = useState(42);
  const [configOpen, setConfigOpen] = useState(false);

  const sources = sourceIds.map(
    (id) => ALL_SOURCES.find((s) => s.id === id)!
  ).filter(Boolean);

  const activeSource = sources[selectedIdx] ?? sources[0];

  /* ── LCD swipe-to-scroll ── */
  const lcdRef = useRef<HTMLDivElement>(null);
  const lcdStartRef = useRef<{ y: number; idx: number } | null>(null);
  const [lcdDragOffset, setLcdDragOffset] = useState(0);

  useEffect(() => {
    const el = lcdRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  const onLcdDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      lcdRef.current?.setPointerCapture(e.pointerId);
      lcdStartRef.current = { y: e.clientY, idx: selectedIdx };
      setLcdDragOffset(0);
    },
    [selectedIdx]
  );

  const onLcdMove = useCallback(
    (e: React.PointerEvent) => {
      if (!lcdStartRef.current) return;
      e.preventDefault();
      const dy = e.clientY - lcdStartRef.current.y;
      setLcdDragOffset(dy);
    },
    []
  );

  const onLcdUp = useCallback(() => {
    if (!lcdStartRef.current) return;
    const dy = lcdDragOffset;
    const threshold = 30;
    if (dy < -threshold && selectedIdx < sources.length - 1) {
      setSelectedIdx((i) => i + 1);
      fire(`source_${sources[selectedIdx + 1]?.id}`);
    } else if (dy > threshold && selectedIdx > 0) {
      setSelectedIdx((i) => i - 1);
      fire(`source_${sources[selectedIdx - 1]?.id}`);
    }
    lcdStartRef.current = null;
    setLcdDragOffset(0);
  }, [lcdDragOffset, selectedIdx, sources, fire]);

  const onLcdLeave = useCallback(() => {
    lcdStartRef.current = null;
    setLcdDragOffset(0);
  }, []);

  /* ── Navigation wheel (swipe) ── */
  const navRef = useRef<HTMLDivElement>(null);
  const navStartRef = useRef<{ x: number; y: number } | null>(null);
  const [navDir, setNavDir] = useState<Direction>(null);
  const [navActive, setNavActive] = useState(false);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = rect.width / 2;
      const dx = touch.clientX - cx;
      const dy = touch.clientY - cy;
      if (dx * dx + dy * dy <= r * r) e.preventDefault();
    };
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  const isInsideNav = useCallback(
    (clientX: number, clientY: number) => {
      if (!navRef.current) return false;
      const rect = navRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = rect.width / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      return dx * dx + dy * dy <= r * r;
    },
    []
  );

  const onNavDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isInsideNav(e.clientX, e.clientY)) return;
      e.preventDefault();
      navRef.current?.setPointerCapture(e.pointerId);
      navStartRef.current = { x: e.clientX, y: e.clientY };
      setNavActive(true);
      setNavDir(null);
    },
    [isInsideNav]
  );

  const onNavMove = useCallback((e: React.PointerEvent) => {
    if (!navStartRef.current) return;
    e.preventDefault();
    const dx = e.clientX - navStartRef.current.x;
    const dy = e.clientY - navStartRef.current.y;
    setNavDir(getSwipeDir(dx, dy, 10));
  }, []);

  const onNavUp = useCallback(() => {
    if (!navStartRef.current) return;
    if (navDir) fire(`nav_${navDir}`);
    else fire("select");
    navStartRef.current = null;
    setNavActive(false);
    setNavDir(null);
  }, [navDir, fire]);

  const onNavLeave = useCallback(() => {
    navStartRef.current = null;
    setNavActive(false);
    setNavDir(null);
  }, []);

  const navGrad = (() => {
    if (!navDir) return "none";
    const m: Record<string, string> = {
      up: "radial-gradient(ellipse 80% 50% at 50% 15%, rgba(255,255,255,0.08) 0%, transparent 70%)",
      down: "radial-gradient(ellipse 80% 50% at 50% 85%, rgba(255,255,255,0.08) 0%, transparent 70%)",
      left: "radial-gradient(ellipse 50% 80% at 15% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)",
      right: "radial-gradient(ellipse 50% 80% at 85% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)",
    };
    return m[navDir] ?? "none";
  })();

  /* ── Volume ── */
  const handleVolUp = useCallback(() => {
    setVolume((v) => Math.min(100, v + 2));
    fire("volume_up");
  }, [fire]);

  const handleVolDown = useCallback(() => {
    setVolume((v) => Math.max(0, v - 2));
    fire("volume_down");
  }, [fire]);

  /* ── Config helpers ── */
  const addSource = (id: string) => {
    if (!sourceIds.includes(id)) setSourceIds((prev) => [...prev, id]);
  };
  const removeSource = (id: string) => {
    setSourceIds((prev) => prev.filter((s) => s !== id));
    if (selectedIdx >= sourceIds.length - 1) setSelectedIdx(Math.max(0, sourceIds.length - 2));
  };
  const moveSource = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sourceIds.length) return;
    const next = [...sourceIds];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setSourceIds(next);
    if (selectedIdx === idx) setSelectedIdx(newIdx);
    else if (selectedIdx === newIdx) setSelectedIdx(idx);
  };

  /* ── Dimensions ── */
  const W = 160;
  const LCD_H = 190;
  const RAIL_W = 6;

  /* Items visible on the LCD carousel */
  const prevSource = selectedIdx > 0 ? sources[selectedIdx - 1] : null;
  const nextSource = selectedIdx < sources.length - 1 ? sources[selectedIdx + 1] : null;

  /* Swipe visual offset for center item (clamped) */
  const displayOffset = Math.max(-40, Math.min(40, lcdDragOffset * 0.4));

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ width: W }}
    >
      {/* ══════ OUTER BODY / SHAPE ══════ */}
      <div
        className="relative flex flex-col"
        style={{
          width: W,
          borderRadius: "16px 16px 12px 12px",
          background: t.body,
          boxShadow: `${t.bodyShadow}, ${t.bodyInner}`,
          overflow: "hidden",
        }}
      >
        {/* ══ Top section: aluminum rails + OLED screen ══ */}
        <div className="relative flex" style={{ padding: "14px 10px 8px" }}>
          {/* Left aluminum rail */}
          <div
            style={{
              width: RAIL_W,
              minHeight: LCD_H,
              background: t.rail,
              borderRight: `0.5px solid ${t.railBorder}`,
            }}
          />

          {/* OLED Touchscreen */}
          <div
            ref={lcdRef}
            className="relative flex-1 overflow-hidden cursor-pointer"
            style={{
              height: LCD_H,
              background: "#050507",
              touchAction: "none",
            }}
            onPointerDown={onLcdDown}
            onPointerMove={onLcdMove}
            onPointerUp={onLcdUp}
            onPointerLeave={onLcdLeave}
          >
            {/* Scanline effect */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.008) 1px, rgba(255,255,255,0.008) 2px)",
              }}
            />

            {/* Source carousel */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{
                transform: `translateY(${displayOffset}px)`,
                transition: lcdStartRef.current ? "none" : "transform 0.25s ease-out",
              }}
            >
              {/* Previous source (above) */}
              <div
                className="flex items-center justify-center"
                style={{
                  height: 36,
                  opacity: prevSource ? 0.35 : 0,
                  transition: "opacity 0.2s",
                }}
              >
                <span
                  style={{
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 400,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {prevSource?.label ?? ""}
                </span>
              </div>

              {/* Separator line */}
              <div
                style={{
                  width: "70%",
                  height: 1,
                  background: "rgba(255,255,255,0.12)",
                }}
              />

              {/* Current / selected source (center) */}
              <div
                className="flex items-center justify-center"
                style={{
                  height: 48,
                  minWidth: "100%",
                }}
              >
                <span
                  style={{
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    textShadow: "0 0 12px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.2)",
                  }}
                >
                  {activeSource?.label ?? ""}
                </span>
              </div>

              {/* Separator line */}
              <div
                style={{
                  width: "70%",
                  height: 1,
                  background: "rgba(255,255,255,0.12)",
                }}
              />

              {/* Next source (below) */}
              <div
                className="flex items-center justify-center"
                style={{
                  height: 36,
                  opacity: nextSource ? 0.35 : 0,
                  transition: "opacity 0.2s",
                }}
              >
                <span
                  style={{
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 400,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {nextSource?.label ?? ""}
                </span>
              </div>
            </div>

            {/* Subtle OLED edge vignette */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                boxShadow:
                  "inset 0 12px 16px -8px rgba(0,0,0,0.9), inset 0 -12px 16px -8px rgba(0,0,0,0.9)",
              }}
            />

            {/* Config gear (top-right corner) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfigOpen(true);
              }}
              className="absolute z-20 flex items-center justify-center"
              style={{
                top: 4,
                right: 4,
                width: 18,
                height: 18,
                borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                pointerEvents: "auto",
              }}
              aria-label="Configure sources"
            >
              <Settings size={9} color="rgba(255,255,255,0.3)" strokeWidth={2.2} />
            </button>

            {/* Scroll indicators (tiny arrows) */}
            {selectedIdx > 0 && (
              <div
                className="absolute z-10 pointer-events-none"
                style={{ top: 2, left: "50%", transform: "translateX(-50%)" }}
              >
                <ChevronUp size={10} color="rgba(255,255,255,0.15)" strokeWidth={2} />
              </div>
            )}
            {selectedIdx < sources.length - 1 && (
              <div
                className="absolute z-10 pointer-events-none"
                style={{ bottom: 2, left: "50%", transform: "translateX(-50%)" }}
              >
                <ChevronDown size={10} color="rgba(255,255,255,0.15)" strokeWidth={2} />
              </div>
            )}
          </div>

          {/* Right aluminum rail */}
          <div
            style={{
              width: RAIL_W,
              minHeight: LCD_H,
              background: t.rail,
              borderLeft: `0.5px solid ${t.railBorder}`,
            }}
          />
        </div>

        {/* ══ Button panel (dark inset area) ══ */}
        <div
          style={{
            width: "100%",
            padding: "6px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* Row: MyBtn / TV / MyBtn */}
          <div className="flex justify-center gap-1">
            <BeoBtn theme={t} label="MyButton 1" onPress={() => fire("mybutton_1")}>
              <Grid3X3 size={11} strokeWidth={1.6} />
            </BeoBtn>
            <BeoBtn
              theme={t}
              label="TV"
              onPress={() => {
                const tvIdx = sourceIds.indexOf("tv");
                if (tvIdx >= 0) setSelectedIdx(tvIdx);
                fire("tv");
              }}
            >
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.06em" }}>TV</span>
            </BeoBtn>
            <BeoBtn theme={t} label="MyButton 2" onPress={() => fire("mybutton_2")}>
              <Grid3X3 size={11} strokeWidth={1.6} />
            </BeoBtn>
          </div>

          {/* Row: MUSIC / _ / LIST */}
          <div className="flex justify-center gap-1">
            <BeoBtn
              theme={t}
              label="Music"
              onPress={() => {
                const mIdx = sourceIds.indexOf("music");
                if (mIdx >= 0) setSelectedIdx(mIdx);
                fire("music");
              }}
            >
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.04em" }}>MUSIC</span>
            </BeoBtn>
            <div style={{ width: 46 }} />
            <BeoBtn theme={t} label="List" onPress={() => fire("list")}>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.04em" }}>LIST</span>
            </BeoBtn>
          </div>

          {/* Number Pad */}
          {[
            ["7", "8", "9"],
            ["4", "5", "6"],
            ["1", "2", "3"],
          ].map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1">
              {row.map((n) => (
                <BeoBtn key={n} theme={t} label={`Number ${n}`} onPress={() => fire(`num_${n}`)}>
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{n}</span>
                </BeoBtn>
              ))}
            </div>
          ))}

          {/* Row: TEXT / 0 / GUIDE */}
          <div className="flex justify-center gap-1">
            <BeoBtn theme={t} label="Text" onPress={() => fire("text")}>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.04em" }}>TEXT</span>
            </BeoBtn>
            <BeoBtn theme={t} label="Number 0" onPress={() => fire("num_0")}>
              <span style={{ fontSize: 11, fontWeight: 500 }}>0</span>
            </BeoBtn>
            <BeoBtn theme={t} label="Guide" onPress={() => fire("guide")}>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.04em" }}>GUIDE</span>
            </BeoBtn>
          </div>

          {/* Row: BACK / INFO / MENU */}
          <div className="flex justify-center gap-1">
            <BeoBtn theme={t} label="Back" onPress={() => fire("back")}>
              <ArrowLeft size={12} strokeWidth={2} />
            </BeoBtn>
            <BeoBtn theme={t} label="Info" onPress={() => fire("info")}>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.04em" }}>INFO</span>
            </BeoBtn>
            <BeoBtn theme={t} label="Menu" onPress={() => fire("menu")}>
              <Home size={12} strokeWidth={2} />
            </BeoBtn>
          </div>

          {/* ── Color dots + Nav Wheel ── */}
          <div className="flex flex-col items-center" style={{ margin: "3px 0" }}>
            {/* Top color dots */}
            <div className="flex items-center justify-center gap-3 mb-1.5">
              <ColorDot color="#4ADE80" label="Green" theme={t} onPress={() => fire("color_green")} />
              <div style={{ width: 50 }} />
              <ColorDot color="#FACC15" label="Yellow" theme={t} onPress={() => fire("color_yellow")} />
            </div>

            {/* Navigation Wheel */}
            <div
              ref={navRef}
              className="relative flex items-center justify-center cursor-pointer"
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: t.navBg,
                boxShadow:
                  "inset 0 2px 6px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04), 0 4px 10px rgba(0,0,0,0.2)",
                touchAction: "none",
              }}
              onPointerDown={onNavDown}
              onPointerMove={onNavMove}
              onPointerUp={onNavUp}
              onPointerLeave={onNavLeave}
            >
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  border: "1.5px solid rgba(255,255,255,0.04)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.015)",
                }}
              />

              {/* Direction chevrons */}
              <ChevronUp
                size={10}
                color={navDir === "up" ? "#fff" : "rgba(255,255,255,0.18)"}
                strokeWidth={2.5}
                className="absolute pointer-events-none"
                style={{ top: 7, left: "50%", transform: "translateX(-50%)", transition: "color 0.1s" }}
              />
              <ChevronDown
                size={10}
                color={navDir === "down" ? "#fff" : "rgba(255,255,255,0.18)"}
                strokeWidth={2.5}
                className="absolute pointer-events-none"
                style={{ bottom: 7, left: "50%", transform: "translateX(-50%)", transition: "color 0.1s" }}
              />
              <ChevronLeft
                size={10}
                color={navDir === "left" ? "#fff" : "rgba(255,255,255,0.18)"}
                strokeWidth={2.5}
                className="absolute pointer-events-none"
                style={{ left: 7, top: "50%", transform: "translateY(-50%)", transition: "color 0.1s" }}
              />
              <ChevronRight
                size={10}
                color={navDir === "right" ? "#fff" : "rgba(255,255,255,0.18)"}
                strokeWidth={2.5}
                className="absolute pointer-events-none"
                style={{ right: 7, top: "50%", transform: "translateY(-50%)", transition: "color 0.1s" }}
              />

              {/* Swipe highlight */}
              <div
                className="absolute inset-[10px] rounded-full pointer-events-none"
                style={{
                  backgroundImage: navGrad,
                  opacity: navDir ? 1 : 0,
                  transition: "opacity 0.08s",
                }}
              />

              {/* Center button */}
              <div
                className="relative z-10 rounded-full"
                style={{
                  width: 28,
                  height: 28,
                  background: navActive && !navDir ? "rgba(255,255,255,0.10)" : t.navCenter,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)",
                  transition: "background 0.1s",
                }}
              />
            </div>

            {/* Bottom color dots */}
            <div className="flex items-center justify-center gap-3 mt-1.5">
              <ColorDot color="#F87171" label="Red" theme={t} onPress={() => fire("color_red")} />
              <div style={{ width: 50 }} />
              <ColorDot color="#60A5FA" label="Blue" theme={t} onPress={() => fire("color_blue")} />
            </div>
          </div>

          {/* ── Transport ── */}
          {/* Row: Prev / Play / Next */}
          <div className="flex justify-center gap-1">
            <BeoBtn theme={t} label="Previous" onPress={() => fire("prev")}>
              <SkipBack size={11} strokeWidth={2} fill="currentColor" />
            </BeoBtn>
            <BeoBtn theme={t} label="Play" onPress={() => fire("play")}>
              <Play size={11} strokeWidth={2} fill="currentColor" />
            </BeoBtn>
            <BeoBtn theme={t} label="Next" onPress={() => fire("next")}>
              <SkipForward size={11} strokeWidth={2} fill="currentColor" />
            </BeoBtn>
          </div>

          {/* Row: Rewind / FF / Stop */}
          <div className="flex justify-center gap-1">
            <BeoBtn theme={t} label="Rewind" onPress={() => fire("rewind")}>
              <Rewind size={11} strokeWidth={2} fill="currentColor" />
            </BeoBtn>
            <BeoBtn theme={t} label="Fast Forward" onPress={() => fire("ff")}>
              <FastForward size={11} strokeWidth={2} fill="currentColor" />
            </BeoBtn>
            <BeoBtn theme={t} label="Stop" onPress={() => fire("stop")}>
              <div style={{ width: 8, height: 8, background: "currentColor", borderRadius: 1 }} />
            </BeoBtn>
          </div>

          {/* Row: P+ / Pause / Vol+ */}
          <div className="flex justify-center gap-1">
            <BeoBtn theme={t} label="Program Up" onPress={() => fire("prog_up")}>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.04em" }}>P+</span>
            </BeoBtn>
            <BeoBtn theme={t} label="Pause" onPress={() => fire("pause")}>
              <Pause size={11} strokeWidth={2} fill="currentColor" />
            </BeoBtn>
            <BeoBtn theme={t} label="Volume Up" onPress={handleVolUp}>
              <Volume2 size={12} strokeWidth={2} />
            </BeoBtn>
          </div>

          {/* Row: P- / Standby / Vol- */}
          <div className="flex justify-center gap-1">
            <BeoBtn theme={t} label="Program Down" onPress={() => fire("prog_down")}>
              <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.04em" }}>P–</span>
            </BeoBtn>
            <BeoBtn theme={t} label="Standby" onPress={() => fire("standby")} accent="#F87171">
              <Power size={12} strokeWidth={2.2} />
            </BeoBtn>
            <BeoBtn theme={t} label="Volume Down" onPress={handleVolDown}>
              <VolumeX size={12} strokeWidth={2} />
            </BeoBtn>
          </div>
        </div>

        {/* ══ Grip / Bottom taper ══ */}
        <div
          className="flex items-end justify-center"
          style={{
            width: "100%",
            height: 38,
            background: t.grip,
            borderTop: `1px solid ${t.gripEdge}`,
            borderRadius: "0 0 12px 12px",
            clipPath: "polygon(3% 0%, 97% 0%, 93% 100%, 7% 100%)",
            paddingBottom: 10,
          }}
        >
          <span
            style={{
              color: t.logo,
              fontSize: 6.5,
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Bang &amp; Olufsen
          </span>
        </div>
      </div>

      {/* ══════ CONFIGURATION OVERLAY ══════ */}
      {configOpen && (
        <div
          className="absolute inset-0 z-50 flex flex-col"
          style={{
            background: "rgba(5,5,7,0.96)",
            borderRadius: "16px 16px 12px 12px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Configure Sources
            </span>
            <button
              onClick={() => setConfigOpen(false)}
              className="flex items-center justify-center"
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <X size={11} color="#fff" strokeWidth={2.5} />
            </button>
          </div>

          {/* Active sources list */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ padding: "6px 8px" }}
          >
            <p
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Active ({sourceIds.length})
            </p>

            <div className="flex flex-col gap-1">
              {sourceIds.map((id, idx) => {
                const src = ALL_SOURCES.find((s) => s.id === id);
                if (!src) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center gap-1.5 rounded px-1.5 py-1"
                    style={{
                      background:
                        selectedIdx === idx
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(255,255,255,0.03)",
                      border: `1px solid ${
                        selectedIdx === idx
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(255,255,255,0.04)"
                      }`,
                    }}
                  >
                    {/* Reorder arrows */}
                    <div className="flex flex-col gap-0">
                      <button
                        onClick={() => moveSource(idx, -1)}
                        disabled={idx === 0}
                        className="flex items-center justify-center"
                        style={{ opacity: idx === 0 ? 0.15 : 0.5, width: 14, height: 10 }}
                      >
                        <ChevronUp size={8} color="#fff" strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => moveSource(idx, 1)}
                        disabled={idx === sourceIds.length - 1}
                        className="flex items-center justify-center"
                        style={{
                          opacity: idx === sourceIds.length - 1 ? 0.15 : 0.5,
                          width: 14,
                          height: 10,
                        }}
                      >
                        <ChevronDown size={8} color="#fff" strokeWidth={3} />
                      </button>
                    </div>

                    <span style={{ fontSize: 10 }}>{src.icon}</span>
                    <span
                      className="flex-1"
                      style={{
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {src.label}
                    </span>

                    <button
                      onClick={() => removeSource(id)}
                      className="flex items-center justify-center"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        background: "rgba(239,68,68,0.12)",
                      }}
                    >
                      <X size={8} color="#F87171" strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Available sources to add */}
            {(() => {
              const available = ALL_SOURCES.filter(
                (s) => !sourceIds.includes(s.id)
              );
              if (available.length === 0) return null;
              return (
                <>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.2)",
                      fontSize: 8,
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginTop: 8,
                      marginBottom: 4,
                    }}
                  >
                    Available
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {available.map((src) => (
                      <button
                        key={src.id}
                        onClick={() => addSource(src.id)}
                        className="flex items-center gap-1 px-1.5 py-1 rounded"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <Plus size={7} color="rgba(96,165,250,0.7)" strokeWidth={3} />
                        <span
                          style={{
                            color: "rgba(255,255,255,0.4)",
                            fontSize: 8,
                            fontWeight: 600,
                          }}
                        >
                          {src.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-center px-3 py-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <button
              onClick={() => setConfigOpen(false)}
              className="px-4 py-1.5 rounded"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              DONE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
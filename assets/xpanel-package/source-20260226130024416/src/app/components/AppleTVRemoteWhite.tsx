import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Mic,
  ChevronLeft,
  Tv,
  VolumeX,
  Plus,
  Minus,
  Power,
} from "lucide-react";

/* ── Helpers ── */
type Direction = "up" | "down" | "left" | "right" | null;

function getSwipeDir(dx: number, dy: number, threshold = 18): Direction {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < threshold) return null;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle >= -45 && angle < 45) return "right";
  if (angle >= 45 && angle < 135) return "down";
  if (angle >= -135 && angle < -45) return "up";
  return "left";
}

/* ── Circular button ── */
function Btn({
  children,
  size = 44,
  label,
  onPress,
}: {
  children: React.ReactNode;
  size?: number;
  label?: string;
  onPress?: () => void;
}) {
  const [p, setP] = useState(false);
  return (
    <button
      aria-label={label}
      className="relative flex items-center justify-center rounded-full select-none"
      style={{
        width: size,
        height: size,
        background: p
          ? "linear-gradient(180deg, #D0D0D3 0%, #DDDDE0 100%)"
          : "linear-gradient(180deg, #E4E4E7 0%, #D5D5D8 100%)",
        boxShadow: p
          ? "inset 0 2px 5px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.05)"
          : "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)",
        transform: p ? "scale(0.93)" : "scale(1)",
        transition: "all 0.1s",
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

/* ── Play/Pause icon ── */
function PlayPauseIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 4.5v15l9.5-7.5L5 4.5z" fill="#6B6B6E" />
      <rect x="16" y="5" width="2.5" height="14" rx="0.8" fill="#6B6B6E" />
      <rect x="20.5" y="5" width="2.5" height="14" rx="0.8" fill="#6B6B6E" />
    </svg>
  );
}

/* ── Main Component ── */
export function AppleTVRemoteWhite({
  onCommand,
  className = "",
}: {
  onCommand?: (command: string) => void;
  className?: string;
}) {
  const fire = useCallback(
    (cmd: string) => onCommand?.(cmd),
    [onCommand]
  );

  /* ── Swipe-capable circular clickpad ── */
  const padRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [padActive, setPadActive] = useState(false);
  const [swipeDir, setSwipeDir] = useState<Direction>(null);
  const [centerPressed, setCenterPressed] = useState(false);

  /* Block native touch-scroll on the circular pad area */
  useEffect(() => {
    const el = padRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = rect.width / 2;
      const dx = t.clientX - cx;
      const dy = t.clientY - cy;
      if (dx * dx + dy * dy <= r * r) e.preventDefault();
    };
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  const isInsideCircle = useCallback(
    (clientX: number, clientY: number) => {
      if (!padRef.current) return false;
      const rect = padRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = rect.width / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      return dx * dx + dy * dy <= r * r;
    },
    []
  );

  const onPadDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isInsideCircle(e.clientX, e.clientY)) return;
      e.preventDefault();
      padRef.current?.setPointerCapture(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY };
      setPadActive(true);
      setSwipeDir(null);
    },
    [isInsideCircle]
  );

  const onPadMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current) return;
    e.preventDefault();
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setSwipeDir(getSwipeDir(dx, dy, 12));
  }, []);

  const onPadUp = useCallback(() => {
    if (!startRef.current) return;
    if (swipeDir) fire(`swipe_${swipeDir}`);
    startRef.current = null;
    setPadActive(false);
    setSwipeDir(null);
  }, [swipeDir, fire]);

  const onPadLeave = useCallback(() => {
    startRef.current = null;
    setPadActive(false);
    setSwipeDir(null);
  }, []);

  /* Direction visual feedback */
  const dirGrad = (() => {
    if (!swipeDir) return "none";
    const m: Record<string, string> = {
      up: "radial-gradient(ellipse 80% 50% at 50% 15%, rgba(0,0,0,0.07) 0%, transparent 70%)",
      down: "radial-gradient(ellipse 80% 50% at 50% 85%, rgba(0,0,0,0.07) 0%, transparent 70%)",
      left: "radial-gradient(ellipse 50% 80% at 15% 50%, rgba(0,0,0,0.07) 0%, transparent 70%)",
      right: "radial-gradient(ellipse 50% 80% at 85% 50%, rgba(0,0,0,0.07) 0%, transparent 70%)",
    };
    return m[swipeDir] ?? "none";
  })();

  /* Volume rocker */
  const [volPart, setVolPart] = useState<"up" | "down" | null>(null);

  return (
    <div
      className={`flex flex-col items-center select-none ${className}`}
      style={{
        width: 192,
        minHeight: 540,
        padding: "22px 22px 18px",
        borderRadius: 42,
        background:
          "linear-gradient(178deg, #F7F7F8 0%, #EDEDF0 35%, #E3E3E7 100%)",
        boxShadow:
          "0 24px 48px rgba(0,0,0,0.28), 0 8px 16px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(0,0,0,0.04)",
      }}
    >
      {/* ── Mic (top-right) ── */}
      <div className="w-full flex justify-end" style={{ marginBottom: 10 }}>
        <Btn size={26} label="Siri" onPress={() => fire("siri")}>
          <Mic size={12} color="#9A9A9D" strokeWidth={2.2} />
        </Btn>
      </div>

      {/* ── Circular Clickpad ── */}
      <div
        ref={padRef}
        className="relative flex items-center justify-center cursor-pointer"
        style={{
          width: 148,
          height: 148,
          borderRadius: "50%",
          background: padActive
            ? "linear-gradient(180deg, #DDDDE0 0%, #E6E6E9 100%)"
            : "linear-gradient(180deg, #EAEAED 0%, #E0E0E4 100%)",
          boxShadow:
            "inset 0 2px 8px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.5), 0 3px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)",
          transition: "background 0.12s",
          touchAction: "none",
        }}
        onPointerDown={onPadDown}
        onPointerMove={onPadMove}
        onPointerUp={onPadUp}
        onPointerLeave={onPadLeave}
      >
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: "2px solid rgba(0,0,0,0.04)",
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.35), 0 0 0 1px rgba(0,0,0,0.02)",
          }}
        />

        {/* Inner touch surface */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: 16,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.01) 100%)",
            border: "1px solid rgba(0,0,0,0.03)",
          }}
        />

        {/* Swipe direction highlight */}
        <div
          className="absolute inset-[16px] rounded-full pointer-events-none"
          style={{
            backgroundImage: dirGrad,
            opacity: swipeDir ? 1 : 0,
            transition: "opacity 0.08s",
          }}
        />

        {/* Center dot */}
        <button
          aria-label="Select"
          className="relative z-10 rounded-full"
          style={{
            width: 8,
            height: 8,
            background: centerPressed
              ? "rgba(0,0,0,0.20)"
              : "rgba(0,0,0,0.10)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.12)",
            transform: centerPressed ? "scale(0.8)" : "scale(1)",
            transition: "all 0.1s",
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setCenterPressed(true);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            setCenterPressed(false);
            fire("select");
          }}
          onPointerLeave={() => setCenterPressed(false)}
        />
      </div>

      <div style={{ height: 22 }} />

      {/* ── Back + TV row ── */}
      <div className="flex items-center justify-center" style={{ gap: 40 }}>
        <Btn size={44} label="Back" onPress={() => fire("back")}>
          <ChevronLeft size={18} color="#6B6B6E" strokeWidth={2.4} />
        </Btn>
        <Btn size={44} label="TV / Home" onPress={() => fire("tv_home")}>
          <Tv size={16} color="#6B6B6E" strokeWidth={2.2} />
        </Btn>
      </div>

      <div style={{ height: 16 }} />

      {/* ── Play/Pause ── */}
      <Btn size={44} label="Play / Pause" onPress={() => fire("play_pause")}>
        <PlayPauseIcon />
      </Btn>

      <div style={{ height: 16 }} />

      {/* ── Mute ── */}
      <Btn size={44} label="Mute" onPress={() => fire("mute")}>
        <VolumeX size={17} color="#6B6B6E" strokeWidth={2.2} />
      </Btn>

      <div style={{ height: 16 }} />

      {/* ── Volume Rocker ── */}
      <div
        className="relative flex flex-col items-center overflow-hidden"
        style={{
          width: 46,
          height: 90,
          borderRadius: 23,
          background:
            "linear-gradient(180deg, #E2E2E5 0%, #D4D4D7 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.55), 0 2px 5px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)",
        }}
      >
        <button
          aria-label="Volume Up"
          className="flex-1 w-full flex items-center justify-center"
          style={{
            background:
              volPart === "up" ? "rgba(0,0,0,0.06)" : "transparent",
            transition: "background 0.08s",
          }}
          onPointerDown={() => setVolPart("up")}
          onPointerUp={() => {
            setVolPart(null);
            fire("volume_up");
          }}
          onPointerLeave={() => setVolPart(null)}
        >
          <Plus size={16} color="#6B6B6E" strokeWidth={2.5} />
        </button>

        <div
          className="w-full pointer-events-none"
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent 15%, rgba(0,0,0,0.08) 50%, transparent 85%)",
          }}
        />

        <button
          aria-label="Volume Down"
          className="flex-1 w-full flex items-center justify-center"
          style={{
            background:
              volPart === "down" ? "rgba(0,0,0,0.06)" : "transparent",
            transition: "background 0.08s",
          }}
          onPointerDown={() => setVolPart("down")}
          onPointerUp={() => {
            setVolPart(null);
            fire("volume_down");
          }}
          onPointerLeave={() => setVolPart(null)}
        >
          <Minus size={16} color="#6B6B6E" strokeWidth={2.5} />
        </button>
      </div>

      <div style={{ height: 14 }} />

      {/* ── Power ── */}
      <Btn size={34} label="Power" onPress={() => fire("power")}>
        <Power size={14} color="#6B6B6E" strokeWidth={2.5} />
      </Btn>
    </div>
  );
}
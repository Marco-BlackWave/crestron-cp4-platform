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

function getDirection(dx: number, dy: number, deadzone = 18): Direction {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < deadzone) return null;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle >= -45 && angle < 45) return "right";
  if (angle >= 45 && angle < 135) return "down";
  if (angle >= -135 && angle < -45) return "up";
  return "left";
}

/* ── Sub-components ── */

/** Small circular button with embossed look */
function RemoteButton({
  children,
  size = 42,
  label,
  onPress,
  className = "",
}: {
  children: React.ReactNode;
  size?: number;
  label?: string;
  onPress?: () => void;
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      aria-label={label}
      className={`relative flex items-center justify-center rounded-full transition-all duration-100 select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: pressed
          ? "linear-gradient(180deg, #A0A0A5 0%, #B8B8BD 100%)"
          : "linear-gradient(180deg, #C0C0C5 0%, #A8A8AD 100%)",
        boxShadow: pressed
          ? "inset 0 2px 4px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(0,0,0,0.08)"
          : "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 4px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)",
        transform: pressed ? "scale(0.93)" : "scale(1)",
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => {
        setPressed(false);
        onPress?.();
      }}
      onPointerLeave={() => setPressed(false)}
    >
      {children}
    </button>
  );
}

/* ── Play/Pause icon (combined SF Symbols style) ── */
function PlayPauseIcon({ size = 18, color = "#3A3A3C" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Play triangle */}
      <path
        d="M5 4.5v15l9.5-7.5L5 4.5z"
        fill={color}
      />
      {/* Pause bars */}
      <rect x="16" y="5" width="2.5" height="14" rx="0.8" fill={color} />
      <rect x="20.5" y="5" width="2.5" height="14" rx="0.8" fill={color} />
    </svg>
  );
}

/* ── Main Component ── */
export function AppleTVRemote({
  onCommand,
  className = "",
}: {
  /** Callback fired on every button press / swipe with command name */
  onCommand?: (command: string) => void;
  className?: string;
}) {
  /* Clickpad state */
  const padRef = useRef<HTMLDivElement>(null);
  const [padDir, setPadDir] = useState<Direction>(null);
  const [padPressed, setPadPressed] = useState(false);
  const [centerPressed, setCenterPressed] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const fire = useCallback(
    (cmd: string) => onCommand?.(cmd),
    [onCommand]
  );

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

  /* Circle boundary check */
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

  /* Clickpad pointer handlers — true swipe tracking */
  const handlePadPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isInsideCircle(e.clientX, e.clientY)) return;
      e.preventDefault();
      padRef.current?.setPointerCapture(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY };
      setPadPressed(true);
      setPadDir(null);
    },
    [isInsideCircle]
  );

  const handlePadPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return;
      e.preventDefault();
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      setPadDir(getDirection(dx, dy, 12));
    },
    []
  );

  const handlePadPointerUp = useCallback(() => {
    if (!startRef.current) return;
    if (padDir) fire(`swipe_${padDir}`);
    else fire("select");
    startRef.current = null;
    setPadPressed(false);
    setPadDir(null);
  }, [padDir, fire]);

  const handlePadPointerLeave = useCallback(() => {
    startRef.current = null;
    setPadPressed(false);
    setPadDir(null);
  }, []);

  /* Direction highlight gradient */
  const dirGradient = (() => {
    if (!padDir) return "none";
    const map: Record<string, string> = {
      up: "radial-gradient(ellipse 80% 50% at 50% 15%, rgba(0,0,0,0.10) 0%, transparent 70%)",
      down: "radial-gradient(ellipse 80% 50% at 50% 85%, rgba(0,0,0,0.10) 0%, transparent 70%)",
      left: "radial-gradient(ellipse 50% 80% at 15% 50%, rgba(0,0,0,0.10) 0%, transparent 70%)",
      right: "radial-gradient(ellipse 50% 80% at 85% 50%, rgba(0,0,0,0.10) 0%, transparent 70%)",
    };
    return map[padDir] ?? "none";
  })();

  /* Volume rocker */
  const [volPart, setVolPart] = useState<"up" | "down" | null>(null);

  return (
    <div
      className={`flex flex-col items-center select-none ${className}`}
      style={{
        width: 200,
        minHeight: 560,
        padding: "20px 24px",
        borderRadius: 40,
        background: "linear-gradient(175deg, #ECECF0 0%, #D6D6DA 40%, #C7C7CC 100%)",
        boxShadow:
          "0 24px 48px rgba(0,0,0,0.30), 0 8px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.50), inset 0 -1px 0 rgba(0,0,0,0.06)",
      }}
    >
      {/* ── Siri / Mic button (right-aligned) ── */}
      <div className="w-full flex justify-end" style={{ marginBottom: 8 }}>
        <RemoteButton size={28} label="Siri" onPress={() => fire("siri")}>
          <Mic size={13} color="#3A3A3C" strokeWidth={2.2} />
        </RemoteButton>
      </div>

      {/* ── Click Pad / Trackpad ── */}
      <div
        ref={padRef}
        className="relative flex items-center justify-center cursor-pointer"
        style={{
          width: 152,
          height: 152,
          borderRadius: "50%",
          background: padPressed
            ? "linear-gradient(180deg, #C0C0C5 0%, #CACACF 100%)"
            : "linear-gradient(180deg, #D4D4D9 0%, #C5C5CA 100%)",
          boxShadow:
            "inset 0 2px 6px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.10)",
          transition: "background 0.1s",
          touchAction: "none",
        }}
        onPointerDown={handlePadPointerDown}
        onPointerMove={handlePadPointerMove}
        onPointerUp={handlePadPointerUp}
        onPointerLeave={handlePadPointerLeave}
      >
        {/* Outer click ring */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: "2.5px solid rgba(0,0,0,0.06)",
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.25), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
        />

        {/* Inner touch surface */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: 14,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.03) 100%)",
            border: "1px solid rgba(0,0,0,0.04)",
          }}
        />

        {/* Direction highlight */}
        <div
          className="absolute inset-[14px] rounded-full pointer-events-none transition-opacity duration-100"
          style={{
            backgroundImage: dirGradient,
            opacity: padDir ? 1 : 0,
          }}
        />

        {/* Center dot (Select/OK) */}
        <button
          aria-label="Select"
          className="relative z-10 rounded-full transition-all duration-100"
          style={{
            width: 10,
            height: 10,
            background: centerPressed
              ? "rgba(0,0,0,0.25)"
              : "rgba(0,0,0,0.12)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
            transform: centerPressed ? "scale(0.85)" : "scale(1)",
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

      {/* ── Spacer ── */}
      <div style={{ height: 20 }} />

      {/* ── Back + TV/Home row ── */}
      <div className="flex items-center justify-center" style={{ gap: 32 }}>
        <RemoteButton size={42} label="Back" onPress={() => fire("back")}>
          <ChevronLeft size={18} color="#3A3A3C" strokeWidth={2.5} />
        </RemoteButton>
        <RemoteButton size={42} label="TV / Home" onPress={() => fire("tv_home")}>
          <Tv size={16} color="#3A3A3C" strokeWidth={2.2} />
        </RemoteButton>
      </div>

      {/* ── Play / Pause ── */}
      <div style={{ height: 16 }} />
      <RemoteButton size={42} label="Play / Pause" onPress={() => fire("play_pause")}>
        <PlayPauseIcon size={17} />
      </RemoteButton>

      {/* ── Mute ── */}
      <div style={{ height: 16 }} />
      <RemoteButton size={42} label="Mute" onPress={() => fire("mute")}>
        <VolumeX size={17} color="#3A3A3C" strokeWidth={2.2} />
      </RemoteButton>

      {/* ── Volume Rocker ── */}
      <div style={{ height: 16 }} />
      <div
        className="relative flex flex-col items-center overflow-hidden"
        style={{
          width: 44,
          height: 88,
          borderRadius: 22,
          background: "linear-gradient(180deg, #C2C2C7 0%, #ABABAF 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.40), 0 2px 5px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        {/* Volume Up */}
        <button
          aria-label="Volume Up"
          className="flex-1 w-full flex items-center justify-center transition-colors duration-75"
          style={{
            background:
              volPart === "up"
                ? "rgba(0,0,0,0.08)"
                : "transparent",
          }}
          onPointerDown={() => setVolPart("up")}
          onPointerUp={() => {
            setVolPart(null);
            fire("volume_up");
          }}
          onPointerLeave={() => setVolPart(null)}
        >
          <Plus size={16} color="#3A3A3C" strokeWidth={2.5} />
        </button>

        {/* Divider */}
        <div
          className="w-full pointer-events-none"
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent 15%, rgba(0,0,0,0.12) 50%, transparent 85%)",
          }}
        />

        {/* Volume Down */}
        <button
          aria-label="Volume Down"
          className="flex-1 w-full flex items-center justify-center transition-colors duration-75"
          style={{
            background:
              volPart === "down"
                ? "rgba(0,0,0,0.08)"
                : "transparent",
          }}
          onPointerDown={() => setVolPart("down")}
          onPointerUp={() => {
            setVolPart(null);
            fire("volume_down");
          }}
          onPointerLeave={() => setVolPart(null)}
        >
          <Minus size={16} color="#3A3A3C" strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Power ── */}
      <div style={{ height: 16 }} />
      <RemoteButton size={36} label="Power" onPress={() => fire("power")}>
        <Power size={15} color="#3A3A3C" strokeWidth={2.5} />
      </RemoteButton>
    </div>
  );
}
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Mic, Tv, Plus, Minus } from "lucide-react";

/* ── Helpers ── */
type Direction = "up" | "down" | "left" | "right" | null;

function getSwipeDir(dx: number, dy: number, threshold = 20): Direction {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < threshold) return null;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle >= -45 && angle < 45) return "right";
  if (angle >= 45 && angle < 135) return "down";
  if (angle >= -135 && angle < -45) return "up";
  return "left";
}

/* ── Circular button (black variant) ── */
function BBtn({
  children,
  size = 42,
  label,
  onPress,
  ring = false,
}: {
  children: React.ReactNode;
  size?: number;
  label?: string;
  onPress?: () => void;
  ring?: boolean;
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
          ? "linear-gradient(180deg, #1A1A1C 0%, #252527 100%)"
          : "linear-gradient(180deg, #2A2A2D 0%, #1F1F22 100%)",
        boxShadow: p
          ? "inset 0 2px 4px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)"
          : `inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.06)${
              ring ? ", inset 0 0 0 1.5px rgba(255,255,255,0.15)" : ""
            }`,
        transform: p ? "scale(0.92)" : "scale(1)",
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

/* ── Play/Pause icon (white) ── */
function PlayPauseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 4.5v15l9.5-7.5L5 4.5z" fill="#E0E0E0" />
      <rect x="16" y="5" width="2.5" height="14" rx="0.8" fill="#E0E0E0" />
      <rect x="20.5" y="5" width="2.5" height="14" rx="0.8" fill="#E0E0E0" />
    </svg>
  );
}

/* ── Main Component ── */
export function AppleTVRemoteBlack({
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

  /* ── Swipe-capable rectangular glass touchpad ── */
  const padRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [padActive, setPadActive] = useState(false);
  const [swipeDir, setSwipeDir] = useState<Direction>(null);
  /* Track touch position for ripple */
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(
    null
  );

  /* Block native touch-scroll on the rectangular glass touchpad */
  useEffect(() => {
    const el = padRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  const isInsidePad = useCallback(
    (clientX: number, clientY: number) => {
      if (!padRef.current) return false;
      const rect = padRef.current.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    },
    []
  );

  const onPadDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isInsidePad(e.clientX, e.clientY)) return;
      e.preventDefault();
      padRef.current?.setPointerCapture(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY };
      setPadActive(true);
      setSwipeDir(null);

      const rect = padRef.current!.getBoundingClientRect();
      setTouchPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [isInsidePad]
  );

  const onPadMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return;
      e.preventDefault();
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      setSwipeDir(getSwipeDir(dx, dy, 14));

      if (padRef.current) {
        const rect = padRef.current.getBoundingClientRect();
        setTouchPos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    },
    []
  );

  const onPadUp = useCallback(() => {
    if (!startRef.current) return;
    if (swipeDir) fire(`swipe_${swipeDir}`);
    else fire("select");
    startRef.current = null;
    setPadActive(false);
    setSwipeDir(null);
    setTouchPos(null);
  }, [swipeDir, fire]);

  const onPadLeave = useCallback(() => {
    startRef.current = null;
    setPadActive(false);
    setSwipeDir(null);
    setTouchPos(null);
  }, []);

  /* Direction highlight */
  const dirGrad = (() => {
    if (!swipeDir) return "none";
    const m: Record<string, string> = {
      up: "linear-gradient(to top, transparent 30%, rgba(255,255,255,0.04) 100%)",
      down: "linear-gradient(to bottom, transparent 30%, rgba(255,255,255,0.04) 100%)",
      left: "linear-gradient(to left, transparent 30%, rgba(255,255,255,0.04) 100%)",
      right: "linear-gradient(to right, transparent 30%, rgba(255,255,255,0.04) 100%)",
    };
    return m[swipeDir] ?? "none";
  })();

  /* Volume rocker */
  const [volPart, setVolPart] = useState<"up" | "down" | null>(null);

  const BODY_W = 174;

  return (
    <div
      className={`flex flex-col items-center select-none ${className}`}
      style={{
        width: BODY_W,
        minHeight: 520,
        borderRadius: 36,
        overflow: "hidden",
        background:
          "linear-gradient(178deg, #1C1C1E 0%, #111113 50%, #0A0A0C 100%)",
        boxShadow:
          "0 24px 48px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3)",
      }}
    >
      {/* ═══ GLASS TOUCHPAD ═══ */}
      <div
        ref={padRef}
        className="relative w-full cursor-pointer"
        style={{
          height: 210,
          background: padActive
            ? "linear-gradient(175deg, #1E1E20 0%, #141416 60%, #0E0E10 100%)"
            : "linear-gradient(175deg, #232325 0%, #18181A 60%, #101012 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          touchAction: "none",
          transition: "background 0.12s",
        }}
        onPointerDown={onPadDown}
        onPointerMove={onPadMove}
        onPointerUp={onPadUp}
        onPointerLeave={onPadLeave}
      >
        {/* Glass reflections */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)",
          }}
        />

        {/* Touch ripple */}
        {padActive && touchPos && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              left: `${touchPos.x}%`,
              top: `${touchPos.y}%`,
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
            }}
          />
        )}

        {/* Direction highlight */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: dirGrad,
            opacity: swipeDir ? 1 : 0,
            transition: "opacity 0.1s",
          }}
        />

        {/* Infrared window (tiny dot at top-center) */}
        <div
          className="absolute"
          style={{
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#0A0A0C",
            boxShadow: "inset 0 0.5px 1px rgba(255,255,255,0.06)",
          }}
        />
      </div>

      {/* ═══ BUTTON GRID ═══ */}
      <div
        className="flex flex-col items-center flex-1 w-full"
        style={{ padding: "20px 22px 18px" }}
      >
        {/* Row 1: MENU + TV */}
        <div className="flex items-center justify-center w-full" style={{ gap: 30 }}>
          <BBtn size={46} label="Menu" ring onPress={() => fire("menu")}>
            <span
              style={{
                color: "#D0D0D3",
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              MENU
            </span>
          </BBtn>
          <BBtn size={46} label="TV / Home" onPress={() => fire("tv_home")}>
            <Tv size={16} color="#D0D0D3" strokeWidth={2} />
          </BBtn>
        </div>

        <div style={{ height: 18 }} />

        {/* Row 2: Mic + Volume Up */}
        <div className="flex items-center justify-center w-full" style={{ gap: 30 }}>
          <BBtn size={46} label="Siri" onPress={() => fire("siri")}>
            <Mic size={16} color="#D0D0D3" strokeWidth={2} />
          </BBtn>

          {/* Volume Up — pill top half */}
          <div
            className="relative flex flex-col items-center overflow-hidden"
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              background:
                "linear-gradient(180deg, #2A2A2D 0%, #1F1F22 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.06)",
            }}
          >
            <button
              aria-label="Volume Up"
              className="flex-1 w-full flex items-center justify-center select-none"
              style={{
                background:
                  volPart === "up"
                    ? "rgba(255,255,255,0.06)"
                    : "transparent",
                transition: "background 0.08s",
              }}
              onPointerDown={() => setVolPart("up")}
              onPointerUp={() => {
                setVolPart(null);
                fire("volume_up");
              }}
              onPointerLeave={() => setVolPart(null)}
            >
              <Plus size={15} color="#D0D0D3" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div style={{ height: 18 }} />

        {/* Row 3: Play/Pause + Volume Down */}
        <div className="flex items-center justify-center w-full" style={{ gap: 30 }}>
          <BBtn size={46} label="Play / Pause" onPress={() => fire("play_pause")}>
            <PlayPauseIcon />
          </BBtn>

          <div
            className="relative flex flex-col items-center overflow-hidden"
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              background:
                "linear-gradient(180deg, #2A2A2D 0%, #1F1F22 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.06)",
            }}
          >
            <button
              aria-label="Volume Down"
              className="flex-1 w-full flex items-center justify-center select-none"
              style={{
                background:
                  volPart === "down"
                    ? "rgba(255,255,255,0.06)"
                    : "transparent",
                transition: "background 0.08s",
              }}
              onPointerDown={() => setVolPart("down")}
              onPointerUp={() => {
                setVolPart(null);
                fire("volume_down");
              }}
              onPointerLeave={() => setVolPart(null)}
            >
              <Minus size={15} color="#D0D0D3" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
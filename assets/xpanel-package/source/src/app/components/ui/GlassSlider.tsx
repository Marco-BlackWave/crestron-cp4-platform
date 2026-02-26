import React, { useRef, useCallback, useState } from "react";

/**
 * Custom pointer-based slider that lives inside DnD cards
 * without conflicting with the HTML5 drag backend.
 *
 * Uses `data-no-drag` + pointer capture so card-level drag
 * never fires while sliding.
 */

interface GlassSliderProps {
  /** 0–100 */
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  /** Track filled colour (CSS value) */
  fillColor?: string;
  /** Thumb colour (CSS value). Defaults to white */
  thumbColor?: string;
  /** Optional glow around the thumb (CSS color) */
  thumbGlow?: string;
  /** Track height px — default 4 */
  trackH?: number;
  /** Thumb diameter px — default 14 */
  thumbSize?: number;
  /** Show a white border around the thumb (default true) */
  thumbBorder?: boolean;
  /** Custom track background (gradient string) — overrides fillColor */
  trackBg?: string;
  className?: string;
}

export function GlassSlider({
  value,
  onChange,
  disabled = false,
  fillColor = "rgba(251,191,36,0.8)",
  thumbColor = "#fff",
  thumbGlow,
  trackH = 4,
  thumbSize = 14,
  thumbBorder = true,
  trackBg,
  className = "",
}: GlassSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const pctFromPointer = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      return Math.max(0, Math.min(100, (x / rect.width) * 100));
    },
    [value]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      onChange(Math.round(pctFromPointer(e.clientX)));
    },
    [disabled, onChange, pctFromPointer]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();
      onChange(Math.round(pctFromPointer(e.clientX)));
    },
    [dragging, onChange, pctFromPointer]
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const half = thumbSize / 2;

  const bg =
    trackBg ??
    `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${value}%, rgba(255,255,255,0.12) ${value}%, rgba(255,255,255,0.12) 100%)`;

  return (
    <div
      ref={trackRef}
      data-no-drag
      className={`relative select-none ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"} ${className}`}
      style={{
        height: Math.max(trackH, thumbSize),
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Track */}
      <div
        className="absolute left-0 right-0 rounded-full"
        style={{
          top: (Math.max(trackH, thumbSize) - trackH) / 2,
          height: trackH,
          background: bg,
          transition: dragging ? "none" : "background 0.15s",
        }}
      />

      {/* Thumb */}
      <div
        className="absolute rounded-full"
        style={{
          width: thumbSize,
          height: thumbSize,
          top: (Math.max(trackH, thumbSize) - thumbSize) / 2,
          left: `calc(${value}% - ${half}px)`,
          backgroundColor: thumbColor,
          boxShadow: thumbGlow
            ? `0 0 10px ${thumbGlow}, 0 1px 4px rgba(0,0,0,0.4)`
            : thumbBorder
              ? "0 1px 4px rgba(0,0,0,0.4)"
              : "none",
          border: thumbBorder ? "2px solid rgba(255,255,255,0.9)" : "none",
          transition: dragging ? "none" : "left 0.1s ease-out",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
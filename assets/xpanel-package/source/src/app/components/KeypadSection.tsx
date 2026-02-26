import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Fingerprint,
  Delete,
  Lock,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
} from "lucide-react";

/* ─── Glass Card ─── */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.07] shadow-lg shadow-black/10 ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Constants ─── */
const CORRECT_PIN = "0000";
const MAX_DIGITS = 4;

interface LogEntry {
  id: number;
  action: string;
  time: string;
  success: boolean;
  method: string;
}

/* ─── Keypad Section ─── */
export function KeypadSection() {
  const [pin, setPin] = useState("");
  const [armed, setArmed] = useState(true);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "processing">("idle");
  const [shake, setShake] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [rippleKey, setRippleKey] = useState<string | null>(null);
  const [pulseRing, setPulseRing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [log, setLog] = useState<LogEntry[]>([
    { id: 1, action: "System Armed", time: "8:00 AM", success: true, method: "Keypad" },
    { id: 2, action: "Access Granted", time: "7:45 AM", success: true, method: "Fingerprint" },
    { id: 3, action: "Failed Attempt", time: "6:30 AM", success: false, method: "Keypad" },
    { id: 4, action: "System Disarmed", time: "6:00 AM", success: true, method: "PIN Code" },
    { id: 5, action: "Night Mode Armed", time: "11:30 PM", success: true, method: "Auto" },
  ]);
  const logIdRef = useRef(6);

  const addLog = useCallback((action: string, success: boolean, method: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLog((prev) => [
      { id: logIdRef.current++, action, time: timeStr, success, method },
      ...prev.slice(0, 9),
    ]);
  }, []);

  /* ── Panic hold-to-activate (3s) ── */
  const [panicHolding, setPanicHolding] = useState(false);
  const [panicActive, setPanicActive] = useState(false);
  const panicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panicStart = useCallback(() => {
    if (panicActive) return;
    setPanicHolding(true);
    panicTimerRef.current = setTimeout(() => {
      setPanicHolding(false);
      setPanicActive(true);
      addLog("Panic Alert", false, "Manual");
    }, 3000);
  }, [panicActive, addLog]);

  const panicCancel = useCallback(() => {
    if (panicTimerRef.current) {
      clearTimeout(panicTimerRef.current);
      panicTimerRef.current = null;
    }
    setPanicHolding(false);
  }, []);

  const panicSilence = useCallback(() => {
    setPanicActive(false);
    addLog("Panic Acknowledged", true, "Manual");
  }, [addLog]);

  useEffect(() => {
    return () => {
      if (panicTimerRef.current) clearTimeout(panicTimerRef.current);
    };
  }, []);

  const handleSubmit = useCallback(
    (code: string) => {
      setStatus("processing");
      setStatusMessage("Verifying...");

      setTimeout(() => {
        if (code === CORRECT_PIN) {
          setStatus("success");
          setPulseRing(true);
          const newArmed = !armed;
          setArmed(newArmed);
          setStatusMessage(newArmed ? "SYSTEM ARMED" : "SYSTEM DISARMED");
          addLog(newArmed ? "System Armed" : "System Disarmed", true, "PIN Code");
          setTimeout(() => {
            setPin("");
            setStatus("idle");
            setPulseRing(false);
            setStatusMessage("");
          }, 2000);
        } else {
          setStatus("error");
          setShake(true);
          setStatusMessage("INVALID CODE");
          addLog("Failed Attempt", false, "Keypad");
          setTimeout(() => {
            setShake(false);
            setPin("");
            setStatus("idle");
            setStatusMessage("");
          }, 1200);
        }
      }, 600);
    },
    [armed, addLog]
  );

  const handleKeyPress = useCallback(
    (key: string) => {
      if (status === "processing" || status === "success") return;

      setPressedKey(key);
      setRippleKey(key);
      setTimeout(() => setPressedKey(null), 150);
      setTimeout(() => setRippleKey(null), 500);

      if (key === "delete") {
        setPin((prev) => prev.slice(0, -1));
        if (status === "error") setStatus("idle");
        return;
      }

      if (key === "bio") {
        setStatus("processing");
        setStatusMessage("Scanning...");
        setTimeout(() => {
          setStatus("success");
          setPulseRing(true);
          const newArmed = !armed;
          setArmed(newArmed);
          setStatusMessage(newArmed ? "SYSTEM ARMED" : "SYSTEM DISARMED");
          addLog(newArmed ? "System Armed" : "System Disarmed", true, "Fingerprint");
          setTimeout(() => {
            setStatus("idle");
            setPulseRing(false);
            setStatusMessage("");
          }, 2000);
        }, 1000);
        return;
      }

      const newPin = pin + key;
      if (newPin.length <= MAX_DIGITS) {
        setPin(newPin);
        if (newPin.length === MAX_DIGITS) {
          handleSubmit(newPin);
        }
      }
    },
    [pin, status, armed, handleSubmit, addLog]
  );

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleKeyPress(e.key);
      else if (e.key === "Backspace") handleKeyPress("delete");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKeyPress]);

  const statusColor =
    status === "success"
      ? armed
        ? "text-emerald-400"
        : "text-amber-400"
      : status === "error"
      ? "text-red-400"
      : status === "processing"
      ? "text-blue-400"
      : armed
      ? "text-emerald-400"
      : "text-amber-400";

  // ringColor removed — glow colors are now computed inline in the JSX

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "delete"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ── Main Keypad ── */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <GlassCard className="p-8 w-full max-w-md">
          {/* Animated Shield Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              {/* Ambient glow behind shield */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  filter: `blur(28px)`,
                  opacity: pulseRing ? 0.9 : 0.45,
                  transition: "opacity 0.7s ease",
                }}
              >
                <div
                  className="w-20 h-20 rounded-full"
                  style={{
                    backgroundColor:
                      status === "error"
                        ? "rgba(239,68,68,0.6)"
                        : status === "success"
                        ? armed
                          ? "rgba(52,211,153,0.6)"
                          : "rgba(251,191,36,0.6)"
                        : armed
                        ? "rgba(52,211,153,0.35)"
                        : "rgba(251,191,36,0.35)",
                  }}
                />
              </div>
              {/* Shield icon — standalone, no container */}
              <div className="relative z-10 flex items-center justify-center w-[120px] h-[120px]">
                {status === "error" ? (
                  <ShieldOff
                    className="w-16 h-16 text-red-400 drop-shadow-[0_0_18px_rgba(239,68,68,0.5)] transition-all duration-500"
                    strokeWidth={1.4}
                  />
                ) : status === "success" ? (
                  armed ? (
                    <ShieldCheck
                      className="w-16 h-16 text-emerald-400 drop-shadow-[0_0_18px_rgba(52,211,153,0.5)] transition-all duration-500"
                      strokeWidth={1.4}
                    />
                  ) : (
                    <ShieldOff
                      className="w-16 h-16 text-amber-400 drop-shadow-[0_0_18px_rgba(251,191,36,0.5)] transition-all duration-500"
                      strokeWidth={1.4}
                    />
                  )
                ) : armed ? (
                  <ShieldCheck
                    className="w-16 h-16 text-emerald-400 drop-shadow-[0_0_18px_rgba(52,211,153,0.4)] transition-all duration-500"
                    strokeWidth={1.4}
                  />
                ) : (
                  <ShieldAlert
                    className="w-16 h-16 text-amber-400 drop-shadow-[0_0_18px_rgba(251,191,36,0.4)] transition-all duration-500"
                    strokeWidth={1.4}
                  />
                )}
                {/* PIN progress ring — subtle, around the icon */}
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 120 120"
                  className="absolute inset-0 z-0"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="56"
                    fill="none"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="56"
                    fill="none"
                    stroke={
                      status === "error"
                        ? "rgba(239,68,68,0.5)"
                        : status === "success"
                        ? armed
                          ? "rgba(52,211,153,0.5)"
                          : "rgba(251,191,36,0.5)"
                        : "rgba(59,130,246,0.4)"
                    }
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={
                      status === "processing"
                        ? 2 * Math.PI * 56 * 0.25
                        : status === "success"
                        ? 0
                        : 2 * Math.PI * 56 * (1 - pin.length / MAX_DIGITS)
                    }
                    transform="rotate(-90 60 60)"
                    className="transition-all duration-500"
                    style={
                      status === "processing"
                        ? { animation: "spin 1.2s linear infinite", transformOrigin: "60px 60px" }
                        : {}
                    }
                  />
                </svg>
              </div>
            </div>

            {/* Status text */}
            <div className="text-center">
              <p className={`text-lg tracking-wide transition-all duration-300 ${statusColor}`}>
                {statusMessage ||
                  (armed ? "SYSTEM ARMED" : "SYSTEM DISARMED")}
              </p>
              <p className="text-white/25 text-xs mt-1">
                {armed ? "Enter PIN to disarm" : "Enter PIN to arm"}
              </p>
            </div>
          </div>

          {/* PIN Display */}
          <div
            className={`flex justify-center gap-4 mb-8 ${
              shake ? "animate-[headShake_0.6s_ease-in-out]" : ""
            }`}
          >
            {Array.from({ length: MAX_DIGITS }).map((_, i) => {
              const filled = i < pin.length;
              const isLatest = i === pin.length - 1 && pin.length > 0;
              return (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    status === "error"
                      ? "bg-red-400 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                      : status === "success"
                      ? armed
                        ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                        : "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                      : filled
                      ? `bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)] ${
                          isLatest ? "scale-125" : ""
                        }`
                      : "bg-white/15 border border-white/20"
                  }`}
                />
              );
            })}
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
            {keys.map((key) => {
              const isPressed = pressedKey === key;
              const hasRipple = rippleKey === key;
              const isBio = key === "bio";
              const isDel = key === "delete";

              return (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  disabled={status === "processing" || status === "success"}
                  className={`relative overflow-hidden w-full aspect-square rounded-2xl border transition-all duration-150 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                    isPressed
                      ? "scale-90 bg-white/25 border-white/30"
                      : isBio
                      ? "bg-blue-500/15 border-blue-500/25 text-blue-400 hover:bg-blue-500/25 hover:border-blue-500/40"
                      : isDel
                      ? "bg-white/[0.05] border-white/10 text-white/40 hover:bg-red-500/15 hover:border-red-500/25 hover:text-red-400"
                      : "bg-white/[0.08] border-white/10 text-white hover:bg-white/15 hover:border-white/20"
                  }`}
                >
                  {/* Ripple effect */}
                  {hasRipple && (
                    <div
                      className="absolute inset-0 rounded-2xl animate-[ping_0.5s_ease-out]"
                      style={{
                        backgroundColor: isBio
                          ? "rgba(59,130,246,0.15)"
                          : "rgba(255,255,255,0.1)",
                      }}
                    />
                  )}
                  {isBio ? (
                    <Fingerprint className="w-7 h-7 relative z-10" />
                  ) : isDel ? (
                    <Delete className="w-6 h-6 relative z-10" />
                  ) : (
                    <span className="text-2xl relative z-10">{key}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => handleKeyPress("bio")}
              disabled={status === "processing" || status === "success"}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/20 transition-all disabled:opacity-30"
            >
              <Fingerprint className="w-4 h-4" />
              Quick Unlock
            </button>
            <button
              className={`relative flex-1 flex flex-col items-center justify-center py-3 rounded-xl border text-sm transition-all overflow-hidden select-none ${
                panicActive
                  ? "bg-red-500/30 border-red-500/50 text-red-300 shadow-[0_0_24px_rgba(239,68,68,0.4)] cursor-pointer"
                  : panicHolding
                    ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : "bg-red-500/10 border-red-500/20 text-red-400/60 hover:bg-red-500/15 hover:text-red-400/80"
              }`}
              onClick={panicActive ? panicSilence : undefined}
              onPointerDown={(e) => {
                if (panicActive) return;
                e.preventDefault();
                panicStart();
              }}
              onPointerUp={() => { if (!panicActive) panicCancel(); }}
              onPointerLeave={() => { if (!panicActive) panicCancel(); }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Fill progress overlay */}
              {!panicActive && (
                <div
                  className="absolute inset-0 bg-red-500/25 origin-left"
                  style={{
                    transform: panicHolding ? "scaleX(1)" : "scaleX(0)",
                    transition: panicHolding ? "transform 3s linear" : "transform 0.15s ease-out",
                  }}
                />
              )}

              {/* Pulsing border ring when active */}
              {panicActive && (
                <div className="absolute inset-0 rounded-xl border-2 border-red-500/60 animate-pulse pointer-events-none" />
              )}

              <div className="flex items-center gap-2 relative z-10">
                <AlertTriangle className={`w-4 h-4 ${panicActive ? "animate-pulse" : ""}`} />
                <span>
                  {panicActive
                    ? "TAP TO SILENCE"
                    : panicHolding
                      ? "Holding..."
                      : "Panic"}
                </span>
              </div>

              {/* Hint text */}
              {!panicActive && !panicHolding && (
                <span className="text-[9px] text-red-400/30 mt-0.5 relative z-10">
                  hold 3s to activate
                </span>
              )}

              {/* Active sub-label */}
              {panicActive && (
                <span className="text-[9px] text-red-300/60 mt-0.5 relative z-10 animate-pulse">
                  ALERT ACTIVE
                </span>
              )}
            </button>
          </div>
        </GlassCard>
      </div>

      {/* ── Right Panel ── */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Live Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Status",
              value: armed ? "Armed" : "Disarmed",
              icon: armed ? ShieldCheck : ShieldAlert,
              color: armed
                ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/25"
                : "text-amber-400 bg-amber-500/15 border-amber-500/25",
            },
            {
              label: "Zones",
              value: "6 Active",
              icon: Shield,
              color: "text-blue-400 bg-blue-500/15 border-blue-500/25",
            },
            {
              label: "Sensors",
              value: "38 Online",
              icon: Lock,
              color: "text-violet-400 bg-violet-500/15 border-violet-500/25",
            },
            {
              label: "Uptime",
              value: "47 days",
              icon: Clock,
              color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/25",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <GlassCard key={card.label} className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] tracking-widest uppercase">
                      {card.label}
                    </p>
                    <p className="text-white text-sm mt-0.5">{card.value}</p>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Zone Map Visual */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-white/40" />
              <h3 className="text-white/60 text-xs tracking-widest uppercase">
                Security Zones
              </h3>
            </div>
            <div
              className={`text-[10px] px-2.5 py-1 rounded-md ${
                armed
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}
            >
              {armed ? "All Armed" : "Disarmed"}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: "Perimeter", sensors: 8, icon: "ring" },
              { name: "Interior", sensors: 12, icon: "filled" },
              { name: "Garage", sensors: 4, icon: "alert" },
              { name: "Garden", sensors: 6, icon: "ring" },
              { name: "Pool Area", sensors: 3, icon: "ring" },
              { name: "Basement", sensors: 5, icon: "filled" },
            ].map((zone) => (
              <div
                key={zone.name}
                className={`relative p-4 rounded-xl border transition-all ${
                  armed
                    ? zone.icon === "alert"
                      ? "bg-amber-500/[0.06] border-amber-500/15"
                      : "bg-emerald-500/[0.04] border-emerald-500/10"
                    : "bg-white/[0.03] border-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/80 text-sm">{zone.name}</p>
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      !armed
                        ? "bg-white/20"
                        : zone.icon === "alert"
                        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse"
                        : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                    }`}
                  />
                </div>
                <p className="text-white/30 text-[11px]">
                  {zone.sensors} sensors
                </p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Activity Log */}
        <GlassCard className="p-5 flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-white/40" />
              <h3 className="text-white/60 text-xs tracking-widest uppercase">
                Activity Log
              </h3>
            </div>
            <span className="text-white/20 text-xs">{log.length} entries</span>
          </div>

          <div
            className="space-y-2 max-h-[280px] overflow-y-auto pr-1"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.06) transparent",
            }}
          >
            {log.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] transition-all hover:bg-white/[0.06]"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    entry.success
                      ? "bg-emerald-500/15 border border-emerald-500/20"
                      : "bg-red-500/15 border border-red-500/20"
                  }`}
                >
                  {entry.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-sm truncate">{entry.action}</p>
                  <p className="text-white/25 text-[10px]">via {entry.method}</p>
                </div>
                <span className="text-white/20 text-[11px] shrink-0">
                  {entry.time}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
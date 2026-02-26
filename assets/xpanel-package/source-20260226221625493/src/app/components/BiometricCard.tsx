import React from "react";
import { GlassCard } from "./GlassCard";
import { Fingerprint, Plus, Shield, Clock, Smartphone, ScanFace } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type CardSize = 1 | 2 | 3;

const AVATARS = [
  {
    id: "1",
    src: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFuJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzcxNzU5MjUzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    name: "Sarah",
    role: "Admin",
  },
  {
    id: "2",
    src: "https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MTY5NTE1MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    name: "James",
    role: "User",
  },
  {
    id: "3",
    src: "https://images.unsplash.com/photo-1618661148759-0d481c0c2116?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwaG90b3xlbnwxfHx8fDE3NzE3NTkyNTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    name: "Emily",
    role: "User",
  },
  {
    id: "4",
    src: "https://images.unsplash.com/photo-1616565441139-06d7c5c6da11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMHBvcnRyYWl0JTIwY2FzdWFsJTIwcGhvdG98ZW58MXx8fHwxNzcxNzU5MjU0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    name: "Michael",
    role: "Guest",
  },
];

const ACCESS_LOG = [
  { user: "Sarah", action: "Front door unlocked", time: "8:02 AM", type: "fingerprint" as const },
  { user: "James", action: "Garage opened", time: "7:45 AM", type: "face" as const },
  { user: "Emily", action: "Front door unlocked", time: "7:12 AM", type: "fingerprint" as const },
  { user: "Michael", action: "Side gate unlocked", time: "6:50 AM", type: "fingerprint" as const },
  { user: "System", action: "Night mode enabled", time: "11:00 PM", type: "fingerprint" as const },
  { user: "Sarah", action: "Back door unlocked", time: "10:15 PM", type: "face" as const },
  { user: "James", action: "Front door locked", time: "9:30 PM", type: "fingerprint" as const },
];

const DEVICES = [
  { name: "Front Door", type: "Fingerprint", status: "Online" },
  { name: "Garage", type: "Face ID", status: "Online" },
  { name: "Back Door", type: "Fingerprint", status: "Offline" },
];

interface BiometricCardProps {
  cardSize?: CardSize;
}

export function BiometricCard({ cardSize = 1 }: BiometricCardProps) {
  const enabled = true;

  /* ── shared header ── */
  const header = (
    <div className="flex items-center gap-2 mb-3">
      <Fingerprint className={`w-4 h-4 transition-colors ${enabled ? "text-blue-400/60" : "text-white/20"}`} />
      <h3 className="text-white/60 text-xs tracking-widest uppercase">Biometric Access</h3>
    </div>
  );

  /* ── shared avatar row ── */
  const avatarRow = (
    <div className="flex items-center mb-3">
      {AVATARS.map((av, i) => (
        <div
          key={av.id}
          className={`relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#1a1a2e] transition-opacity ${!enabled ? "opacity-30" : ""}`}
          style={{ marginLeft: i > 0 ? "-8px" : "0", zIndex: AVATARS.length - i }}
        >
          <ImageWithFallback src={av.src} alt={av.name} className="w-full h-full object-cover" />
        </div>
      ))}
      <div
        className={`relative w-10 h-10 rounded-full border border-dashed flex items-center justify-center transition-all ${
          enabled ? "border-white/30 text-white/50 hover:border-white/50 hover:text-white cursor-pointer" : "border-white/10 text-white/15 cursor-not-allowed"
        }`}
        style={{ marginLeft: "-4px", zIndex: 0 }}
      >
        <Plus className="w-3.5 h-3.5" />
      </div>
    </div>
  );

  /* ── shared status strip ── */
  const statusStrip = (
    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
      <div className="flex items-center gap-2">
        <Shield className="w-3 h-3 text-emerald-400/60" />
        <span className={`text-xs transition-colors ${enabled ? "text-white/40" : "text-white/20"}`}>
          System {enabled ? "Armed" : "Disarmed"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3 text-white/20" />
        <span className="text-white/25 text-[10px]">Last: 8:02 AM</span>
      </div>
    </div>
  );

  /* ── Size 1 (S) ── */
  if (cardSize === 1) {
    return (
      <GlassCard className="p-5 flex flex-col h-full">
        {header}
        {avatarRow}
        {/* Enrolled count */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-blue-400/40" />
            <span className="text-white/40 text-xs">4 Enrolled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ScanFace className="w-3.5 h-3.5 text-blue-400/40" />
            <span className="text-white/40 text-xs">2 Face IDs</span>
          </div>
        </div>
        {/* Recent access — compact */}
        <div className="flex-1 min-h-0 flex flex-col">
          <span className="text-white/30 text-[10px] tracking-widest uppercase block mb-2 shrink-0">Recent Access</span>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-2 overscroll-contain select-none">
            {ACCESS_LOG.slice(0, 3).map((ev, i) => {
              const EvIcon = ev.type === "fingerprint" ? Fingerprint : ScanFace;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <EvIcon className="w-3 h-3 text-blue-400/40 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white/50 text-[11px] truncate">{ev.action}</p>
                      <p className="text-white/20 text-[9px]">{ev.user}</p>
                    </div>
                  </div>
                  <span className="text-white/20 text-[10px] shrink-0 ml-2">{ev.time}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-auto">{statusStrip}</div>
      </GlassCard>
    );
  }

  /* ── Size 2 (M): + access log + devices summary ── */
  if (cardSize === 2) {
    return (
      <GlassCard className="p-5 flex flex-col h-full">
        {header}
        {avatarRow}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-blue-400/40" />
            <span className="text-white/40 text-xs">4 Enrolled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ScanFace className="w-3.5 h-3.5 text-blue-400/40" />
            <span className="text-white/40 text-xs">2 Face IDs</span>
          </div>
        </div>
        {/* Access log */}
        <div className="flex-1 min-h-0 flex flex-col">
          <span className="text-white/30 text-[10px] tracking-widest uppercase block mb-2 shrink-0">Recent Access</span>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-2.5 overscroll-contain select-none">
            {ACCESS_LOG.map((ev, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {ev.type === "fingerprint" ? (
                    <Fingerprint className="w-3 h-3 text-blue-400/40 shrink-0" />
                  ) : (
                    <ScanFace className="w-3 h-3 text-blue-400/40 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-white/50 text-xs truncate">{ev.action}</p>
                    <p className="text-white/20 text-[9px]">{ev.user}</p>
                  </div>
                </div>
                <span className="text-white/20 text-[10px] shrink-0 ml-2">{ev.time}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Devices summary */}
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-2">
            <Smartphone className="w-3 h-3 text-white/25" />
            <span className="text-white/30 text-[10px] tracking-widest uppercase">Devices</span>
          </div>
          <div className="space-y-1.5">
            {DEVICES.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="text-white/40 text-[11px]">{d.name}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${d.status === "Online" ? "bg-emerald-400" : "bg-red-400"}`} />
                  <span className="text-white/25 text-[10px]">{d.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3">{statusStrip}</div>
      </GlassCard>
    );
  }

  /* ── Size 3 (L): + access log + user list + devices ── */
  return (
    <GlassCard className="p-5 flex flex-col h-full">
      {header}
      {/* User cards instead of avatar row */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {AVATARS.map((av) => (
          <div
            key={av.id}
            className={`flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] transition-opacity ${!enabled ? "opacity-30" : ""}`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
              <ImageWithFallback src={av.src} alt={av.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-white/60 text-xs truncate">{av.name}</p>
              <p className="text-white/25 text-[9px]">{av.role}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Access log */}
      <div className="flex-1 min-h-0 flex flex-col mb-4">
        <span className="text-white/30 text-[10px] tracking-widest uppercase block mb-2 shrink-0">Recent Access</span>
        <div className="overflow-y-auto flex-1 min-h-0 space-y-2.5 overscroll-contain select-none">
          {ACCESS_LOG.map((ev, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {ev.type === "fingerprint" ? (
                  <Fingerprint className="w-3 h-3 text-blue-400/40 shrink-0" />
                ) : (
                  <ScanFace className="w-3 h-3 text-blue-400/40 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-white/50 text-xs truncate">{ev.action}</p>
                  <p className="text-white/20 text-[9px]">{ev.user}</p>
                </div>
              </div>
              <span className="text-white/20 text-[10px] shrink-0 ml-2">{ev.time}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Devices */}
      <div className="pt-3 border-t border-white/[0.06] mb-auto">
        <div className="flex items-center gap-1.5 mb-2">
          <Smartphone className="w-3 h-3 text-white/25" />
          <span className="text-white/30 text-[10px] tracking-widest uppercase">Enrolled Devices</span>
        </div>
        <div className="space-y-2">
          {DEVICES.map((d) => (
            <div key={d.name} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <div>
                <p className="text-white/50 text-xs">{d.name}</p>
                <p className="text-white/20 text-[9px]">{d.type}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${d.status === "Online" ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className="text-white/25 text-[10px]">{d.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3">{statusStrip}</div>
    </GlassCard>
  );
}
import React, { useState } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Eye,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Activity,
  User,
  LogIn,
  Fingerprint,
  Zap,
  MapPin,
  Search,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

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

/* ─── Data ─── */
const CAMERA_IMAGES = [
  "https://images.unsplash.com/photo-1668973291514-f6a88e4096cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsdXh1cnklMjBob21lJTIwZW50cmFuY2UlMjBnYXRlJTIwbmlnaHR8ZW58MXx8fHwxNzcxNzU4NjkyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1763333407379-9bd0aca01dfd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob21lJTIwc2VjdXJpdHklMjBjYW1lcmElMjBuaWdodCUyMHZpc2lvbnxlbnwxfHx8fDE3NzE3NjU5NjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1771365046561-d2425f5f3035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwYmFja3lhcmQlMjBzZWN1cml0eSUyMGNhbWVyYSUyMHZpZXclMjBuaWdodHxlbnwxfHx8fDE3NzE3NjU5NjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1675747158954-4a32e28812c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob21lJTIwZ2FyYWdlJTIwc2VjdXJpdHklMjBjYW1lcmF8ZW58MXx8fHwxNzcxNzY1OTY1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
];

const cameras = [
  { id: 1, name: "Main Gate", location: "Front Entrance", status: "online" as const, image: CAMERA_IMAGES[0] },
  { id: 2, name: "Front Porch", location: "Entrance Area", status: "online" as const, image: CAMERA_IMAGES[1] },
  { id: 3, name: "Backyard", location: "Garden Area", status: "online" as const, image: CAMERA_IMAGES[2] },
  { id: 4, name: "Garage", location: "Parking", status: "offline" as const, image: CAMERA_IMAGES[3] },
];

interface SecurityEvent {
  id: number;
  type: string;
  title: string;
  location: string;
  time: string;
  severity: "success" | "warning" | "error" | "info";
  icon: React.ElementType;
}

const events: SecurityEvent[] = [
  { id: 1, type: "motion", title: "Motion Detected", location: "Front Porch", time: "2 min ago", severity: "warning", icon: Activity },
  { id: 2, type: "access", title: "Access Granted", location: "Main Gate", time: "15 min ago", severity: "success", icon: Lock },
  { id: 3, type: "camera", title: "Camera Offline", location: "Garage Cam", time: "32 min ago", severity: "error", icon: Camera },
  { id: 4, type: "door", title: "Door Opened", location: "Back Door", time: "1h ago", severity: "info", icon: LogIn },
  { id: 5, type: "system", title: "System Armed", location: "All Zones", time: "2h ago", severity: "success", icon: ShieldCheck },
  { id: 6, type: "access", title: "Access Denied", location: "Garage", time: "3h ago", severity: "error", icon: ShieldAlert },
  { id: 7, type: "motion", title: "Motion Detected", location: "Garden", time: "3h 15m ago", severity: "warning", icon: Activity },
  { id: 8, type: "sensor", title: "Sensor Battery Low", location: "Window #3", time: "5h ago", severity: "warning", icon: Zap },
  { id: 9, type: "biometric", title: "Fingerprint Verified", location: "Front Door", time: "6h ago", severity: "success", icon: Fingerprint },
  { id: 10, type: "access", title: "Guest Access Created", location: "Main Gate", time: "8h ago", severity: "info", icon: User },
  { id: 11, type: "system", title: "Night Mode Activated", location: "All Zones", time: "12h ago", severity: "info", icon: Eye },
  { id: 12, type: "motion", title: "Motion Cleared", location: "Driveway", time: "14h ago", severity: "success", icon: CheckCircle2 },
];

const zones = [
  { id: "perimeter", name: "Perimeter", sensors: 8, status: "armed" as const },
  { id: "interior", name: "Interior", sensors: 12, status: "armed" as const },
  { id: "garage", name: "Garage", sensors: 4, status: "alert" as const },
  { id: "garden", name: "Garden", sensors: 6, status: "armed" as const },
  { id: "pool", name: "Pool Area", sensors: 3, status: "disarmed" as const },
  { id: "basement", name: "Basement", sensors: 5, status: "armed" as const },
];

const accessLog = [
  { id: 1, name: "Sarah Thompson", method: "Fingerprint", time: "8:02 AM", avatar: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", granted: true },
  { id: 2, name: "James Wilson", method: "PIN Code", time: "7:45 AM", avatar: "https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", granted: true },
  { id: 3, name: "Unknown", method: "Key Card", time: "6:30 AM", avatar: "", granted: false },
  { id: 4, name: "Emily Davis", method: "Face ID", time: "Yesterday", avatar: "https://images.unsplash.com/photo-1618661148759-0d481c0c2116?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", granted: true },
];

const severityColors = {
  success: { bg: "bg-emerald-500/15", border: "border-emerald-500/25", text: "text-emerald-400", dot: "bg-emerald-400" },
  warning: { bg: "bg-amber-500/15", border: "border-amber-500/25", text: "text-amber-400", dot: "bg-amber-400" },
  error: { bg: "bg-red-500/15", border: "border-red-500/25", text: "text-red-400", dot: "bg-red-400" },
  info: { bg: "bg-blue-500/15", border: "border-blue-500/25", text: "text-blue-400", dot: "bg-blue-400" },
};

/* ─── Security Section ─── */
export function SecuritySection() {
  const [systemArmed, setSystemArmed] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const totalSensors = zones.reduce((sum, z) => sum + z.sensors, 0);
  const alertCount = zones.filter((z) => z.status === "alert").length;
  const onlineCams = cameras.filter((c) => c.status === "online").length;

  const filteredEvents = events.filter((e) => {
    const matchesFilter = eventFilter === "all" || e.severity === eventFilter;
    const matchesSearch =
      searchQuery === "" ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* ── Status Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* System Status */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                systemArmed
                  ? "bg-emerald-500/15 border border-emerald-500/25"
                  : "bg-amber-500/15 border border-amber-500/25"
              }`}
            >
              {systemArmed ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <p className="text-white text-sm">
                {systemArmed ? "Armed" : "Disarmed"}
              </p>
              <p className="text-white/30 text-[11px]">System Status</p>
            </div>
          </div>
        </GlassCard>

        {/* Sensors */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-sm">{totalSensors} Active</p>
              <p className="text-white/30 text-[11px]">Sensors</p>
            </div>
          </div>
        </GlassCard>

        {/* Alerts */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                alertCount > 0
                  ? "bg-red-500/15 border border-red-500/25"
                  : "bg-emerald-500/15 border border-emerald-500/25"
              }`}
            >
              {alertCount > 0 ? (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <p className="text-white text-sm">
                {alertCount > 0 ? `${alertCount} Alert${alertCount > 1 ? "s" : ""}` : "All Clear"}
              </p>
              <p className="text-white/30 text-[11px]">Warnings</p>
            </div>
          </div>
        </GlassCard>

        {/* Cameras */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Camera className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-white text-sm">
                {onlineCams}/{cameras.length} Online
              </p>
              <p className="text-white/30 text-[11px]">Cameras</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Camera Grid + Zones */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Camera Grid */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-white/40" />
                <h3 className="text-white/60 text-xs tracking-widest uppercase">
                  Live Cameras
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-[11px]">REC</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {cameras.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() =>
                    setSelectedCamera(
                      selectedCamera === cam.id ? null : cam.id
                    )
                  }
                  className={`relative rounded-xl overflow-hidden group transition-all ${
                    selectedCamera === cam.id
                      ? "ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/10"
                      : ""
                  }`}
                  style={{ aspectRatio: "16/10" }}
                >
                  <ImageWithFallback
                    src={cam.image}
                    alt={cam.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  {/* Camera offline overlay */}
                  {cam.status === "offline" && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="w-6 h-6 text-white/20 mx-auto mb-1" />
                        <span className="text-white/30 text-[10px]">
                          Offline
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top left: status */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        cam.status === "online"
                          ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]"
                          : "bg-red-400"
                      }`}
                    />
                    <span className="text-white/60 text-[10px] bg-black/40 px-1.5 py-0.5 rounded">
                      {cam.status === "online" ? "LIVE" : "OFF"}
                    </span>
                  </div>

                  {/* Top right: expand */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded-md bg-black/40 border border-white/10 flex items-center justify-center">
                      <Eye className="w-3 h-3 text-white/60" />
                    </div>
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-white text-xs">{cam.name}</p>
                    <p className="text-white/35 text-[10px]">{cam.location}</p>
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Zone Status */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white/40" />
                <h3 className="text-white/60 text-xs tracking-widest uppercase">
                  Security Zones
                </h3>
              </div>
              <button
                onClick={() => setSystemArmed(!systemArmed)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                  systemArmed
                    ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25"
                    : "bg-amber-500/15 border-amber-500/25 text-amber-400 hover:bg-amber-500/25"
                }`}
              >
                {systemArmed ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Unlock className="w-3 h-3" />
                )}
                {systemArmed ? "Armed" : "Disarmed"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {zones.map((zone) => {
                const isAlert = zone.status === "alert";
                const isDisarmed = zone.status === "disarmed";
                return (
                  <div
                    key={zone.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isAlert
                        ? "bg-red-500/10 border-red-500/20"
                        : isDisarmed
                        ? "bg-white/[0.03] border-white/[0.06]"
                        : "bg-white/[0.06] border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm ${
                          isAlert
                            ? "text-red-400"
                            : isDisarmed
                            ? "text-white/40"
                            : "text-white/80"
                        }`}
                      >
                        {zone.name}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isAlert
                            ? "bg-red-400 animate-pulse"
                            : isDisarmed
                            ? "bg-white/20"
                            : "bg-emerald-400"
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/25 text-[10px]">
                        {zone.sensors} sensors
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isAlert
                            ? "bg-red-500/20 text-red-400"
                            : isDisarmed
                            ? "bg-white/[0.05] text-white/25"
                            : "bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {zone.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Access Log */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-4 h-4 text-white/40" />
              <h3 className="text-white/60 text-xs tracking-widest uppercase">
                Recent Access
              </h3>
            </div>
            <div className="space-y-2.5">
              {accessLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                >
                  {entry.avatar ? (
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                      <ImageWithFallback
                        src={entry.avatar}
                        alt={entry.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        entry.granted ? "text-white/80" : "text-red-400"
                      }`}
                    >
                      {entry.name}
                    </p>
                    <p className="text-white/30 text-[11px]">{entry.method}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        entry.granted
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {entry.granted ? "Granted" : "Denied"}
                    </span>
                    <p className="text-white/20 text-[10px] mt-1">
                      {entry.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right: Event Log */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <GlassCard className="p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white/40" />
                <h3 className="text-white/60 text-xs tracking-widest uppercase">
                  Event Log
                </h3>
              </div>
              <span className="text-white/20 text-xs">
                {filteredEvents.length} events
              </span>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs placeholder-white/25 outline-none focus:border-white/20 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {[
                { id: "all", label: "All" },
                { id: "success", label: "Success" },
                { id: "warning", label: "Warning" },
                { id: "error", label: "Error" },
                { id: "info", label: "Info" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setEventFilter(filter.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] transition-all border ${
                    eventFilter === filter.id
                      ? filter.id === "all"
                        ? "bg-white/15 border-white/20 text-white"
                        : `${
                            severityColors[
                              filter.id as keyof typeof severityColors
                            ]?.bg
                          } ${
                            severityColors[
                              filter.id as keyof typeof severityColors
                            ]?.border
                          } ${
                            severityColors[
                              filter.id as keyof typeof severityColors
                            ]?.text
                          }`
                      : "bg-white/[0.04] border-white/[0.06] text-white/30 hover:text-white/50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Timeline */}
            <div
              className="relative space-y-0 max-h-[520px] overflow-y-auto pr-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(255,255,255,0.06) transparent",
              }}
            >
              {filteredEvents.map((event, i) => {
                const colors = severityColors[event.severity];
                const Icon = event.icon;
                const isLast = i === filteredEvents.length - 1;

                return (
                  <div key={event.id} className="flex gap-3 group">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center shrink-0 w-8">
                      <div
                        className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                      </div>
                      {!isLast && (
                        <div className="w-px flex-1 bg-white/[0.08] min-h-[16px]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-white/80 text-sm truncate">
                            {event.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <MapPin className="w-3 h-3 text-white/20 shrink-0" />
                            <span className="text-white/30 text-[11px] truncate">
                              {event.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-white/20 text-[10px]">
                            {event.time}
                          </span>
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard className="p-5">
            <h3 className="text-white/60 text-xs tracking-widest uppercase mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSystemArmed(!systemArmed)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  systemArmed
                    ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
                    : "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20"
                }`}
              >
                {systemArmed ? (
                  <Lock className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Unlock className="w-5 h-5 text-amber-400" />
                )}
                <div className="text-left">
                  <p className="text-white text-xs">
                    {systemArmed ? "Disarm" : "Arm"}
                  </p>
                  <p className="text-white/25 text-[10px]">All Zones</p>
                </div>
              </button>

              <button className="flex items-center gap-3 p-3.5 rounded-xl border bg-white/[0.05] border-white/10 hover:bg-white/10 transition-all">
                <Bell className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <p className="text-white text-xs">Alert</p>
                  <p className="text-white/25 text-[10px]">Sound Alarm</p>
                </div>
              </button>

              <button className="flex items-center gap-3 p-3.5 rounded-xl border bg-white/[0.05] border-white/10 hover:bg-white/10 transition-all">
                <Eye className="w-5 h-5 text-violet-400" />
                <div className="text-left">
                  <p className="text-white text-xs">Patrol</p>
                  <p className="text-white/25 text-[10px]">Camera Sweep</p>
                </div>
              </button>

              <button className="flex items-center gap-3 p-3.5 rounded-xl border bg-white/[0.05] border-white/10 hover:bg-white/10 transition-all">
                <Shield className="w-5 h-5 text-amber-400" />
                <div className="text-left">
                  <p className="text-white text-xs">Night</p>
                  <p className="text-white/25 text-[10px]">Mode</p>
                </div>
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
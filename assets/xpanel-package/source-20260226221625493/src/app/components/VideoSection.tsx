import React, { useState } from "react";
import {
  Tv,
  Power,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  MonitorPlay,
  Signal,
  Maximize2,
  Minus,
  Plus,
  Info,
  Menu,
  ArrowLeft,
  Home,
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
const TV_IMAGE =
  "https://images.unsplash.com/photo-1665272475970-ea2ac5c28521?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBmbGF0JTIwc2NyZWVuJTIwdHYlMjBsaXZpbmclMjByb29tJTIwZGFya3xlbnwxfHx8fDE3NzE3NjU5NjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

interface Source {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  channels: { id: number; name: string; number: string; genre: string }[];
}

const sources: Source[] = [
  {
    id: "sky",
    name: "Sky",
    icon: Signal,
    color: "#0072C6",
    channels: [
      { id: 1, name: "Sky Sports Main", number: "401", genre: "Sports" },
      { id: 2, name: "Sky Cinema Premiere", number: "301", genre: "Movies" },
      { id: 3, name: "Sky News", number: "501", genre: "News" },
      { id: 4, name: "Sky Atlantic", number: "108", genre: "Entertainment" },
      { id: 5, name: "Sky Arts", number: "122", genre: "Arts" },
      { id: 6, name: "Sky Documentaries", number: "112", genre: "Docs" },
    ],
  },
  {
    id: "appletv",
    name: "Apple TV",
    icon: MonitorPlay,
    color: "#A3AAAE",
    channels: [
      { id: 1, name: "Apple TV+", number: "", genre: "Streaming" },
      { id: 2, name: "Netflix", number: "", genre: "Streaming" },
      { id: 3, name: "Disney+", number: "", genre: "Streaming" },
      { id: 4, name: "Prime Video", number: "", genre: "Streaming" },
      { id: 5, name: "HBO Max", number: "", genre: "Streaming" },
      { id: 6, name: "YouTube", number: "", genre: "Video" },
    ],
  },
  {
    id: "digitaltv",
    name: "Digital TV",
    icon: Tv,
    color: "#4CAF50",
    channels: [
      { id: 1, name: "BBC One", number: "1", genre: "General" },
      { id: 2, name: "BBC Two", number: "2", genre: "General" },
      { id: 3, name: "ITV", number: "3", genre: "Entertainment" },
      { id: 4, name: "Channel 4", number: "4", genre: "Entertainment" },
      { id: 5, name: "Channel 5", number: "5", genre: "General" },
      { id: 6, name: "BBC News", number: "231", genre: "News" },
    ],
  },
  {
    id: "sat",
    name: "Satellite",
    icon: Signal,
    color: "#FF9800",
    channels: [
      { id: 1, name: "CNN International", number: "200", genre: "News" },
      { id: 2, name: "Discovery Channel", number: "250", genre: "Docs" },
      { id: 3, name: "National Geographic", number: "260", genre: "Docs" },
      { id: 4, name: "Eurosport", number: "410", genre: "Sports" },
      { id: 5, name: "Al Jazeera", number: "235", genre: "News" },
      { id: 6, name: "TV5 Monde", number: "280", genre: "International" },
    ],
  },
];

const tvRooms = [
  { id: "living", name: "Living Room", source: "Sky Sports", on: true },
  { id: "cinema", name: "Cinema", source: "Apple TV+", on: true },
  { id: "bedroom", name: "Master Bedroom", source: "Off", on: false },
  { id: "kitchen", name: "Kitchen", source: "BBC One", on: false },
];

/* ─── Video Section ─── */
export function VideoSection() {
  const [activeSource, setActiveSource] = useState("sky");
  const [selectedChannel, setSelectedChannel] = useState(0);
  const [volume, setVolume] = useState(45);
  const [muted, setMuted] = useState(false);
  const [tvPower, setTvPower] = useState(true);
  const [showAllSources, setShowAllSources] = useState(false);

  const currentSource =
    sources.find((s) => s.id === activeSource) || sources[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ── Left: TV Preview + Channels ── */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Source Tabs */}
        <GlassCard className="p-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {sources.map((src) => {
              const Icon = src.icon;
              const isActive = activeSource === src.id;
              return (
                <button
                  key={src.id}
                  onClick={() => {
                    setActiveSource(src.id);
                    setSelectedChannel(0);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap shrink-0 border ${
                    isActive
                      ? "bg-white/15 border-white/20 text-white shadow-md"
                      : "border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{src.name}</span>
                  {isActive && (
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: src.color }}
                    />
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap shrink-0 border ${
                showAllSources
                  ? "bg-blue-500/15 border-blue-500/25 text-blue-400"
                  : "border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              <Maximize2 className="w-4 h-4" />
              <span className="text-sm">All</span>
            </button>
          </div>
        </GlassCard>

        {/* TV Preview */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="relative aspect-video bg-black/40">
            {tvPower ? (
              <>
                <ImageWithFallback
                  src={TV_IMAGE}
                  alt="TV Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                {/* Top overlay: source info */}
                <div className="absolute top-4 left-4 flex items-center gap-3">
                  <div
                    className="px-3 py-1.5 rounded-lg text-white text-xs flex items-center gap-2"
                    style={{ backgroundColor: `${currentSource.color}CC` }}
                  >
                    <currentSource.icon className="w-3.5 h-3.5" />
                    {currentSource.name}
                  </div>
                  <span className="text-white/50 text-xs px-2 py-1 rounded-md bg-black/40 border border-white/10">
                    HD 1080p
                  </span>
                </div>

                {/* Bottom overlay: channel info */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      {currentSource.channels[selectedChannel]?.number && (
                        <span className="text-white/40 text-xs mb-1 block">
                          CH{" "}
                          {currentSource.channels[selectedChannel]?.number}
                        </span>
                      )}
                      <h3 className="text-white text-xl">
                        {currentSource.channels[selectedChannel]?.name}
                      </h3>
                      <p className="text-white/40 text-sm mt-0.5">
                        {currentSource.channels[selectedChannel]?.genre} •
                        Living Room
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10">
                        {muted ? (
                          <VolumeX className="w-4 h-4 text-white/50" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-white/50" />
                        )}
                        <span className="text-white text-sm">{volume}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Tv className="w-16 h-16 text-white/10 mb-3" />
                <p className="text-white/20 text-sm">TV is Off</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Channel Grid */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/60 text-xs tracking-widest uppercase">
              {currentSource.name} Channels
            </h3>
            <span className="text-white/25 text-xs">
              {currentSource.channels.length} available
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentSource.channels.map((ch, i) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(i)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${
                  selectedChannel === i
                    ? "bg-white/15 border-white/20 shadow-md"
                    : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/15"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedChannel === i
                      ? "bg-white/20"
                      : "bg-white/[0.08]"
                  }`}
                >
                  {ch.number ? (
                    <span className="text-white/70 text-xs">{ch.number}</span>
                  ) : (
                    <MonitorPlay className="w-4 h-4 text-white/50" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <p
                    className={`text-sm truncate ${
                      selectedChannel === i ? "text-white" : "text-white/70"
                    }`}
                  >
                    {ch.name}
                  </p>
                  <p className="text-white/25 text-[11px]">{ch.genre}</p>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Right: Remote Control + TV Status ── */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        {/* Remote Control */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white/60 text-xs tracking-widest uppercase">
              Remote
            </h3>
            <button
              onClick={() => setTvPower(!tvPower)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                tvPower
                  ? "bg-red-500/15 border-red-500/25 text-red-400 hover:bg-red-500/25"
                  : "bg-emerald-500/15 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25"
              }`}
            >
              <Power className="w-5 h-5" />
            </button>
          </div>

          {/* D-Pad */}
          <div className="flex justify-center mb-6">
            <div className="relative w-44 h-44">
              {/* Up */}
              <button className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white transition-all active:scale-95">
                <ChevronUp className="w-5 h-5" />
              </button>
              {/* Down */}
              <button className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white transition-all active:scale-95">
                <ChevronDown className="w-5 h-5" />
              </button>
              {/* Left */}
              <button className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white transition-all active:scale-95">
                <ChevronLeft className="w-5 h-5" />
              </button>
              {/* Right */}
              <button className="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white transition-all active:scale-95">
                <ChevronRight className="w-5 h-5" />
              </button>
              {/* OK */}
              <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-all shadow-lg active:scale-95">
                <span className="text-sm">OK</span>
              </button>
            </div>
          </div>

          {/* Nav Buttons */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <button className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/15 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/15 transition-all">
              <Home className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/15 transition-all">
              <Menu className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/15 transition-all">
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Volume & Channel */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Volume */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-white/30 text-[10px] tracking-widest uppercase">
                Volume
              </p>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setVolume((v) => Math.min(100, v + 5))}
                  className="w-12 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <div className="w-12 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                  <span className="text-white text-sm">{volume}</span>
                </div>
                <button
                  onClick={() => setVolume((v) => Math.max(0, v - 5))}
                  className="w-12 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white transition-all active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Channel */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-white/30 text-[10px] tracking-widest uppercase">
                Channel
              </p>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() =>
                    setSelectedChannel((c) =>
                      c > 0 ? c - 1 : currentSource.channels.length - 1
                    )
                  }
                  className="w-12 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white transition-all active:scale-95"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <div className="w-12 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                  <span className="text-white text-xs">
                    {currentSource.channels[selectedChannel]?.number || "—"}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setSelectedChannel((c) =>
                      c < currentSource.channels.length - 1 ? c + 1 : 0
                    )
                  }
                  className="w-12 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 hover:text-white transition-all active:scale-95"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mute */}
          <button
            onClick={() => setMuted(!muted)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${
              muted
                ? "bg-red-500/15 border-red-500/20 text-red-400"
                : "bg-white/[0.06] border-white/10 text-white/40 hover:text-white hover:bg-white/10"
            }`}
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span className="text-xs">{muted ? "Unmute" : "Mute"}</span>
          </button>
        </GlassCard>

        {/* TV Rooms Status */}
        <GlassCard className="p-5">
          <h3 className="text-white/60 text-xs tracking-widest uppercase mb-4">
            TV Outputs
          </h3>
          <div className="space-y-2.5">
            {tvRooms.map((room) => (
              <div
                key={room.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  room.on
                    ? "bg-white/[0.08] border-white/15"
                    : "bg-white/[0.03] border-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      room.on
                        ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                        : "bg-white/20"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm ${
                        room.on ? "text-white" : "text-white/40"
                      }`}
                    >
                      {room.name}
                    </p>
                    <p className="text-white/25 text-[11px]">{room.source}</p>
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded-md text-[10px] ${
                    room.on
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/[0.05] text-white/25"
                  }`}
                >
                  {room.on ? "Live" : "Off"}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Quick Settings */}
        <GlassCard className="p-5">
          <h3 className="text-white/60 text-xs tracking-widest uppercase mb-3">
            Picture
          </h3>
          <div className="space-y-3">
            {[
              { label: "Brightness", value: 70 },
              { label: "Contrast", value: 55 },
              { label: "Color", value: 65 },
            ].map((setting) => (
              <div key={setting.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/40 text-xs">{setting.label}</span>
                  <span className="text-white/50 text-xs">
                    {setting.value}%
                  </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full">
                  <div
                    className="h-full bg-blue-400/60 rounded-full"
                    style={{ width: `${setting.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
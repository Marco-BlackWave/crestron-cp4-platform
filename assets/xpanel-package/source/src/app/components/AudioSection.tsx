import React, { useState } from "react";
import {
  Search,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Shuffle,
  Repeat,
  Volume2,
  Music,
  ListMusic,
  Clock,
  Radio,
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
const COVERS = [
  "https://images.unsplash.com/photo-1602654435744-6e9b86a3d72c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG90aWZ5JTIwcGxheWxpc3QlMjBhbGJ1bSUyMGNvdmVyJTIwbmVvbnxlbnwxfHx8fDE3NzE3NjU5NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1767479673600-0129c29ff518?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdyYWRpZW50JTIwbXVzaWMlMjBhcnR3b3JrJTIwcHVycGxlfGVufDF8fHx8MTc3MTc2NTk2Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1717769165971-c81dfab13a1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbGJ1bSUyMGNvdmVyJTIwYXJ0JTIwY29sb3JmdWwlMjBhYnN0cmFjdHxlbnwxfHx8fDE3NzE3NjU5NjN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1695238005211-cf98f378809f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwYWJzdHJhY3QlMjBtdXNpYyUyMHZpbnlsJTIwYXJ0d29ya3xlbnwxfHx8fDE3NzE3NjU5NjN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1709408832525-868cb87fd1ce?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdW5zZXQlMjBvY2VhbiUyMGFic3RyYWN0JTIwb3JhbmdlfGVufDF8fHx8MTc3MTc2NTk2M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1770320606462-923269bed845?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsdWUlMjB3YXZlJTIwbmVvbiUyMG11c2ljfGVufDF8fHx8MTc3MTc2NTk2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
];

const playlists = [
  { id: 1, name: "Chill Vibes", desc: "Relaxing ambient tunes for unwinding", tracks: 42, cover: COVERS[0] },
  { id: 2, name: "Focus Mode", desc: "Deep concentration beats", tracks: 38, cover: COVERS[1] },
  { id: 3, name: "Evening Jazz", desc: "Smooth jazz for evenings", tracks: 56, cover: COVERS[2] },
  { id: 4, name: "Workout Energy", desc: "High intensity motivation", tracks: 31, cover: COVERS[3] },
  { id: 5, name: "Acoustic Morning", desc: "Gentle acoustic melodies", tracks: 25, cover: COVERS[4] },
  { id: 6, name: "Late Night Lounge", desc: "Atmospheric night sounds", tracks: 47, cover: COVERS[5] },
  { id: 7, name: "Sunday Soul", desc: "Soulful vibes for lazy days", tracks: 33, cover: COVERS[2] },
  { id: 8, name: "Rainy Days", desc: "Cozy tracks for rain", tracks: 29, cover: COVERS[3] },
];

const tracks = [
  { id: 1, title: "Midnight Dreams", artist: "Luna Waves", duration: "3:42" },
  { id: 2, title: "Starlight Boulevard", artist: "Orbital Sky", duration: "4:15" },
  { id: 3, title: "Ocean Breeze", artist: "Coastal", duration: "3:58" },
  { id: 4, title: "Neon Lights", artist: "Synthwave Collective", duration: "5:02" },
  { id: 5, title: "Velvet Morning", artist: "Dawn Chorus", duration: "3:21" },
  { id: 6, title: "Crystal Rain", artist: "Ambient Theory", duration: "4:47" },
  { id: 7, title: "Golden Hour", artist: "Sunset Radio", duration: "3:33" },
  { id: 8, title: "Deep Blue", artist: "Aqua Dreams", duration: "4:08" },
  { id: 9, title: "Electric Pulse", artist: "Binary Code", duration: "3:55" },
  { id: 10, title: "Silent Echo", artist: "Midnight Jazz", duration: "5:14" },
  { id: 11, title: "Autumn Leaves", artist: "Amber Folk", duration: "3:19" },
  { id: 12, title: "City Lights", artist: "Urban Dreams", duration: "4:32" },
];

const zones = [
  { id: "living", name: "Living Room", active: true },
  { id: "kitchen", name: "Kitchen", active: true },
  { id: "bedroom", name: "Bedroom", active: false },
  { id: "cinema", name: "Cinema", active: false },
  { id: "outdoor", name: "Outdoor", active: true },
];

/* ─── Audio Section ─── */
export function AudioSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activePlaylist, setActivePlaylist] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(75);
  const [liked, setLiked] = useState<Set<number>>(new Set([1, 3, 7]));
  const [currentTrack, setCurrentTrack] = useState(0);
  const [progress] = useState(42);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);
  const [activeTab, setActiveTab] = useState<"playlists" | "queue">("playlists");
  const [activeZones, setActiveZones] = useState<Set<string>>(
    new Set(zones.filter((z) => z.active).map((z) => z.id))
  );

  const filteredPlaylists = playlists.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTracks = tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleLike = (id: number) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleZone = (id: string) => {
    setActiveZones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ── Left Panel: Playlist Browser ── */}
      <div className="lg:col-span-4 xl:col-span-3">
        <GlassCard className="p-5 flex flex-col h-full">
          {/* Spotify Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-white text-sm">Spotify</span>
              <span className="text-emerald-400 text-[10px] ml-2 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25">
                Connected
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search playlists & tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-white/25 transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 p-1 bg-white/[0.05] rounded-lg">
            {(["playlists", "queue"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  activeTab === tab
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {tab === "playlists" ? (
                  <ListMusic className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                {tab === "playlists" ? "Playlists" : "Queue"}
              </button>
            ))}
          </div>

          {/* Playlist List */}
          <div
            className="flex-1 overflow-y-auto space-y-1.5 min-h-0 max-h-[420px] pr-1"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.08) transparent",
            }}
          >
            {filteredPlaylists.map((pl, i) => (
              <button
                key={pl.id}
                onClick={() => setActivePlaylist(i)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                  activePlaylist === i
                    ? "bg-emerald-500/15 border border-emerald-500/20"
                    : "hover:bg-white/[0.08] border border-transparent"
                }`}
              >
                <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-md">
                  <ImageWithFallback
                    src={pl.cover}
                    alt={pl.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm truncate ${
                      activePlaylist === i ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {pl.name}
                  </p>
                  <p className="text-white/35 text-[11px] truncate">
                    {pl.tracks} tracks
                  </p>
                </div>
                {activePlaylist === i && playing && (
                  <div className="flex gap-[3px] items-end h-4 shrink-0">
                    {[1, 2, 3].map((bar) => (
                      <div
                        key={bar}
                        className="w-[3px] bg-emerald-400 rounded-full"
                        style={{
                          height: `${6 + bar * 4}px`,
                          animation: "pulse 1s ease-in-out infinite",
                          animationDelay: `${bar * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Zones */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/30 text-[10px] tracking-widest uppercase mb-2.5">
              Playing In
            </p>
            <div className="flex flex-wrap gap-1.5">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => toggleZone(zone.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] transition-all border ${
                    activeZones.has(zone.id)
                      ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
                      : "bg-white/[0.05] border-white/10 text-white/30 hover:text-white/50"
                  }`}
                >
                  {zone.name}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Right Panel: Now Playing + Tracks ── */}
      <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
        {/* Now Playing */}
        <GlassCard className="p-6 relative overflow-hidden">
          {/* Ambient glow from album art */}
          <div
            className="absolute inset-0 opacity-20 blur-3xl"
            style={{
              backgroundImage: `url(${playlists[activePlaylist]?.cover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Album Art */}
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl shrink-0 relative group">
                <ImageWithFallback
                  src={playlists[activePlaylist]?.cover}
                  alt="Now Playing"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => setPlaying(!playing)}
                    className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 transition-transform"
                  >
                    {playing ? (
                      <Pause className="w-6 h-6 text-white" />
                    ) : (
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <span className="text-emerald-400 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 inline-flex items-center gap-1">
                    <Radio className="w-3 h-3" /> Spotify Connect
                  </span>
                  <span className="text-white/20 text-[10px]">•</span>
                  <span className="text-white/30 text-[10px]">
                    {activeZones.size} zone{activeZones.size !== 1 ? "s" : ""}{" "}
                    active
                  </span>
                </div>
                <h2 className="text-white text-2xl truncate">
                  {tracks[currentTrack]?.title}
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  {tracks[currentTrack]?.artist}
                </p>
                <p className="text-white/25 text-xs mt-0.5">
                  {playlists[activePlaylist]?.name} •{" "}
                  {playlists[activePlaylist]?.desc}
                </p>

                {/* Progress Bar */}
                <div className="mt-5 w-full">
                  <div className="relative h-1.5 bg-white/10 rounded-full group cursor-pointer">
                    <div
                      className="absolute h-full bg-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      style={{ left: `calc(${progress}% - 6px)` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-white/30 text-[11px]">1:47</span>
                    <span className="text-white/30 text-[11px]">
                      {tracks[currentTrack]?.duration}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center sm:justify-start gap-5 mt-3">
                  <button
                    onClick={() => setShuffleOn(!shuffleOn)}
                    className={`transition-colors ${
                      shuffleOn
                        ? "text-emerald-400"
                        : "text-white/30 hover:text-white/70"
                    }`}
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentTrack((t) => Math.max(0, t - 1))
                    }
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPlaying(!playing)}
                    className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25 hover:scale-105"
                  >
                    {playing ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      setCurrentTrack((t) =>
                        Math.min(tracks.length - 1, t + 1)
                      )
                    }
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setRepeatOn(!repeatOn)}
                    className={`transition-colors ${
                      repeatOn
                        ? "text-emerald-400"
                        : "text-white/30 hover:text-white/70"
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>

                  {/* Volume */}
                  <div className="hidden sm:flex items-center gap-2 ml-4 border-l border-white/10 pl-4">
                    <Volume2 className="w-4 h-4 text-white/40" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-24 h-1 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgba(52,211,153,0.8) 0%, rgba(52,211,153,0.8) ${volume}%, rgba(255,255,255,0.12) ${volume}%, rgba(255,255,255,0.12) 100%)`,
                      }}
                    />
                    <span className="text-white/30 text-[11px] w-7">
                      {volume}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Track List */}
        <GlassCard className="p-5 flex-1 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-white/40" />
              <h3 className="text-white/60 text-xs tracking-widest uppercase">
                {playlists[activePlaylist]?.name}
              </h3>
            </div>
            <span className="text-white/25 text-xs">
              {filteredTracks.length} tracks
            </span>
          </div>

          {/* Track header */}
          <div className="flex items-center gap-3 px-3 py-2 text-white/20 text-[10px] tracking-widest uppercase border-b border-white/[0.06] mb-1">
            <span className="w-6 text-right">#</span>
            <span className="flex-1">Title</span>
            <span className="w-8" />
            <span className="w-12 text-right">Time</span>
          </div>

          <div
            className="space-y-0.5 max-h-[320px] overflow-y-auto pr-1"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.08) transparent",
            }}
          >
            {filteredTracks.map((track, i) => (
              <div
                key={track.id}
                onClick={() => {
                  setCurrentTrack(i);
                  setPlaying(true);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group cursor-pointer ${
                  currentTrack === i
                    ? "bg-emerald-500/10 border border-emerald-500/15"
                    : "hover:bg-white/[0.06] border border-transparent"
                }`}
              >
                <span
                  className={`w-6 text-xs text-right shrink-0 ${
                    currentTrack === i ? "text-emerald-400" : "text-white/25"
                  }`}
                >
                  {currentTrack === i && playing ? (
                    <span className="inline-flex gap-[2px] items-end justify-end w-full h-3">
                      {[1, 2, 3].map((b) => (
                        <span
                          key={b}
                          className="inline-block w-[2px] bg-emerald-400 rounded-full"
                          style={{
                            height: `${4 + b * 3}px`,
                            animation: "pulse 1s ease-in-out infinite",
                            animationDelay: `${b * 0.12}s`,
                          }}
                        />
                      ))}
                    </span>
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p
                    className={`text-sm truncate ${
                      currentTrack === i ? "text-emerald-400" : "text-white/90"
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="text-white/35 text-[11px] truncate">
                    {track.artist}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(track.id);
                  }}
                  className="p-1 shrink-0"
                >
                  <Heart
                    className={`w-3.5 h-3.5 transition-all ${
                      liked.has(track.id)
                        ? "text-emerald-400 fill-emerald-400"
                        : "text-white/15 group-hover:text-white/30 hover:text-white/60"
                    }`}
                  />
                </button>
                <span className="text-white/25 text-xs w-12 text-right shrink-0">
                  {track.duration}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
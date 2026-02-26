import React, { useState } from "react";
import { GlassCard } from "./GlassCard";
import { Play, Pause, SkipBack, SkipForward, Volume2, Radio, Shuffle, Repeat, ListMusic, Speaker } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { GlassSlider } from "./ui/GlassSlider";

type CardSize = 1 | 2 | 3;

interface MediaCardProps {
  albumImage: string;
  cardSize?: CardSize;
}

const QUEUE = [
  { title: "Midnight Sun", artist: "Ambient Dreams", dur: "4:12" },
  { title: "Cloud Atlas", artist: "Ethereal Sound", dur: "3:55" },
  { title: "Ocean Floor", artist: "Deep Blue", dur: "5:01" },
  { title: "Solar Wind", artist: "Cosmic Drift", dur: "3:28" },
  { title: "Glass Rain", artist: "Neon Pulse", dur: "4:44" },
  { title: "Velvet Haze", artist: "Slow Motion", dur: "3:17" },
  { title: "Northern Lights", artist: "Arctic Sound", dur: "6:02" },
];

const ZONES = [
  { name: "Living Room", active: true },
  { name: "Kitchen", active: true },
  { name: "Bedroom", active: false },
  { name: "Patio", active: false },
];

export function MediaCard({ albumImage, cardSize = 1 }: MediaCardProps) {
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(62);
  const [volume, setVolume] = useState(70);

  /* ── shared elements ── */
  const progressBar = (
    <div>
      <GlassSlider
        value={progress}
        onChange={setProgress}
        fillColor="rgba(52,211,153,0.7)"
        thumbColor="#fff"
        thumbGlow="rgba(52,211,153,0.4)"
        trackH={4}
        thumbSize={12}
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-white/25 text-[9px]">2:18</span>
        <span className="text-white/25 text-[9px]">3:42</span>
      </div>
    </div>
  );

  const transport = (
    <div className="flex items-center justify-center gap-4">
      <button className="text-white/30 hover:text-white/60 transition-colors">
        <Shuffle className="w-3.5 h-3.5" />
      </button>
      <button className="text-white/40 hover:text-white transition-colors">
        <SkipBack className="w-4.5 h-4.5" />
      </button>
      <button
        onClick={() => setPlaying(!playing)}
        className="w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-all"
      >
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      <button className="text-white/40 hover:text-white transition-colors">
        <SkipForward className="w-4.5 h-4.5" />
      </button>
      <button className="text-white/30 hover:text-white/60 transition-colors">
        <Repeat className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const volumeBar = (
    <div className="flex items-center gap-2.5 pt-2">
      <Volume2 className="w-3 h-3 text-white/20 shrink-0" />
      <div className="flex-1">
        <GlassSlider
          value={volume}
          onChange={setVolume}
          fillColor="rgba(255,255,255,0.18)"
          thumbColor="rgba(255,255,255,0.6)"
          trackH={2}
          thumbSize={6}
          thumbBorder={false}
        />
      </div>
      <span className="text-white/20 text-[9px] w-5 text-right">{volume}</span>
    </div>
  );

  /* ── Size 1 (S) ── */
  if (cardSize === 1) {
    return (
      <GlassCard className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2.5">
          <Radio className="w-4 h-4 text-emerald-400/60" />
          <h3 className="text-white/60 text-xs tracking-widest uppercase">Media</h3>
        </div>
        <div className="flex gap-3 mb-3">
          <div className="w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 shadow-lg shadow-black/30">
            <ImageWithFallback src={albumImage} alt="Album" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-white text-sm">Music</span>
              <span className="text-emerald-400 text-[9px] px-1.5 py-px rounded-full bg-emerald-400/15 border border-emerald-400/20">Spotify</span>
            </div>
            <p className="text-white/60 text-xs truncate">Chill Vibes Playlist</p>
            <p className="text-white/30 text-[10px] mt-0.5 truncate">Ambient Dreams · Vol. III</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Radio className="w-3 h-3 text-white/25" />
              <span className="text-white/30 text-[10px]">All Zones</span>
            </div>
          </div>
        </div>
        {/* Progress */}
        <div>
          <GlassSlider
            value={progress}
            onChange={setProgress}
            fillColor="rgba(52,211,153,0.7)"
            thumbColor="#fff"
            thumbGlow="rgba(52,211,153,0.4)"
            trackH={3}
            thumbSize={10}
          />
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-white/25 text-[9px]">2:18</span>
            <span className="text-white/25 text-[9px]">3:42</span>
          </div>
        </div>
        {/* Transport — compact */}
        <div className="flex items-center justify-center gap-3 mt-1">
          <button className="text-white/30 hover:text-white/60 transition-colors">
            <Shuffle className="w-3 h-3" />
          </button>
          <button className="text-white/40 hover:text-white transition-colors">
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-all"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button className="text-white/40 hover:text-white transition-colors">
            <SkipForward className="w-4 h-4" />
          </button>
          <button className="text-white/30 hover:text-white/60 transition-colors">
            <Repeat className="w-3 h-3" />
          </button>
        </div>
        {/* Volume — inline compact */}
        <div className="flex items-center gap-2 mt-1.5">
          <Volume2 className="w-3 h-3 text-white/20 shrink-0" />
          <div className="flex-1">
            <GlassSlider
              value={volume}
              onChange={setVolume}
              fillColor="rgba(255,255,255,0.18)"
              thumbColor="rgba(255,255,255,0.6)"
              trackH={2}
              thumbSize={6}
              thumbBorder={false}
            />
          </div>
          <span className="text-white/20 text-[9px] w-5 text-right">{volume}</span>
        </div>
        {/* Up-next queue */}
        <div className="mt-2 pt-2 border-t border-white/[0.06] flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1 shrink-0">
            <ListMusic className="w-3 h-3 text-white/25" />
            <span className="text-white/30 text-[10px] tracking-widest uppercase">Up Next</span>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-1 overscroll-contain select-none">
            {QUEUE.map((t) => (
              <div key={t.title} className="flex items-center justify-between py-0.5">
                <p className="text-white/50 text-[11px] truncate min-w-0">{t.title}</p>
                <span className="text-white/25 text-[10px] shrink-0 ml-3">{t.dur}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  /* ── Size 2 (M): larger art + queue ── */
  if (cardSize === 2) {
    return (
      <GlassCard className="p-5 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-emerald-400/60" />
          <h3 className="text-white/60 text-xs tracking-widest uppercase">Media</h3>
        </div>
        <div className="flex gap-4 mb-3">
          <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-black/40">
            <ImageWithFallback src={albumImage} alt="Album" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-sm">Music</span>
              <span className="text-emerald-400 text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-400/20">Spotify</span>
            </div>
            <p className="text-white/60 text-sm truncate">Chill Vibes Playlist</p>
            <p className="text-white/30 text-xs mt-0.5 truncate">Ambient Dreams · Vol. III</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Radio className="w-3 h-3 text-white/25" />
              <span className="text-white/30 text-[10px]">All Zones Play</span>
            </div>
          </div>
        </div>
        {progressBar}
        <div className="mt-1.5">{transport}</div>
        <div className="mt-2">{volumeBar}</div>
        {/* Up-next queue */}
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
            <ListMusic className="w-3 h-3 text-white/25" />
            <span className="text-white/30 text-[10px] tracking-widest uppercase">Up Next</span>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-1.5 overscroll-contain select-none">
            {QUEUE.map((t) => (
              <div key={t.title} className="flex items-center justify-between py-0.5">
                <div className="min-w-0">
                  <p className="text-white/50 text-xs truncate">{t.title}</p>
                  <p className="text-white/20 text-[10px] truncate">{t.artist}</p>
                </div>
                <span className="text-white/25 text-[10px] shrink-0 ml-3">{t.dur}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  /* ── Size 3 (L): full layout + queue + zone selector ── */
  return (
    <GlassCard className="p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-4 h-4 text-emerald-400/60" />
        <h3 className="text-white/60 text-xs tracking-widest uppercase">Media</h3>
      </div>
      <div className="flex gap-5 mb-4">
        <div className="w-32 h-32 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-black/40">
          <ImageWithFallback src={albumImage} alt="Album" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm">Music</span>
            <span className="text-emerald-400 text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-400/20">Spotify</span>
          </div>
          <p className="text-white/60 text-sm truncate">Chill Vibes Playlist</p>
          <p className="text-white/30 text-xs mt-0.5 truncate">Ambient Dreams · Vol. III</p>
          <div className="flex items-center gap-1.5 mt-3">
            <Radio className="w-3 h-3 text-white/25" />
            <span className="text-white/30 text-[10px]">All Zones Play</span>
          </div>
        </div>
      </div>
      {progressBar}
      <div className="mt-2">{transport}</div>
      <div className="mt-2">{volumeBar}</div>
      {/* Queue */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2 shrink-0">
          <ListMusic className="w-3 h-3 text-white/25" />
          <span className="text-white/30 text-[10px] tracking-widest uppercase">Up Next</span>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 space-y-1.5 overscroll-contain select-none">
          {QUEUE.map((t) => (
            <div key={t.title} className="flex items-center justify-between py-0.5">
              <div className="min-w-0">
                <p className="text-white/50 text-xs truncate">{t.title}</p>
                <p className="text-white/20 text-[10px] truncate">{t.artist}</p>
              </div>
              <span className="text-white/25 text-[10px] shrink-0 ml-3">{t.dur}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Zone selector */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5 mb-2">
          <Speaker className="w-3 h-3 text-white/25" />
          <span className="text-white/30 text-[10px] tracking-widest uppercase">Playback Zones</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ZONES.map((z) => (
            <div
              key={z.name}
              className={`flex items-center gap-2 py-2 px-3 rounded-lg border transition-all cursor-pointer ${
                z.active
                  ? "bg-white/[0.06] border-white/[0.10] text-white/60"
                  : "bg-white/[0.02] border-white/[0.05] text-white/25"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${z.active ? "bg-emerald-400" : "bg-white/20"}`} />
              <span className="text-[10px]">{z.name}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
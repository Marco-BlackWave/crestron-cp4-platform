import React, { useState } from "react";
import { GlassCard } from "./GlassCard";
import { ShieldCheck, ChevronLeft, ChevronRight, AlertTriangle, Camera } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type CardSize = 1 | 2 | 3;

const cameras = [
  { id: "main-gate", name: "Main Gate", status: "Online" },
  { id: "backyard", name: "Backyard", status: "Online" },
  { id: "garage", name: "Garage", status: "Online" },
  { id: "driveway", name: "Driveway", status: "Offline" },
];

const events = [
  { time: "8:02 AM", event: "Motion detected", cam: "Main Gate" },
  { time: "7:45 AM", event: "System armed", cam: "All" },
  { time: "6:30 AM", event: "Door opened", cam: "Garage" },
  { time: "5:15 AM", event: "Sensor OK", cam: "Backyard" },
];

interface SecurityCardProps {
  cameraImage: string;
  cardSize?: CardSize;
}

export function SecurityCard({ cameraImage, cardSize = 1 }: SecurityCardProps) {
  const [currentCam, setCurrentCam] = useState(0);

  const nextCam = () => setCurrentCam((c) => (c + 1) % cameras.length);
  const prevCam = () => setCurrentCam((c) => (c - 1 + cameras.length) % cameras.length);

  /* shared camera feed */
  const cameraFeed = (minH: string) => (
    <div className={`relative flex-1 rounded-xl overflow-hidden`} style={{ minHeight: minH }}>
      <ImageWithFallback src={cameraImage} alt="Security Camera" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <button onClick={prevCam} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button onClick={nextCam} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all">
        <ChevronRight className="w-4 h-4" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
        <div>
          <p className="text-white text-sm">{cameras[currentCam].name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${cameras[currentCam].status === "Online" ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className="text-white/50 text-xs">{cameras[currentCam].status}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-xs">System Armed</span>
        </div>
      </div>
    </div>
  );

  /* shared camera dots */
  const camDots = (
    <div className="flex items-center justify-center gap-1.5 mt-3">
      {cameras.map((_, i) => (
        <button key={i} onClick={() => setCurrentCam(i)} className={`h-1.5 rounded-full transition-all ${i === currentCam ? "bg-white w-4" : "bg-white/30 w-1.5"}`} />
      ))}
    </div>
  );

  /* ── Size 1 (S): Camera + dots ── */
  if (cardSize === 1) {
    return (
      <GlassCard className="p-5 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400/60" />
          <h3 className="text-white/60 text-xs tracking-widest uppercase">Security</h3>
        </div>
        {cameraFeed("140px")}
        {camDots}
      </GlassCard>
    );
  }

  /* ── Size 2 (M): Camera + dots + event log ── */
  if (cardSize === 2) {
    return (
      <GlassCard className="p-5 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400/60" />
          <h3 className="text-white/60 text-xs tracking-widest uppercase">Security</h3>
        </div>
        {cameraFeed("180px")}
        {camDots}
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <span className="text-white/30 text-[10px] tracking-widest uppercase block mb-2">Recent Events</span>
          <div className="space-y-2">
            {events.slice(0, 3).map((ev, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400/50" />
                  <span className="text-white/50 text-xs">{ev.event}</span>
                </div>
                <span className="text-white/25 text-[10px]">{ev.time}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  /* ── Size 3 (L): Camera + dots + events + camera status grid ── */
  return (
    <GlassCard className="p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400/60" />
        <h3 className="text-white/60 text-xs tracking-widest uppercase">Security</h3>
      </div>
      {cameraFeed("220px")}
      {camDots}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <span className="text-white/30 text-[10px] tracking-widest uppercase block mb-2">Recent Events</span>
        <div className="space-y-2">
          {events.map((ev, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-400/50" />
                <span className="text-white/50 text-xs">{ev.event}</span>
              </div>
              <span className="text-white/25 text-[10px]">{ev.time}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <span className="text-white/30 text-[10px] tracking-widest uppercase block mb-2">Camera Status</span>
        <div className="grid grid-cols-2 gap-2">
          {cameras.map((cam) => (
            <div key={cam.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <Camera className="w-3.5 h-3.5 text-white/25" />
              <div className="flex-1 min-w-0">
                <span className="text-white/60 text-[10px] block truncate">{cam.name}</span>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${cam.status === "Online" ? "bg-emerald-400" : "bg-red-400"}`} />
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
import { useState } from 'react';
import { 
  Power, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, 
  ChevronRight, Home, Menu, SkipBack, Play, Pause, SkipForward
} from 'lucide-react';

interface TVRemoteControlProps {
  width: number;
  height: number;
}

export function TVRemoteControl({ width, height }: TVRemoteControlProps) {
  const [isOn, setIsOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Apple TV-inspired ultra compact design
  const w = width;
  const h = height;

  return (
    <div
      className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-2xl shadow-xl flex flex-col justify-between"
      style={{ width: w, height: h, padding: `${Math.max(8, w * 0.04)}px ${Math.max(6, w * 0.03)}px` }}
    >
      {/* Power - Top */}
      <button
        onClick={() => setIsOn(!isOn)}
        className={`w-full rounded-full transition-all ${isOn ? 'bg-red-500/90' : 'bg-white/10'}`}
        style={{ height: `${Math.max(18, h * 0.04)}px` }}
      >
        <Power className="mx-auto text-white" style={{ width: `${Math.max(10, h * 0.025)}px`, height: `${Math.max(10, h * 0.025)}px` }} />
      </button>

      {/* D-Pad Circle - Apple TV style */}
      <div className="flex-1 flex items-center justify-center" style={{ minHeight: '60px' }}>
        <div className="relative" style={{ width: `${Math.min(w * 0.7, h * 0.25)}px`, height: `${Math.min(w * 0.7, h * 0.25)}px` }}>
          {/* Circular touchpad */}
          <div className="absolute inset-0 bg-white/5 rounded-full border border-white/10"></div>
          
          {/* Direction buttons */}
          <button className="absolute top-0 left-1/2 -translate-x-1/2 bg-white/10 hover:bg-white/20 transition-all" style={{ width: '30%', height: '30%', borderRadius: '40% 40% 10% 10%' }}>
            <ChevronUp className="mx-auto text-white/70" style={{ width: `${Math.max(10, h * 0.02)}px`, height: `${Math.max(10, h * 0.02)}px` }} />
          </button>
          <button className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white/10 hover:bg-white/20 transition-all" style={{ width: '30%', height: '30%', borderRadius: '10% 10% 40% 40%' }}>
            <ChevronDown className="mx-auto text-white/70" style={{ width: `${Math.max(10, h * 0.02)}px`, height: `${Math.max(10, h * 0.02)}px` }} />
          </button>
          <button className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 transition-all" style={{ width: '30%', height: '30%', borderRadius: '40% 10% 10% 40%' }}>
            <ChevronLeft className="mx-auto text-white/70" style={{ width: `${Math.max(10, h * 0.02)}px`, height: `${Math.max(10, h * 0.02)}px` }} />
          </button>
          <button className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 transition-all" style={{ width: '30%', height: '30%', borderRadius: '10% 40% 40% 10%' }}>
            <ChevronRight className="mx-auto text-white/70" style={{ width: `${Math.max(10, h * 0.02)}px`, height: `${Math.max(10, h * 0.02)}px` }} />
          </button>
          
          {/* Center OK */}
          <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 rounded-full transition-all text-white flex items-center justify-center" style={{ width: '35%', height: '35%', fontSize: `${Math.max(8, h * 0.018)}px` }}>
            OK
          </button>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2" style={{ gap: `${Math.max(4, w * 0.02)}px`, marginBottom: `${Math.max(6, h * 0.015)}px` }}>
        <button className="bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center justify-center" style={{ height: `${Math.max(20, h * 0.045)}px` }}>
          <Home className="text-white/80" style={{ width: `${Math.max(12, h * 0.025)}px`, height: `${Math.max(12, h * 0.025)}px` }} />
        </button>
        <button className="bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center justify-center" style={{ height: `${Math.max(20, h * 0.045)}px` }}>
          <Menu className="text-white/80" style={{ width: `${Math.max(12, h * 0.025)}px`, height: `${Math.max(12, h * 0.025)}px` }} />
        </button>
      </div>

      {/* Volume Row */}
      <div className="grid grid-cols-3" style={{ gap: `${Math.max(4, w * 0.02)}px`, marginBottom: `${Math.max(6, h * 0.015)}px` }}>
        <button className="bg-white/10 hover:bg-white/20 rounded-lg transition-all flex flex-col items-center justify-center" style={{ height: `${Math.max(24, h * 0.05)}px` }}>
          <span className="text-white/90" style={{ fontSize: `${Math.max(10, h * 0.02)}px` }}>VOL</span>
          <span className="text-white/60" style={{ fontSize: `${Math.max(8, h * 0.015)}px` }}>−</span>
        </button>
        <button onClick={() => setIsMuted(!isMuted)} className={`rounded-lg transition-all flex items-center justify-center ${isMuted ? 'bg-red-500/90' : 'bg-white/10 hover:bg-white/20'}`} style={{ height: `${Math.max(24, h * 0.05)}px` }}>
          {isMuted ? <VolumeX className="text-white" style={{ width: `${Math.max(12, h * 0.025)}px`, height: `${Math.max(12, h * 0.025)}px` }} /> : <Volume2 className="text-white/80" style={{ width: `${Math.max(12, h * 0.025)}px`, height: `${Math.max(12, h * 0.025)}px` }} />}
        </button>
        <button className="bg-white/10 hover:bg-white/20 rounded-lg transition-all flex flex-col items-center justify-center" style={{ height: `${Math.max(24, h * 0.05)}px` }}>
          <span className="text-white/90" style={{ fontSize: `${Math.max(10, h * 0.02)}px` }}>VOL</span>
          <span className="text-white/60" style={{ fontSize: `${Math.max(8, h * 0.015)}px` }}>+</span>
        </button>
      </div>

      {/* Channel Row */}
      <div className="grid grid-cols-2" style={{ gap: `${Math.max(4, w * 0.02)}px`, marginBottom: `${Math.max(6, h * 0.015)}px` }}>
        <button className="bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center justify-center gap-1" style={{ height: `${Math.max(20, h * 0.045)}px` }}>
          <span className="text-white/80" style={{ fontSize: `${Math.max(9, h * 0.018)}px` }}>CH</span>
          <ChevronDown className="text-white/60" style={{ width: `${Math.max(10, h * 0.02)}px`, height: `${Math.max(10, h * 0.02)}px` }} />
        </button>
        <button className="bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center justify-center gap-1" style={{ height: `${Math.max(20, h * 0.045)}px` }}>
          <span className="text-white/80" style={{ fontSize: `${Math.max(9, h * 0.018)}px` }}>CH</span>
          <ChevronUp className="text-white/60" style={{ width: `${Math.max(10, h * 0.02)}px`, height: `${Math.max(10, h * 0.02)}px` }} />
        </button>
      </div>

      {/* Number Pad - Compact 3x4 */}
      <div className="grid grid-cols-3" style={{ gap: `${Math.max(3, w * 0.015)}px`, marginBottom: `${Math.max(6, h * 0.015)}px` }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((num, i) => (
          <button key={i} className="bg-white/5 hover:bg-white/10 rounded-md transition-all text-white/70 flex items-center justify-center" style={{ height: `${Math.max(18, h * 0.04)}px`, fontSize: `${Math.max(9, h * 0.018)}px` }}>
            {num}
          </button>
        ))}
      </div>

      {/* Media Controls - Bottom */}
      <div className="grid grid-cols-3" style={{ gap: `${Math.max(4, w * 0.02)}px` }}>
        <button className="bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center justify-center" style={{ height: `${Math.max(20, h * 0.04)}px` }}>
          <SkipBack className="text-white/70" style={{ width: `${Math.max(11, h * 0.022)}px`, height: `${Math.max(11, h * 0.022)}px` }} />
        </button>
        <button onClick={() => setIsPlaying(!isPlaying)} className="bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center justify-center" style={{ height: `${Math.max(20, h * 0.04)}px` }}>
          {isPlaying ? <Pause className="text-white" style={{ width: `${Math.max(11, h * 0.022)}px`, height: `${Math.max(11, h * 0.022)}px` }} /> : <Play className="text-white" style={{ width: `${Math.max(11, h * 0.022)}px`, height: `${Math.max(11, h * 0.022)}px` }} />}
        </button>
        <button className="bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center justify-center" style={{ height: `${Math.max(20, h * 0.04)}px` }}>
          <SkipForward className="text-white/70" style={{ width: `${Math.max(11, h * 0.022)}px`, height: `${Math.max(11, h * 0.022)}px` }} />
        </button>
      </div>
    </div>
  );
}

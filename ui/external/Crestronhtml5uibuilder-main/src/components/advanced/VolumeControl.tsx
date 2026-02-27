import { useState } from 'react';
import { Volume2, VolumeX, Plus, Minus } from 'lucide-react';

interface VolumeControlProps {
  width: number;
  height: number;
}

export function VolumeControl({ width, height }: VolumeControlProps) {
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  
  const minDim = Math.min(width, height);

  return (
    <div
      className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl shadow-2xl flex flex-col"
      style={{ 
        width, 
        height,
        padding: `${minDim * 0.06}px`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white" style={{ fontSize: `${minDim * 0.08}px` }}>Volume</h3>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-all"
          style={{
            width: `${minDim * 0.15}px`,
            height: `${minDim * 0.15}px`,
          }}
        >
          {isMuted ? (
            <VolumeX className="text-white" style={{ width: `${minDim * 0.07}px`, height: `${minDim * 0.07}px` }} />
          ) : (
            <Volume2 className="text-white" style={{ width: `${minDim * 0.07}px`, height: `${minDim * 0.07}px` }} />
          )}
        </button>
      </div>

      {/* Volume Display */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white mb-2" style={{ fontSize: `${minDim * 0.2}px` }}>{volume}</div>
          <div className="text-white/70" style={{ fontSize: `${minDim * 0.06}px` }}>Level</div>
        </div>
      </div>

      {/* Volume Bar */}
      <div className="mb-2">
        <div className="relative bg-white/20 rounded-full overflow-hidden" style={{ height: `${minDim * 0.04}px` }}>
          <div
            className="absolute left-0 top-0 h-full bg-white transition-all duration-300"
            style={{ width: `${volume}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setVolume(Math.max(0, volume - 5))}
          className="rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center gap-1 transition-all active:scale-95"
          style={{
            padding: `${minDim * 0.04}px`,
          }}
        >
          <Minus className="text-white" style={{ width: `${minDim * 0.06}px`, height: `${minDim * 0.06}px` }} />
          <span className="text-white" style={{ fontSize: `${minDim * 0.05}px` }}>Down</span>
        </button>
        <button
          onClick={() => setVolume(Math.min(100, volume + 5))}
          className="rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center gap-1 transition-all active:scale-95"
          style={{
            padding: `${minDim * 0.04}px`,
          }}
        >
          <Plus className="text-white" style={{ width: `${minDim * 0.06}px`, height: `${minDim * 0.06}px` }} />
          <span className="text-white" style={{ fontSize: `${minDim * 0.05}px` }}>Up</span>
        </button>
      </div>
    </div>
  );
}

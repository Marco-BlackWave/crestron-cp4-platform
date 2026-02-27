import { useState } from 'react';
import { Wind, Power } from 'lucide-react';

interface FanControlProps {
  width: number;
  height: number;
}

export function FanControl({ width, height }: FanControlProps) {
  const [speed, setSpeed] = useState(2);
  const [isOn, setIsOn] = useState(true);

  const speeds = ['Off', 'Low', 'Med', 'High'];

  return (
    <div
      className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl shadow-2xl flex flex-col"
      style={{ 
        width, 
        height,
        padding: `${Math.min(width, height) * 0.06}px`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white" style={{ fontSize: `${Math.min(width, height) * 0.08}px` }}>Fan</h3>
        <button
          onClick={() => setIsOn(!isOn)}
          className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-all"
          style={{
            width: `${Math.min(width, height) * 0.15}px`,
            height: `${Math.min(width, height) * 0.15}px`,
          }}
        >
          <Power className={`text-white ${!isOn && 'opacity-50'}`} style={{ width: `${Math.min(width, height) * 0.07}px`, height: `${Math.min(width, height) * 0.07}px` }} />
        </button>
      </div>

      {/* Fan Icon */}
      <div className="flex justify-center mb-2">
        <div 
          className="rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
          style={{
            width: `${Math.min(width, height) * 0.3}px`,
            height: `${Math.min(width, height) * 0.3}px`,
          }}
        >
          <Wind 
            className={`text-white transition-all duration-300 ${isOn ? 'animate-pulse' : 'opacity-50'}`}
            style={{
              width: `${Math.min(width, height) * 0.15}px`,
              height: `${Math.min(width, height) * 0.15}px`,
              animation: isOn ? `spin ${4 - speed}s linear infinite` : 'none'
            }}
          />
        </div>
      </div>

      {/* Speed Control */}
      <div className="flex-1 flex flex-col gap-1">
        {[0, 1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => {
              setSpeed(s);
              setIsOn(s > 0);
            }}
            className={`w-full rounded-xl transition-all ${
              speed === s
                ? 'bg-white/30 shadow-lg'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            style={{
              padding: `${Math.min(width, height) * 0.035}px`,
              fontSize: `${Math.min(width, height) * 0.05}px`,
            }}
          >
            <span className="text-white">{speeds[s]}</span>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
import { useState } from 'react';
import { Lightbulb, Power } from 'lucide-react';

interface DimmerControlProps {
  width: number;
  height: number;
}

export function DimmerControl({ width, height }: DimmerControlProps) {
  const [brightness, setBrightness] = useState(75);
  const [isOn, setIsOn] = useState(true);
  
  const minDim = Math.min(width, height);

  return (
    <div
      className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl shadow-2xl flex flex-col"
      style={{ 
        width, 
        height,
        padding: `${minDim * 0.06}px`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white" style={{ fontSize: `${minDim * 0.08}px` }}>Lights</h3>
        <button
          onClick={() => setIsOn(!isOn)}
          className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-all"
          style={{
            width: `${minDim * 0.15}px`,
            height: `${minDim * 0.15}px`,
          }}
        >
          <Power className={`${isOn ? 'text-white' : 'text-white/50'}`} style={{ width: `${minDim * 0.06}px`, height: `${minDim * 0.06}px` }} />
        </button>
      </div>

      {/* Bulb Icon */}
      <div className="flex-1 flex items-center justify-center">
        <div 
          className="rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            width: `${minDim * 0.4}px`,
            height: `${minDim * 0.4}px`,
            backgroundColor: isOn ? `rgba(255, 255, 255, ${brightness / 200 + 0.2})` : 'rgba(255, 255, 255, 0.1)',
            boxShadow: isOn ? `0 0 ${brightness * 0.5}px rgba(255, 255, 255, 0.5)` : 'none',
          }}
        >
          <Lightbulb 
            className={`transition-all ${isOn ? 'text-white' : 'text-white/30'}`}
            fill={isOn ? 'currentColor' : 'none'}
            style={{ width: `${minDim * 0.2}px`, height: `${minDim * 0.2}px` }}
          />
        </div>
      </div>

      {/* Brightness Display */}
      <div className="text-center mb-2">
        <div className="text-white mb-1" style={{ fontSize: `${minDim * 0.12}px` }}>{brightness}%</div>
        <div className="text-white/70" style={{ fontSize: `${minDim * 0.045}px` }}>Brightness</div>
      </div>

      {/* Slider */}
      <div className="mb-2">
        <input
          type="range"
          min="0"
          max="100"
          value={brightness}
          onChange={(e) => {
            setBrightness(Number(e.target.value));
            if (Number(e.target.value) > 0) setIsOn(true);
          }}
          className="w-full bg-white/20 rounded-full appearance-none cursor-pointer"
          style={{
            height: `${minDim * 0.03}px`,
            accentColor: 'white',
          }}
        />
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[25, 50, 100].map((preset) => (
          <button
            key={preset}
            onClick={() => {
              setBrightness(preset);
              setIsOn(true);
            }}
            className="rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur text-white transition-all active:scale-95"
            style={{
              padding: `${minDim * 0.03}px`,
              fontSize: `${minDim * 0.05}px`,
            }}
          >
            {preset}%
          </button>
        ))}
      </div>
    </div>
  );
}

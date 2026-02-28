import { useState } from 'react';
import { Plus, Minus, Thermometer } from 'lucide-react';

interface MiniThermostatProps {
  width: number;
  height: number;
}

export function MiniThermostat({ width, height }: MiniThermostatProps) {
  const [temp, setTemp] = useState(72);
  
  const minDim = Math.min(width, height);

  return (
    <div
      className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-2xl flex flex-col items-center justify-center"
      style={{ width, height, padding: `${minDim * 0.08}px` }}
    >
      {/* Icon */}
      <Thermometer className="text-white/70 mb-2" style={{ width: `${minDim * 0.15}px`, height: `${minDim * 0.15}px` }} />
      
      {/* Temperature */}
      <div className="text-white mb-3" style={{ fontSize: `${minDim * 0.3}px` }}>{temp}°</div>
      
      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setTemp(Math.max(60, temp - 1))}
          className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-all active:scale-90"
          style={{
            width: `${minDim * 0.22}px`,
            height: `${minDim * 0.22}px`,
          }}
        >
          <Minus className="text-white" style={{ width: `${minDim * 0.1}px`, height: `${minDim * 0.1}px` }} />
        </button>
        <button
          onClick={() => setTemp(Math.min(85, temp + 1))}
          className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-all active:scale-90"
          style={{
            width: `${minDim * 0.22}px`,
            height: `${minDim * 0.22}px`,
          }}
        >
          <Plus className="text-white" style={{ width: `${minDim * 0.1}px`, height: `${minDim * 0.1}px` }} />
        </button>
      </div>
    </div>
  );
}

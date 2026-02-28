import { useState } from 'react';
import { Droplets, Plus, Minus, Power } from 'lucide-react';

interface HumidityControlProps {
  width: number;
  height: number;
}

export function HumidityControl({ width, height }: HumidityControlProps) {
  const [humidity, setHumidity] = useState(45);
  const [targetHumidity, setTargetHumidity] = useState(50);
  const [isOn, setIsOn] = useState(true);
  
  const minDim = Math.min(width, height);

  return (
    <div
      className="w-full h-full bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl shadow-2xl flex flex-col"
      style={{ 
        width, 
        height,
        padding: `${minDim * 0.05}px`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white" style={{ fontSize: `${minDim * 0.08}px` }}>Humidity</h3>
        <button
          onClick={() => setIsOn(!isOn)}
          className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-all"
          style={{
            width: `${minDim * 0.13}px`,
            height: `${minDim * 0.13}px`,
          }}
        >
          <Power className={`${isOn ? 'text-white' : 'text-white/50'}`} style={{ width: `${minDim * 0.06}px`, height: `${minDim * 0.06}px` }} />
        </button>
      </div>

      {/* Humidity Icon */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-2 transition-all mx-auto"
            style={{
              width: `${minDim * 0.3}px`,
              height: `${minDim * 0.3}px`,
              boxShadow: isOn ? '0 0 40px rgba(255, 255, 255, 0.3)' : 'none',
            }}
          >
            <Droplets 
              className={`transition-all ${isOn ? 'text-white' : 'text-white/30'}`}
              fill={isOn ? 'currentColor' : 'none'}
              style={{ width: `${minDim * 0.15}px`, height: `${minDim * 0.15}px` }}
            />
          </div>
          <div className="text-white mb-1" style={{ fontSize: `${minDim * 0.12}px` }}>{humidity}%</div>
          <div className="text-white/70" style={{ fontSize: `${minDim * 0.045}px` }}>Current</div>
        </div>
      </div>

      {/* Target Control */}
      <div className="bg-white/10 backdrop-blur rounded-2xl mb-2" style={{ padding: `${minDim * 0.04}px` }}>
        <div className="text-white/70 text-center mb-1" style={{ fontSize: `${minDim * 0.04}px` }}>Target</div>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setTargetHumidity(Math.max(0, targetHumidity - 5))}
            className="rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
            style={{
              width: `${minDim * 0.12}px`,
              height: `${minDim * 0.12}px`,
            }}
          >
            <Minus className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
          </button>
          <div className="flex-1 text-center text-white" style={{ fontSize: `${minDim * 0.09}px` }}>{targetHumidity}%</div>
          <button
            onClick={() => setTargetHumidity(Math.min(100, targetHumidity + 5))}
            className="rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
            style={{
              width: `${minDim * 0.12}px`,
              height: `${minDim * 0.12}px`,
            }}
          >
            <Plus className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative bg-white/20 rounded-full overflow-hidden" style={{ height: `${minDim * 0.03}px` }}>
        <div
          className="absolute left-0 top-0 h-full bg-white transition-all duration-300"
          style={{ width: `${humidity}%` }}
        />
      </div>
    </div>
  );
}

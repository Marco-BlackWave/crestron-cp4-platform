import { useState } from 'react';
import { Plus, Minus, Power, Snowflake, Sun, Wind, Droplets } from 'lucide-react';

interface ThermostatControlProps {
  width: number;
  height: number;
  currentTemp?: number;
  targetTemp?: number;
  mode?: 'cool' | 'heat' | 'auto' | 'off';
  humidity?: number;
}

export function ThermostatControl({
  width,
  height,
  currentTemp = 72,
  targetTemp = 72,
  mode = 'auto',
  humidity = 45,
}: ThermostatControlProps) {
  const [temp, setTemp] = useState(targetTemp);
  const [activeMode, setActiveMode] = useState(mode);
  const [isOn, setIsOn] = useState(true);

  const modeConfig = {
    cool: { color: 'from-blue-500 to-cyan-500', icon: Snowflake, label: 'Cool' },
    heat: { color: 'from-orange-500 to-red-500', icon: Sun, label: 'Heat' },
    auto: { color: 'from-purple-500 to-blue-500', icon: Wind, label: 'Auto' },
    off: { color: 'from-zinc-600 to-zinc-700', icon: Power, label: 'Off' },
  };

  const config = modeConfig[isOn ? activeMode : 'off'];
  const ModeIcon = config.icon;
  const minDim = Math.min(width, height);

  return (
    <div
      className={`w-full h-full relative bg-gradient-to-br ${config.color} opacity-90 flex flex-col`}
      style={{ width, height }}
    >
      {/* Glassmorphic overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-white/10" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col" style={{ padding: `${minDim * 0.04}px` }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-white/90 uppercase tracking-wider" style={{ fontSize: `${minDim * 0.03}px` }}>Climate</h3>
            <p className="text-white mt-1" style={{ fontSize: `${minDim * 0.055}px` }}>Living Room</p>
          </div>
          <button
            onClick={() => setIsOn(!isOn)}
            className={`rounded-full ${
              isOn ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'
            } backdrop-blur-md flex items-center justify-center transition-all duration-300`}
            style={{
              width: `${minDim * 0.1}px`,
              height: `${minDim * 0.1}px`,
            }}
          >
            <Power className={`${isOn ? 'text-white' : 'text-white/50'}`} style={{ width: `${minDim * 0.045}px`, height: `${minDim * 0.045}px` }} />
          </button>
        </div>

        {/* Temperature Display */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-2">
              {/* Circular Progress */}
              <svg className="transform -rotate-90" viewBox="0 0 200 200" style={{ width: `${minDim * 0.45}px`, height: `${minDim * 0.45}px` }}>
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="12"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="white"
                  strokeWidth="12"
                  strokeDasharray="534"
                  strokeDashoffset={534 - (534 * temp) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>

              {/* Temperature Value */}
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <div className="text-white mb-1" style={{ fontSize: `${minDim * 0.14}px` }}>{temp}°</div>
                <ModeIcon className="text-white/60" style={{ width: `${minDim * 0.06}px`, height: `${minDim * 0.06}px` }} />
              </div>
            </div>

            {/* Current Temp & Humidity */}
            <div className="flex items-center justify-center gap-4 text-white/70" style={{ fontSize: `${minDim * 0.035}px` }}>
              <div>Current: {currentTemp}°</div>
              <div className="flex items-center gap-1">
                <Droplets style={{ width: `${minDim * 0.03}px`, height: `${minDim * 0.03}px` }} />
                {humidity}%
              </div>
            </div>
          </div>
        </div>

        {/* Temperature Controls */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <button
            onClick={() => setTemp(Math.max(60, temp - 1))}
            className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all active:scale-95"
            style={{
              width: `${minDim * 0.12}px`,
              height: `${minDim * 0.12}px`,
            }}
          >
            <Minus className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
          </button>
          <div className="text-white" style={{ fontSize: `${minDim * 0.05}px` }}>Target</div>
          <button
            onClick={() => setTemp(Math.min(90, temp + 1))}
            className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all active:scale-95"
            style={{
              width: `${minDim * 0.12}px`,
              height: `${minDim * 0.12}px`,
            }}
          >
            <Plus className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
          </button>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-3 gap-2">
          {(['cool', 'heat', 'auto'] as const).map((m) => {
            const MIcon = modeConfig[m].icon;
            return (
              <button
                key={m}
                onClick={() => {
                  setActiveMode(m);
                  setIsOn(true);
                }}
                className={`rounded-xl backdrop-blur-md transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                  activeMode === m && isOn
                    ? 'bg-white/30 shadow-lg'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                style={{
                  padding: `${minDim * 0.03}px`,
                }}
              >
                <MIcon className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
                <span className="text-white" style={{ fontSize: `${minDim * 0.035}px` }}>{modeConfig[m].label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

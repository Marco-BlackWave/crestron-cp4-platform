// EXAMPLE: Thermostat UI Component
// 100% UI FIDELITY - Pure design component!

import { Plus, Minus, Droplets, Wind } from 'lucide-react';

export interface ThermostatUIProps {
  currentTemp?: number; // Current temperature
  targetTemp?: number; // Target temperature
  humidity?: number; // 0-100
  mode?: 'COOLING' | 'HEATING' | 'AUTO' | 'OFF';
  isActive?: boolean; // Is system running?
  
  onTempUp?: () => void;
  onTempDown?: () => void;
  onModeToggle?: () => void;
}

export function ThermostatUI({
  currentTemp = 72,
  targetTemp = 72,
  humidity = 45,
  mode = 'COOLING',
  isActive = true,
  onTempUp,
  onTempDown,
  onModeToggle,
}: ThermostatUIProps) {
  // Color based on mode
  const modeColor = {
    COOLING: 'from-blue-500 to-cyan-500',
    HEATING: 'from-orange-500 to-red-500',
    AUTO: 'from-purple-500 to-pink-500',
    OFF: 'from-zinc-600 to-zinc-700',
  }[mode];

  const modeTextColor = {
    COOLING: 'text-blue-400',
    HEATING: 'text-orange-400',
    AUTO: 'text-purple-400',
    OFF: 'text-zinc-500',
  }[mode];

  return (
    <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center">
      {/* Main Thermostat Circle */}
      <div className="relative mb-8">
        {/* Outer ring (gradient based on mode) */}
        <div className={`w-64 h-64 rounded-full bg-gradient-to-br ${modeColor} p-1 ${isActive ? 'shadow-2xl' : 'opacity-50'}`}>
          {/* Inner dark circle */}
          <div className="w-full h-full rounded-full bg-zinc-900 flex flex-col items-center justify-center">
            {/* Temperature Display */}
            <div className="text-center mb-2">
              <div className="text-7xl text-white mb-1">
                {targetTemp}°
              </div>
              <div className="text-sm text-zinc-500">
                Target
              </div>
            </div>

            {/* Current Temperature (smaller) */}
            <div className="text-center">
              <div className="text-2xl text-zinc-400">
                {currentTemp}°
              </div>
              <div className="text-xs text-zinc-600">
                Current
              </div>
            </div>
          </div>
        </div>

        {/* Temperature Controls (overlaid on circle) */}
        <button
          onClick={onTempUp}
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-zinc-800 hover:bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-white transition-all shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </button>
        
        <button
          onClick={onTempDown}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-zinc-800 hover:bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-white transition-all shadow-lg"
        >
          <Minus className="w-6 h-6" />
        </button>
      </div>

      {/* Mode Display */}
      <button
        onClick={onModeToggle}
        className={`px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-all mb-6 ${modeTextColor}`}
      >
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5" />
          <span className="text-lg">{mode}</span>
        </div>
      </button>

      {/* Humidity */}
      <div className="flex items-center gap-3 text-zinc-400">
        <Droplets className="w-5 h-5" />
        <span className="text-lg">{humidity}%</span>
        <span className="text-sm text-zinc-600">Humidity</span>
      </div>

      {/* Status Indicator */}
      {isActive && (
        <div className="mt-4 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${modeColor} animate-pulse`} />
          <span className="text-xs text-zinc-500">System Active</span>
        </div>
      )}
    </div>
  );
}

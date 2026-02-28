// EXAMPLE: Light Zone Card UI Component
// 100% UI FIDELITY - Pure design component!

import { Lightbulb } from 'lucide-react';
import { useState } from 'react';

export interface LightZoneCardProps {
  zoneName?: string;
  brightness?: number; // 0-100
  isOn?: boolean;
  
  onToggle?: () => void;
  onBrightnessChange?: (value: number) => void;
}

export function LightZoneCard({
  zoneName = 'Living Room',
  brightness = 75,
  isOn = true,
  onToggle,
  onBrightnessChange,
}: LightZoneCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.round((x / rect.width) * 100);
    onBrightnessChange?.(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-2xl p-6 flex flex-col">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white text-lg truncate flex-1">{zoneName}</h3>
        <button
          onClick={onToggle}
          className={`w-12 h-6 rounded-full transition-all ${
            isOn ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-zinc-700'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${
              isOn ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Light Icon (large, centered) */}
      <div className="flex-1 flex items-center justify-center mb-6">
        <div
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all ${
            isOn
              ? 'bg-gradient-to-br from-yellow-400 to-orange-400 shadow-2xl shadow-yellow-500/50'
              : 'bg-zinc-800'
          }`}
        >
          <Lightbulb
            className={`w-16 h-16 transition-colors ${
              isOn ? 'text-white' : 'text-zinc-600'
            }`}
          />
          
          {/* Glow effect when on */}
          {isOn && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 blur-2xl opacity-50 -z-10" />
          )}
        </div>
      </div>

      {/* Brightness Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Brightness</span>
          <span className="text-white font-medium">{brightness}%</span>
        </div>
        
        <div
          onClick={handleSliderClick}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          className={`relative h-2 bg-zinc-700 rounded-full cursor-pointer group ${
            !isOn && 'opacity-50 cursor-not-allowed'
          }`}
        >
          {/* Progress bar */}
          <div
            className={`absolute h-full rounded-full transition-all ${
              isOn
                ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                : 'bg-zinc-600'
            }`}
            style={{ width: `${brightness}%` }}
          />
          
          {/* Slider thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg transition-all ${
              isOn ? 'bg-white' : 'bg-zinc-500'
            } ${isDragging || !isOn ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            style={{ left: `${brightness}%`, marginLeft: '-8px' }}
          />
        </div>

        {/* Brightness levels */}
        <div className="flex justify-between text-xs text-zinc-600">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Volume2, Plus, Minus, Power, Music } from 'lucide-react';

interface AudioZoneControlProps {
  width: number;
  height: number;
}

export function AudioZoneControl({ width, height }: AudioZoneControlProps) {
  const [zones, setZones] = useState([
    { id: 1, name: 'Living Room', volume: 60, isOn: true },
    { id: 2, name: 'Kitchen', volume: 45, isOn: true },
    { id: 3, name: 'Bedroom', volume: 30, isOn: false },
    { id: 4, name: 'Patio', volume: 70, isOn: true },
  ]);

  const minDim = Math.min(width, height);

  const toggleZone = (id: number) => {
    setZones(zones.map(z => z.id === id ? { ...z, isOn: !z.isOn } : z));
  };

  const adjustVolume = (id: number, delta: number) => {
    setZones(zones.map(z => 
      z.id === id ? { ...z, volume: Math.max(0, Math.min(100, z.volume + delta)) } : z
    ));
  };

  return (
    <div
      className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl shadow-2xl flex flex-col"
      style={{ width, height, padding: `${minDim * 0.04}px` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Music className="text-white" style={{ width: `${minDim * 0.06}px`, height: `${minDim * 0.06}px` }} />
        <h3 className="text-white" style={{ fontSize: `${minDim * 0.06}px` }}>Audio Zones</h3>
      </div>

      {/* Zones */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`bg-white/10 backdrop-blur rounded-xl transition-all ${
              zone.isOn ? 'bg-white/20' : 'bg-white/5'
            }`}
            style={{ padding: `${minDim * 0.03}px` }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-white" style={{ fontSize: `${minDim * 0.045}px` }}>{zone.name}</span>
              <button
                onClick={() => toggleZone(zone.id)}
                className={`rounded-full transition-all ${
                  zone.isOn ? 'bg-white/30' : 'bg-white/10'
                }`}
                style={{
                  width: `${minDim * 0.08}px`,
                  height: `${minDim * 0.08}px`,
                  padding: `${minDim * 0.015}px`,
                }}
              >
                <Power 
                  className={`mx-auto ${zone.isOn ? 'text-white' : 'text-white/40'}`}
                  style={{ width: `${minDim * 0.035}px`, height: `${minDim * 0.035}px` }}
                />
              </button>
            </div>

            {zone.isOn && (
              <>
                {/* Volume Bar */}
                <div className="relative bg-white/10 rounded-full overflow-hidden mb-1" style={{ height: `${minDim * 0.02}px` }}>
                  <div
                    className="absolute left-0 top-0 h-full bg-white transition-all"
                    style={{ width: `${zone.volume}%` }}
                  />
                </div>

                {/* Volume Controls */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => adjustVolume(zone.id, -5)}
                    className="bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center justify-center"
                    style={{
                      width: `${minDim * 0.07}px`,
                      height: `${minDim * 0.07}px`,
                    }}
                  >
                    <Minus className="text-white" style={{ width: `${minDim * 0.03}px`, height: `${minDim * 0.03}px` }} />
                  </button>
                  <div className="flex items-center gap-1 flex-1 justify-center">
                    <Volume2 className="text-white/70" style={{ width: `${minDim * 0.035}px`, height: `${minDim * 0.035}px` }} />
                    <span className="text-white" style={{ fontSize: `${minDim * 0.04}px` }}>{zone.volume}%</span>
                  </div>
                  <button
                    onClick={() => adjustVolume(zone.id, 5)}
                    className="bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center justify-center"
                    style={{
                      width: `${minDim * 0.07}px`,
                      height: `${minDim * 0.07}px`,
                    }}
                  >
                    <Plus className="text-white" style={{ width: `${minDim * 0.03}px`, height: `${minDim * 0.03}px` }} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Master Controls */}
      <div className="mt-2 bg-white/10 backdrop-blur rounded-xl" style={{ padding: `${minDim * 0.03}px` }}>
        <div className="text-white/70 text-center mb-1" style={{ fontSize: `${minDim * 0.035}px` }}>Master Volume</div>
        <div className="flex items-center gap-2">
          <button className="bg-white/20 hover:bg-white/30 rounded-lg transition-all flex items-center justify-center"
            style={{
              width: `${minDim * 0.08}px`,
              height: `${minDim * 0.08}px`,
            }}>
            <Minus className="text-white" style={{ width: `${minDim * 0.04}px`, height: `${minDim * 0.04}px` }} />
          </button>
          <div className="flex-1 bg-white/10 rounded-full overflow-hidden relative" style={{ height: `${minDim * 0.025}px` }}>
            <div className="absolute left-0 top-0 h-full bg-white w-3/4" />
          </div>
          <button className="bg-white/20 hover:bg-white/30 rounded-lg transition-all flex items-center justify-center"
            style={{
              width: `${minDim * 0.08}px`,
              height: `${minDim * 0.08}px`,
            }}>
            <Plus className="text-white" style={{ width: `${minDim * 0.04}px`, height: `${minDim * 0.04}px` }} />
          </button>
        </div>
      </div>
    </div>
  );
}

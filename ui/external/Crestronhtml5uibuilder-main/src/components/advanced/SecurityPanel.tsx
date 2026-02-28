import { useState } from 'react';
import { Shield, Lock, Unlock, Home, Moon, AlertTriangle, Check } from 'lucide-react';

interface SecurityPanelProps {
  width: number;
  height: number;
}

export function SecurityPanel({ width, height }: SecurityPanelProps) {
  const [mode, setMode] = useState<'disarmed' | 'armed-home' | 'armed-away'>('disarmed');
  const [sensors, setSensors] = useState([
    { id: 1, name: 'Front Door', status: 'closed' },
    { id: 2, name: 'Back Door', status: 'closed' },
    { id: 3, name: 'Living Room Motion', status: 'clear' },
    { id: 4, name: 'Kitchen Window', status: 'closed' },
  ]);

  const minDim = Math.min(width, height);

  const modeConfig = {
    'disarmed': { color: 'from-green-600 to-emerald-700', icon: Unlock, label: 'Disarmed', statusColor: 'text-green-400' },
    'armed-home': { color: 'from-blue-600 to-indigo-700', icon: Home, label: 'Armed Home', statusColor: 'text-blue-400' },
    'armed-away': { color: 'from-red-600 to-rose-700', icon: Lock, label: 'Armed Away', statusColor: 'text-red-400' },
  };

  const config = modeConfig[mode];
  const ModeIcon = config.icon;

  return (
    <div
      className={`w-full h-full bg-gradient-to-br ${config.color} rounded-3xl shadow-2xl flex flex-col`}
      style={{ width, height, padding: `${minDim * 0.04}px` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Shield className="text-white" style={{ width: `${minDim * 0.065}px`, height: `${minDim * 0.065}px` }} />
        <h3 className="text-white" style={{ fontSize: `${minDim * 0.06}px` }}>Security</h3>
      </div>

      {/* Status Display */}
      <div className="text-center mb-2 bg-white/10 backdrop-blur rounded-2xl" style={{ padding: `${minDim * 0.04}px` }}>
        <ModeIcon className="text-white mx-auto mb-1" style={{ width: `${minDim * 0.12}px`, height: `${minDim * 0.12}px` }} />
        <div className={`mb-1 ${config.statusColor}`} style={{ fontSize: `${minDim * 0.07}px` }}>
          {config.label.toUpperCase()}
        </div>
        <div className="text-white/60" style={{ fontSize: `${minDim * 0.035}px` }}>System Status</div>
      </div>

      {/* Mode Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <button
          onClick={() => setMode('disarmed')}
          className={`rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
            mode === 'disarmed' ? 'bg-white/30 shadow-lg' : 'bg-white/10 hover:bg-white/20'
          }`}
          style={{ padding: `${minDim * 0.025}px` }}
        >
          <Unlock className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
          <span className="text-white" style={{ fontSize: `${minDim * 0.03}px` }}>Off</span>
        </button>
        <button
          onClick={() => setMode('armed-home')}
          className={`rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
            mode === 'armed-home' ? 'bg-white/30 shadow-lg' : 'bg-white/10 hover:bg-white/20'
          }`}
          style={{ padding: `${minDim * 0.025}px` }}
        >
          <Home className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
          <span className="text-white" style={{ fontSize: `${minDim * 0.03}px` }}>Home</span>
        </button>
        <button
          onClick={() => setMode('armed-away')}
          className={`rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
            mode === 'armed-away' ? 'bg-white/30 shadow-lg' : 'bg-white/10 hover:bg-white/20'
          }`}
          style={{ padding: `${minDim * 0.025}px` }}
        >
          <Lock className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
          <span className="text-white" style={{ fontSize: `${minDim * 0.03}px` }}>Away</span>
        </button>
      </div>

      {/* Sensors */}
      <div className="flex-1 overflow-y-auto">
        <div className="text-white/70 mb-1" style={{ fontSize: `${minDim * 0.035}px` }}>Sensors</div>
        <div className="space-y-1">
          {sensors.map((sensor) => (
            <div
              key={sensor.id}
              className="bg-white/10 backdrop-blur rounded-lg flex items-center justify-between"
              style={{ padding: `${minDim * 0.025}px` }}
            >
              <span className="text-white" style={{ fontSize: `${minDim * 0.04}px` }}>{sensor.name}</span>
              <div className="flex items-center gap-1">
                <Check className="text-green-400" style={{ width: `${minDim * 0.035}px`, height: `${minDim * 0.035}px` }} />
                <span className="text-green-400" style={{ fontSize: `${minDim * 0.035}px` }}>{sensor.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Button */}
      <button className="mt-2 bg-red-600 hover:bg-red-700 rounded-xl transition-all flex items-center justify-center gap-2"
        style={{ padding: `${minDim * 0.035}px` }}>
        <AlertTriangle className="text-white" style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
        <span className="text-white" style={{ fontSize: `${minDim * 0.045}px` }}>Emergency</span>
      </button>
    </div>
  );
}

import { useState } from 'react';
import { Lock, Unlock, Key } from 'lucide-react';

interface DoorLockControlProps {
  width: number;
  height: number;
}

export function DoorLockControl({ width, height }: DoorLockControlProps) {
  const [isLocked, setIsLocked] = useState(true);
  
  const minDim = Math.min(width, height);

  return (
    <div
      className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl shadow-2xl flex flex-col"
      style={{ 
        width, 
        height,
        padding: `${minDim * 0.06}px`,
      }}
    >
      {/* Header */}
      <div className="mb-2">
        <h3 className="text-white" style={{ fontSize: `${minDim * 0.08}px` }}>Door Lock</h3>
        <p className="text-white/60" style={{ fontSize: `${minDim * 0.045}px` }}>Front Door</p>
      </div>

      {/* Lock Icon */}
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={() => setIsLocked(!isLocked)}
          className={`rounded-full transition-all duration-300 flex items-center justify-center ${
            isLocked ? 'bg-red-500/20 hover:bg-red-500/30' : 'bg-green-500/20 hover:bg-green-500/30'
          }`}
          style={{
            width: `${minDim * 0.5}px`,
            height: `${minDim * 0.5}px`,
            boxShadow: isLocked 
              ? '0 0 60px rgba(239, 68, 68, 0.4)' 
              : '0 0 60px rgba(34, 197, 94, 0.4)',
          }}
        >
          {isLocked ? (
            <Lock 
              className="text-red-400"
              style={{ width: `${minDim * 0.25}px`, height: `${minDim * 0.25}px` }}
            />
          ) : (
            <Unlock 
              className="text-green-400"
              style={{ width: `${minDim * 0.25}px`, height: `${minDim * 0.25}px` }}
            />
          )}
        </button>
      </div>

      {/* Status */}
      <div className="text-center mb-4">
        <div 
          className={`mb-2 ${isLocked ? 'text-red-400' : 'text-green-400'}`}
          style={{ fontSize: `${minDim * 0.1}px` }}
        >
          {isLocked ? 'LOCKED' : 'UNLOCKED'}
        </div>
        <div className="text-white/60" style={{ fontSize: `${minDim * 0.04}px` }}>
          Tap to {isLocked ? 'unlock' : 'lock'}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setIsLocked(true)}
          className="rounded-xl bg-red-500/20 hover:bg-red-500/30 backdrop-blur text-red-300 transition-all active:scale-95 flex items-center justify-center gap-1"
          style={{
            padding: `${minDim * 0.035}px`,
            fontSize: `${minDim * 0.045}px`,
          }}
        >
          <Lock style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
          Lock
        </button>
        <button
          onClick={() => setIsLocked(false)}
          className="rounded-xl bg-green-500/20 hover:bg-green-500/30 backdrop-blur text-green-300 transition-all active:scale-95 flex items-center justify-center gap-1"
          style={{
            padding: `${minDim * 0.035}px`,
            fontSize: `${minDim * 0.045}px`,
          }}
        >
          <Unlock style={{ width: `${minDim * 0.05}px`, height: `${minDim * 0.05}px` }} />
          Unlock
        </button>
      </div>
    </div>
  );
}

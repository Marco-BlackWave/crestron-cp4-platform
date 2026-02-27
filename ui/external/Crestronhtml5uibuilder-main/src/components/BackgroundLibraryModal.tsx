import { X, Sparkles, Gauge, Zap } from 'lucide-react';
import { Project } from '../types/crestron';
import { BACKGROUND_PRESETS } from './backgrounds/AnimatedBackground';
import { useState } from 'react';

interface BackgroundLibraryModalProps {
  project: Project;
  setProject: (project: Project) => void;
  currentPageId: string;
  onClose: () => void;
}

export function BackgroundLibraryModal({
  project,
  setProject,
  currentPageId,
  onClose,
}: BackgroundLibraryModalProps) {
  const currentPage = project.pages.find(p => p.id === currentPageId);
  const [speed, setSpeed] = useState(currentPage?.backgroundSpeed || 1.0);
  const [intensity, setIntensity] = useState(currentPage?.backgroundIntensity || 1.0);

  const applyBackground = (type: string) => {
    setProject({
      ...project,
      pages: project.pages.map(p =>
        p.id === currentPageId
          ? { 
              ...p, 
              backgroundAnimation: type as any,
              backgroundSpeed: speed,
              backgroundIntensity: intensity,
            }
          : p
      ),
    });
  };

  const updateSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (currentPage?.backgroundAnimation && currentPage.backgroundAnimation !== 'none') {
      setProject({
        ...project,
        pages: project.pages.map(p =>
          p.id === currentPageId
            ? { ...p, backgroundSpeed: newSpeed }
            : p
        ),
      });
    }
  };

  const updateIntensity = (newIntensity: number) => {
    setIntensity(newIntensity);
    if (currentPage?.backgroundAnimation && currentPage.backgroundAnimation !== 'none') {
      setProject({
        ...project,
        pages: project.pages.map(p =>
          p.id === currentPageId
            ? { ...p, backgroundIntensity: newIntensity }
            : p
        ),
      });
    }
  };

  const softBackgrounds = BACKGROUND_PRESETS.filter(p => p.category === 'soft');
  const basicBackgrounds = BACKGROUND_PRESETS.filter(p => p.category === 'basic');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-[1100px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3>Animated Backgrounds</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Section */}
        {currentPage?.backgroundAnimation && currentPage.backgroundAnimation !== 'none' && (
          <div className="p-4 border-b border-zinc-800 bg-zinc-800/30">
            <div className="grid grid-cols-2 gap-4">
              {/* Speed Control */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <label className="text-sm">Speed: {speed.toFixed(1)}x</label>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => updateSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>Slow (0.1x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Fast (2.0x)</span>
                </div>
              </div>

              {/* Intensity Control */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-4 h-4 text-purple-400" />
                  <label className="text-sm">Intensity: {intensity.toFixed(1)}x</label>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={intensity}
                  onChange={(e) => updateIntensity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>Subtle (0.1x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Bold (2.0x)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {/* SOFT BACKGROUNDS SECTION */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h4>Soft Backgrounds</h4>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {softBackgrounds.map(preset => {
                const isActive = currentPage?.backgroundAnimation === preset.id;
                
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyBackground(preset.id)}
                    className={`relative group flex flex-col rounded-lg overflow-hidden border-2 transition-all ${
                      isActive
                        ? 'border-purple-500 ring-2 ring-purple-500/50'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    {/* Preview */}
                    <div
                      className="w-full h-32 relative"
                      style={{
                        background: preset.preview,
                      }}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-purple-500 text-white px-2 py-1 rounded text-xs">
                            Active
                          </div>
                        </div>
                      )}
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-xs px-3 py-1.5 bg-black/60 rounded">
                          Apply
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-2 bg-zinc-800/50 text-left">
                      <div className="text-xs mb-0.5">{preset.name}</div>
                      <div className="text-xs text-zinc-500 text-[10px]">{preset.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BASIC */}
          <div>
            <div className="grid grid-cols-6 gap-2">
              {basicBackgrounds.map(preset => {
                const isActive = currentPage?.backgroundAnimation === preset.id;
                
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyBackground(preset.id)}
                    className={`relative group flex flex-col rounded overflow-hidden border-2 transition-all ${
                      isActive
                        ? 'border-zinc-500 ring-2 ring-zinc-500/50'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div
                      className="w-full h-16 relative"
                      style={{
                        background: preset.preview,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-xs">
                        {preset.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
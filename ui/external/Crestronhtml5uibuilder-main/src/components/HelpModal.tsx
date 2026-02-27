import { X, Keyboard, Mouse, Info } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-800/95 border-2 border-emerald-500/30 rounded-2xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl shadow-emerald-500/20 backdrop-blur-xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-zinc-700/50 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-emerald-500/10">
          <h3 className="text-xl font-semibold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Help & Shortcuts</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Quick Start */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-400" />
              <h4>Quick Start</h4>
            </div>
            <div className="space-y-2 text-sm text-zinc-300">
              <p>1. Create a new page or use the default Main Page</p>
              <p>2. Drag components from the Library onto the Canvas</p>
              <p>3. Select elements to configure properties and Crestron joins</p>
              <p>4. Export to HTML5 when ready to deploy</p>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="w-5 h-5 text-blue-400" />
              <h4>Keyboard Shortcuts</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                <span>Delete Element</span>
                <kbd className="px-2 py-1 bg-zinc-700 rounded text-xs">Delete</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                <span>Delete Element</span>
                <kbd className="px-2 py-1 bg-zinc-700 rounded text-xs">Backspace</kbd>
              </div>
            </div>
          </div>

          {/* Mouse Controls */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Mouse className="w-5 h-5 text-blue-400" />
              <h4>Mouse Controls</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                <span>Pan Canvas</span>
                <span className="text-xs text-zinc-400">Shift + Drag</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                <span>Pan Canvas</span>
                <span className="text-xs text-zinc-400">Middle Mouse + Drag</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                <span>Move Element</span>
                <span className="text-xs text-zinc-400">Click + Drag</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                <span>Resize Element</span>
                <span className="text-xs text-zinc-400">Drag Corner Handle</span>
              </div>
            </div>
          </div>

          {/* Crestron Joins */}
          <div>
            <h4 className="mb-3">Crestron Join Types</h4>
            <div className="space-y-2 text-sm">
              <div className="p-3 bg-zinc-800 rounded">
                <div className="mb-1">
                  <strong className="text-blue-400">Digital Joins</strong>
                </div>
                <p className="text-zinc-400">
                  Boolean values (true/false). Used for button presses, feedback, and on/off states.
                </p>
              </div>
              <div className="p-3 bg-zinc-800 rounded">
                <div className="mb-1">
                  <strong className="text-green-400">Analog Joins</strong>
                </div>
                <p className="text-zinc-400">
                  Numeric values (0-65535). Used for sliders, gauges, volume levels, and position values.
                </p>
              </div>
              <div className="p-3 bg-zinc-800 rounded">
                <div className="mb-1">
                  <strong className="text-purple-400">Serial Joins</strong>
                </div>
                <p className="text-zinc-400">
                  Text strings. Used for dynamic text, labels, and data exchange.
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div>
            <h4 className="mb-3">Tips</h4>
            <div className="space-y-2 text-sm text-zinc-300">
              <p>• Use templates to save common UI layouts</p>
              <p>• Organize elements in the Project Tree for easy navigation</p>
              <p>• Test exported HTML5 files in a web browser before deploying</p>
              <p>• Join numbers should match your Crestron program configuration</p>
              <p>• Use descriptive names for elements to identify them easily</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
import { X } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-800/95 border-2 border-orange-500/30 rounded-2xl w-[500px] shadow-2xl shadow-orange-500/20 backdrop-blur-xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-zinc-700/50 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10">
          <h3 className="text-xl font-semibold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Settings</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h4 className="mb-3">General</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 bg-zinc-800 rounded cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span className="text-sm">Auto-save project</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-zinc-800 rounded cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span className="text-sm">Show grid</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-zinc-800 rounded cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">Snap to grid</span>
              </label>
            </div>
          </div>

          <div>
            <h4 className="mb-3">Crestron Connection</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-sm mb-1">Default Host</label>
                <input
                  type="text"
                  placeholder="localhost"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Default Port</label>
                <input
                  type="number"
                  placeholder="49200"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3">About</h4>
            <div className="p-3 bg-zinc-800 rounded text-sm space-y-1">
              <p>Crestron UI Builder v1.0</p>
              <p className="text-zinc-500">
                Professional HTML5 UI builder for Crestron control systems
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
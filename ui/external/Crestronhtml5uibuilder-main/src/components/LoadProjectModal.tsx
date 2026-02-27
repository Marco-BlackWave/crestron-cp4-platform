import { useRef } from 'react';
import { X, Upload } from 'lucide-react';

interface LoadProjectModalProps {
  onLoad: (file: File) => void;
  onClose: () => void;
}

export function LoadProjectModal({ onLoad, onClose }: LoadProjectModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoad(file);
      onClose();
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-800/95 border-2 border-blue-500/30 rounded-2xl w-96 shadow-2xl shadow-blue-500/20 backdrop-blur-xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-zinc-700/50 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10">
          <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Load Project</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          <button
            onClick={handleClick}
            className="w-full p-8 border-2 border-dashed border-zinc-700 hover:border-blue-500 hover:bg-blue-500/5 rounded-xl flex flex-col items-center gap-3 transition-all duration-200 hover:scale-[1.02]"
          >
            <Upload className="w-12 h-12 text-zinc-500" />
            <div className="text-center">
              <p className="mb-1">Click to select project file</p>
              <p className="text-sm text-zinc-500">.crestron files</p>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".crestron,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-zinc-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
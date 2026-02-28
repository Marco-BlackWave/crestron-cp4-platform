import { useState } from 'react';
import { X } from 'lucide-react';
import { Project } from '../types/crestron';

interface SaveAsModalProps {
  project: Project;
  setProject: (project: Project) => void;
  onClose: () => void;
}

export function SaveAsModal({ project, setProject, onClose }: SaveAsModalProps) {
  const [projectName, setProjectName] = useState(project.name);

  const handleSave = () => {
    const updatedProject = { ...project, name: projectName };
    setProject(updatedProject);

    const projectData = JSON.stringify(updatedProject, null, 2);
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.crestron`;
    a.click();
    URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-800/95 border-2 border-green-500/30 rounded-2xl w-96 shadow-2xl shadow-green-500/20 backdrop-blur-xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-zinc-700/50 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10">
          <h3 className="text-xl font-semibold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Save Project As</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm mb-2 text-zinc-300">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800/80 border border-zinc-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-zinc-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!projectName.trim()}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-green-500/20"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
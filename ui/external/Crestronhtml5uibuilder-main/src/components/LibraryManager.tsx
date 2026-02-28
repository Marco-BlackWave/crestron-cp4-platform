import { X, Plus, Trash2, Download, Upload } from 'lucide-react';
import { Project, Library, CrestronElement } from '../types/crestron';
import { useState } from 'react';

interface LibraryManagerProps {
  project: Project;
  setProject: (project: Project) => void;
  onClose: () => void;
}

export function LibraryManager({ project, setProject, onClose }: LibraryManagerProps) {
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);

  const handleCreateLibrary = () => {
    const libraryName = prompt('Enter library name:');
    if (!libraryName) return;

    const newLibrary: Library = {
      id: `library_${Date.now()}`,
      name: libraryName,
      components: [],
    };

    setProject({
      ...project,
      libraries: [...project.libraries, newLibrary],
    });
  };

  const handleDeleteLibrary = (libraryId: string) => {
    // Delete library directly
    setProject({
      ...project,
      libraries: project.libraries.filter((l) => l.id !== libraryId),
    });
    if (selectedLibrary?.id === libraryId) {
      setSelectedLibrary(null);
    }
  };

  const handleExportLibrary = (library: Library) => {
    const libraryData = JSON.stringify(library, null, 2);
    const blob = new Blob([libraryData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${library.name.replace(/\s+/g, '_')}.crestron-library`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportLibrary = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.crestron-library';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const library = JSON.parse(event.target?.result as string);
          setProject({
            ...project,
            libraries: [...project.libraries, library],
          });
        } catch (error) {
          alert('Error importing library');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-[800px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3>Component Libraries</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Libraries List */}
          <div className="w-64 border-r border-zinc-800 flex flex-col">
            <div className="p-3 border-b border-zinc-800">
              <button
                onClick={handleCreateLibrary}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                New Library
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {project.libraries.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No libraries yet
                </div>
              ) : (
                project.libraries.map((library) => (
                  <div
                    key={library.id}
                    className={`p-3 mb-2 rounded cursor-pointer transition-colors ${
                      selectedLibrary?.id === library.id
                        ? 'bg-blue-600'
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                    onClick={() => setSelectedLibrary(library)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm mb-1">{library.name}</div>
                        <div className="text-xs text-zinc-400">
                          {library.components.length} component{library.components.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLibrary(library.id);
                        }}
                        className="p-1 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-zinc-800">
              <button
                onClick={handleImportLibrary}
                className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" />
                Import Library
              </button>
            </div>
          </div>

          {/* Library Details */}
          <div className="flex-1 flex flex-col">
            {selectedLibrary ? (
              <>
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <h4>{selectedLibrary.name}</h4>
                    <p className="text-sm text-zinc-400">
                      {selectedLibrary.components.length} component{selectedLibrary.components.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportLibrary(selectedLibrary)}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {selectedLibrary.components.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                      <p className="mb-2">No components in this library</p>
                      <p className="text-sm">
                        Add components by dragging elements from your project
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLibrary.components.map((component) => (
                        <div
                          key={component.id}
                          className="p-4 bg-zinc-800 rounded border border-zinc-700 hover:border-zinc-600"
                        >
                          <div className="mb-2">
                            <div className="text-sm mb-1">{component.name}</div>
                            <div className="text-xs text-zinc-400">
                              {component.type} • {component.width}x{component.height}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">
                              Use
                            </button>
                            <button className="px-2 py-1 bg-zinc-700 hover:bg-red-600 rounded text-xs">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500">
                Select a library to view components
              </div>
            )}
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
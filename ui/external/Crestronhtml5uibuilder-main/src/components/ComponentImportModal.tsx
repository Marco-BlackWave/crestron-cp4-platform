// COMPONENT IMPORT MODAL
// Drag & drop / upload JSX/TSX files, parse, select, and save to libraries

import { useState, useRef } from 'react';
import { X, Upload, FileCode, AlertCircle, Check, Package, Sparkles } from 'lucide-react';
import { parseJSXFile, ParsedComponent, generateDefaultJoins } from '../utils/jsxParser';
import { ComponentPreviewCard } from './ComponentPreviewCard';
import { Project, ExternalLibrary } from '../types/crestron';

interface ComponentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onImport: (components: ImportedComponent[], targetLibraryId: string) => void;
}

interface ImportedComponent {
  originalName: string;
  customName: string;
  code: string;
  parsedData: ParsedComponent;
  icon: string;
  joins: {
    digital: number;
    analog: number;
    serial: number;
  };
  config: {
    width: number;
    height: number;
  };
}

export function ComponentImportModal({ isOpen, onClose, project, onImport }: ComponentImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedComponents, setParsedComponents] = useState<ParsedComponent[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());
  const [componentConfigs, setComponentConfigs] = useState<Map<string, ImportedComponent>>(new Map());
  const [targetLibraryId, setTargetLibraryId] = useState<string>('');
  const [newLibraryName, setNewLibraryName] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'configure'>('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    setError('');
    
    if (!file.name.match(/\.(tsx|jsx|ts|js)$/)) {
      setError('Please upload a .tsx, .jsx, .ts, or .js file');
      return;
    }

    try {
      const content = await file.text();
      const result = parseJSXFile(content);

      if (!result.success || result.components.length === 0) {
        setError(result.errors?.join(', ') || 'No components found in file');
        return;
      }

      // Initialize component configs
      const configs = new Map<string, ImportedComponent>();
      const selected = new Set<string>();

      result.components.forEach((comp, idx) => {
        const defaultJoins = generateDefaultJoins(idx);
        configs.set(comp.name, {
          originalName: comp.name,
          customName: comp.name,
          code: comp.code,
          parsedData: comp,
          icon: 'Box',
          joins: defaultJoins,
          config: {
            width: comp.estimatedSize.width,
            height: comp.estimatedSize.height,
          },
        });
        selected.add(comp.name); // Select all by default
      });

      setFileName(file.name);
      setParsedComponents(result.components);
      setComponentConfigs(configs);
      setSelectedComponents(selected);
      setStep('configure');

      // Auto-select first library or create new
      if (project.libraries.length > 0) {
        setTargetLibraryId(project.libraries[0].id);
      } else {
        setNewLibraryName('Imported Components');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const toggleComponent = (name: string) => {
    const newSelected = new Set(selectedComponents);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedComponents(newSelected);
  };

  const updateComponentConfig = (name: string, updates: Partial<ImportedComponent>) => {
    const config = componentConfigs.get(name);
    if (config) {
      componentConfigs.set(name, { ...config, ...updates });
      setComponentConfigs(new Map(componentConfigs));
    }
  };

  const handleImport = () => {
    const componentsToImport = Array.from(selectedComponents)
      .map(name => componentConfigs.get(name))
      .filter((c): c is ImportedComponent => c !== undefined);

    if (componentsToImport.length === 0) {
      setError('Please select at least one component');
      return;
    }

    let libraryId = targetLibraryId;

    // Create new library if needed
    if (!libraryId && newLibraryName) {
      libraryId = `library_${Date.now()}`;
    } else if (!libraryId) {
      setError('Please select or create a library');
      return;
    }

    onImport(componentsToImport, libraryId);
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setFileName('');
    setParsedComponents([]);
    setSelectedComponents(new Set());
    setComponentConfigs(new Map());
    setError('');
    setTargetLibraryId('');
    setNewLibraryName('');
    onClose();
  };

  const selectedCount = selectedComponents.size;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-800/95 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-2 border-indigo-500/30 shadow-indigo-500/20 backdrop-blur-xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700/50 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Import Components</h2>
              <p className="text-sm text-zinc-400">
                {step === 'upload' ? 'Upload JSX/TSX file' : `${parsedComponents.length} components found`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  dragOver
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                }`}
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-zinc-500" />
                <h3 className="text-lg font-semibold mb-2">Drop JSX/TSX file here</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Or click to browse files
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  Select File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".tsx,.jsx,.ts,.js"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                  <FileCode className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200 space-y-2">
                    <p className="font-semibold">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-300">
                      <li>Upload a file with React components (JSX/TSX)</li>
                      <li>We'll automatically detect all exported components</li>
                      <li>Select which ones to import and configure them</li>
                      <li>Choose a library to save them to</li>
                      <li>Use them in your Crestron interface with drag & drop!</li>
                    </ol>
                    <p className="text-xs text-blue-400 mt-3">
                      💡 <strong>120% UI Fidelity:</strong> Your components stay exactly as designed!
                    </p>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CONFIGURE */}
          {step === 'configure' && (
            <div className="space-y-6">
              {/* File Info */}
              <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileCode className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium">{fileName}</p>
                      <p className="text-xs text-zinc-500">
                        {parsedComponents.length} component{parsedComponents.length !== 1 ? 's' : ''} detected
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Upload different file
                  </button>
                </div>
              </div>

              {/* Target Library Selection */}
              <div>
                <label className="text-sm font-semibold text-zinc-300 mb-2 block">
                  Save to Library
                </label>
                <div className="space-y-2">
                  {/* Existing Libraries */}
                  {project.libraries.map((lib) => (
                    <button
                      key={lib.id}
                      onClick={() => {
                        setTargetLibraryId(lib.id);
                        setNewLibraryName('');
                      }}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
                        targetLibraryId === lib.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-400" />
                        <div className="flex-1">
                          <p className="font-medium">{lib.name}</p>
                          <p className="text-xs text-zinc-500">
                            {lib.components.length} existing component{lib.components.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {targetLibraryId === lib.id && (
                          <Check className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                    </button>
                  ))}

                  {/* New Library */}
                  <div
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      newLibraryName
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-zinc-700 bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <input
                        type="text"
                        value={newLibraryName}
                        onChange={(e) => {
                          setNewLibraryName(e.target.value);
                          setTargetLibraryId('');
                        }}
                        placeholder="Create new library..."
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Components List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-zinc-300">
                    Select Components ({selectedCount} of {parsedComponents.length})
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedComponents(new Set(parsedComponents.map(c => c.name)))}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedComponents(new Set())}
                      className="text-xs text-zinc-500 hover:text-zinc-400"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {parsedComponents.map((component) => {
                    const config = componentConfigs.get(component.name);
                    if (!config) return null;

                    return (
                      <ComponentPreviewCard
                        key={component.name}
                        component={component}
                        selected={selectedComponents.has(component.name)}
                        onToggle={() => toggleComponent(component.name)}
                        customName={config.customName}
                        onNameChange={(name) => updateComponentConfig(component.name, { customName: name })}
                        icon={config.icon}
                        onIconChange={(icon) => updateComponentConfig(component.name, { icon })}
                        joins={config.joins}
                        onJoinsChange={(joins) => updateComponentConfig(component.name, { joins })}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'configure' && (
          <div className="border-t border-zinc-800 p-6 bg-zinc-950">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                {selectedCount} component{selectedCount !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedCount === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Import {selectedCount} Component{selectedCount !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
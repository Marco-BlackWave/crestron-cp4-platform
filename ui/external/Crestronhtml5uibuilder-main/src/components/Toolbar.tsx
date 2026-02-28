import { Save, FolderOpen, FileDown, FileUp, Layout, Library, Settings, Play, FileStack, HelpCircle, Undo, Redo, Copy, Clipboard, Search, PanelRight, Eye, ChevronDown, FilePlus, Sparkles, Zap, Monitor, FileCode2, Wand2, BookmarkPlus } from 'lucide-react';
import { Project, HistoryState } from '../types/crestron';
import { exportToHTML } from '../utils/export';
import { useState, useRef, useEffect } from 'react';
import { SaveAsModal } from './SaveAsModal';
import { LoadProjectModal } from './LoadProjectModal';
import { ExportModal } from './ExportModal';
import { SettingsModal } from './SettingsModal';
import { TemplatesModal } from './TemplatesModal';
import { HelpModal } from './HelpModal';
import { JoinInspector } from './JoinInspector';
import { PreviewModal } from './PreviewModal';
import { HistoryButtons } from './HistoryButtons';
import { BackgroundLibraryModal } from './BackgroundLibraryModal';
import { ImportHubModal } from './ImportHubModal';

interface ToolbarProps {
  project: Project;
  setProject: (project: Project | ((prev: Project) => Project)) => void;
  currentPageId: string;
  showProjectTree: boolean;
  setShowProjectTree: (show: boolean) => void;
  showLibrary: boolean;
  setShowLibrary: (show: boolean) => void;
  showProperties: boolean;
  setShowProperties: (show: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onCopy: () => void;
  onPaste: () => void;
  canCopy: boolean;
  canPaste: boolean;
  history: HistoryState[];
  historyIndex: number;
  onJumpToHistory: (index: number) => void;
  onAutoLayout?: () => void;
  onImportCSharpJoins?: () => void;
  onShowComponentImport?: () => void;
  onShowExternalLibs?: () => void;
}

export function Toolbar({
  project,
  setProject,
  currentPageId,
  showProjectTree,
  setShowProjectTree,
  showLibrary,
  setShowLibrary,
  showProperties,
  setShowProperties,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onCopy,
  onPaste,
  canCopy,
  canPaste,
  history,
  historyIndex,
  onJumpToHistory,
  onAutoLayout,
  onImportCSharpJoins,
  onShowComponentImport,
  onShowExternalLibs,
}: ToolbarProps) {
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showJoinInspector, setShowJoinInspector] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFileDropdown, setShowFileDropdown] = useState(false);
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [showImportHub, setShowImportHub] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFileDropdown(false);
      }
    };

    if (showFileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFileDropdown]);

  const createNewProject = () => {
    // Auto-save handles save, just create new project directly
    const newProject: Project = {
      name: 'New Project',
      pages: [
        {
          id: `page_${Date.now()}`,
          name: 'Page 1',
          width: 1024,
          height: 768,
          elements: [],
          backgroundColor: '#18181b',
        },
      ],
      templates: [],
      libraries: [],
    };
    setProject(newProject);
    setShowFileDropdown(false);
  };

  const saveProject = () => {
    const projectData = JSON.stringify(project, null, 2);
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.crestron`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loadedProject = JSON.parse(e.target?.result as string);
        setProject(loadedProject);
      } catch (error) {
        alert('Error loading project file');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    setShowExport(true);
  };

  return (
    <>
      <div className="h-12 bg-zinc-950 border-b border-zinc-800 flex items-center px-3 gap-1.5">
        {/* Logo / Brand */}
        <div className="mr-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Monitor className="w-4 h-4 text-white" />
          </div>
          <div className="leading-none">
            <h1 className="text-sm tracking-tight text-white">Crestron UI Builder</h1>
            <span className="text-[9px] text-cyan-400/70 tracking-wider">HTML5 STUDIO</span>
          </div>
        </div>

        {/* File Menu */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setShowFileDropdown(!showFileDropdown)}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-sm transition-all ${showFileDropdown ? 'bg-zinc-700 text-white' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}
            title="File"
          >
            <span>File</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showFileDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-zinc-800/95 backdrop-blur-xl border border-zinc-600/50 rounded-xl shadow-2xl shadow-black/50 z-50 min-w-[200px] py-1.5 overflow-hidden">
              <button
                onClick={() => { createNewProject(); setShowFileDropdown(false); }}
                className="px-4 py-2 w-full text-left hover:bg-zinc-700/80 flex items-center gap-2.5 text-sm transition-colors"
              >
                <FilePlus className="w-4 h-4 text-zinc-400" />
                <span>New Project</span>
                <span className="ml-auto text-[10px] text-zinc-600">Ctrl+N</span>
              </button>
              <div className="h-px bg-zinc-700/50 my-1" />
              <button
                onClick={() => { saveProject(); setShowFileDropdown(false); }}
                className="px-4 py-2 w-full text-left hover:bg-zinc-700/80 flex items-center gap-2.5 text-sm transition-colors"
              >
                <Save className="w-4 h-4 text-zinc-400" />
                <span>Save</span>
                <span className="ml-auto text-[10px] text-zinc-600">Ctrl+S</span>
              </button>
              <button
                onClick={() => { setShowSaveAs(true); setShowFileDropdown(false); }}
                className="px-4 py-2 w-full text-left hover:bg-zinc-700/80 flex items-center gap-2.5 text-sm transition-colors"
              >
                <Save className="w-4 h-4 text-zinc-400" />
                <span>Save As...</span>
              </button>
              <button
                onClick={() => { setShowLoad(true); setShowFileDropdown(false); }}
                className="px-4 py-2 w-full text-left hover:bg-zinc-700/80 flex items-center gap-2.5 text-sm transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-zinc-400" />
                <span>Open Project</span>
                <span className="ml-auto text-[10px] text-zinc-600">Ctrl+O</span>
              </button>
              <div className="h-px bg-zinc-700/50 my-1" />
              <button
                onClick={() => { setShowTemplates(true); setShowFileDropdown(false); }}
                className="px-4 py-2 w-full text-left hover:bg-zinc-700/80 flex items-center gap-2.5 text-sm transition-colors"
              >
                <FileStack className="w-4 h-4 text-purple-400" />
                <span>Templates</span>
              </button>
              <button
                onClick={() => {
                  const templateName = prompt('Save current project as reusable template:\n\nTemplate name:', project.name + ' Template');
                  if (!templateName) return;
                  const template = {
                    id: `template_${Date.now()}`,
                    name: templateName,
                    description: `Saved from "${project.name}" — ${project.pages.length} pages, ${project.pages.reduce((s, p) => s + p.elements.length, 0)} elements. Pixel-perfect snapshot.`,
                    pages: JSON.parse(JSON.stringify(project.pages)),
                  };
                  // Export as .crestron-template file
                  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${templateName.replace(/\s+/g, '_')}.crestron-template`;
                  a.click();
                  URL.revokeObjectURL(url);
                  // Also add to project templates
                  setProject({ ...project, templates: [...project.templates, template] });
                  setShowFileDropdown(false);
                }}
                className="px-4 py-2 w-full text-left hover:bg-zinc-700/80 flex items-center gap-2.5 text-sm transition-colors"
              >
                <BookmarkPlus className="w-4 h-4 text-emerald-400" />
                <span>Save as Template</span>
              </button>
              <div className="h-px bg-zinc-700/50 my-1" />
              <button
                onClick={() => { setShowImportHub(true); setShowFileDropdown(false); }}
                className="px-4 py-2 w-full text-left hover:bg-zinc-700/80 flex items-center gap-2.5 text-sm transition-colors"
              >
                <FileUp className="w-4 h-4 text-cyan-400" />
                <span>Import Hub</span>
                <span className="ml-auto text-[10px] text-zinc-600">Ctrl+I</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* History (Undo/Redo) */}
        <HistoryButtons
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          history={history}
          historyIndex={historyIndex}
          onJumpToHistory={onJumpToHistory}
        />

        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* Copy/Paste */}
        <button
          onClick={onCopy}
          disabled={!canCopy}
          className={`p-1.5 rounded-lg transition-all ${canCopy ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'text-zinc-700 cursor-not-allowed'}`}
          title="Copy (Ctrl+C)"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onPaste}
          disabled={!canPaste}
          className={`p-1.5 rounded-lg transition-all ${canPaste ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'text-zinc-700 cursor-not-allowed'}`}
          title="Paste (Ctrl+V)"
        >
          <Clipboard className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* Primary Actions */}
        <button
          onClick={() => setShowPreview(true)}
          className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/10"
          title="Preview"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="text-sm">Preview</span>
        </button>

        <button
          onClick={handleExport}
          className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
          title="Export Crestron HTML5"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="text-sm">Export</span>
        </button>

        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* Panel Toggles */}
        <button
          onClick={() => setShowProjectTree(!showProjectTree)}
          className={`p-1.5 rounded-lg transition-all ${showProjectTree ? 'bg-blue-600/80 text-white' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}
          title="Pages Panel"
        >
          <Layout className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className={`p-1.5 rounded-lg transition-all ${showLibrary ? 'bg-blue-600/80 text-white' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}
          title="Component Library"
        >
          <Library className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowBackgrounds(true)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 transition-all"
          title="Animated Backgrounds"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowProperties(!showProperties)}
          className={`p-1.5 rounded-lg transition-all ${showProperties ? 'bg-blue-600/80 text-white' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}
          title="Properties Panel"
        >
          <PanelRight className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Project Info */}
        <span className="text-[10px] text-zinc-600 mr-2 hidden xl:block">
          {project.pages.length} pages | {project.pages.reduce((sum, p) => sum + p.elements.length, 0)} elements
        </span>

        {/* Right Side Tools */}
        <button
          onClick={() => setShowJoinInspector(true)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
          title="Join Inspector"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowHelp(true)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
          title="Help & Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {showSaveAs && (
        <SaveAsModal
          project={project}
          setProject={setProject}
          onClose={() => setShowSaveAs(false)}
        />
      )}

      {showLoad && (
        <LoadProjectModal
          onLoad={loadProject}
          onClose={() => setShowLoad(false)}
        />
      )}

      {showExport && (
        <ExportModal
          project={project}
          onClose={() => setShowExport(false)}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showTemplates && (
        <TemplatesModal
          project={project}
          setProject={setProject}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}

      {showJoinInspector && (
        <JoinInspector
          project={project}
          onClose={() => setShowJoinInspector(false)}
        />
      )}

      {showPreview && (
        <PreviewModal
          project={project}
          currentPageId={currentPageId}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showBackgrounds && (
        <BackgroundLibraryModal
          project={project}
          setProject={setProject}
          currentPageId={currentPageId}
          onClose={() => setShowBackgrounds(false)}
        />
      )}

      {showImportHub && (
        <ImportHubModal
          isOpen={showImportHub}
          onClose={() => setShowImportHub(false)}
          project={project}
          setProject={setProject}
          onShowComponentImport={onShowComponentImport}
          onShowExternalLibs={onShowExternalLibs}
        />
      )}
    </>
  );
}
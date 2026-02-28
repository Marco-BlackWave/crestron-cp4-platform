import { useState, useRef, type ReactNode } from 'react';
import { X, Download, Code, Copy, Check, Eye, EyeOff, Zap, FileCode, Globe, Bug, Smartphone, MonitorSmartphone } from 'lucide-react';
import { Project } from '../types/crestron';
import { exportToHTML } from '../utils/export';
import { exportToReact } from '../utils/exportReact';
import { exportToTailwindHTML } from '../utils/exportTailwindHTML';

interface ExportModalProps {
  project: Project;
  onClose: () => void;
}

type ExportFormat = 'tailwind' | 'html' | 'react';

export function ExportModal({ project, onClose }: ExportModalProps) {
  const [selectedPages, setSelectedPages] = useState<Set<string>>(
    new Set(project.pages.map((p) => p.id))
  );
  const [includeRuntime, setIncludeRuntime] = useState(true);
  const [includeDebugPanel, setIncludeDebugPanel] = useState(false);
  const [touchOptimized, setTouchOptimized] = useState(true);
  const [includeAnimations, setIncludeAnimations] = useState(true);
  const [preview, setPreview] = useState(false);
  const [livePreview, setLivePreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('tailwind');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const filteredProject = { ...project, pages: project.pages.filter((p) => selectedPages.has(p.id)) };

  const getExportCode = () => {
    switch (exportFormat) {
      case 'tailwind':
        return exportToTailwindHTML(filteredProject, {
          includeRuntime,
          includeDebugPanel,
          touchOptimized,
          includeAnimations,
          darkMode: true,
        });
      case 'react':
        return exportToReact(filteredProject, includeRuntime);
      case 'html':
        return exportToHTML(filteredProject, includeRuntime);
      default:
        return '';
    }
  };

  const handleExport = () => {
    const code = getExportCode();
    
    if (exportFormat === 'react') {
      const blob = new Blob([code], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_react_project.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = exportFormat === 'tailwind' ? '_tailwind' : '';
      a.download = `${project.name.replace(/\s+/g, '_')}${suffix}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }

    onClose();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getExportCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLivePreview = () => {
    setLivePreview(!livePreview);
    if (!livePreview) {
      setTimeout(() => {
        if (iframeRef.current) {
          const code = getExportCode();
          const blob = new Blob([code], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          iframeRef.current.src = url;
        }
      }, 100);
    }
  };

  const togglePage = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  const totalElements = filteredProject.pages.reduce((sum, p) => sum + p.elements.length, 0);

  const formatConfigs: { id: ExportFormat; icon: ReactNode; title: string; badge?: string; desc: string }[] = [
    {
      id: 'tailwind',
      icon: <Zap className="w-5 h-5 text-cyan-400" />,
      title: 'Tailwind CSS HTML5',
      badge: 'RECOMMENDED',
      desc: 'Production-ready single file with Tailwind CDN, glass morphism, touch optimization, WebSocket bridge v3.0'
    },
    {
      id: 'react',
      icon: <FileCode className="w-5 h-5 text-blue-400" />,
      title: 'React + Vite Project',
      desc: 'Full React project structure with Lucide icons, components, and Vite bundler'
    },
    {
      id: 'html',
      icon: <Globe className="w-5 h-5 text-amber-400" />,
      title: 'Legacy HTML5',
      desc: 'Basic HTML file with inline CSS and vanilla JavaScript'
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl flex flex-col shadow-2xl ${livePreview ? 'w-[95vw] h-[90vh]' : 'w-[680px] max-h-[85vh]'} transition-all duration-300`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg">Export Crestron HTML5</h3>
              <p className="text-xs text-zinc-500">
                {selectedPages.size} pages, {totalElements} elements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLivePreview}
              className={`p-2 rounded-lg transition-all ${livePreview ? 'bg-green-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}
              title="Live Preview"
            >
              {livePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className={`flex flex-1 overflow-hidden ${livePreview ? 'flex-row' : 'flex-col'}`}>
          {/* Settings Panel */}
          <div className={`overflow-y-auto p-5 space-y-5 ${livePreview ? 'w-[380px] flex-shrink-0 border-r border-zinc-700/50' : 'flex-1'}`}>
            {/* Export Format Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Export Format</label>
              <div className="space-y-2">
                {formatConfigs.map(fmt => (
                  <label
                    key={fmt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                      exportFormat === fmt.id
                        ? 'bg-zinc-800 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                        : 'bg-zinc-800/50 border-zinc-700/30 hover:bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={exportFormat === fmt.id}
                      onChange={() => setExportFormat(fmt.id)}
                      className="w-4 h-4 mt-0.5 accent-cyan-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {fmt.icon}
                        <span className="text-sm">{fmt.title}</span>
                        {fmt.badge && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            {fmt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{fmt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Page Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-zinc-400">Pages</label>
                <button
                  onClick={() => {
                    if (selectedPages.size === project.pages.length) {
                      setSelectedPages(new Set());
                    } else {
                      setSelectedPages(new Set(project.pages.map(p => p.id)));
                    }
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {selectedPages.size === project.pages.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {project.pages.map((page) => (
                  <label
                    key={page.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      selectedPages.has(page.id) ? 'bg-zinc-800 text-white' : 'bg-zinc-800/30 text-zinc-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPages.has(page.id)}
                      onChange={() => togglePage(page.id)}
                      className="w-3.5 h-3.5 accent-cyan-500"
                    />
                    <span className="text-sm flex-1 truncate">{page.name}</span>
                    <span className="text-[10px] text-zinc-600">
                      {page.width}x{page.height} | {page.elements.length}el
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Options</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-3 px-3 py-2 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={includeRuntime}
                    onChange={(e) => setIncludeRuntime(e.target.checked)}
                    className="w-3.5 h-3.5 accent-cyan-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-green-400" />
                      Crestron WebSocket Runtime
                    </div>
                    <div className="text-[10px] text-zinc-500">WebSocket bridge with heartbeat, reconnect, pulse/toggle/ramp</div>
                  </div>
                </label>

                {exportFormat === 'tailwind' && (
                  <>
                    <label className="flex items-center gap-3 px-3 py-2 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
                      <input
                        type="checkbox"
                        checked={touchOptimized}
                        onChange={(e) => setTouchOptimized(e.target.checked)}
                        className="w-3.5 h-3.5 accent-cyan-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm flex items-center gap-2">
                          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                          Touch Panel Optimization
                        </div>
                        <div className="text-[10px] text-zinc-500">Touch events, no-select, tap feedback, swipe navigation</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 px-3 py-2 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
                      <input
                        type="checkbox"
                        checked={includeAnimations}
                        onChange={(e) => setIncludeAnimations(e.target.checked)}
                        className="w-3.5 h-3.5 accent-cyan-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm flex items-center gap-2">
                          <MonitorSmartphone className="w-3.5 h-3.5 text-purple-400" />
                          Animations & Transitions
                        </div>
                        <div className="text-[10px] text-zinc-500">Page transitions, glow effects, background animations</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 px-3 py-2 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800">
                      <input
                        type="checkbox"
                        checked={includeDebugPanel}
                        onChange={(e) => setIncludeDebugPanel(e.target.checked)}
                        className="w-3.5 h-3.5 accent-cyan-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm flex items-center gap-2">
                          <Bug className="w-3.5 h-3.5 text-amber-400" />
                          Debug Console
                        </div>
                        <div className="text-[10px] text-zinc-500">Join testing panel for development (remove in production)</div>
                      </div>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Code Preview Toggle */}
            <div>
              <button
                onClick={() => setPreview(!preview)}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-400 transition-colors"
              >
                <Code className="w-4 h-4" />
                {preview ? 'Hide' : 'Show'} Source Code
              </button>

              {preview && (
                <div className="mt-2 relative">
                  <button
                    onClick={handleCopyCode}
                    className="absolute top-2 right-2 p-1.5 bg-zinc-700/80 hover:bg-zinc-600 rounded-lg transition-all z-10"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] overflow-x-auto max-h-48 overflow-y-auto font-mono leading-relaxed text-zinc-400">
                    {getExportCode().substring(0, 5000)}{getExportCode().length > 5000 ? '\n\n... [truncated - full code will be exported]' : ''}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Panel */}
          {livePreview && (
            <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
              <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-700/50 flex items-center gap-2 text-xs text-zinc-400 flex-shrink-0">
                <Eye className="w-3.5 h-3.5 text-green-400" />
                <span>Live Preview</span>
                <span className="text-zinc-600">|</span>
                <span>{filteredProject.pages[0]?.width || 0} x {filteredProject.pages[0]?.height || 0}</span>
                <div className="flex-1" />
                <button
                  onClick={() => {
                    if (iframeRef.current) {
                      const code = getExportCode();
                      const blob = new Blob([code], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      iframeRef.current.src = url;
                    }
                  }}
                  className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
                >
                  Refresh
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                <iframe
                  ref={iframeRef}
                  className="bg-black rounded-lg shadow-2xl border border-zinc-700"
                  style={{
                    width: Math.min(filteredProject.pages[0]?.width || 800, 1200),
                    height: Math.min(filteredProject.pages[0]?.height || 600, 700),
                    maxWidth: '100%',
                    maxHeight: '100%',
                  }}
                  title="Export Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyCode}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center gap-2 text-sm transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={selectedPages.size === 0}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Export {exportFormat === 'tailwind' ? 'Tailwind HTML5' : exportFormat === 'react' ? 'React Project' : 'HTML5'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
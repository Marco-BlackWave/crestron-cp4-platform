// IMPORT HUB MODAL
// Unified import center: New Library, Import Components, Import Files, Browse Libraries
// Smart ZIP Explorer with auto-exclude of junk files

import { useState, useRef, useMemo, type ReactNode } from 'react';
import { 
  X, Plus, Sparkles, Upload, Package, FileCode, FolderOpen, FileJson, 
  ArrowRight, CheckCircle, AlertCircle, Layers, Folder, File, 
  ChevronRight, ChevronDown, Eye, EyeOff, Filter, Archive,
  CheckSquare, Square, MinusSquare, Trash2, FileText, Image, Settings,
  Code, Copy, Check as CheckIcon, BookOpen, PanelLeft, Rocket, Download
} from 'lucide-react';
import { Project, Template, CrestronElement } from '../types/crestron';
import { parseJSXFile, generateDefaultJoins } from '../utils/jsxParser';
// Figma Make converter — lazy import to avoid potential bundler issues
const loadFigmaMakeConverter = () => import('../utils/figmaMakeConverter');

interface ImportHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  setProject: (project: Project | ((prev: Project) => Project)) => void;
  onShowComponentImport?: () => void;
  onShowExternalLibs?: () => void;
}

type ImportStep = 'hub' | 'new-library' | 'import-files' | 'zip-explorer' | 'zip-source-viewer' | 'import-result';

interface ImportResult {
  type: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  count?: number;
}

// ZIP file entry for the explorer
interface ZipFileEntry {
  path: string;
  name: string;
  isDir: boolean;
  size: number;
  ext: string;
  category: 'component' | 'style' | 'config' | 'asset' | 'data' | 'junk' | 'other';
  autoExcluded: boolean;
  selected: boolean;
  content?: string; // loaded on demand
}

// ── Auto-exclude patterns ──
const EXCLUDED_DIRS = [
  '.git', '.svn', '.hg', 'node_modules', '.next', '.nuxt', '.cache',
  'dist', 'build', 'out', '.turbo', '.vercel', '.netlify', 
  '__pycache__', '.vscode', '.idea', '.DS_Store', 'coverage',
  '.parcel-cache', '.webpack', 'tmp', 'temp',
];

const EXCLUDED_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  '.gitignore', '.gitattributes', '.npmrc', '.nvmrc', '.editorconfig',
  '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.cjs',
  '.prettierrc', '.prettierrc.js', '.prettierrc.json', '.prettierignore',
  'tsconfig.json', 'tsconfig.node.json', 'tsconfig.app.json',
  'vite.config.ts', 'vite.config.js', 'webpack.config.js', 'next.config.js',
  'next.config.mjs', 'next.config.ts', 'postcss.config.js', 'postcss.config.cjs',
  'tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs',
  'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
  'babel.config.js', '.babelrc', 'rollup.config.js',
  'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  '.env', '.env.local', '.env.development', '.env.production',
  'LICENSE', 'LICENSE.md', 'CHANGELOG.md', 'CONTRIBUTING.md',
  'Makefile', 'Procfile', '.dockerignore', 'renovate.json',
];

const EXCLUDED_EXTENSIONS = [
  'map', 'lock', 'log', 'pid', 'seed', 'swp', 'swo',
  'pyc', 'pyo', 'class', 'o', 'so', 'dll', 'exe',
  'woff', 'woff2', 'eot', 'ttf', 'otf', // fonts (not UI-relevant)
  'mp4', 'webm', 'mov', 'avi', // video
  'mp3', 'wav', 'ogg', 'flac', // audio
];

function categorizeFile(path: string, ext: string): ZipFileEntry['category'] {
  if (['tsx', 'jsx'].includes(ext)) return 'component';
  if (['ts', 'js'].includes(ext)) {
    if (path.includes('utils/') || path.includes('lib/') || path.includes('helpers/')) return 'data';
    if (path.includes('config') || path.includes('.config.')) return 'config';
    return 'component';
  }
  if (['css', 'scss', 'sass', 'less', 'styl'].includes(ext)) return 'style';
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) return 'data';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'avif'].includes(ext)) return 'asset';
  if (['md', 'txt', 'rst'].includes(ext)) return 'other';
  return 'other';
}

function shouldAutoExclude(path: string, name: string, ext: string): boolean {
  // Check directory patterns
  const parts = path.split('/');
  for (const part of parts) {
    if (EXCLUDED_DIRS.includes(part)) return true;
    if (part.startsWith('.') && part !== '.') return true; // hidden dirs
  }
  // Check file name
  if (EXCLUDED_FILES.includes(name)) return true;
  // Check extension
  if (EXCLUDED_EXTENSIONS.includes(ext)) return true;
  // Check patterns
  if (name.endsWith('.test.tsx') || name.endsWith('.test.ts') || name.endsWith('.test.js')) return true;
  if (name.endsWith('.spec.tsx') || name.endsWith('.spec.ts') || name.endsWith('.spec.js')) return true;
  if (name.endsWith('.stories.tsx') || name.endsWith('.stories.ts')) return true;
  if (name.endsWith('.d.ts')) return true;
  if (name.startsWith('.')) return true;
  
  return false;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORY_COLORS: Record<ZipFileEntry['category'], string> = {
  component: 'text-blue-400',
  style: 'text-purple-400',
  config: 'text-zinc-500',
  asset: 'text-amber-400',
  data: 'text-cyan-400',
  junk: 'text-zinc-600',
  other: 'text-zinc-500',
};

const CATEGORY_LABELS: Record<ZipFileEntry['category'], string> = {
  component: 'Component',
  style: 'Style',
  config: 'Config',
  asset: 'Asset',
  data: 'Data',
  junk: 'Excluded',
  other: 'Other',
};

export function ImportHubModal({ isOpen, onClose, project, setProject, onShowComponentImport, onShowExternalLibs }: ImportHubModalProps) {
  const [step, setStep] = useState<ImportStep>('hub');
  const [newLibName, setNewLibName] = useState('');
  const [newLibDescription, setNewLibDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ZIP Explorer state
  const [zipEntries, setZipEntries] = useState<ZipFileEntry[]>([]);
  const [zipName, setZipName] = useState('');
  const [zipRef, setZipRef] = useState<any>(null); // JSZip instance
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [showExcluded, setShowExcluded] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Source Viewer state
  const [viewerActiveFile, setViewerActiveFile] = useState<string>('');
  const [viewerFileContent, setViewerFileContent] = useState<string>('');
  const [viewerLoadingFile, setViewerLoadingFile] = useState(false);
  const [viewerCopied, setViewerCopied] = useState(false);
  const [viewerSidebarCollapsed, setViewerSidebarCollapsed] = useState(false);

  // Detected project files inside ZIP
  const [detectedProjectFiles, setDetectedProjectFiles] = useState<Array<{ path: string; name: string; type: 'project' | 'template'; pageCount: number; elementCount: number }>>([]);
  const [loadingProject, setLoadingProject] = useState(false);
  
  // Detected Figma Make ZIP
  const [detectedFigmaMake, setDetectedFigmaMake] = useState(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setStep('hub');
    setNewLibName('');
    setNewLibDescription('');
    setImportResults([]);
    setIsProcessing(false);
    setZipEntries([]);
    setZipName('');
    setZipRef(null);
    setExpandedDirs(new Set());
    setShowExcluded(false);
    setFilterCategory('all');
    setSearchQuery('');
    setDetectedProjectFiles([]);
    setDetectedFigmaMake(false);
    setLoadingProject(false);
    onClose();
  };

  // ── New Library ──
  const handleCreateLibrary = () => {
    if (!newLibName.trim()) return;

    const newLibrary = {
      id: `library_${Date.now()}`,
      name: newLibName.trim(),
      components: [],
    };

    setProject((prev: Project) => ({
      ...prev,
      libraries: [...prev.libraries, newLibrary],
    }));

    setImportResults([{
      type: 'success',
      message: `Library "${newLibName.trim()}" created!`,
      details: 'You can now add components to it from the Libraries tab.',
    }]);
    setStep('import-result');
  };

  // ── Open ZIP and scan contents ──
  const handleZipUpload = async (file: globalThis.File) => {
    setIsProcessing(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      setZipRef(zipContent);
      setZipName(file.name.replace(/\.zip$/, ''));

      const entries: ZipFileEntry[] = [];
      const dirSet = new Set<string>();

      zipContent.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) {
          dirSet.add(relativePath);
          return;
        }

        const name = relativePath.split('/').pop() || '';
        const ext = name.split('.').pop()?.toLowerCase() || '';
        const autoExcluded = shouldAutoExclude(relativePath, name, ext);
        const category = autoExcluded ? 'junk' : categorizeFile(relativePath, ext);

        entries.push({
          path: relativePath,
          name,
          isDir: false,
          size: 0, // We'll get this when reading
          ext,
          category,
          autoExcluded,
          selected: !autoExcluded && ['component', 'style', 'data', 'asset'].includes(category),
        });
      });

      // Get file sizes
      for (const entry of entries) {
        try {
          const data = await zipContent.file(entry.path)?.async('uint8array');
          entry.size = data?.length || 0;
        } catch {
          entry.size = 0;
        }
      }

      setZipEntries(entries);
      
      // Auto-expand top-level dirs
      const topDirs = new Set<string>();
      entries.forEach(e => {
        const firstDir = e.path.split('/')[0];
        if (e.path.includes('/')) topDirs.add(firstDir + '/');
      });
      setExpandedDirs(topDirs);
      
      // ── Auto-detect project/template files inside ZIP ──
      const projectCandidates: typeof detectedProjectFiles = [];
      for (const entry of entries) {
        const ext = entry.ext;
        if (['crestron', 'crestron-template', 'json'].includes(ext)) {
          try {
            const content = await zipContent.file(entry.path)?.async('text');
            if (content) {
              const parsed = JSON.parse(content);
              if (parsed.pages && Array.isArray(parsed.pages)) {
                const totalElements = parsed.pages.reduce((s: number, p: any) => s + (p.elements?.length || 0), 0);
                projectCandidates.push({
                  path: entry.path,
                  name: parsed.name || entry.name,
                  type: ext === 'crestron' ? 'project' : 'template',
                  pageCount: parsed.pages.length,
                  elementCount: totalElements,
                });
              }
            }
          } catch (_e) {
            // Not a valid JSON, skip
          }
        }
      }
      setDetectedProjectFiles(projectCandidates);
      
      // ── Auto-detect Figma Make ZIP structure ──
      try {
        const { isFigmaMakeZip } = await loadFigmaMakeConverter();
        const allPaths = entries.map(e => e.path);
        setDetectedFigmaMake(projectCandidates.length === 0 && isFigmaMakeZip(allPaths));
      } catch (_e) {
        setDetectedFigmaMake(false);
      }
      
      setStep('zip-explorer');
    } catch (error) {
      setImportResults([{
        type: 'error',
        message: `Failed to open ZIP: ${file.name}`,
        details: error instanceof Error ? error.message : 'Unknown error',
      }]);
      setStep('import-result');
    }
    setIsProcessing(false);
  };

  // ── Process non-ZIP files ──
  const processFiles = async (files: FileList) => {
    setIsProcessing(true);
    const results: ImportResult[] = [];

    for (const file of Array.from(files)) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        // ZIP → go to explorer
        if (ext === 'zip') {
          await handleZipUpload(file);
          return; // ZIP explorer handles the rest
        }

        const content = await file.text();

        if (ext === 'crestron') {
          const parsed = JSON.parse(content);
          if (parsed.pages && Array.isArray(parsed.pages)) {
            if (!parsed.libraries) parsed.libraries = [];
            if (!parsed.templates) parsed.templates = [];
            setProject(parsed);
            results.push({
              type: 'success',
              message: `Project "${parsed.name || file.name}" loaded!`,
              details: `${parsed.pages.length} pages, ${parsed.pages.reduce((s: number, p: any) => s + (p.elements?.length || 0), 0)} elements`,
              count: parsed.pages.length,
            });
          } else {
            results.push({ type: 'error', message: `${file.name}: Invalid .crestron file structure` });
          }
        } else if (ext === 'crestron-template' || (ext === 'json' && content.includes('"pages"'))) {
          const template = JSON.parse(content);
          if (template.pages && Array.isArray(template.pages)) {
            if (!template.id) template.id = `template_${Date.now()}`;
            if (!template.name) template.name = file.name.replace(/\.(crestron-template|json)$/, '');
            setProject((prev: Project) => ({
              ...prev,
              templates: [...prev.templates, template],
            }));
            results.push({
              type: 'success',
              message: `Template "${template.name}" imported!`,
              details: `${template.pages.length} pages — available in Templates modal.`,
              count: template.pages.length,
            });
          } else {
            results.push({ type: 'error', message: `${file.name}: Invalid template structure` });
          }
        } else if (ext === 'crestron-library' || (ext === 'json' && content.includes('"components"') && !content.includes('"pages"'))) {
          const library = JSON.parse(content);
          if (!library.id) library.id = `library_${Date.now()}`;
          if (!library.name) library.name = file.name.replace(/\.(crestron-library|json)$/, '');
          if (!library.components) library.components = [];
          setProject((prev: Project) => ({
            ...prev,
            libraries: [...prev.libraries, library],
          }));
          results.push({
            type: 'success',
            message: `Library "${library.name}" imported!`,
            details: `${library.components.length} components added`,
            count: library.components.length,
          });
        } else if (['tsx', 'jsx', 'ts', 'js'].includes(ext)) {
          const parseResult = parseJSXFile(content);
          if (parseResult.success && parseResult.components.length > 0) {
            const newLibrary = {
              id: `library_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              name: file.name.replace(/\.(tsx|jsx|ts|js)$/, ''),
              components: parseResult.components.map((comp, idx) => {
                const defaultJoins = generateDefaultJoins(idx);
                return {
                  id: `el_${Date.now()}_${idx}`,
                  type: `custom-${comp.name.toLowerCase().replace(/\s+/g, '-')}` as any,
                  name: comp.name,
                  x: 100 + idx * 20,
                  y: 100 + idx * 20,
                  width: comp.estimatedSize.width,
                  height: comp.estimatedSize.height,
                  joins: {},
                  style: {},
                  config: { componentCode: comp.code },
                  digitalJoin: defaultJoins.digital,
                  analogJoin: defaultJoins.analog,
                  serialJoin: defaultJoins.serial,
                };
              }),
            };
            setProject((prev: Project) => ({
              ...prev,
              libraries: [...prev.libraries, newLibrary],
            }));
            results.push({
              type: 'success',
              message: `Parsed "${file.name}"`,
              details: `${parseResult.components.length} components → library "${newLibrary.name}"`,
              count: parseResult.components.length,
            });
          } else {
            results.push({
              type: 'error',
              message: `${file.name}: No components found`,
              details: parseResult.errors?.join(', ') || 'Could not parse React components',
            });
          }
        } else {
          results.push({
            type: 'warning',
            message: `${file.name}: Skipped`,
            details: `Supported: .crestron, .crestron-template, .crestron-library, .tsx, .jsx, .json, .zip`,
          });
        }
      } catch (error) {
        results.push({
          type: 'error',
          message: `${file.name}: Parse error`,
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    setImportResults(results);
    setIsProcessing(false);
    if (results.length > 0) setStep('import-result');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // ── ZIP Explorer: toggle selection ──
  const toggleEntry = (path: string) => {
    setZipEntries(prev => prev.map(e => e.path === path ? { ...e, selected: !e.selected } : e));
  };

  const toggleDir = (dirPath: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  // Select/deselect all in a directory
  const toggleDirSelection = (dirPrefix: string, select: boolean) => {
    setZipEntries(prev => prev.map(e => 
      e.path.startsWith(dirPrefix) && !e.autoExcluded ? { ...e, selected: select } : e
    ));
  };

  // Select all / deselect all
  const selectAll = (select: boolean) => {
    setZipEntries(prev => prev.map(e => !e.autoExcluded ? { ...e, selected: select } : e));
  };

  // ── Load detected project file directly from ZIP ──
  const handleLoadProjectFromZip = async (projectFile: typeof detectedProjectFiles[0]) => {
    if (!zipRef) return;
    setLoadingProject(true);
    try {
      const content = await zipRef.file(projectFile.path)?.async('text');
      if (!content) throw new Error('Could not read file');
      const parsed = JSON.parse(content);
      
      if (parsed.pages && Array.isArray(parsed.pages)) {
        // Ensure required fields
        if (!parsed.libraries) parsed.libraries = [];
        if (!parsed.templates) parsed.templates = [];
        if (!parsed.name) parsed.name = projectFile.name;
        
        if (projectFile.type === 'project') {
          // Full project load — replace everything
          setProject(parsed);
          setImportResults([{
            type: 'success',
            message: `Project "${parsed.name}" loaded!`,
            details: `${parsed.pages.length} pages, ${projectFile.elementCount} elements — your full UI is now on the canvas.`,
            count: parsed.pages.length,
          }]);
        } else {
          // Template — apply pages directly to current project
          setProject((prev: Project) => ({
            ...prev,
            pages: parsed.pages.map((page: any) => ({
              ...page,
              id: page.id || `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            })),
            // Also merge libraries if present
            libraries: [
              ...prev.libraries,
              ...(parsed.libraries || []),
            ],
          }));
          setImportResults([{
            type: 'success',
            message: `Template "${parsed.name}" applied!`,
            details: `${parsed.pages.length} pages, ${projectFile.elementCount} elements loaded onto your canvas.`,
            count: parsed.pages.length,
          }]);
        }
        setStep('import-result');
      }
    } catch (error) {
      setImportResults([{
        type: 'error',
        message: `Failed to load: ${projectFile.name}`,
        details: error instanceof Error ? error.message : 'Unknown error',
      }]);
      setStep('import-result');
    }
    setLoadingProject(false);
  };

  // ── Convert Figma Make ZIP → Crestron project ──
  const handleConvertFigmaMake = async () => {
    if (!zipRef) return;
    setLoadingProject(true);
    try {
      const { convertFigmaMakeZip } = await loadFigmaMakeConverter();
      const allPaths = zipEntries.map(e => e.path);
      const result = await convertFigmaMakeZip(zipRef, allPaths);
      
      if (result.project.pages && result.project.pages.length > 0) {
        setProject((prev: Project) => ({
          ...prev,
          name: result.project.name || prev.name,
          pages: result.project.pages!,
          libraries: [
            ...prev.libraries,
            ...(result.project.libraries || []),
          ],
        }));
        setImportResults([{
          type: 'success',
          message: `Figma Make app converted!`,
          details: `${result.stats.pages} page(s), ${result.stats.elements} elements, ${result.stats.icons} icons detected — your UI is now on the canvas.`,
          count: result.stats.elements,
        }]);
      } else {
        setImportResults([{
          type: 'warning',
          message: `Conversion completed but no visual elements found`,
          details: 'Try importing components manually via the ZIP Explorer file list below.',
        }]);
      }
      setStep('import-result');
    } catch (error) {
      setImportResults([{
        type: 'error',
        message: `Figma Make conversion failed`,
        details: error instanceof Error ? error.message : 'Unknown error',
      }]);
      setStep('import-result');
    }
    setLoadingProject(false);
  };

  // ── ZIP Explorer: process selected files ──
  const processSelectedZipFiles = async () => {
    if (!zipRef) return;
    setIsProcessing(true);
    const results: ImportResult[] = [];
    const selected = zipEntries.filter(e => e.selected);

    // Group by category
    const componentFiles = selected.filter(e => e.category === 'component');
    const styleFiles = selected.filter(e => e.category === 'style');
    const dataFiles = selected.filter(e => e.category === 'data');
    const assetFiles = selected.filter(e => e.category === 'asset');
    const otherFiles = selected.filter(e => !['component', 'style', 'data', 'asset'].includes(e.category));

    // Process component files (TSX/JSX/TS/JS)
    if (componentFiles.length > 0) {
      const libraryComponents: any[] = [];
      
      for (const entry of componentFiles) {
        try {
          const content = await zipRef.file(entry.path)?.async('text');
          if (!content) continue;

          const parseResult = parseJSXFile(content);
          if (parseResult.success && parseResult.components.length > 0) {
            parseResult.components.forEach((comp, idx) => {
              const defaultJoins = generateDefaultJoins(libraryComponents.length + idx);
              libraryComponents.push({
                id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: `custom-${comp.name.toLowerCase().replace(/\s+/g, '-')}` as any,
                name: comp.name,
                x: 100,
                y: 100,
                width: comp.estimatedSize.width,
                height: comp.estimatedSize.height,
                joins: {},
                style: {},
                config: { 
                  componentCode: comp.code,
                  sourcePath: entry.path,
                },
                digitalJoin: defaultJoins.digital,
                analogJoin: defaultJoins.analog,
                serialJoin: defaultJoins.serial,
              });
            });
            results.push({
              type: 'success',
              message: `${entry.name}: ${parseResult.components.length} component(s)`,
              details: parseResult.components.map(c => c.name).join(', '),
            });
          } else {
            results.push({
              type: 'warning',
              message: `${entry.name}: No exportable components found`,
              details: 'File was included but no React components were detected',
            });
          }
        } catch (error) {
          results.push({
            type: 'error',
            message: `${entry.name}: Parse error`,
            details: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      if (libraryComponents.length > 0) {
        const libraryName = zipName || 'Imported ZIP';
        const newLibrary = {
          id: `library_${Date.now()}`,
          name: libraryName,
          components: libraryComponents,
        };
        setProject((prev: Project) => ({
          ...prev,
          libraries: [...prev.libraries, newLibrary],
        }));
        results.unshift({
          type: 'success',
          message: `Library "${libraryName}" created`,
          details: `${libraryComponents.length} components from ${componentFiles.length} files`,
          count: libraryComponents.length,
        });
      }
    }

    // Process data files (JSON with pages = template/project)
    for (const entry of dataFiles) {
      try {
        const content = await zipRef.file(entry.path)?.async('text');
        if (!content) continue;
        
        if (entry.ext === 'json') {
          const parsed = JSON.parse(content);
          if (parsed.pages && Array.isArray(parsed.pages)) {
            // It's a template or project
            if (!parsed.id) parsed.id = `template_${Date.now()}`;
            if (!parsed.name) parsed.name = entry.name.replace('.json', '');
            setProject((prev: Project) => ({
              ...prev,
              templates: [...prev.templates, parsed],
            }));
            results.push({
              type: 'success',
              message: `Template "${parsed.name}" imported`,
              details: `${parsed.pages.length} pages from ${entry.name}`,
            });
          } else if (parsed.components && Array.isArray(parsed.components)) {
            // It's a library
            if (!parsed.id) parsed.id = `library_${Date.now()}`;
            if (!parsed.name) parsed.name = entry.name.replace('.json', '');
            setProject((prev: Project) => ({
              ...prev,
              libraries: [...prev.libraries, parsed],
            }));
            results.push({
              type: 'success',
              message: `Library "${parsed.name}" imported`,
              details: `${parsed.components.length} components`,
            });
          }
        }
      } catch {
        // Skip non-parseable data files
      }
    }

    // Summary for styles/assets
    if (styleFiles.length > 0) {
      results.push({
        type: 'warning',
        message: `${styleFiles.length} style file(s) noted`,
        details: `CSS/SCSS files: ${styleFiles.map(f => f.name).join(', ')}. Style extraction is manual.`,
      });
    }
    if (assetFiles.length > 0) {
      results.push({
        type: 'warning', 
        message: `${assetFiles.length} asset(s) noted`,
        details: `Images: ${assetFiles.map(f => f.name).join(', ')}. Assets can be referenced in components.`,
      });
    }

    if (results.length === 0) {
      results.push({
        type: 'warning',
        message: 'No importable content found',
        details: 'Select files containing React components (.tsx, .jsx) or data files (.json with pages/components).',
      });
    }

    setImportResults(results);
    setIsProcessing(false);
    setStep('import-result');
  };

  // Apply last imported template directly
  const handleApplyLastTemplate = () => {
    const lastTemplate = project.templates[project.templates.length - 1];
    if (lastTemplate) {
      setProject((prev: Project) => ({
        ...prev,
        pages: lastTemplate.pages.map((page) => ({
          ...page,
          id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          elements: page.elements.map((el) => ({
            ...el,
            id: `element_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          })),
        })),
      }));
      resetAndClose();
    }
  };

  // ── Build tree structure for ZIP explorer ──
  const buildTree = () => {
    const filtered = zipEntries.filter(e => {
      if (!showExcluded && e.autoExcluded) return false;
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (searchQuery && !e.path.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // Group by directory
    const dirMap = new Map<string, ZipFileEntry[]>();
    const rootFiles: ZipFileEntry[] = [];

    filtered.forEach(entry => {
      const lastSlash = entry.path.lastIndexOf('/');
      if (lastSlash === -1) {
        rootFiles.push(entry);
      } else {
        const dir = entry.path.substring(0, lastSlash + 1);
        if (!dirMap.has(dir)) dirMap.set(dir, []);
        dirMap.get(dir)!.push(entry);
      }
    });

    return { dirMap, rootFiles };
  };

  // ── Source Viewer: load file content ──
  const loadFileContent = async (path: string) => {
    if (!zipRef) return;
    setViewerLoadingFile(true);
    setViewerActiveFile(path);
    try {
      const content = await zipRef.file(path)?.async('text');
      setViewerFileContent(content || '(empty file)');
    } catch {
      setViewerFileContent('(binary or unreadable file)');
    }
    setViewerLoadingFile(false);
  };

  const handleCopySource = () => {
    navigator.clipboard.writeText(viewerFileContent);
    setViewerCopied(true);
    setTimeout(() => setViewerCopied(false), 2000);
  };

  // Get viewable files (text-based, non-excluded) for the source viewer sidebar
  const viewableFiles = useMemo(() => {
    return zipEntries.filter(e => 
      !e.autoExcluded && 
      ['component', 'style', 'data', 'config', 'other'].includes(e.category) &&
      !['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'avif', 'svg'].includes(e.ext)
    );
  }, [zipEntries]);

  // Stats
  const selectedCount = zipEntries.filter(e => e.selected).length;
  const totalUsable = zipEntries.filter(e => !e.autoExcluded).length;
  const excludedCount = zipEntries.filter(e => e.autoExcluded).length;
  const selectedSize = zipEntries.filter(e => e.selected).reduce((s, e) => s + e.size, 0);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    zipEntries.filter(e => !e.autoExcluded).forEach(e => {
      stats[e.category] = (stats[e.category] || 0) + 1;
    });
    return stats;
  }, [zipEntries]);

  const getFileIcon = (entry: ZipFileEntry) => {
    switch (entry.category) {
      case 'component': return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
      case 'style': return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      case 'asset': return <Image className="w-3.5 h-3.5 text-amber-400" />;
      case 'data': return <FileJson className="w-3.5 h-3.5 text-cyan-400" />;
      case 'config': return <Settings className="w-3.5 h-3.5 text-zinc-500" />;
      case 'junk': return <File className="w-3.5 h-3.5 text-zinc-600" />;
      default: return <File className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className={`bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-2xl ${step === 'zip-source-viewer' ? 'w-[95vw] max-w-[1200px]' : step === 'zip-explorer' ? 'w-[720px]' : 'w-[520px]'} max-h-[85vh] flex flex-col shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200 transition-all`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-700/50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${step === 'zip-source-viewer' ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : step === 'zip-explorer' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
              {step === 'zip-source-viewer' ? <Code className="w-5 h-5 text-white" /> : step === 'zip-explorer' ? <Archive className="w-5 h-5 text-white" /> : <Package className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {step === 'zip-source-viewer' ? 'Source Viewer' : step === 'zip-explorer' ? 'ZIP Explorer' : 'Import Hub'}
              </h3>
              <p className="text-[11px] text-zinc-500">
                {step === 'zip-source-viewer'
                  ? `${zipName} — Browse source code of all files`
                  : step === 'zip-explorer' 
                  ? `${zipName}.zip — ${totalUsable} usable files, ${excludedCount} auto-excluded`
                  : 'Import files, components, and libraries'}
              </p>
            </div>
          </div>
          <button onClick={resetAndClose} className="p-2 hover:bg-white/10 rounded-lg transition-all">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 p-5 ${step === 'zip-source-viewer' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          
          {/* ═══ HUB VIEW ═══ */}
          {step === 'hub' && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('new-library')}
                className="w-full px-5 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center gap-4 transition-all group shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm text-white">New Library</p>
                  <p className="text-[11px] text-blue-200/70">Create a new custom component library</p>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-200/50 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => { resetAndClose(); onShowComponentImport?.(); }}
                className="w-full px-5 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-4 transition-all group shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm text-white">Import Components</p>
                  <p className="text-[11px] text-emerald-200/70">Parse TSX/JSX files into reusable components</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-200/50 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setStep('import-files')}
                className="w-full px-5 py-4 bg-zinc-700 hover:bg-zinc-600 rounded-xl flex items-center gap-4 transition-all group border border-zinc-600 hover:border-zinc-500 shadow-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm text-white">Import Files</p>
                  <p className="text-[11px] text-zinc-400">.crestron, .crestron-template, .tsx, .jsx, .json, .zip</p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => { resetAndClose(); onShowExternalLibs?.(); }}
                className="w-full px-5 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl flex items-center gap-4 transition-all group shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm text-white">Browse Libraries</p>
                  <p className="text-[11px] text-purple-200/70">Explore and install external component libraries</p>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-200/50 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                <span>{project.libraries.length} libraries</span>
                <span>{project.templates.length} templates</span>
                <span>{project.pages.reduce((s, p) => s + p.elements.length, 0)} elements</span>
              </div>
            </div>
          )}

          {/* ═══ NEW LIBRARY ═══ */}
          {step === 'new-library' && (
            <div className="space-y-4">
              <button onClick={() => setStep('hub')} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                <ArrowRight className="w-3 h-3 rotate-180" /> Back to Hub
              </button>

              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <h4 className="text-sm text-white mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" /> Create New Library
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Library Name *</label>
                    <input
                      type="text" value={newLibName}
                      onChange={(e) => setNewLibName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLibrary(); }}
                      placeholder="e.g. My Custom Controls"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Description (optional)</label>
                    <input
                      type="text" value={newLibDescription}
                      onChange={(e) => setNewLibDescription(e.target.value)}
                      placeholder="e.g. Custom controls for the lobby"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={handleCreateLibrary} disabled={!newLibName.trim()}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Create Library
                  </button>
                </div>
              </div>

              {project.libraries.length > 0 && (
                <div className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-800">
                  <p className="text-[11px] text-zinc-500 mb-2">Existing libraries:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.libraries.map(lib => (
                      <span key={lib.id} className="px-2 py-1 bg-zinc-800 rounded text-[11px] text-zinc-400">
                        {lib.name} ({lib.components.length})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ IMPORT FILES ═══ */}
          {step === 'import-files' && (
            <div className="space-y-4">
              <button onClick={() => setStep('hub')} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                <ArrowRight className="w-3 h-3 rotate-180" /> Back to Hub
              </button>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-blue-400 bg-blue-500/10 scale-[1.02]' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/30 hover:bg-zinc-800/50'
                } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
              >
                <input ref={fileInputRef} type="file" multiple
                  accept=".crestron,.crestron-template,.crestron-library,.json,.tsx,.jsx,.ts,.js,.html,.htm,.zip"
                  onChange={handleFileInput} className="hidden"
                />
                {isProcessing ? (
                  <div className="space-y-3">
                    <div className="w-10 h-10 mx-auto border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-zinc-300">Processing...</p>
                  </div>
                ) : (
                  <>
                    <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${dragOver ? 'text-blue-400' : 'text-zinc-600'}`} />
                    <p className="text-sm text-zinc-300 mb-1">{dragOver ? 'Drop files here!' : 'Drag & drop files or ZIP here'}</p>
                    <p className="text-xs text-zinc-500">or click to browse</p>
                    <p className="text-[11px] text-amber-400/60 mt-3">ZIP files open a smart explorer to pick what you need</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { ext: '.zip', desc: 'Smart Explorer', icon: Archive, color: 'text-amber-400' },
                  { ext: '.crestron', desc: 'Full project', icon: FolderOpen, color: 'text-blue-400' },
                  { ext: '.crestron-template', desc: 'Template', icon: FileJson, color: 'text-purple-400' },
                  { ext: '.tsx / .jsx', desc: 'Components', icon: FileCode, color: 'text-cyan-400' },
                ].map(fmt => (
                  <div key={fmt.ext} className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg border border-zinc-800">
                    <fmt.icon className={`w-3.5 h-3.5 ${fmt.color}`} />
                    <div>
                      <p className="text-[11px] text-zinc-300">{fmt.ext}</p>
                      <p className="text-[10px] text-zinc-600">{fmt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ ZIP EXPLORER ═══ */}
          {step === 'zip-explorer' && (
            <div className="space-y-3">

              {/* ── DETECTED PROJECT FILES BANNER ── */}
              {detectedProjectFiles.length > 0 && (
                <div className="space-y-2">
                  {detectedProjectFiles.map((pf, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 border border-emerald-500/30 rounded-xl animate-in slide-in-from-top duration-300">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                        <Rocket className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-emerald-300 truncate">
                          {pf.type === 'project' ? '🎯 Full Project' : '📄 Template'} detected
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          <span className="text-emerald-400/80">{pf.name}</span> — {pf.pageCount} pages, {pf.elementCount} elements
                        </p>
                      </div>
                      <button
                        onClick={() => handleLoadProjectFromZip(pf)}
                        disabled={loadingProject}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:from-zinc-700 disabled:to-zinc-700 rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex-shrink-0"
                      >
                        {loadingProject ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Load Now
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── DETECTED FIGMA MAKE ZIP BANNER ── */}
              {detectedFigmaMake && (
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 border border-violet-500/30 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-violet-300">
                      Figma Make app detected
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Convert all React/Tailwind components to Crestron canvas elements
                    </p>
                  </div>
                  <button
                    onClick={handleConvertFigmaMake}
                    disabled={loadingProject}
                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-zinc-700 disabled:to-zinc-700 rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 flex-shrink-0"
                  >
                    {loadingProject ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Rocket className="w-4 h-4" />
                    )}
                    Convert & Load
                  </button>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setStep('import-files')} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                  <ArrowRight className="w-3 h-3 rotate-180" /> Back
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => selectAll(true)}
                  className="px-2 py-1 text-[11px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={() => selectAll(false)}
                  className="px-2 py-1 text-[11px] bg-zinc-700 text-zinc-400 hover:bg-zinc-600 rounded transition-colors"
                >
                  Deselect All
                </button>
                <button
                  onClick={() => setShowExcluded(!showExcluded)}
                  className={`px-2 py-1 text-[11px] rounded transition-colors flex items-center gap-1 ${showExcluded ? 'bg-amber-600/20 text-amber-400' : 'bg-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                >
                  {showExcluded ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {showExcluded ? 'Hiding junk' : 'Show excluded'}
                </button>
                <button
                  onClick={() => {
                    // Auto-load first viewable file
                    const first = zipEntries.find(e => !e.autoExcluded && ['component', 'style', 'data'].includes(e.category));
                    if (first) loadFileContent(first.path);
                    setStep('zip-source-viewer');
                  }}
                  className="px-2 py-1 text-[11px] bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 rounded transition-colors flex items-center gap-1"
                >
                  <Code className="w-3 h-3" />
                  View Source
                </button>
              </div>

              {/* Search */}
              <input
                type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter files..."
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs focus:border-blue-500 outline-none"
              />

              {/* Category filter chips */}
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${filterCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                >
                  All ({totalUsable})
                </button>
                {Object.entries(categoryStats).map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                    className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${filterCategory === cat ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {CATEGORY_LABELS[cat as ZipFileEntry['category']] || cat} ({count})
                  </button>
                ))}
              </div>

              {/* File tree */}
              <div className="bg-zinc-950/50 rounded-xl border border-zinc-800 max-h-[40vh] overflow-y-auto">
                {(() => {
                  const { dirMap, rootFiles } = buildTree();
                  const allDirs = Array.from(dirMap.keys()).sort();

                  // Get unique top-level directories for grouping
                  const rendered = new Set<string>();

                  return (
                    <div className="divide-y divide-zinc-800/50">
                      {/* Root files */}
                      {rootFiles.map(entry => (
                        <FileRow key={entry.path} entry={entry} onToggle={toggleEntry} getIcon={getFileIcon} />
                      ))}

                      {/* Directory groups */}
                      {allDirs.map(dir => {
                        // Find top-level dir for nesting
                        const topDir = dir.split('/')[0] + '/';
                        const isTopLevel = dir === topDir;
                        const isExpanded = expandedDirs.has(dir) || expandedDirs.has(topDir);
                        const files = dirMap.get(dir) || [];
                        const dirSelectedCount = files.filter(f => f.selected).length;
                        const allSelected = dirSelectedCount === files.length && files.length > 0;
                        const someSelected = dirSelectedCount > 0 && !allSelected;

                        // For nested dirs, only show if parent is expanded
                        if (!isTopLevel) {
                          const parentExpanded = expandedDirs.has(topDir);
                          if (!parentExpanded) return null;
                        }

                        if (rendered.has(dir)) return null;
                        rendered.add(dir);

                        return (
                          <div key={dir}>
                            {/* Directory header */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 hover:bg-zinc-800/50 cursor-pointer group">
                              <button onClick={() => toggleDir(dir)} className="flex items-center gap-1.5 flex-1 min-w-0">
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                                )}
                                <Folder className="w-3.5 h-3.5 text-amber-500/70 flex-shrink-0" />
                                <span className="text-[11px] text-zinc-300 truncate">{dir}</span>
                                <span className="text-[10px] text-zinc-600 flex-shrink-0">{files.length}</span>
                              </button>
                              {/* Dir select toggle */}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleDirSelection(dir, !allSelected); }}
                                className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={allSelected ? 'Deselect all in folder' : 'Select all in folder'}
                              >
                                {allSelected ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                                ) : someSelected ? (
                                  <MinusSquare className="w-3.5 h-3.5 text-blue-400/50" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-zinc-600" />
                                )}
                              </button>
                            </div>

                            {/* Directory files */}
                            {isExpanded && files.map(entry => (
                              <FileRow key={entry.path} entry={entry} onToggle={toggleEntry} getIcon={getFileIcon} indent />
                            ))}
                          </div>
                        );
                      })}

                      {rootFiles.length === 0 && allDirs.length === 0 && (
                        <div className="py-8 text-center text-zinc-600 text-xs">
                          No files match your filter
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Selection summary & import button */}
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <div className="flex-1">
                  <p className="text-xs text-zinc-300">
                    <span className="text-blue-400">{selectedCount}</span> / {totalUsable} files selected
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {formatSize(selectedSize)} total
                    {excludedCount > 0 && ` · ${excludedCount} auto-excluded`}
                  </p>
                </div>
                <button
                  onClick={processSelectedZipFiles}
                  disabled={selectedCount === 0 || isProcessing}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 rounded-lg text-sm transition-all flex items-center gap-2 shadow-lg"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  Import Selected
                </button>
              </div>
            </div>
          )}

          {/* ═══ SOURCE VIEWER (split pane: file list + code) ═══ */}
          {step === 'zip-source-viewer' && (
            <div className="flex gap-3 h-[65vh]">
              {/* Left sidebar — file list */}
              {!viewerSidebarCollapsed && (
                <div className="w-[240px] flex-shrink-0 flex flex-col bg-zinc-950/50 rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                    <span className="text-[11px] text-zinc-400">{viewableFiles.length} files</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setStep('zip-explorer')}
                        className="text-[10px] text-zinc-500 hover:text-cyan-400 transition-colors"
                      >
                        Explorer
                      </button>
                      <button
                        onClick={() => setViewerSidebarCollapsed(true)}
                        className="p-0.5 hover:bg-white/10 rounded transition-colors"
                        title="Collapse sidebar"
                      >
                        <PanelLeft className="w-3 h-3 text-zinc-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {viewableFiles.map(entry => (
                      <button
                        key={entry.path}
                        onClick={() => loadFileContent(entry.path)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                          viewerActiveFile === entry.path
                            ? 'bg-blue-500/15 text-blue-300 border-l-2 border-blue-400'
                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border-l-2 border-transparent'
                        }`}
                      >
                        {getFileIcon(entry)}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] truncate">{entry.name}</p>
                          <p className="text-[9px] text-zinc-600 truncate">{entry.path}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Right pane — source code */}
              <div className="flex-1 flex flex-col bg-zinc-950/50 rounded-xl border border-zinc-800 overflow-hidden min-w-0">
                {/* File header */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 flex-shrink-0">
                  {viewerSidebarCollapsed && (
                    <button
                      onClick={() => setViewerSidebarCollapsed(false)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Show file list"
                    >
                      <PanelLeft className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                  )}
                  <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="text-[11px] text-zinc-300 truncate flex-1">
                    {viewerActiveFile || 'Select a file to view'}
                  </span>
                  {viewerActiveFile && (
                    <>
                      <span className="text-[10px] text-zinc-600">
                        {viewerFileContent.split('\n').length} lines
                      </span>
                      <button
                        onClick={handleCopySource}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        {viewerCopied ? (
                          <><CheckIcon className="w-3 h-3 text-emerald-400" /> Copied!</>
                        ) : (
                          <><Copy className="w-3 h-3 text-zinc-400" /> Copy</>
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Code content */}
                <div className="flex-1 overflow-auto">
                  {viewerLoadingFile ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : !viewerActiveFile ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600">
                      <BookOpen className="w-10 h-10" />
                      <p className="text-sm">Select a file from the sidebar to view its source code</p>
                      <p className="text-[11px] text-zinc-700">Click any file to read it — copy code to paste into chat</p>
                    </div>
                  ) : (
                    <pre className="p-4 text-[11px] text-zinc-300 whitespace-pre overflow-x-auto" style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace', tabSize: 2 }}>
                      <code>
                        {viewerFileContent.split('\n').map((line, i) => (
                          <div key={i} className="flex hover:bg-white/5 group">
                            <span className="w-10 text-right pr-4 text-zinc-700 select-none flex-shrink-0 group-hover:text-zinc-500">{i + 1}</span>
                            <span className="flex-1">{line || '\u200B'}</span>
                          </div>
                        ))}
                      </code>
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ IMPORT RESULTS ═══ */}
          {step === 'import-result' && (
            <div className="space-y-4">
              <div className="space-y-2">
                {importResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start gap-3 ${
                      result.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30'
                      : result.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    {result.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : result.type === 'warning' ? (
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${
                        result.type === 'success' ? 'text-emerald-300'
                        : result.type === 'warning' ? 'text-amber-300'
                        : 'text-red-300'
                      }`}>
                        {result.message}
                      </p>
                      {result.details && (
                        <p className="text-[11px] text-zinc-500 mt-0.5">{result.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {importResults.some(r => r.message.includes('Template') && r.type === 'success') && (
                <button
                  onClick={handleApplyLastTemplate}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  Apply Imported Template Now
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setImportResults([]); setStep('import-files'); }}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-all"
                >
                  Import More
                </button>
                <button onClick={resetAndClose} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-all">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── File Row Component ──
function FileRow({ 
  entry, onToggle, getIcon, indent 
}: { 
  entry: ZipFileEntry; 
  onToggle: (path: string) => void; 
  getIcon: (e: ZipFileEntry) => ReactNode;
  indent?: boolean;
}) {
  return (
    <div
      onClick={() => !entry.autoExcluded && onToggle(entry.path)}
      className={`flex items-center gap-2 px-3 py-1 transition-colors cursor-pointer ${
        indent ? 'pl-8' : ''
      } ${
        entry.autoExcluded 
          ? 'opacity-40 cursor-default' 
          : entry.selected 
          ? 'bg-blue-500/10 hover:bg-blue-500/15' 
          : 'hover:bg-zinc-800/50'
      }`}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0">
        {entry.autoExcluded ? (
          <Trash2 className="w-3 h-3 text-zinc-600" />
        ) : entry.selected ? (
          <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
        ) : (
          <Square className="w-3.5 h-3.5 text-zinc-600" />
        )}
      </div>
      
      {/* Icon */}
      {getIcon(entry)}
      
      {/* Name */}
      <span className={`text-[11px] flex-1 truncate ${entry.autoExcluded ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
        {entry.name}
      </span>
      
      {/* Category badge */}
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 ${CATEGORY_COLORS[entry.category]}`}>
        {CATEGORY_LABELS[entry.category]}
      </span>
      
      {/* Size */}
      <span className="text-[10px] text-zinc-600 flex-shrink-0 w-14 text-right">
        {formatSize(entry.size)}
      </span>
    </div>
  );
}
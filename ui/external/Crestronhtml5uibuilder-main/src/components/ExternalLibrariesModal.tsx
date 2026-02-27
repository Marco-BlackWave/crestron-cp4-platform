import { useState } from 'react';
import { X, Search, Download, Palette, Box, Sparkles, CheckCircle } from 'lucide-react';
import { ExternalLibrary } from '../types/crestron';

interface ExternalLibrariesModalProps {
  onClose: () => void;
  onInstall: (library: ExternalLibrary) => void;
  installedLibraries?: ExternalLibrary[];
}

const AVAILABLE_LIBRARIES: ExternalLibrary[] = [
  {
    id: 'tailwind-pro',
    name: 'Tailwind CSS Pro',
    version: '4.0.0',
    type: 'css',
    description: 'Premium Tailwind CSS with advanced components and utilities',
    isPro: true,
    installed: false,
    cdnUrl: 'https://cdn.tailwindcss.com',
    installCommand: 'npm i @tailwindcss/pro',
  },
  {
    id: 'bootstrap-5',
    name: 'Bootstrap 5',
    version: '5.3.0',
    type: 'css',
    description: 'Popular CSS framework with responsive grid system',
    isPro: false,
    installed: false,
    cdnUrl: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    installCommand: 'npm i bootstrap',
  },
  {
    id: 'bulma',
    name: 'Bulma CSS',
    version: '0.9.4',
    type: 'css',
    description: 'Modern CSS framework based on Flexbox',
    isPro: false,
    installed: false,
    cdnUrl: 'https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css',
    installCommand: 'npm i bulma',
  },
  {
    id: 'ant-design',
    name: 'Ant Design',
    version: '5.12.0',
    type: 'components',
    description: 'A design system for enterprise-level products',
    isPro: false,
    installed: false,
    installCommand: 'npm i antd',
  },
  {
    id: 'material-ui',
    name: 'Material UI',
    version: '5.14.0',
    type: 'components',
    description: 'React components implementing Material Design',
    isPro: false,
    installed: false,
    installCommand: 'npm i @mui/material',
  },
  {
    id: 'chakra-ui',
    name: 'Chakra UI',
    version: '2.8.0',
    type: 'components',
    description: 'Simple, modular and accessible component library',
    isPro: false,
    installed: false,
    installCommand: 'npm i @chakra-ui/react',
  },
  {
    id: 'fontawesome-pro',
    name: 'Font Awesome Pro',
    version: '6.4.0',
    type: 'icons',
    description: '12 libraries and 42 categories of vector icons',
    isPro: true,
    installed: false,
    installCommand: 'npm i @fortawesome/fontawesome-pro',
  },
  {
    id: 'lucide-icons',
    name: 'Lucide Icons',
    version: '0.294.0',
    type: 'icons',
    description: 'Beautiful & consistent icon toolkit',
    isPro: false,
    installed: false,
    installCommand: 'npm i lucide-react',
  },
  {
    id: 'heroicons',
    name: 'Heroicons',
    version: '2.0.18',
    type: 'icons',
    description: 'Beautiful hand-crafted SVG icons by Tailwind',
    isPro: false,
    installed: false,
    installCommand: 'npm i @heroicons/react',
  },
];

export function ExternalLibrariesModal({ onClose, onInstall, installedLibraries = [] }: ExternalLibrariesModalProps) {
  const [selectedType, setSelectedType] = useState<'all' | 'css' | 'components' | 'icons'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLibraries = AVAILABLE_LIBRARIES.filter((lib) => {
    const matchesType = selectedType === 'all' || lib.type === selectedType;
    const matchesSearch = lib.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lib.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const isInstalled = (libId: string) => {
    return installedLibraries.some(lib => lib.id === libId);
  };

  const handleInstall = (library: ExternalLibrary) => {
    if (library.isPro) {
      alert('This is a Pro library. In production, this would redirect to purchase or licensing.');
      return;
    }
    onInstall({ ...library, installed: true });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-800/95 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border-2 border-cyan-500/30 shadow-cyan-500/20 backdrop-blur-xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-zinc-700/50 flex items-center justify-between bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Browse Libraries</h2>
            <p className="text-sm text-zinc-400 mt-1">Install CSS frameworks, component libraries, and icon sets</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="p-6 border-b border-zinc-800 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                selectedType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              All Libraries
            </button>
            <button
              onClick={() => setSelectedType('css')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedType === 'css'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" />
              CSS Frameworks
            </button>
            <button
              onClick={() => setSelectedType('components')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedType === 'components'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              <Box className="w-4 h-4" />
              Components
            </button>
            <button
              onClick={() => setSelectedType('icons')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedType === 'icons'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Icons
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search libraries..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Libraries Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            {filteredLibraries.map((library) => (
              <div
                key={library.id}
                className="bg-zinc-800 rounded-lg p-5 border border-zinc-700 hover:border-zinc-600 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {library.type === 'css' && <Palette className="w-5 h-5 text-blue-400" />}
                    {library.type === 'components' && <Box className="w-5 h-5 text-green-400" />}
                    {library.type === 'icons' && <Sparkles className="w-5 h-5 text-purple-400" />}
                    <h3 className="font-semibold">{library.name}</h3>
                  </div>
                  {library.isPro && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded font-medium">
                      Pro
                    </span>
                  )}
                  {!library.isPro && (
                    <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                      Free
                    </span>
                  )}
                </div>

                <p className="text-sm text-zinc-400 mb-3">{library.description}</p>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-500">
                    <span className="capitalize">{library.type}</span>
                    {' • '}
                    v{library.version}
                  </div>
                  
                  {isInstalled(library.id) ? (
                    <button
                      disabled
                      className="px-4 py-1.5 bg-green-600/20 text-green-400 rounded text-sm flex items-center gap-2 cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Installed
                    </button>
                  ) : library.isPro ? (
                    <button
                      onClick={() => handleInstall(library)}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Get Pro
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInstall(library)}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Install
                    </button>
                  )}
                </div>

                {/* Install command hint */}
                {library.installCommand && (
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <code className="text-xs text-zinc-500 font-mono bg-zinc-900 px-2 py-1 rounded">
                      {library.installCommand}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredLibraries.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-500">No libraries found</p>
              <p className="text-sm text-zinc-600 mt-1">Try a different search or filter</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {filteredLibraries.length} {filteredLibraries.length === 1 ? 'library' : 'libraries'} available
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
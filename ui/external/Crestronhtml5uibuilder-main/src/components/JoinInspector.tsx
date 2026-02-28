import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Project, Join } from '../types/crestron';

interface JoinInspectorProps {
  project: Project;
  onClose: () => void;
}

interface JoinUsage {
  joinNumber: number;
  type: 'digital' | 'analog' | 'serial';
  elements: Array<{
    elementId: string;
    elementName: string;
    pageName: string;
    joinType: string;
  }>;
}

export function JoinInspector({ project, onClose }: JoinInspectorProps) {
  const [filterType, setFilterType] = useState<'all' | 'digital' | 'analog' | 'serial'>('all');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Analyze joins across all pages
  const analyzeJoins = (): JoinUsage[] => {
    const joinMap = new Map<string, JoinUsage>();

    project.pages.forEach(page => {
      page.elements.forEach(element => {
        // Check all join types
        Object.entries(element.joins).forEach(([joinType, join]) => {
          if (join) {
            const key = `${join.type}-${join.number}`;
            
            if (!joinMap.has(key)) {
              joinMap.set(key, {
                joinNumber: join.number,
                type: join.type,
                elements: [],
              });
            }

            joinMap.get(key)!.elements.push({
              elementId: element.id,
              elementName: element.name,
              pageName: page.name,
              joinType,
            });
          }
        });
      });
    });

    return Array.from(joinMap.values()).sort((a, b) => a.joinNumber - b.joinNumber);
  };

  const joinUsages = analyzeJoins();

  // Filter joins
  const filteredJoins = joinUsages.filter(usage => {
    if (filterType !== 'all' && usage.type !== filterType) return false;
    if (showDuplicatesOnly && usage.elements.length <= 1) return false;
    return true;
  });

  // Statistics
  const stats = {
    totalJoins: joinUsages.length,
    digitalJoins: joinUsages.filter(j => j.type === 'digital').length,
    analogJoins: joinUsages.filter(j => j.type === 'analog').length,
    serialJoins: joinUsages.filter(j => j.type === 'serial').length,
    duplicates: joinUsages.filter(j => j.elements.length > 1).length,
  };

  const getJoinColor = (type: string) => {
    switch (type) {
      case 'digital':
        return 'text-blue-400';
      case 'analog':
        return 'text-green-400';
      case 'serial':
        return 'text-purple-400';
      default:
        return 'text-zinc-400';
    }
  };

  const getJoinBadgeColor = (type: string) => {
    switch (type) {
      case 'digital':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'analog':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'serial':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-[900px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg">Join Inspector</h2>
            <p className="text-sm text-zinc-400">
              Analyze and validate Crestron joins across your project
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-5 gap-4 p-4 border-b border-zinc-800">
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-2xl">{stats.totalJoins}</div>
            <div className="text-xs text-zinc-400">Total Joins</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-2xl text-blue-400">{stats.digitalJoins}</div>
            <div className="text-xs text-zinc-400">Digital</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-2xl text-green-400">{stats.analogJoins}</div>
            <div className="text-xs text-zinc-400">Analog</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-2xl text-purple-400">{stats.serialJoins}</div>
            <div className="text-xs text-zinc-400">Serial</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-2xl text-orange-400">{stats.duplicates}</div>
            <div className="text-xs text-zinc-400">Duplicates</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded text-sm ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('digital')}
              className={`px-3 py-1.5 rounded text-sm ${
                filterType === 'digital'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Digital
            </button>
            <button
              onClick={() => setFilterType('analog')}
              className={`px-3 py-1.5 rounded text-sm ${
                filterType === 'analog'
                  ? 'bg-green-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Analog
            </button>
            <button
              onClick={() => setFilterType('serial')}
              className={`px-3 py-1.5 rounded text-sm ${
                filterType === 'serial'
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Serial
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDuplicatesOnly}
              onChange={e => setShowDuplicatesOnly(e.target.checked)}
              className="rounded"
            />
            Show duplicates only
          </label>
        </div>

        {/* Join List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredJoins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Info className="w-12 h-12 mb-2" />
              <p>No joins found matching filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJoins.map(usage => (
                <div
                  key={`${usage.type}-${usage.joinNumber}`}
                  className="bg-zinc-800 rounded-lg p-4 border border-zinc-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-3 py-1 rounded border text-sm ${getJoinBadgeColor(
                          usage.type
                        )}`}
                      >
                        {usage.type.toUpperCase()} #{usage.joinNumber}
                      </div>
                      {usage.elements.length > 1 && (
                        <div className="flex items-center gap-1 text-orange-400 text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Used {usage.elements.length} times</span>
                        </div>
                      )}
                      {usage.elements.length === 1 && (
                        <div className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Unique</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {usage.elements.map((element, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 text-sm text-zinc-300 bg-zinc-900/50 rounded px-3 py-2"
                      >
                        <span className="text-zinc-500">{element.pageName}</span>
                        <span className="text-zinc-600">/</span>
                        <span>{element.elementName}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-500 text-xs">{element.joinType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

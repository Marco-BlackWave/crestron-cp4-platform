import { useState, useRef } from 'react';
import {
  X, Upload, FileCode2, Zap, Hash, AlertTriangle, CheckCircle2,
  Copy, Layers, ChevronDown, ChevronRight, Search, Download,
  ArrowRight, RefreshCw, Info
} from 'lucide-react';
import {
  parseCSharpJoins,
  suggestJoinMappings,
  detectJoinPatterns,
  multiplyJoinBlock,
  ParsedJoin,
  ImportResult,
  JoinMapping,
  JoinBlock,
} from '../utils/csharpJoinImporter';
import { CrestronElement, Page, Project } from '../types/crestron';

interface CSharpImportModalProps {
  onClose: () => void;
  project: Project;
  setProject: (project: Project) => void;
}

export function CSharpImportModal({
  onClose,
  project,
  setProject,
}: CSharpImportModalProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'map' | 'multiply'>('upload');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [mappings, setMappings] = useState<JoinMapping[]>([]);
  const [selectedJoins, setSelectedJoins] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'digital' | 'analog' | 'serial'>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [multiplyCopies, setMultiplyCopies] = useState(4);
  const [multiplyOffset, setMultiplyOffset] = useState(10);
  const [multiplyLabel, setMultiplyLabel] = useState('Zone {n}');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPage = project.pages[0]; // Use first page for element analysis
  const currentElements = currentPage?.elements || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = parseCSharpJoins(content, file.name);
      setImportResult(result);

      // Auto-select all joins
      const allKeys = new Set(result.joins.map(j => `${j.type}-${j.number}`));
      setSelectedJoins(allKeys);

      // Expand all groups
      setExpandedGroups(new Set(result.stats.groups));

      // Auto-generate mappings
      const maps = suggestJoinMappings(
        currentElements.map(el => ({
          id: el.id,
          name: el.name,
          type: el.type,
          joins: el.joins || {},
        })),
        result.joins
      );
      setMappings(maps);

      setStep('review');
    };
    reader.readAsText(file);
  };

  const handlePasteCode = () => {
    navigator.clipboard.readText().then(text => {
      if (text.trim()) {
        const result = parseCSharpJoins(text, 'clipboard.cs');
        setImportResult(result);
        const allKeys = new Set(result.joins.map(j => `${j.type}-${j.number}`));
        setSelectedJoins(allKeys);
        setExpandedGroups(new Set(result.stats.groups));
        const maps = suggestJoinMappings(
          currentElements.map(el => ({
            id: el.id,
            name: el.name,
            type: el.type,
            joins: el.joins || {},
          })),
          result.joins
        );
        setMappings(maps);
        setStep('review');
      }
    }).catch(() => {
      // Fallback: show textarea
    });
  };

  const handleTextAreaImport = (text: string) => {
    if (!text.trim()) return;
    const result = parseCSharpJoins(text, 'pasted-code.cs');
    setImportResult(result);
    const allKeys = new Set(result.joins.map(j => `${j.type}-${j.number}`));
    setSelectedJoins(allKeys);
    setExpandedGroups(new Set(result.stats.groups));
    const maps = suggestJoinMappings(
      currentElements.map(el => ({
        id: el.id,
        name: el.name,
        type: el.type,
        joins: el.joins || {},
      })),
      result.joins
    );
    setMappings(maps);
    setStep('review');
  };

  const toggleGroup = (group: string) => {
    const next = new Set(expandedGroups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setExpandedGroups(next);
  };

  const toggleJoin = (key: string) => {
    const next = new Set(selectedJoins);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedJoins(next);
  };

  const filteredJoins = importResult?.joins.filter(j => {
    if (filterType !== 'all' && j.type !== filterType) return false;
    if (filterGroup !== 'all' && j.group !== filterGroup) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return j.name.toLowerCase().includes(q) || j.description.toLowerCase().includes(q) || String(j.number).includes(q);
    }
    return true;
  }) || [];

  // Group filtered joins
  const groupedJoins = new Map<string, ParsedJoin[]>();
  filteredJoins.forEach(j => {
    const g = j.group || 'General';
    if (!groupedJoins.has(g)) groupedJoins.set(g, []);
    groupedJoins.get(g)!.push(j);
  });

  const pattern = importResult ? detectJoinPatterns(importResult.joins) : null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'digital': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'analog': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'serial': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'text-emerald-400';
      case 'medium': return 'text-amber-400';
      case 'low': return 'text-zinc-500';
      default: return 'text-zinc-500';
    }
  };

  const [pasteText, setPasteText] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
              <FileCode2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg text-white">C# Crestron Join Import</h2>
              <p className="text-xs text-zinc-400">
                {step === 'upload' && 'Upload or paste your SIMPL# Pro / C# project file'}
                {step === 'review' && `${importResult?.stats.totalJoins || 0} joins parsed from ${importResult?.fileName}`}
                {step === 'map' && `${mappings.length} element mappings suggested`}
                {step === 'multiply' && 'Configure join block multiplication'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Step indicators */}
            <div className="flex items-center gap-1 mr-4">
              {(['upload', 'review', 'map', 'multiply'] as const).map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                    step === s ? 'bg-blue-600 text-white' : 
                    (['upload', 'review', 'map', 'multiply'].indexOf(step) > i) ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {i + 1}
                  </div>
                  {i < 3 && <div className="w-4 h-px bg-zinc-700" />}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="p-8 space-y-6">
              {/* File upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-blue-500/50 rounded-xl p-12 text-center cursor-pointer transition-colors group"
              >
                <Upload className="w-12 h-12 mx-auto text-zinc-500 group-hover:text-blue-400 mb-4 transition-colors" />
                <p className="text-zinc-300 mb-1">Drop a C# file here or click to browse</p>
                <p className="text-xs text-zinc-500">Supports .cs, .csp, .usp files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".cs,.csp,.usp,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-500">OR</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Paste code */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-zinc-300">Paste C# code directly</label>
                  <button
                    onClick={handlePasteCode}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 flex items-center gap-1.5"
                  >
                    <Copy className="w-3 h-3" /> Paste from clipboard
                  </button>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`// Paste your C# code here...\n// Examples of supported patterns:\n\nconst uint DIGITAL_JOIN_POWER = 1;\nconst uint ANALOG_JOIN_VOLUME = 1;\n\n[Join(1)]\npublic BooleanSigData PowerOn;\n\npublic BooleanOutput[1] // Power\npublic UShortOutput[1] // Volume Level`}
                  className="w-full h-48 px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {pasteText.trim() && (
                  <button
                    onClick={() => handleTextAreaImport(pasteText)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Parse C# Code
                  </button>
                )}
              </div>

              {/* Supported patterns info */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-zinc-300">Supported C# Patterns</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 font-mono">
                  <div className="bg-zinc-900 rounded px-2 py-1">[Join(n)] attributes</div>
                  <div className="bg-zinc-900 rounded px-2 py-1">const uint DIGITAL_JOIN_xxx = n</div>
                  <div className="bg-zinc-900 rounded px-2 py-1">BooleanSigData / UShortSigData</div>
                  <div className="bg-zinc-900 rounded px-2 py-1">BooleanInput[n] / BooleanOutput[n]</div>
                  <div className="bg-zinc-900 rounded px-2 py-1">Sig(eJoinCapabilities...)</div>
                  <div className="bg-zinc-900 rounded px-2 py-1">JoinDataComplete entries</div>
                  <div className="bg-zinc-900 rounded px-2 py-1">enum eDigitalJoins &#123; ... &#125;</div>
                  <div className="bg-zinc-900 rounded px-2 py-1">SmartObject signal arrays</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Review parsed joins */}
          {step === 'review' && importResult && (
            <div className="flex flex-col h-full">
              {/* Stats bar */}
              <div className="px-6 py-3 bg-zinc-800/50 border-b border-zinc-800 flex items-center gap-4">
                <div className="flex items-center gap-6">
                  <span className="text-sm text-zinc-400">
                    Total: <span className="text-white">{importResult.stats.totalJoins}</span>
                  </span>
                  <span className="text-sm text-blue-400">
                    D: {importResult.stats.digital}
                  </span>
                  <span className="text-sm text-emerald-400">
                    A: {importResult.stats.analog}
                  </span>
                  <span className="text-sm text-purple-400">
                    S: {importResult.stats.serial}
                  </span>
                  <span className="text-sm text-zinc-500">
                    Groups: {importResult.stats.groups.length}
                  </span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search joins..."
                      className="pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="px-6 py-2 border-b border-zinc-800 flex items-center gap-2">
                {(['all', 'digital', 'analog', 'serial'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 rounded text-xs ${filterType === t ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                    {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
                <div className="w-px h-5 bg-zinc-700 mx-1" />
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300"
                >
                  <option value="all">All Groups</option>
                  {importResult.stats.groups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Join list */}
              <div className="flex-1 overflow-y-auto px-6 py-3 max-h-[50vh]">
                {Array.from(groupedJoins.entries()).map(([group, joins]) => (
                  <div key={group} className="mb-3">
                    <button
                      onClick={() => toggleGroup(group)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
                    >
                      {expandedGroups.has(group) ? (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      <span className="text-xs text-zinc-300">{group}</span>
                      <span className="text-[10px] text-zinc-600">({joins.length})</span>
                    </button>
                    {expandedGroups.has(group) && (
                      <div className="ml-5 space-y-1 mt-1">
                        {joins.map(j => {
                          const key = `${j.type}-${j.number}`;
                          return (
                            <div
                              key={key}
                              className={`flex items-center gap-3 px-3 py-2 rounded text-sm cursor-pointer transition-colors ${
                                selectedJoins.has(key) ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-900/30 border border-transparent hover:bg-zinc-800/50'
                              }`}
                              onClick={() => toggleJoin(key)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedJoins.has(key)}
                                onChange={() => toggleJoin(key)}
                                className="rounded border-zinc-600"
                              />
                              <span className={`px-2 py-0.5 rounded border text-[10px] ${getTypeColor(j.type)}`}>
                                {j.type[0].toUpperCase()} #{j.number}
                              </span>
                              <span className="text-xs text-zinc-300 flex-1">{j.name}</span>
                              <span className="text-[10px] text-zinc-600">{j.direction}</span>
                              <span className="text-[10px] text-zinc-600">{j.sourcePattern}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Warnings */}
              {importResult.warnings.length > 0 && (
                <div className="px-6 py-2 border-t border-zinc-800 bg-amber-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400">{importResult.warnings.length} warnings</span>
                  </div>
                  <div className="max-h-20 overflow-y-auto space-y-0.5">
                    {importResult.warnings.map((w, i) => (
                      <p key={i} className="text-[10px] text-zinc-500">{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Pattern detection */}
              {pattern && pattern.hasPattern && (
                <div className="px-6 py-3 border-t border-zinc-800 bg-emerald-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">Pattern Detected!</span>
                  </div>
                  <p className="text-xs text-zinc-400">{pattern.suggestion}</p>
                  <button
                    onClick={() => setStep('multiply')}
                    className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-xs flex items-center gap-1.5"
                  >
                    <Copy className="w-3 h-3" /> Configure Multiplication
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Map to elements */}
          {step === 'map' && importResult && (
            <div className="p-6 space-y-4">
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-zinc-300">Smart Join Mapping</span>
                </div>
                <p className="text-xs text-zinc-500">
                  Joins are matched to canvas elements by name similarity, type compatibility, and semantic analysis.
                  Review and adjust mappings before applying.
                </p>
              </div>

              {mappings.length === 0 ? (
                <div className="text-center py-12">
                  <Info className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                  <p className="text-sm text-zinc-400">No automatic mappings could be generated.</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Add elements to the canvas first, then re-import to get suggestions.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                  {mappings.map((m, i) => (
                    <div key={i} className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-zinc-200">{m.elementName}</span>
                          <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">{m.elementType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] ${getConfidenceColor(m.confidence)}`}>
                            {m.confidence === 'high' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                            {m.confidence}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {Object.entries(m.mappedJoins).map(([key, num]) => (
                          <div key={key} className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-500 min-w-[80px]">{key}</span>
                            <ArrowRight className="w-3 h-3 text-zinc-600" />
                            <span className="text-zinc-300">#{num}</span>
                          </div>
                        ))}
                      </div>
                      {m.reason && (
                        <p className="text-[10px] text-zinc-600 mt-2">{m.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Multiply */}
          {step === 'multiply' && pattern && (
            <div className="p-6 space-y-6">
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Copy className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-zinc-300">Join Block Multiplication</span>
                </div>
                <p className="text-xs text-zinc-500">
                  Generate multiple copies of a join block with automatic offset calculation.
                  Perfect for rooms, zones, or repeated UI sections.
                </p>
              </div>

              {pattern.hasPattern && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                  <p className="text-xs text-emerald-400 mb-2">Auto-detected pattern:</p>
                  <p className="text-xs text-zinc-400">{pattern.suggestion}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] text-zinc-500">
                      Block size: {pattern.baseBlockSize} joins
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Detected offset: {pattern.offset}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Copies found: {pattern.detectedCopies}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Number of copies</label>
                  <input
                    type="number"
                    value={multiplyCopies}
                    onChange={(e) => setMultiplyCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    min="1"
                    max="100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Join offset per copy</label>
                  <input
                    type="number"
                    value={multiplyOffset}
                    onChange={(e) => setMultiplyOffset(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    min="1"
                    max="1000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400">Label template</label>
                  <input
                    type="text"
                    value={multiplyLabel}
                    onChange={(e) => setMultiplyLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Zone {n}"
                  />
                </div>
              </div>

              {/* Preview */}
              {pattern.hasPattern && pattern.baseJoins.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-zinc-400">Preview (first 3 blocks):</span>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {multiplyJoinBlock(pattern.baseJoins, Math.min(3, multiplyCopies), multiplyOffset, multiplyLabel)
                      .map((block, bi) => (
                        <div key={bi} className="bg-zinc-800 rounded p-3 border border-zinc-700">
                          <span className="text-xs text-zinc-300 mb-1 block">{block.label}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {block.joins.map((j, ji) => (
                              <span key={ji} className={`px-2 py-0.5 rounded border text-[10px] ${getTypeColor(j.type)}`}>
                                {j.type[0].toUpperCase()} #{j.number}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    {multiplyCopies > 3 && (
                      <p className="text-[10px] text-zinc-600 text-center">... and {multiplyCopies - 3} more blocks</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <div>
            {step !== 'upload' && (
              <button
                onClick={() => {
                  if (step === 'review') setStep('upload');
                  else if (step === 'map') setStep('review');
                  else if (step === 'multiply') setStep('review');
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm"
            >
              Cancel
            </button>
            {step === 'review' && (
              <>
                <button
                  onClick={() => setStep('map')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2"
                  disabled={selectedJoins.size === 0}
                >
                  <ArrowRight className="w-4 h-4" /> Map to Elements
                </button>
              </>
            )}
            {step === 'map' && (
              <button
                onClick={() => {
                  const newProject = {
                    ...project,
                    pages: project.pages.map(p => ({
                      ...p,
                      elements: p.elements.map(el => {
                        const mapping = mappings.find(m => m.elementId === el.id);
                        if (mapping) {
                          return {
                            ...el,
                            joins: {
                              ...el.joins,
                              ...mapping.mappedJoins,
                            },
                          };
                        }
                        return el;
                      }),
                    })),
                  };
                  setProject(newProject);
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm flex items-center gap-2"
                disabled={mappings.length === 0}
              >
                <CheckCircle2 className="w-4 h-4" /> Apply {mappings.length} Mappings
              </button>
            )}
            {step === 'multiply' && pattern?.hasPattern && (
              <button
                onClick={() => {
                  const blocks = multiplyJoinBlock(
                    pattern.baseJoins,
                    multiplyCopies,
                    multiplyOffset,
                    multiplyLabel
                  );
                  // Create a template element for multiplication
                  const templateEl: CrestronElement = {
                    id: '',
                    type: 'button',
                    name: 'Zone Button',
                    x: 0, y: 0,
                    width: 120, height: 50,
                    joins: {},
                    style: { backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 8 },
                  };
                  const newProject = {
                    ...project,
                    pages: project.pages.map((p, idx) => idx === 0 ? ({
                      ...p,
                      elements: [
                        ...p.elements,
                        ...blocks.flatMap((block, bi) => {
                          const cols = Math.ceil(Math.sqrt(blocks.length));
                          const col = bi % cols;
                          const row = Math.floor(bi / cols);
                          return [{
                            ...templateEl,
                            id: `zone_${Date.now()}_${bi}`,
                            name: block.label,
                            text: block.label,
                            x: 20 + col * (templateEl.width + 20),
                            y: 20 + row * (templateEl.height + 20),
                            joins: block.joins.reduce((acc: Record<string, number>, j: any) => {
                              acc[j.type] = j.number;
                              return acc;
                            }, {} as Record<string, number>),
                          }];
                        }),
                      ],
                    }) : p),
                  };
                  setProject(newProject);
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Generate {multiplyCopies} Blocks
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
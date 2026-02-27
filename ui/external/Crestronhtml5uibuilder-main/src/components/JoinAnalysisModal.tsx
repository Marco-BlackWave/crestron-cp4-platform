import { X, Zap, Hash, Type, Check, AlertCircle } from 'lucide-react';
import { DetectedElement } from '../utils/jsxParser';

interface JoinAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: DetectedElement[];
  componentName: string;
  onApplyJoins: (elements: DetectedElement[]) => void;
}

export function JoinAnalysisModal({
  isOpen,
  onClose,
  elements,
  componentName,
  onApplyJoins,
}: JoinAnalysisModalProps) {
  if (!isOpen) return null;

  const totalJoins = elements.reduce((acc, el) => {
    let count = 0;
    if (el.suggestedJoins.digital) count++;
    if (el.suggestedJoins.analog) count++;
    if (el.suggestedJoins.serial) count++;
    return acc + count;
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-[#1e1e1e] rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Smart Join Analysis
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {elements.length} interactive elements detected in <span className="text-blue-400">{componentName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-700 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-300">
              <span className="font-semibold text-white">
                {elements.filter(e => e.suggestedJoins.digital).length}
              </span>{' '}
              Digital Joins
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-300">
              <span className="font-semibold text-white">
                {elements.filter(e => e.suggestedJoins.analog).length}
              </span>{' '}
              Analog Joins
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-300">
              <span className="font-semibold text-white">
                {elements.filter(e => e.suggestedJoins.serial).length}
              </span>{' '}
              Serial Joins
            </span>
          </div>
          <div className="ml-auto text-sm text-gray-400">
            Total: <span className="font-semibold text-white">{totalJoins}</span> joins
          </div>
        </div>

        {/* Elements List */}
        <div className="flex-1 overflow-y-auto p-6">
          {elements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg mb-2">No interactive elements detected</p>
              <p className="text-gray-500 text-sm max-w-md">
                This component doesn't appear to have any interactive elements that require Crestron joins.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {elements.map((element, index) => (
                <div
                  key={element.id}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        {element.displayName}
                        <span className="text-xs text-gray-500 font-mono bg-gray-900 px-2 py-0.5 rounded">
                          {element.id}
                        </span>
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5">
                        Category: <span className="text-blue-400">{element.category}</span>
                      </p>
                    </div>
                  </div>

                  {/* Joins Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Digital Join */}
                    {element.suggestedJoins.digital ? (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-xs font-semibold text-blue-400 uppercase">
                            Digital
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-blue-400" />
                          <span className="text-xl font-bold text-white">
                            {element.suggestedJoins.digital.number}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {element.suggestedJoins.digital.purpose}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-900/50 border border-gray-800 rounded p-3 flex items-center justify-center">
                        <span className="text-xs text-gray-600">Not used</span>
                      </div>
                    )}

                    {/* Analog Join */}
                    {element.suggestedJoins.analog ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs font-semibold text-green-400 uppercase">
                            Analog
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-green-400" />
                          <span className="text-xl font-bold text-white">
                            {element.suggestedJoins.analog.number}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {element.suggestedJoins.analog.purpose}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-900/50 border border-gray-800 rounded p-3 flex items-center justify-center">
                        <span className="text-xs text-gray-600">Not used</span>
                      </div>
                    )}

                    {/* Serial Join */}
                    {element.suggestedJoins.serial ? (
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span className="text-xs font-semibold text-purple-400 uppercase">
                            Serial
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Type className="w-4 h-4 text-purple-400" />
                          <span className="text-xl font-bold text-white">
                            {element.suggestedJoins.serial.number}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {element.suggestedJoins.serial.purpose}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-900/50 border border-gray-800 rounded p-3 flex items-center justify-center">
                        <span className="text-xs text-gray-600">Not used</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between bg-gray-800/30">
          <div className="text-sm text-gray-400">
            <p className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              All joins have been automatically analyzed and assigned
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApplyJoins(elements);
                onClose();
              }}
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Apply Joins
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

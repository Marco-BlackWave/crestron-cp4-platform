import { CrestronElement } from '../types/crestron';
import { JoinConfig } from './JoinConfig';
import { StyleConfig } from './StyleConfig';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PropertiesPanelProps {
  selectedElement: CrestronElement | null;
  updateElement: (elementId: string, updates: Partial<CrestronElement>) => void;
}

export function PropertiesPanel({ selectedElement, updateElement }: PropertiesPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    joins: true,
    style: true,
    states: false,
  });

  if (!selectedElement) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-zinc-500 text-sm">No element selected</p>
      </div>
    );
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  const handleUpdate = (updates: Partial<CrestronElement>) => {
    updateElement(selectedElement.id, updates);
  };

  return (
    <div className="w-full h-full bg-zinc-900 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="mb-1">Properties</h2>
        <p className="text-xs text-zinc-500">{selectedElement.type}</p>
      </div>

      {/* Basic Properties */}
      <div className="border-b border-zinc-800">
        <button
          onClick={() => toggleSection('basic')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800"
        >
          <span>Basic Properties</span>
          {expandedSections.basic ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {expandedSections.basic && (
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                type="text"
                value={selectedElement.name}
                onChange={(e) => handleUpdate({ name: e.target.value })}
                className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1">X</label>
                <input
                  type="number"
                  value={Math.round(selectedElement.x)}
                  onChange={(e) => handleUpdate({ x: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Y</label>
                <input
                  type="number"
                  value={Math.round(selectedElement.y)}
                  onChange={(e) => handleUpdate({ y: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1">Width</label>
                <input
                  type="number"
                  value={Math.round(selectedElement.width)}
                  onChange={(e) => handleUpdate({ width: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Height</label>
                <input
                  type="number"
                  value={Math.round(selectedElement.height)}
                  onChange={(e) => handleUpdate({ height: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                />
              </div>
            </div>

            {(selectedElement.type === 'button' || selectedElement.type === 'text') && (
              <div>
                <label className="block text-sm mb-1">Text</label>
                <input
                  type="text"
                  value={selectedElement.text || ''}
                  onChange={(e) => handleUpdate({ text: e.target.value })}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                />
              </div>
            )}

            {selectedElement.type === 'image' && (
              <div>
                <label className="block text-sm mb-1">Image URL</label>
                <input
                  type="text"
                  value={selectedElement.imageUrl || ''}
                  onChange={(e) => handleUpdate({ imageUrl: e.target.value })}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                />
              </div>
            )}

            {(selectedElement.type === 'slider' || selectedElement.type === 'gauge') && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm mb-1">Min</label>
                    <input
                      type="number"
                      value={selectedElement.min || 0}
                      onChange={(e) => handleUpdate({ min: Number(e.target.value) })}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Max</label>
                    <input
                      type="number"
                      value={selectedElement.max || 100}
                      onChange={(e) => handleUpdate({ max: Number(e.target.value) })}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                    />
                  </div>
                </div>

                {selectedElement.type === 'slider' && (
                  <div>
                    <label className="block text-sm mb-1">Orientation</label>
                    <select
                      value={selectedElement.orientation || 'horizontal'}
                      onChange={(e) =>
                        handleUpdate({ orientation: e.target.value as 'horizontal' | 'vertical' })
                      }
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
                    >
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Join Configuration */}
      <div className="border-b border-zinc-800" data-section="joins">
        <button
          onClick={() => toggleSection('joins')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800 transition-colors"
        >
          <span>Crestron Joins</span>
          {expandedSections.joins ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {expandedSections.joins && (
          <JoinConfig element={selectedElement} updateElement={handleUpdate} />
        )}
      </div>

      {/* Style Configuration */}
      <div className="border-b border-zinc-800">
        <button
          onClick={() => toggleSection('style')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800"
        >
          <span>Style</span>
          {expandedSections.style ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {expandedSections.style && (
          <StyleConfig element={selectedElement} updateElement={handleUpdate} />
        )}
      </div>
    </div>
  );
}
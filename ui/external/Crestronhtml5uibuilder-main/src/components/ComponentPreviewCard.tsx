// COMPONENT PREVIEW CARD
// Shows parsed component with selection, rename, and configuration

import { useState } from 'react';
import { Check, X, Code, Zap, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { ParsedComponent } from '../utils/jsxParser';
import * as LucideIcons from 'lucide-react';

interface ComponentPreviewCardProps {
  component: ParsedComponent;
  selected: boolean;
  onToggle: () => void;
  customName: string;
  onNameChange: (name: string) => void;
  icon: string;
  onIconChange: (icon: string) => void;
  joins: {
    digital: number;
    analog: number;
    serial: number;
  };
  onJoinsChange: (joins: { digital: number; analog: number; serial: number }) => void;
}

export function ComponentPreviewCard({
  component,
  selected,
  onToggle,
  customName,
  onNameChange,
  icon,
  onIconChange,
  joins,
  onJoinsChange,
}: ComponentPreviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Popular icons for quick selection
  const popularIcons = [
    'Box', 'Music', 'Tv', 'Thermometer', 'Lightbulb', 'Lock', 'Camera',
    'Volume2', 'Film', 'Radio', 'Speaker', 'Headphones', 'Smartphone',
    'Monitor', 'Sun', 'Moon', 'Wind', 'Droplets', 'Zap', 'Activity',
    'Grid', 'Layers', 'Settings', 'Sliders', 'ToggleLeft', 'Power',
  ];

  // Get icon component
  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.Box;

  // Count joins by type
  const digitalProps = component.props.filter(p => p.suggestedJoinType === 'digital');
  const analogProps = component.props.filter(p => p.suggestedJoinType === 'analog');
  const serialProps = component.props.filter(p => p.suggestedJoinType === 'serial');

  // Code preview (first 300 chars)
  const codePreview = component.code.substring(0, 300) + (component.code.length > 300 ? '...' : '');

  return (
    <div
      className={`border-2 rounded-xl transition-all ${
        selected
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={onToggle}
            className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
              selected
                ? 'bg-blue-600 border-blue-600'
                : 'border-zinc-600 hover:border-blue-500'
            }`}
          >
            {selected && <Check className="w-4 h-4 text-white" />}
          </button>

          {/* Icon */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center hover:scale-110 transition-transform"
              title="Change icon"
            >
              <IconComponent className="w-6 h-6 text-white" />
            </button>

            {/* Icon Picker Dropdown */}
            {showIconPicker && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400 font-semibold">SELECT ICON</span>
                  <button
                    onClick={() => setShowIconPicker(false)}
                    className="p-1 hover:bg-zinc-800 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                  {popularIcons.map((iconName) => {
                    const Icon = (LucideIcons as any)[iconName];
                    if (!Icon) return null;
                    return (
                      <button
                        key={iconName}
                        onClick={() => {
                          onIconChange(iconName);
                          setShowIconPicker(false);
                        }}
                        className={`w-10 h-10 rounded flex items-center justify-center transition-all ${
                          icon === iconName
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                        }`}
                        title={iconName}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Name input */}
            <input
              type="text"
              value={customName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={component.name}
              className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-white mb-2"
            />

            {/* Meta info */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 bg-zinc-700 rounded text-zinc-300">
                {component.estimatedSize.width} × {component.estimatedSize.height}
              </span>
              {component.hasInteraction && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                  Interactive
                </span>
              )}
              {component.detectedElements && component.detectedElements.length > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {component.detectedElements.length} elements
                </span>
              )}
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                {component.props.length} props
              </span>
            </div>
          </div>

          {/* Expand button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 p-2 hover:bg-zinc-700 rounded transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-zinc-700 p-4 space-y-4">
          {/* 🔥 DETECTED ELEMENTS - Mostra TUTTI gli elementi trovati nel codice */}
          {component.detectedElements && component.detectedElements.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2 flex items-center gap-2">
                <Zap className="w-3 h-3" />
                Interactive Elements Detected ({component.detectedElements.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {component.detectedElements.map((element, idx) => (
                  <div
                    key={element.id}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 space-y-2"
                  >
                    {/* Element Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{element.displayName}</p>
                        <p className="text-xs text-zinc-500">{element.category} • {element.id}</p>
                      </div>
                    </div>

                    {/* Joins for this specific element */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Digital Join */}
                      {element.suggestedJoins.digital && (
                        <div>
                          <label className="text-[10px] text-green-400 mb-1 block flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            Digital
                          </label>
                          <input
                            type="number"
                            value={element.suggestedJoins.digital.number}
                            onChange={(e) => {
                              // TODO: Update join number
                              const newValue = parseInt(e.target.value) || 0;
                              element.suggestedJoins.digital!.number = newValue;
                            }}
                            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-xs"
                            min="1"
                            max="4000"
                          />
                          <p className="text-[9px] text-zinc-600 mt-0.5">{element.suggestedJoins.digital.purpose}</p>
                        </div>
                      )}

                      {/* Analog Join */}
                      {element.suggestedJoins.analog && (
                        <div>
                          <label className="text-[10px] text-blue-400 mb-1 block flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            Analog
                          </label>
                          <input
                            type="number"
                            value={element.suggestedJoins.analog.number}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value) || 0;
                              element.suggestedJoins.analog!.number = newValue;
                            }}
                            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-xs"
                            min="1"
                            max="4000"
                          />
                          <p className="text-[9px] text-zinc-600 mt-0.5">{element.suggestedJoins.analog.purpose}</p>
                        </div>
                      )}

                      {/* Serial Join */}
                      {element.suggestedJoins.serial && (
                        <div>
                          <label className="text-[10px] text-purple-400 mb-1 block flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                            Serial
                          </label>
                          <input
                            type="number"
                            value={element.suggestedJoins.serial.number}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value) || 0;
                              element.suggestedJoins.serial!.number = newValue;
                            }}
                            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-xs"
                            min="1"
                            max="4000"
                          />
                          <p className="text-[9px] text-zinc-600 mt-0.5">{element.suggestedJoins.serial.purpose}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                <p className="text-[10px] text-blue-300">
                  💡 Each element has been automatically assigned joins. Edit join numbers as needed.
                </p>
              </div>
            </div>
          )}
          
          {/* Fallback: Base Joins Configuration (se non ci sono elementi rilevati) */}
          {(!component.detectedElements || component.detectedElements.length === 0) && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Crestron Joins</h4>
              <div className="grid grid-cols-3 gap-3">
                {/* Digital Join */}
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">
                    Digital ({digitalProps.length})
                  </label>
                  <input
                    type="number"
                    value={joins.digital}
                    onChange={(e) => onJoinsChange({ ...joins, digital: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm"
                    min="1"
                    max="4000"
                  />
                </div>

                {/* Analog Join */}
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">
                    Analog ({analogProps.length})
                  </label>
                  <input
                    type="number"
                    value={joins.analog}
                    onChange={(e) => onJoinsChange({ ...joins, analog: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm"
                    min="1"
                    max="4000"
                  />
                </div>

                {/* Serial Join */}
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">
                    Serial ({serialProps.length})
                  </label>
                  <input
                    type="number"
                    value={joins.serial}
                    onChange={(e) => onJoinsChange({ ...joins, serial: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm"
                    min="1"
                    max="4000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Props List */}
          {component.props.length > 0 && (!component.detectedElements || component.detectedElements.length === 0) && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Props Detected</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {component.props.map((prop, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2 py-1 bg-zinc-900 rounded text-xs"
                  >
                    <span className="text-white font-mono">{prop.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">{prop.type}</span>
                      {prop.suggestedJoinType && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          prop.suggestedJoinType === 'digital' ? 'bg-green-500/20 text-green-400' :
                          prop.suggestedJoinType === 'analog' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {prop.suggestedJoinType}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Preview */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2 flex items-center gap-1">
              <Code className="w-3 h-3" />
              Code Preview
            </h4>
            <pre className="bg-zinc-950 border border-zinc-700 rounded p-3 text-[10px] overflow-x-auto text-zinc-400 font-mono max-h-32 overflow-y-auto">
              {codePreview}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
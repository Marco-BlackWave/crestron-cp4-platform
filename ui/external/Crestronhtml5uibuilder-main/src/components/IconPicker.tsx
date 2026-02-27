import { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { ChevronDown, Search } from 'lucide-react';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  className?: string;
}

// Popular Crestron UI icons
const POPULAR_ICONS = [
  'Power', 'Home', 'Settings', 'Wifi', 'Volume2', 'VolumeX', 'Play', 'Pause', 
  'SkipForward', 'SkipBack', 'Sun', 'Moon', 'Lightbulb', 'Thermometer', 'Wind',
  'Droplet', 'Music', 'Radio', 'Tv', 'Monitor', 'Speaker', 'Camera', 'Video',
  'Lock', 'Unlock', 'Shield', 'Bell', 'AlertTriangle', 'Info', 'Check', 'X',
  'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ArrowUp', 'ArrowDown',
  'Plus', 'Minus', 'Menu', 'Grid', 'List', 'Zap', 'Wifi', 'Bluetooth', 'Cast',
  'Maximize', 'Minimize', 'Eye', 'EyeOff', 'Star', 'Heart', 'Clock', 'Calendar',
  'Sunrise', 'Sunset', 'CloudRain', 'Fan', 'Waves', 'Film', 'Image', 'Layers',
  'Sparkles', 'Flame', 'Snowflake', 'Coffee', 'Briefcase', 'Sofa', 'Bed', 'Armchair',
  'LayoutDashboard', 'LayoutGrid', 'Square', 'Circle', 'Triangle', 'Hexagon'
];

export function IconPicker({ value, onChange, className = '' }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get the icon component
  const IconComponent = (Icons as any)[value] || Icons.HelpCircle;

  // Filter icons based on search
  const filteredIcons = search
    ? POPULAR_ICONS.filter(name => 
        name.toLowerCase().includes(search.toLowerCase())
      )
    : POPULAR_ICONS;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-xs flex items-center justify-between hover:bg-zinc-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <IconComponent className="w-4 h-4" />
          <span>{value || 'Select icon...'}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[10000] mt-1 w-full bg-zinc-800 border border-zinc-600 rounded-lg shadow-2xl max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-zinc-700 sticky top-0 bg-zinc-800">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search icons..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Icon Grid */}
          <div className="grid grid-cols-6 gap-1 p-2 max-h-80 overflow-y-auto">
            {filteredIcons.map((iconName) => {
              const Icon = (Icons as any)[iconName];
              if (!Icon) return null;

              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => {
                    onChange(iconName);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`p-2 rounded hover:bg-zinc-700 transition-colors flex flex-col items-center gap-1 group ${
                    value === iconName ? 'bg-blue-600 text-white' : 'text-zinc-400'
                  }`}
                  title={iconName}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] truncate w-full text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {iconName}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredIcons.length === 0 && (
            <div className="p-4 text-center text-zinc-500 text-sm">
              No icons found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { CrestronElement, Join, JoinType, Page } from '../types/crestron';
import { X, Type, Hash, Palette, Image as ImageIcon, Settings } from 'lucide-react';
import { IconPicker } from './IconPicker';
import { HeaderSidebarConfig } from './HeaderSidebarConfig';

interface QuickEditSidebarProps {
  element: CrestronElement;
  pages: Page[];
  onUpdate: (updates: Partial<CrestronElement>) => void;
  onClose: () => void;
}

export function QuickEditSidebar({ element, pages, onUpdate, onClose }: QuickEditSidebarProps) {
  const [localElement, setLocalElement] = useState(element);
  const [activeTab, setActiveTab] = useState<'basic' | 'style' | 'config' | 'joins'>('basic');

  // Sync with external updates
  useEffect(() => {
    setLocalElement(element);
  }, [element]);

  const handleUpdate = (updates: Partial<CrestronElement>) => {
    const newElement = { ...localElement, ...updates };
    setLocalElement(newElement);
    onUpdate(updates);
  };

  const handleConfigUpdate = (key: string, value: any) => {
    const newConfig = { ...localElement.config, [key]: value };
    handleUpdate({ config: newConfig });
  };

  const tabs = [
    { id: 'basic' as const, icon: Type, label: 'Basic' },
    { id: 'style' as const, icon: Palette, label: 'Style' },
    { id: 'config' as const, icon: Settings, label: 'Config' },
    { id: 'joins' as const, icon: Hash, label: 'Joins' },
  ];

  // Helper function to render join input
  const renderJoinInput = (label: string, joinKey: string, type: JoinType, defaultValue: number, description?: string) => {
    const currentJoins = localElement.joins || {};
    const joinValue = currentJoins[joinKey];

    return (
      <div key={joinKey} className="space-y-1">
        <label className="text-xs text-zinc-400 block">{label}</label>
        {description && <p className="text-[10px] text-zinc-500 mb-1">{description}</p>}
        <div className="flex gap-2">
          <span className="px-2 py-1.5 bg-zinc-900 rounded text-xs text-zinc-400 min-w-[60px] text-center">
            {type === 'digital' ? 'D' : type === 'analog' ? 'A' : 'S'}
          </span>
          <input
            type="number"
            value={joinValue ?? defaultValue}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              handleUpdate({
                joins: {
                  ...currentJoins,
                  [joinKey]: isNaN(value) ? defaultValue : value,
                },
              });
            }}
            className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            min="1"
            max="65535"
          />
        </div>
      </div>
    );
  };

  // Render joins based on element type
  const renderJoins = () => {
    switch (localElement.type) {
      case 'button':
        return (
          <>
            {renderJoinInput('Press Join', 'press', 'digital', 1, 'Triggered when button is pressed')}
            {renderJoinInput('Feedback Join', 'feedback', 'digital', 2, 'Controls button active state')}
            {renderJoinInput('Text Join', 'text', 'serial', 1, 'Text to display on button')}
          </>
        );

      case 'slider':
        return (
          <>
            {renderJoinInput('Value Join', 'value', 'analog', 1, 'Slider value (0-65535)')}
            {renderJoinInput('Feedback Join', 'feedback', 'analog', 2, 'Value feedback from system')}
          </>
        );

      case 'gauge':
        return (
          <>
            {renderJoinInput('Value Join', 'value', 'analog', 1, 'Gauge value (0-65535)')}
            {renderJoinInput('Label Join', 'label', 'serial', 1, 'Gauge label text')}
          </>
        );

      case 'text':
        return (
          <>
            {renderJoinInput('Text Join', 'text', 'serial', 1, 'Text content to display')}
          </>
        );

      case 'list':
        return (
          <>
            {renderJoinInput('Selected Index', 'selectedIndex', 'analog', 1, 'Currently selected item (0-65535)')}
            {renderJoinInput('Item Press', 'itemPress', 'digital', 1, 'Triggered when item is pressed')}
            {renderJoinInput('List Data', 'listData', 'serial', 1, 'List items data (JSON format)')}
          </>
        );

      case 'video':
        return (
          <>
            {renderJoinInput('Play/Pause', 'playPause', 'digital', 1, 'Toggle play/pause state')}
            {renderJoinInput('Stop', 'stop', 'digital', 2, 'Stop video playback')}
            {renderJoinInput('Volume', 'volume', 'analog', 1, 'Volume level (0-65535)')}
            {renderJoinInput('Progress', 'progress', 'analog', 2, 'Playback progress (0-65535)')}
            {renderJoinInput('Video URL', 'videoUrl', 'serial', 1, 'Video source URL')}
            {renderJoinInput('Video Title', 'videoTitle', 'serial', 2, 'Video title text')}
          </>
        );

      case 'media-player':
        return (
          <>
            {renderJoinInput('Play Button', 'playPress', 'digital', 1, 'Play button pressed')}
            {renderJoinInput('Pause Button', 'pausePress', 'digital', 2, 'Pause button pressed')}
            {renderJoinInput('Previous Button', 'previousPress', 'digital', 3, 'Previous track button pressed')}
            {renderJoinInput('Next Button', 'nextPress', 'digital', 4, 'Next track button pressed')}
            {renderJoinInput('Volume Up Button', 'volumeUpPress', 'digital', 5, 'Volume up button pressed')}
            {renderJoinInput('Volume Down Button', 'volumeDownPress', 'digital', 6, 'Volume down button pressed')}
            {renderJoinInput('Volume Level', 'volumeLevel', 'analog', 1, 'Volume level (0-65535)')}
            {renderJoinInput('Progress Position', 'progressPosition', 'analog', 2, 'Track progress (0-65535)')}
            {renderJoinInput('Track Title', 'trackTitle', 'serial', 1, 'Currently playing track title')}
            {renderJoinInput('Track Artist', 'trackArtist', 'serial', 2, 'Track artist name')}
            {renderJoinInput('Track Album', 'trackAlbum', 'serial', 3, 'Track album name')}
            {renderJoinInput('Album Art URL', 'albumArtUrl', 'serial', 4, 'Album art image URL')}
          </>
        );

      case 'header':
        return (
          <>
            {renderJoinInput('Logo Button', 'logoPress', 'digital', 1, 'Logo/brand button pressed')}
            {renderJoinInput('Settings Button', 'settingsPress', 'digital', 2, 'Settings button pressed')}
            {renderJoinInput('Notifications Button', 'notificationsPress', 'digital', 3, 'Notifications button pressed')}
            {renderJoinInput('Search Button', 'searchPress', 'digital', 4, 'Search button pressed')}
            {renderJoinInput('Notification Count', 'notificationCount', 'analog', 1, 'Number of notifications (0-65535)')}
            {renderJoinInput('Title Text', 'titleText', 'serial', 1, 'Header title text')}
            {renderJoinInput('Subtitle Text', 'subtitleText', 'serial', 2, 'Header subtitle text')}
            {renderJoinInput('Logo Text', 'logoText', 'serial', 3, 'Header logo text')}
          </>
        );

      case 'sidebar':
        return (
          <>
            {renderJoinInput('Home Button', 'homePress', 'digital', 10, 'Home menu item pressed')}
            {renderJoinInput('Lighting Button', 'lightingPress', 'digital', 11, 'Lighting menu item pressed')}
            {renderJoinInput('Climate Button', 'climatePress', 'digital', 12, 'Climate menu item pressed')}
            {renderJoinInput('Media Button', 'mediaPress', 'digital', 13, 'Media menu item pressed')}
            {renderJoinInput('Security Button', 'securityPress', 'digital', 14, 'Security menu item pressed')}
            {renderJoinInput('Settings Button', 'settingsPress', 'digital', 15, 'Settings menu item pressed')}
            {renderJoinInput('Selected Index', 'selectedIndex', 'analog', 10, 'Currently selected menu index (0-65535)')}
            {renderJoinInput('Footer Text', 'footerText', 'serial', 10, 'Sidebar footer text')}
          </>
        );

      default:
        return (
          <>
            {renderJoinInput('Digital Join', 'digital', 'digital', 1)}
            {renderJoinInput('Analog Join', 'analog', 'analog', 1)}
            {renderJoinInput('Serial Join', 'serial', 'serial', 1)}
          </>
        );
    }
  };

  return (
    <div className="w-80 h-full bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-xs font-bold">
            {localElement.type[0].toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-sm">Quick Edit</h3>
            <p className="text-xs text-zinc-400">{localElement.type}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-zinc-950 text-blue-400 border-b-2 border-blue-500'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* BASIC TAB */}
        {activeTab === 'basic' && (
          <>
            {/* Element Name (internal identifier) */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 block">Element Name</label>
              <input
                type="text"
                value={localElement.name || ''}
                onChange={(e) => handleUpdate({ name: e.target.value })}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Element name (ID)"
              />
            </div>

            {/* Display Text */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 block">Display Text</label>
              <input
                type="text"
                value={localElement.text || ''}
                onChange={(e) => handleUpdate({ text: e.target.value })}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Text shown on element"
              />
            </div>

            {/* Icon Picker */}
            {(localElement.type === 'button' || 
              localElement.type === 'light-zone-card' || 
              localElement.type === 'climate-zone-card' ||
              localElement.type === 'security-panel') && (
              <IconPicker
                value={localElement.icon || 'Circle'}
                onChange={(icon) => handleUpdate({ icon })}
              />
            )}

            {/* Position & Size */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block">X Position</label>
                <input
                  type="number"
                  value={Math.round(localElement.x)}
                  onChange={(e) => handleUpdate({ x: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block">Y Position</label>
                <input
                  type="number"
                  value={Math.round(localElement.y)}
                  onChange={(e) => handleUpdate({ y: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block">Width</label>
                <input
                  type="number"
                  value={Math.round(localElement.width)}
                  onChange={(e) => handleUpdate({ width: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block">Height</label>
                <input
                  type="number"
                  value={Math.round(localElement.height)}
                  onChange={(e) => handleUpdate({ height: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </>
        )}

        {/* STYLE TAB */}
        {activeTab === 'style' && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 block">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={localElement.style?.backgroundColor || '#3b82f6'}
                  onChange={(e) => handleUpdate({ style: { ...localElement.style, backgroundColor: e.target.value } })}
                  className="w-12 h-9 rounded cursor-pointer bg-zinc-900 border border-zinc-700"
                />
                <input
                  type="text"
                  value={localElement.style?.backgroundColor || '#3b82f6'}
                  onChange={(e) => handleUpdate({ style: { ...localElement.style, backgroundColor: e.target.value } })}
                  className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 block">Text / Accent Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={localElement.style?.textColor || '#ffffff'}
                  onChange={(e) => handleUpdate({ style: { ...localElement.style, textColor: e.target.value } })}
                  className="w-12 h-9 rounded cursor-pointer bg-zinc-900 border border-zinc-700"
                />
                <input
                  type="text"
                  value={localElement.style?.textColor || '#ffffff'}
                  onChange={(e) => handleUpdate({ style: { ...localElement.style, textColor: e.target.value } })}
                  className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 block">Border Radius</label>
              <input
                type="number"
                value={localElement.style?.borderRadius || 8}
                onChange={(e) => handleUpdate({ style: { ...localElement.style, borderRadius: parseInt(e.target.value) || 0 } })}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="0"
                max="100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 block">Border Width</label>
              <input
                type="number"
                value={localElement.style?.borderWidth || 0}
                onChange={(e) => handleUpdate({ style: { ...localElement.style, borderWidth: parseInt(e.target.value) || 0 } })}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="0"
                max="20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 block">Border Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={localElement.style?.borderColor || '#3f3f46'}
                  onChange={(e) => handleUpdate({ style: { ...localElement.style, borderColor: e.target.value } })}
                  className="w-12 h-9 rounded cursor-pointer bg-zinc-900 border border-zinc-700"
                />
                <input
                  type="text"
                  value={localElement.style?.borderColor || '#3f3f46'}
                  onChange={(e) => handleUpdate({ style: { ...localElement.style, borderColor: e.target.value } })}
                  className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 block">Opacity</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((localElement.style?.opacity ?? 1) * 100)}
                  onChange={(e) => handleUpdate({ style: { ...localElement.style, opacity: parseInt(e.target.value) / 100 } })}
                  className="flex-1"
                />
                <span className="text-xs text-zinc-400 min-w-[40px] text-right">{Math.round((localElement.style?.opacity ?? 1) * 100)}%</span>
              </div>
            </div>

            {localElement.type === 'image' && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block">Image URL</label>
                <input
                  type="text"
                  value={localElement.imageUrl || ''}
                  onChange={(e) => handleUpdate({ imageUrl: e.target.value })}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
            )}
          </>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <>
            {(localElement.type === 'header' || localElement.type === 'sidebar') ? (
              <HeaderSidebarConfig
                element={localElement}
                pages={pages}
                onConfigChange={handleConfigUpdate}
              />
            ) : (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                <p className="text-sm text-zinc-400">No config options for this element</p>
              </div>
            )}
          </>
        )}

        {/* JOINS TAB */}
        {activeTab === 'joins' && (
          <div className="space-y-3" data-section="joins">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-400 mb-1 font-medium">Crestron Joins</p>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Configure digital (D), analog (A), and serial (S) joins for Crestron system integration
              </p>
            </div>
            {renderJoins()}
          </div>
        )}
      </div>
    </div>
  );
}
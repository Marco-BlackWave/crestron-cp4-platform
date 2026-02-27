import { useState, useEffect, useRef } from 'react';
import { CrestronElement, Join, JoinType, Page } from '../types/crestron';
import { X, Type, Hash, Palette, Image as ImageIcon, Settings, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { IconPicker } from './IconPicker';
import { HeaderSidebarConfig } from './HeaderSidebarConfig';

interface QuickEditPopupProps {
  element: CrestronElement;
  position: { x: number; y: number };
  pages: Page[];
  onUpdate: (updates: Partial<CrestronElement>) => void;
  onClose: () => void;
}

export function QuickEditPopup({ element, position, pages, onUpdate, onClose }: QuickEditPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [localElement, setLocalElement] = useState(element);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [activeTab, setActiveTab] = useState<'basic' | 'style' | 'config' | 'joins'>('basic');

  // Adjust position to keep popup visible
  useEffect(() => {
    if (!popupRef.current) return;

    const popup = popupRef.current;
    const rect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = position.x + 10;
    let newY = position.y + 10;

    // Adjust X if popup goes off right edge
    if (newX + rect.width > viewportWidth) {
      newX = viewportWidth - rect.width - 10;
    }

    // Adjust Y if popup goes off bottom edge
    if (newY + rect.height > viewportHeight) {
      newY = viewportHeight - rect.height - 10;
    }

    // Keep popup on screen (left edge)
    if (newX < 10) {
      newX = 10;
    }

    // Keep popup on screen (top edge)
    if (newY < 10) {
      newY = 10;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [position]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevent scroll propagation to canvas when mouse is over popup
    const handleWheel = (e: WheelEvent) => {
      if (popupRef.current && popupRef.current.contains(e.target as Node)) {
        e.stopPropagation();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [onClose]);

  const handleChange = (field: string, value: any) => {
    const updates = { [field]: value };
    setLocalElement({ ...localElement, ...updates });
    onUpdate(updates);
  };

  const handleStyleChange = (field: string, value: any) => {
    const styleUpdates = {
      style: {
        ...localElement.style,
        [field]: value,
      },
    };
    setLocalElement({ ...localElement, ...styleUpdates });
    onUpdate(styleUpdates);
  };

  const updateJoin = (joinKey: string, updates: Partial<Join>) => {
    const joinUpdates = {
      joins: {
        ...localElement.joins,
        [joinKey]: {
          ...(localElement.joins[joinKey as keyof typeof localElement.joins] || {}),
          ...updates,
        },
      },
    };
    setLocalElement({ ...localElement, ...joinUpdates });
    onUpdate(joinUpdates);
  };

  const renderJoinInput = (
    label: string,
    joinKey: string,
    defaultType: JoinType,
    defaultNumber: number = 1,
    description?: string
  ) => {
    // Ensure join exists
    const join = localElement.joins[joinKey as keyof typeof localElement.joins] || {
      type: defaultType,
      number: defaultNumber,
    };

    // Auto-create join if it doesn't exist
    if (!localElement.joins[joinKey as keyof typeof localElement.joins]) {
      setTimeout(() => updateJoin(joinKey, { type: defaultType, number: defaultNumber }), 0);
    }

    const typeColors = {
      digital: 'text-blue-400',
      analog: 'text-green-400',
      serial: 'text-purple-400',
    };

    return (
      <div className="p-2 bg-zinc-900 rounded mb-2">
        <div className="mb-2">
          <label className="text-xs font-medium block mb-1">{label}</label>
          {description && <p className="text-xs text-zinc-500">{description}</p>}
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Type</label>
              <select
                value={join?.type || defaultType}
                onChange={(e) =>
                  updateJoin(joinKey, { type: e.target.value as JoinType })
                }
                className={`w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs ${typeColors[join?.type || defaultType]}`}
              >
                <option value="digital">Digital</option>
                <option value="analog">Analog</option>
                <option value="serial">Serial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Join #</label>
              <input
                type="number"
                min="1"
                max="65535"
                value={join?.number || defaultNumber}
                onChange={(e) =>
                  updateJoin(joinKey, { number: Number(e.target.value) })
                }
                className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Description (Optional)</label>
            <input
              type="text"
              value={join?.description || ''}
              onChange={(e) =>
                updateJoin(joinKey, { description: e.target.value })
              }
              placeholder={description || 'Add description...'}
              className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderJoinsForType = () => {
    switch (element.type) {
      case 'button':
        return (
          <>
            {renderJoinInput('Press Join', 'press', 'digital', 1, 'Button pressed')}
            {renderJoinInput('Release Join', 'release', 'digital', 2, 'Button released')}
            {renderJoinInput('Feedback Join', 'feedback', 'digital', 3, 'Button state feedback')}
          </>
        );

      case 'slider':
        return (
          <>
            {renderJoinInput('Value Join', 'value', 'analog', 1, 'Slider value (0-65535)')}
            {renderJoinInput('Feedback Join', 'feedback', 'analog', 2, 'Slider position feedback')}
          </>
        );

      case 'gauge':
        return <>{renderJoinInput('Value Join', 'value', 'analog', 1, 'Gauge value')}</>;

      case 'text':
        return <>{renderJoinInput('Text Join', 'text', 'serial', 1, 'Dynamic text content')}</>;

      case 'image':
        return <>{renderJoinInput('Image Join', 'text', 'serial', 1, 'Dynamic image URL')}</>;

      case 'list':
        return (
          <>
            {renderJoinInput('Select Join', 'press', 'digital', 1, 'Item selected')}
            {renderJoinInput('Data Join', 'text', 'serial', 1, 'List data (JSON)')}
          </>
        );

      case 'subpage':
        return <>{renderJoinInput('Show Join', 'feedback', 'digital', 1, 'Show/hide subpage')}</>;

      case 'thermostat':
        return (
          <>
            {renderJoinInput('Temperature Value', 'tempValue', 'analog', 1, 'Current temperature (0-65535)')}
            {renderJoinInput('Setpoint Value', 'setpointValue', 'analog', 2, 'Target temperature (0-65535)')}
            {renderJoinInput('Temp Up Press', 'tempUpPress', 'digital', 1, 'Increase temperature')}
            {renderJoinInput('Temp Down Press', 'tempDownPress', 'digital', 2, 'Decrease temperature')}
            {renderJoinInput('Mode Press', 'modePress', 'digital', 3, 'Change mode button')}
            {renderJoinInput('Fan Press', 'fanPress', 'digital', 4, 'Change fan button')}
            {renderJoinInput('Mode Feedback', 'modeFeedback', 'serial', 1, 'Current mode (heat/cool/auto/off)')}
            {renderJoinInput('Fan Feedback', 'fanFeedback', 'serial', 2, 'Current fan mode (auto/on)')}
          </>
        );

      case 'mini-thermostat':
        return (
          <>
            {renderJoinInput('Temperature Value', 'tempValue', 'analog', 1, 'Current temperature')}
            {renderJoinInput('Setpoint Value', 'setpointValue', 'analog', 2, 'Target temperature')}
            {renderJoinInput('Temp Up Press', 'tempUpPress', 'digital', 1, 'Increase temperature')}
            {renderJoinInput('Temp Down Press', 'tempDownPress', 'digital', 2, 'Decrease temperature')}
          </>
        );

      case 'fan':
        return (
          <>
            {renderJoinInput('Power Press', 'powerPress', 'digital', 1, 'Power on/off')}
            {renderJoinInput('Speed Press', 'speedPress', 'digital', 2, 'Change speed')}
            {renderJoinInput('Power Feedback', 'powerFeedback', 'digital', 3, 'Power state')}
            {renderJoinInput('Speed Feedback', 'speedFeedback', 'serial', 1, 'Current speed (low/med/high)')}
          </>
        );

      case 'volume-control':
        return (
          <>
            {renderJoinInput('Volume Value', 'volumeValue', 'analog', 1, 'Volume level (0-65535)')}
            {renderJoinInput('Volume Up Press', 'volumeUpPress', 'digital', 1, 'Increase volume')}
            {renderJoinInput('Volume Down Press', 'volumeDownPress', 'digital', 2, 'Decrease volume')}
            {renderJoinInput('Mute Press', 'mutePress', 'digital', 3, 'Toggle mute')}
            {renderJoinInput('Mute Feedback', 'muteFeedback', 'digital', 4, 'Mute state')}
          </>
        );

      case 'dimmer':
        return (
          <>
            {renderJoinInput('Brightness Value', 'brightnessValue', 'analog', 1, 'Brightness level (0-65535)')}
            {renderJoinInput('Power Press', 'powerPress', 'digital', 1, 'Power on/off')}
            {renderJoinInput('Brightness Up Press', 'brightnessUpPress', 'digital', 2, 'Increase brightness')}
            {renderJoinInput('Brightness Down Press', 'brightnessDownPress', 'digital', 3, 'Decrease brightness')}
            {renderJoinInput('Power Feedback', 'powerFeedback', 'digital', 4, 'Power state')}
          </>
        );

      case 'door-lock':
        return (
          <>
            {renderJoinInput('Lock Press', 'lockPress', 'digital', 1, 'Lock door')}
            {renderJoinInput('Unlock Press', 'unlockPress', 'digital', 2, 'Unlock door')}
            {renderJoinInput('Lock Feedback', 'lockFeedback', 'digital', 3, 'Lock state (locked/unlocked)')}
            {renderJoinInput('Status Text', 'statusText', 'serial', 1, 'Status message')}
          </>
        );

      case 'humidity':
        return (
          <>
            {renderJoinInput('Humidity Value', 'humidityValue', 'analog', 1, 'Current humidity (0-65535)')}
            {renderJoinInput('Target Value', 'targetValue', 'analog', 2, 'Target humidity (0-65535)')}
            {renderJoinInput('Humidity Up Press', 'humidityUpPress', 'digital', 1, 'Increase target')}
            {renderJoinInput('Humidity Down Press', 'humidityDownPress', 'digital', 2, 'Decrease target')}
          </>
        );

      case 'media-player':
        return (
          <>
            {renderJoinInput('Play Press', 'playPress', 'digital', 1, 'Play button')}
            {renderJoinInput('Pause Press', 'pausePress', 'digital', 2, 'Pause button')}
            {renderJoinInput('Stop Press', 'stopPress', 'digital', 3, 'Stop button')}
            {renderJoinInput('Next Press', 'nextPress', 'digital', 4, 'Next track')}
            {renderJoinInput('Previous Press', 'prevPress', 'digital', 5, 'Previous track')}
            {renderJoinInput('Volume Value', 'volumeValue', 'analog', 1, 'Volume level')}
            {renderJoinInput('Progress Value', 'progressValue', 'analog', 2, 'Playback progress')}
            {renderJoinInput('Title Text', 'titleText', 'serial', 1, 'Current title')}
            {renderJoinInput('Artist Text', 'artistText', 'serial', 2, 'Current artist')}
            {renderJoinInput('Status Feedback', 'statusFeedback', 'serial', 3, 'Playback status')}
          </>
        );

      case 'audio-zone':
        return (
          <>
            {renderJoinInput('Power Press', 'powerPress', 'digital', 1, 'Zone power')}
            {renderJoinInput('Volume Value', 'volumeValue', 'analog', 1, 'Volume level')}
            {renderJoinInput('Source Press', 'sourcePress', 'digital', 2, 'Change source')}
            {renderJoinInput('Mute Press', 'mutePress', 'digital', 3, 'Toggle mute')}
            {renderJoinInput('Power Feedback', 'powerFeedback', 'digital', 4, 'Power state')}
            {renderJoinInput('Source Text', 'sourceText', 'serial', 1, 'Current source name')}
            {renderJoinInput('Mute Feedback', 'muteFeedback', 'digital', 5, 'Mute state')}
          </>
        );

      case 'security-panel':
        return (
          <>
            {renderJoinInput('Arm Home Press', 'armHomePress', 'digital', 1, 'Arm home')}
            {renderJoinInput('Arm Away Press', 'armAwayPress', 'digital', 2, 'Arm away')}
            {renderJoinInput('Disarm Press', 'disarmPress', 'digital', 3, 'Disarm')}
            {renderJoinInput('Status Feedback', 'statusFeedback', 'serial', 1, 'System status')}
            {renderJoinInput('Zone Status', 'zoneStatus', 'serial', 2, 'Zone status (JSON)')}
            {renderJoinInput('Alarm Feedback', 'alarmFeedback', 'digital', 4, 'Alarm active')}
          </>
        );

      case 'tv-remote':
        return (
          <>
            {renderJoinInput('Power Press', 'powerPress', 'digital', 1, 'Power on/off')}
            {renderJoinInput('Vol Up Press', 'volUpPress', 'digital', 2, 'Volume up')}
            {renderJoinInput('Vol Down Press', 'volDownPress', 'digital', 3, 'Volume down')}
            {renderJoinInput('Ch Up Press', 'chUpPress', 'digital', 4, 'Channel up')}
            {renderJoinInput('Ch Down Press', 'chDownPress', 'digital', 5, 'Channel down')}
            {renderJoinInput('Mute Press', 'mutePress', 'digital', 6, 'Toggle mute')}
            {renderJoinInput('Menu Press', 'menuPress', 'digital', 7, 'Menu button')}
            {renderJoinInput('Back Press', 'backPress', 'digital', 8, 'Back button')}
            {renderJoinInput('Up Press', 'upPress', 'digital', 9, 'Navigate up')}
            {renderJoinInput('Down Press', 'downPress', 'digital', 10, 'Navigate down')}
            {renderJoinInput('Left Press', 'leftPress', 'digital', 11, 'Navigate left')}
            {renderJoinInput('Right Press', 'rightPress', 'digital', 12, 'Navigate right')}
            {renderJoinInput('OK Press', 'okPress', 'digital', 13, 'OK/Select button')}
            {renderJoinInput('Number Press', 'numberPress', 'analog', 1, 'Number pad (0-9)')}
          </>
        );

      case 'keypad':
        return (
          <>
            {renderJoinInput('Key Press', 'keyPress', 'serial', 1, 'Key pressed value')}
            {renderJoinInput('Enter Press', 'enterPress', 'digital', 1, 'Enter/Submit button')}
            {renderJoinInput('Clear Press', 'clearPress', 'digital', 2, 'Clear button')}
            {renderJoinInput('Display Text', 'displayText', 'serial', 2, 'Display feedback')}
          </>
        );

      case 'rgb-light':
        return (
          <>
            {renderJoinInput('Power Press', 'powerPress', 'digital', 1, 'Power on/off')}
            {renderJoinInput('Red Value', 'redValue', 'analog', 1, 'Red component (0-65535)')}
            {renderJoinInput('Green Value', 'greenValue', 'analog', 2, 'Green component (0-65535)')}
            {renderJoinInput('Blue Value', 'blueValue', 'analog', 3, 'Blue component (0-65535)')}
            {renderJoinInput('Brightness Value', 'brightnessValue', 'analog', 4, 'Overall brightness')}
            {renderJoinInput('Power Feedback', 'powerFeedback', 'digital', 2, 'Power state')}
          </>
        );

      case 'scene-selector':
        return (
          <>
            {renderJoinInput('Scene Press', 'scenePress', 'analog', 1, 'Scene number (1-65535)')}
            {renderJoinInput('Scene Feedback', 'sceneFeedback', 'analog', 2, 'Active scene number')}
            {renderJoinInput('Scene Name', 'sceneName', 'serial', 1, 'Scene name text')}
          </>
        );

      case 'camera-view':
        return (
          <>
            {renderJoinInput('Stream URL', 'streamUrl', 'serial', 1, 'Camera stream URL')}
            {renderJoinInput('PTZ Up Press', 'ptzUpPress', 'digital', 1, 'Pan/Tilt up')}
            {renderJoinInput('PTZ Down Press', 'ptzDownPress', 'digital', 2, 'Pan/Tilt down')}
            {renderJoinInput('PTZ Left Press', 'ptzLeftPress', 'digital', 3, 'Pan/Tilt left')}
            {renderJoinInput('PTZ Right Press', 'ptzRightPress', 'digital', 4, 'Pan/Tilt right')}
            {renderJoinInput('Zoom In Press', 'zoomInPress', 'digital', 5, 'Zoom in')}
            {renderJoinInput('Zoom Out Press', 'zoomOutPress', 'digital', 6, 'Zoom out')}
          </>
        );

      case 'light-zone-card':
        return (
          <>
            {renderJoinInput('Brightness Value', 'value', 'analog', 1, 'Light brightness level (0-65535)')}
            {renderJoinInput('Power Feedback', 'feedback', 'digital', 1, 'Light on/off state')}
            {renderJoinInput('Power Press', 'press', 'digital', 2, 'Power button press (optional)')}
          </>
        );

      case 'scene-button':
        return (
          <>
            {renderJoinInput('Scene Press', 'press', 'digital', 1, 'Scene activation button')}
            {renderJoinInput('Scene Feedback', 'feedback', 'digital', 2, 'Scene active state')}
            {renderJoinInput('Release Join', 'release', 'digital', 3, 'Button released (optional)')}
          </>
        );

      case 'room-card':
        return (
          <>
            {renderJoinInput('Room Press', 'press', 'digital', 1, 'Room navigation button')}
            {renderJoinInput('Status Feedback', 'feedback', 'digital', 2, 'Room status/active state (optional)')}
            {renderJoinInput('Status Text', 'text', 'serial', 1, 'Room status text (optional)')}
          </>
        );

      case 'header':
        return (
          <>
            {renderJoinInput('Menu Button', 'menuPress', 'digital', 1, 'Menu button pressed')}
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
          <div className="text-center text-zinc-500 text-sm py-4">
            No specific joins defined for this element type
          </div>
        );
    }
  };

  const handleConfigChange = (field: string, value: any) => {
    const configUpdates = {
      config: {
        ...localElement.config,
        [field]: value,
      },
    };
    setLocalElement({ ...localElement, ...configUpdates });
    onUpdate(configUpdates);
  };

  return (
    <div
      ref={popupRef}
      className="quick-edit-popup fixed bg-gradient-to-br from-zinc-900/98 via-zinc-800/98 to-zinc-900/98 border-2 border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-500/30 z-[9999] w-[450px] backdrop-blur-xl animate-in zoom-in-95 duration-200"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20 px-6 py-4 border-b border-zinc-700/50 flex items-center justify-between rounded-t-2xl flex-shrink-0">
        <div>
          <h3 className="font-semibold text-white text-lg bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Quick Edit</h3>
          <p className="text-xs text-zinc-400 mt-1">{element.type} · {element.name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-700/50 bg-zinc-900/50">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'basic'
              ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Type className="w-4 h-4 inline mr-2" />
          Basic
        </button>
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'style'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Palette className="w-4 h-4 inline mr-2" />
          Style
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'config'
              ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Hash className="w-4 h-4 inline mr-2" />
          Config
        </button>
        <button
          onClick={() => setActiveTab('joins')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'joins'
              ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Hash className="w-4 h-4 inline mr-2" />
          Joins
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="p-4 h-[60vh] overflow-y-auto">{/* Fixed height for all tabs */}
        {/* BASIC TAB */}
        {activeTab === 'basic' && (
          <div className="space-y-3">
            {/* Element Name */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-1 block">Element Name</label>
              <input
                type="text"
                value={localElement.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-sm"
                placeholder="Element name..."
              />
            </div>

            {/* Position & Size */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-2 block">Position & Size</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">X Position</label>
                  <input
                    type="number"
                    value={localElement.x}
                    onChange={(e) => handleChange('x', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Y Position</label>
                  <input
                    type="number"
                    value={localElement.y}
                    onChange={(e) => handleChange('y', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Width</label>
                  <input
                    type="number"
                    value={localElement.width}
                    onChange={(e) => handleChange('width', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Height</label>
                  <input
                    type="number"
                    value={localElement.height}
                    onChange={(e) => handleChange('height', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Text Content */}
            {(element.type === 'text' || element.type === 'button') && (
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1 block">
                  {element.type === 'button' ? 'Button Label' : 'Text Content'}
                </label>
                <input
                  type="text"
                  value={localElement.text || ''}
                  onChange={(e) => handleChange('text', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  placeholder="Enter text..."
                />
              </div>
            )}

            {/* Icon */}
            {element.icon !== undefined && (
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1 block">
                  <ImageIcon className="w-3 h-3 inline mr-1" />
                  Icon Name (Lucide)
                </label>
                <IconPicker
                  value={localElement.icon || ''}
                  onChange={(icon) => handleChange('icon', icon)}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Browse icons at <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">lucide.dev</a>
                </p>
              </div>
            )}

            {/* Scene Selector Editor */}
            {element.type === 'scene-selector' && (
              <div className="border border-zinc-700/50 rounded-lg p-4 bg-zinc-900/50 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-base font-semibold text-emerald-400">Scenes Editor</label>
                  <button
                    onClick={() => {
                      const scenes = localElement.config?.scenes || [];
                      const newScene = { name: `Scene ${scenes.length + 1}`, icon: 'Sparkles' };
                      handleConfigChange('scenes', [...scenes, newScene]);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    + Add Scene
                  </button>
                </div>

                {/* Layout Options */}
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Layout</label>
                  <select
                    value={localElement.config?.sceneLayout || 'grid'}
                    onChange={(e) => handleConfigChange('sceneLayout', e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                  </select>
                </div>

                {localElement.config?.sceneLayout === 'grid' && (
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Columns</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={localElement.config?.sceneCols || 2}
                      onChange={(e) => handleConfigChange('sceneCols', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    />
                  </div>
                )}

                {/* Scenes List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {(localElement.config?.scenes || []).map((scene: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Scene {idx + 1}</span>
                        <button
                          onClick={() => {
                            const scenes = [...(localElement.config?.scenes || [])];
                            scenes.splice(idx, 1);
                            handleConfigChange('scenes', scenes);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={scene.name}
                          onChange={(e) => {
                            const scenes = [...(localElement.config?.scenes || [])];
                            scenes[idx] = { ...scenes[idx], name: e.target.value };
                            handleConfigChange('scenes', scenes);
                          }}
                          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                          placeholder="Scene name"
                        />
                        <IconPicker
                          value={scene.icon}
                          onChange={(icon) => {
                            const scenes = [...(localElement.config?.scenes || [])];
                            scenes[idx] = { ...scenes[idx], icon };
                            handleConfigChange('scenes', scenes);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image URL */}
            {element.imageUrl !== undefined && (
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1 block">Image URL</label>
                <input
                  type="text"
                  value={localElement.imageUrl || ''}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Slider Range */}
            {(element.type === 'slider' || element.type === 'gauge') && (
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-2 block">Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Min Value</label>
                    <input
                      type="number"
                      value={localElement.min ?? 0}
                      onChange={(e) => handleChange('min', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Max Value</label>
                    <input
                      type="number"
                      value={localElement.max ?? 100}
                      onChange={(e) => handleChange('max', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Orientation */}
            {element.orientation !== undefined && (
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1 block">Orientation</label>
                <select
                  value={localElement.orientation || 'horizontal'}
                  onChange={(e) => handleChange('orientation', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-sm"
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* STYLE TAB */}
        {activeTab === 'style' && (
          <div className="space-y-3">
            {/* Background Color */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-1 block">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={localElement.style.backgroundColor || '#3f3f46'}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="w-12 h-10 bg-zinc-700 border border-zinc-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={localElement.style.backgroundColor || '#3f3f46'}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  placeholder="#3f3f46"
                />
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-1 block">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={localElement.style.textColor || '#ffffff'}
                  onChange={(e) => handleStyleChange('textColor', e.target.value)}
                  className="w-12 h-10 bg-zinc-700 border border-zinc-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={localElement.style.textColor || '#ffffff'}
                  onChange={(e) => handleStyleChange('textColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Border */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-2 block">Border</label>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={localElement.style.borderColor || '#71717a'}
                        onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                        className="w-10 h-8 bg-zinc-700 border border-zinc-600 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={localElement.style.borderColor || '#71717a'}
                        onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                        className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Width (px)</label>
                    <input
                      type="number"
                      min="0"
                      value={localElement.style.borderWidth ?? 1}
                      onChange={(e) => handleStyleChange('borderWidth', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Radius (px)</label>
                  <input
                    type="number"
                    min="0"
                    value={localElement.style.borderRadius ?? 4}
                    onChange={(e) => handleStyleChange('borderRadius', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Typography */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-2 block">Typography</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Font Size (px)</label>
                  <input
                    type="number"
                    min="8"
                    value={localElement.style.fontSize ?? 16}
                    onChange={(e) => handleStyleChange('fontSize', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Font Family</label>
                  <select
                    value={localElement.style.fontFamily || 'system-ui'}
                    onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm"
                  >
                    <option value="system-ui">System UI</option>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Arial">Arial</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Opacity */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 mb-1 block">
                Opacity ({((localElement.style.opacity ?? 1) * 100).toFixed(0)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localElement.style.opacity ?? 1}
                onChange={(e) => handleStyleChange('opacity', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <div className="space-y-3">
            {/* Header and Sidebar Configuration */}
            {(element.type === 'header' || element.type === 'sidebar') && (
              <HeaderSidebarConfig element={localElement} pages={pages} onConfigChange={handleConfigChange} />
            )}

            {/* Scene Selector Editor */}
            {element.type === 'scene-selector' && (
              <div className="border border-zinc-700/50 rounded-lg p-4 bg-zinc-900/50 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-base font-semibold text-emerald-400">Scenes Editor</label>
                  <button
                    onClick={() => {
                      const scenes = localElement.config?.scenes || [];
                      const newScene = { name: `Scene ${scenes.length + 1}`, icon: 'Sparkles' };
                      handleConfigChange('scenes', [...scenes, newScene]);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    + Add Scene
                  </button>
                </div>

                {/* Layout Options */}
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Layout</label>
                  <select
                    value={localElement.config?.sceneLayout || 'grid'}
                    onChange={(e) => handleConfigChange('sceneLayout', e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                  </select>
                </div>

                {localElement.config?.sceneLayout === 'grid' && (
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Columns</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={localElement.config?.sceneCols || 2}
                      onChange={(e) => handleConfigChange('sceneCols', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                    />
                  </div>
                )}

                {/* Scenes List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {(localElement.config?.scenes || []).map((scene: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Scene {idx + 1}</span>
                        <button
                          onClick={() => {
                            const scenes = [...(localElement.config?.scenes || [])];
                            scenes.splice(idx, 1);
                            handleConfigChange('scenes', scenes);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={scene.name}
                          onChange={(e) => {
                            const scenes = [...(localElement.config?.scenes || [])];
                            scenes[idx] = { ...scenes[idx], name: e.target.value };
                            handleConfigChange('scenes', scenes);
                          }}
                          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                          placeholder="Scene name"
                        />
                        <IconPicker
                          value={scene.icon}
                          onChange={(icon) => {
                            const scenes = [...(localElement.config?.scenes || [])];
                            scenes[idx] = { ...scenes[idx], icon };
                            handleConfigChange('scenes', scenes);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* JOINS TAB */}
        {activeTab === 'joins' && (
          <div>
            <div className="space-y-1">
              {renderJoinsForType()}
            </div>

            {/* Join Info */}
            <div className="pt-3 mt-3 text-xs text-zinc-500 border-t border-zinc-700">
              <p className="mb-1 font-semibold">Join Types:</p>
              <ul className="space-y-0.5 text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">●</span> Digital: Boolean (on/off)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">●</span> Analog: Number (0-65535)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">●</span> Serial: Text string
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-zinc-900 px-4 py-2 border-t border-zinc-700 flex justify-end rounded-b-lg flex-shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}
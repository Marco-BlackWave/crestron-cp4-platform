import { useState } from 'react';
import { Monitor, Smartphone, Tablet, Plus, RotateCw } from 'lucide-react';
import { DevicePreset } from '../types/crestron';
import { devicePresets } from '../utils/devicePresets';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface DeviceSelectorProps {
  currentWidth: number;
  currentHeight: number;
  onDeviceChange: (width: number, height: number) => void;
}

export function DeviceSelector({
  currentWidth,
  currentHeight,
  onDeviceChange,
}: DeviceSelectorProps) {
  const [customWidth, setCustomWidth] = useState(currentWidth);
  const [customHeight, setCustomHeight] = useState(currentHeight);
  const [showCustom, setShowCustom] = useState(false);

  const isLandscape = currentWidth > currentHeight;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'crestron':
        return <Monitor className="w-4 h-4" />;
      case 'apple':
        return <Smartphone className="w-4 h-4" />;
      case 'android':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const handlePresetChange = (presetId: string) => {
    if (presetId === 'custom') {
      setShowCustom(true);
      return;
    }

    const preset = devicePresets.find(p => p.id === presetId);
    if (preset) {
      onDeviceChange(preset.width, preset.height);
      setShowCustom(false);
    }
  };

  const handleCustomApply = () => {
    onDeviceChange(customWidth, customHeight);
    setShowCustom(false);
  };

  const crestronPresets = devicePresets.filter(p => p.category === 'crestron');
  const applePresets = devicePresets.filter(p => p.category === 'apple');
  const androidPresets = devicePresets.filter(p => p.category === 'android');

  const currentPreset = devicePresets.find(
    p => p.width === currentWidth && p.height === currentHeight
  );

  return (
    <div className="flex items-center gap-2">
      <Monitor className="w-4 h-4 text-zinc-400" />
      <Select onValueChange={handlePresetChange} value={currentPreset?.id || 'custom'}>
        <SelectTrigger className="w-[280px] bg-zinc-800 border-zinc-700">
          <SelectValue>
            {currentPreset ? (
              <div className="flex items-center gap-2">
                {getCategoryIcon(currentPreset.category)}
                <span>{currentPreset.name}</span>
                <span className="text-zinc-500 text-xs">
                  ({currentPreset.width} × {currentPreset.height})
                </span>
              </div>
            ) : (
              <span>
                Custom ({currentWidth} × {currentHeight})
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectGroup>
            <SelectLabel className="text-zinc-400">Crestron Panels</SelectLabel>
            {crestronPresets.map(preset => (
              <SelectItem key={preset.id} value={preset.id} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  <span>{preset.name}</span>
                  <span className="text-zinc-500 text-xs">
                    {preset.width} × {preset.height}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          <SelectGroup>
            <SelectLabel className="text-zinc-400">Apple Devices</SelectLabel>
            {applePresets.map(preset => (
              <SelectItem key={preset.id} value={preset.id} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>{preset.name}</span>
                  <span className="text-zinc-500 text-xs">
                    {preset.width} × {preset.height}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          <SelectGroup>
            <SelectLabel className="text-zinc-400">Android Devices</SelectLabel>
            {androidPresets.map(preset => (
              <SelectItem key={preset.id} value={preset.id} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Tablet className="w-4 h-4" />
                  <span>{preset.name}</span>
                  <span className="text-zinc-500 text-xs">
                    {preset.width} × {preset.height}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          <SelectGroup>
            <SelectItem value="custom" className="cursor-pointer">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Custom Size...</span>
              </div>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="number"
            value={customWidth}
            onChange={e => setCustomWidth(parseInt(e.target.value) || 0)}
            className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
            placeholder="Width"
          />
          <span className="text-zinc-500">x</span>
          <input
            type="number"
            value={customHeight}
            onChange={e => setCustomHeight(parseInt(e.target.value) || 0)}
            className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
            placeholder="Height"
          />
          <button
            onClick={handleCustomApply}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Apply
          </button>
          <button
            onClick={() => setShowCustom(false)}
            className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Rotate button */}
      <button
        onClick={() => onDeviceChange(currentHeight, currentWidth)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-zinc-300 transition-colors"
        title={`Rotate to ${isLandscape ? 'portrait' : 'landscape'} (${currentHeight} x ${currentWidth})`}
      >
        <RotateCw className="w-3.5 h-3.5" />
        <span>{isLandscape ? 'Portrait' : 'Landscape'}</span>
      </button>
    </div>
  );
}
import { CrestronElement } from '../types/crestron';

interface StyleConfigProps {
  element: CrestronElement;
  updateElement: (updates: Partial<CrestronElement>) => void;
}

export function StyleConfig({ element, updateElement }: StyleConfigProps) {
  const updateStyle = (updates: Partial<CrestronElement['style']>) => {
    updateElement({
      style: {
        ...(element.style || {}),
        ...updates,
      },
    });
  };

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm mb-1">Background Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={element.style?.backgroundColor || '#3b82f6'}
            onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
            className="w-12 h-8 bg-zinc-800 border border-zinc-700 rounded cursor-pointer"
          />
          <input
            type="text"
            value={element.style?.backgroundColor || ''}
            onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
            placeholder="#000000"
            className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Text Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={element.style?.textColor || '#ffffff'}
            onChange={(e) => updateStyle({ textColor: e.target.value })}
            className="w-12 h-8 bg-zinc-800 border border-zinc-700 rounded cursor-pointer"
          />
          <input
            type="text"
            value={element.style?.textColor || ''}
            onChange={(e) => updateStyle({ textColor: e.target.value })}
            placeholder="#ffffff"
            className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Border Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={element.style?.borderColor || '#000000'}
            onChange={(e) => updateStyle({ borderColor: e.target.value })}
            className="w-12 h-8 bg-zinc-800 border border-zinc-700 rounded cursor-pointer"
          />
          <input
            type="text"
            value={element.style?.borderColor || ''}
            onChange={(e) => updateStyle({ borderColor: e.target.value })}
            placeholder="#000000"
            className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm mb-1">Border Width</label>
          <input
            type="number"
            min="0"
            value={element.style?.borderWidth || 0}
            onChange={(e) => updateStyle({ borderWidth: Number(e.target.value) })}
            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Border Radius</label>
          <input
            type="number"
            min="0"
            value={element.style?.borderRadius || 0}
            onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })}
            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Font Size</label>
        <input
          type="number"
          min="8"
          value={element.style?.fontSize || 16}
          onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
          className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Font Family</label>
        <select
          value={element.style?.fontFamily || 'system-ui'}
          onChange={(e) => updateStyle({ fontFamily: e.target.value })}
          className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
        >
          <option value="system-ui">System UI</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Courier New', monospace">Courier New</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="Verdana, sans-serif">Verdana</option>
        </select>
      </div>

      <div>
        <label className="block text-sm mb-1">Opacity</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={element.style?.opacity ?? 1}
            onChange={(e) => updateStyle({ opacity: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="text-sm w-12 text-right">
            {Math.round((element.style?.opacity ?? 1) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
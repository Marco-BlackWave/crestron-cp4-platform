import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { IconPicker } from './IconPicker';
import { Page } from '../types/crestron';

interface HeaderSidebarConfigProps {
  element: any;
  pages: Page[];
  onConfigChange: (field: string, value: any) => void;
}

export function HeaderSidebarConfig({ element, pages, onConfigChange }: HeaderSidebarConfigProps) {
  if (element.type === 'header') {
    return (
      <div className="space-y-4">
        <div className="border border-zinc-700/50 rounded-lg p-4 bg-zinc-900/50 space-y-3">
          <h4 className="text-sm font-semibold text-emerald-400 mb-3">Header Content</h4>
          
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Title</label>
            <input
              type="text"
              value={element.config?.title || 'Header Title'}
              onChange={(e) => onConfigChange('title', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
              placeholder="Header title..."
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Subtitle (optional)</label>
            <input
              type="text"
              value={element.config?.subtitle || ''}
              onChange={(e) => onConfigChange('subtitle', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
              placeholder="Subtitle..."
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Logo Text</label>
            <input
              type="text"
              value={element.config?.logoText || 'LOGO'}
              onChange={(e) => onConfigChange('logoText', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
              placeholder="Logo text..."
            />
          </div>
        </div>

        <div className="border border-zinc-700/50 rounded-lg p-4 bg-zinc-900/50 space-y-3">
          <h4 className="text-sm font-semibold text-emerald-400 mb-3">Appearance</h4>
          
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Background Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={element.config?.backgroundColor || '#18181b'}
                onChange={(e) => onConfigChange('backgroundColor', e.target.value)}
                className="w-12 h-10 bg-zinc-700 border border-zinc-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={element.config?.backgroundColor || '#18181b'}
                onChange={(e) => onConfigChange('backgroundColor', e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                placeholder="#18181b"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Text Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={element.config?.textColor || '#ffffff'}
                onChange={(e) => onConfigChange('textColor', e.target.value)}
                className="w-12 h-10 bg-zinc-700 border border-zinc-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={element.config?.textColor || '#ffffff'}
                onChange={(e) => onConfigChange('textColor', e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Alignment</label>
            <select
              value={element.config?.alignment || 'space-between'}
              onChange={(e) => onConfigChange('alignment', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
            >
              <option value="flex-start">Left</option>
              <option value="center">Center</option>
              <option value="flex-end">Right</option>
              <option value="space-between">Space Between</option>
              <option value="space-around">Space Around</option>
            </select>
          </div>
        </div>

        <div className="border border-zinc-700/50 rounded-lg p-4 bg-zinc-900/50 space-y-3">
          <h4 className="text-sm font-semibold text-emerald-400 mb-3">Buttons Visibility</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={element.config?.showLogo !== false}
                onChange={(e) => onConfigChange('showLogo', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700"
              />
              <span className="text-sm text-zinc-300">Show Logo</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={element.config?.showMenu !== false}
                onChange={(e) => onConfigChange('showMenu', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700"
              />
              <span className="text-sm text-zinc-300">Show Menu</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={element.config?.showSettings !== false}
                onChange={(e) => onConfigChange('showSettings', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700"
              />
              <span className="text-sm text-zinc-300">Show Settings</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={element.config?.showNotifications !== false}
                onChange={(e) => onConfigChange('showNotifications', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700"
              />
              <span className="text-sm text-zinc-300">Show Notifications</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={element.config?.showSearch !== false}
                onChange={(e) => onConfigChange('showSearch', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700"
              />
              <span className="text-sm text-zinc-300">Show Search</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (element.type === 'sidebar') {
    return (
      <div className="space-y-4">
        <div className="border border-zinc-700/50 rounded-lg p-4 bg-zinc-900/50 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-emerald-400">Menu Items</h4>
            <button
              onClick={() => {
                const menuItems = element.config?.menuItems || [];
                const newItem = { icon: 'Circle', label: `Item ${menuItems.length + 1}`, pageId: null };
                onConfigChange('menuItems', [...menuItems, newItem]);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium transition-colors"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {(element.config?.menuItems || []).map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400">Item {idx + 1}</span>
                  <div className="flex gap-1">
                    {idx > 0 && (
                      <button
                        onClick={() => {
                          const menuItems = [...(element.config?.menuItems || [])];
                          [menuItems[idx - 1], menuItems[idx]] = [menuItems[idx], menuItems[idx - 1]];
                          onConfigChange('menuItems', menuItems);
                        }}
                        className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                        title="Move up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                    )}
                    {idx < (element.config?.menuItems || []).length - 1 && (
                      <button
                        onClick={() => {
                          const menuItems = [...(element.config?.menuItems || [])];
                          [menuItems[idx], menuItems[idx + 1]] = [menuItems[idx + 1], menuItems[idx]];
                          onConfigChange('menuItems', menuItems);
                        }}
                        className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                        title="Move down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const menuItems = [...(element.config?.menuItems || [])];
                        menuItems.splice(idx, 1);
                        onConfigChange('menuItems', menuItems);
                      }}
                      className="p-1 hover:bg-red-700 rounded text-red-400 hover:text-white"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Label</label>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => {
                        const menuItems = [...(element.config?.menuItems || [])];
                        menuItems[idx] = { ...menuItems[idx], label: e.target.value };
                        onConfigChange('menuItems', menuItems);
                      }}
                      className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-xs"
                      placeholder="Item label"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Icon</label>
                    <IconPicker
                      value={item.icon}
                      onChange={(icon) => {
                        const menuItems = [...(element.config?.menuItems || [])];
                        menuItems[idx] = { ...menuItems[idx], icon };
                        onConfigChange('menuItems', menuItems);
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Link to Page (optional)</label>
                  <select
                    value={item.pageId || ''}
                    onChange={(e) => {
                      const menuItems = [...(element.config?.menuItems || [])];
                      menuItems[idx] = { ...menuItems[idx], pageId: e.target.value || null };
                      onConfigChange('menuItems', menuItems);
                    }}
                    className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-xs"
                  >
                    <option value="">-- No Link --</option>
                    {pages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.name} ({page.width}x{page.height})
                      </option>
                    ))}
                  </select>
                  {item.pageId && (
                    <p className="text-xs text-emerald-400 mt-1">
                      → Linked to: {pages.find(p => p.id === item.pageId)?.name || 'Unknown'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-zinc-700/50 rounded-lg p-4 bg-zinc-900/50 space-y-3">
          <h4 className="text-sm font-semibold text-emerald-400 mb-3">Appearance</h4>
          
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Position</label>
            <select
              value={element.config?.position || 'left'}
              onChange={(e) => onConfigChange('position', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Background Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={element.config?.backgroundColor || '#18181b'}
                onChange={(e) => onConfigChange('backgroundColor', e.target.value)}
                className="w-12 h-10 bg-zinc-700 border border-zinc-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={element.config?.backgroundColor || '#18181b'}
                onChange={(e) => onConfigChange('backgroundColor', e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                placeholder="#18181b"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Text Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={element.config?.textColor || '#ffffff'}
                onChange={(e) => onConfigChange('textColor', e.target.value)}
                className="w-12 h-10 bg-zinc-700 border border-zinc-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={element.config?.textColor || '#ffffff'}
                onChange={(e) => onConfigChange('textColor', e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Active Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={element.config?.activeColor || '#3b82f6'}
                onChange={(e) => onConfigChange('activeColor', e.target.value)}
                className="w-12 h-10 bg-zinc-700 border border-zinc-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={element.config?.activeColor || '#3b82f6'}
                onChange={(e) => onConfigChange('activeColor', e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Expanded Width (px)</label>
            <input
              type="number"
              min="100"
              max="500"
              value={element.config?.expandedWidth || 240}
              onChange={(e) => onConfigChange('expandedWidth', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="border border-zinc-700/50 rounded-lg p-4 bg-zinc-900/50 space-y-3">
          <h4 className="text-sm font-semibold text-emerald-400 mb-3">Behavior</h4>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={element.config?.collapsible !== false}
              onChange={(e) => onConfigChange('collapsible', e.target.checked)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-700"
            />
            <span className="text-sm text-zinc-300">Collapsible</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={element.config?.autoCollapse === true}
              onChange={(e) => onConfigChange('autoCollapse', e.target.checked)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-700"
            />
            <span className="text-sm text-zinc-300">Auto Collapse</span>
          </label>

          {element.config?.autoCollapse && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Auto Collapse Delay (ms)</label>
              <input
                type="number"
                min="500"
                max="10000"
                step="500"
                value={element.config?.autoCollapseDelay || 3000}
                onChange={(e) => onConfigChange('autoCollapseDelay', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={element.config?.initialCollapsed === true}
              onChange={(e) => onConfigChange('initialCollapsed', e.target.checked)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-700"
            />
            <span className="text-sm text-zinc-300">Start Collapsed</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={element.config?.showFooter === true}
              onChange={(e) => onConfigChange('showFooter', e.target.checked)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-700"
            />
            <span className="text-sm text-zinc-300">Show Footer</span>
          </label>

          {element.config?.showFooter && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Footer Text</label>
              <input
                type="text"
                value={element.config?.footerText || 'Crestron Control'}
                onChange={(e) => onConfigChange('footerText', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                placeholder="Footer text..."
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
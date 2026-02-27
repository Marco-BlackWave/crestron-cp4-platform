import { Square, SlidersHorizontal, Gauge, Type, Image, Video, List, Layers, Hash, LayoutDashboard, PanelLeft } from 'lucide-react';
import { CrestronElement, ElementType } from '../types/crestron';
import { useState, type ReactNode } from 'react';

interface ComponentLibraryProps {
  addElement: (element: CrestronElement) => void;
}

interface ComponentTemplate {
  type: ElementType;
  icon: ReactNode;
  label: string;
  defaultConfig: Partial<CrestronElement>;
}

const componentTemplates: ComponentTemplate[] = [
  {
    type: 'button',
    icon: <Square className="w-5 h-5" />,
    label: 'Button',
    defaultConfig: {
      width: 120,
      height: 50,
      text: 'Button',
      style: {
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        textColor: '#ffffff',
      },
      states: {
        default: {
          backgroundColor: '#3b82f6',
          textColor: '#ffffff',
        },
        pressed: {
          backgroundColor: '#2563eb',
          textColor: '#ffffff',
        },
      },
    },
  },
  {
    type: 'slider',
    icon: <SlidersHorizontal className="w-5 h-5" />,
    label: 'Slider',
    defaultConfig: {
      width: 200,
      height: 40,
      orientation: 'horizontal',
      min: 0,
      max: 65535,
      style: {
        backgroundColor: '#52525b',
        borderRadius: 4,
      },
    },
  },
  {
    type: 'gauge',
    icon: <Gauge className="w-5 h-5" />,
    label: 'Gauge',
    defaultConfig: {
      width: 150,
      height: 150,
      min: 0,
      max: 100,
      style: {
        backgroundColor: '#18181b',
        borderRadius: 75,
      },
    },
  },
  {
    type: 'text',
    icon: <Type className="w-5 h-5" />,
    label: 'Text',
    defaultConfig: {
      width: 150,
      height: 30,
      text: 'Text Label',
      style: {
        textColor: '#ffffff',
        fontSize: 16,
      },
    },
  },
  {
    type: 'image',
    icon: <Image className="w-5 h-5" />,
    label: 'Image',
    defaultConfig: {
      width: 200,
      height: 150,
      style: {
        backgroundColor: '#27272a',
      },
    },
  },
  {
    type: 'keypad',
    icon: <Hash className="w-5 h-5" />,
    label: 'Keypad',
    defaultConfig: {
      width: 240,
      height: 280,
      style: {
        backgroundColor: '#18181b',
        borderRadius: 8,
      },
    },
  },
  {
    type: 'list',
    icon: <List className="w-5 h-5" />,
    label: 'List',
    defaultConfig: {
      width: 300,
      height: 400,
      style: {
        backgroundColor: '#18181b',
        borderRadius: 4,
      },
    },
  },
  {
    type: 'subpage',
    icon: <Layers className="w-5 h-5" />,
    label: 'Subpage',
    defaultConfig: {
      width: 400,
      height: 300,
      style: {
        backgroundColor: '#09090b',
        borderColor: '#3f3f46',
        borderWidth: 2,
        borderRadius: 8,
      },
    },
  },
  {
    type: 'header',
    icon: <LayoutDashboard className="w-5 h-5" />,
    label: 'Header',
    defaultConfig: {
      width: 1024,
      height: 80,
      digitalJoin: 1,
      config: {
        title: 'My Interface',
        subtitle: 'Control System',
        showLogo: true,
        showMenu: true,
        showSettings: true,
        showNotifications: true,
        showSearch: true,
        backgroundColor: '#18181b',
        textColor: '#ffffff',
        logoText: 'CRESTRON',
        alignment: 'space-between',
      },
      style: {
        backgroundColor: '#18181b',
        textColor: '#ffffff',
      },
    },
  },
  {
    type: 'sidebar',
    icon: <PanelLeft className="w-5 h-5" />,
    label: 'Sidebar',
    defaultConfig: {
      width: 240,
      height: 768,
      digitalJoin: 10,
      config: {
        position: 'left',
        backgroundColor: '#18181b',
        textColor: '#ffffff',
        activeColor: '#3b82f6',
        collapsible: true,
        autoCollapse: true,
        autoCollapseDelay: 3000,
        initialCollapsed: false,
        expandedWidth: 240,
        showFooter: true,
        footerText: 'Crestron Control',
        menuItems: [
          { icon: 'home', label: 'Home' },
          { icon: 'light', label: 'Lighting' },
          { icon: 'temperature', label: 'Climate' },
          { icon: 'video', label: 'Media' },
          { icon: 'camera', label: 'Security' },
          { icon: 'settings', label: 'Settings' },
        ],
      },
      style: {
        backgroundColor: '#18181b',
        textColor: '#ffffff',
      },
    },
  },
];

export function ComponentLibrary({ addElement }: ComponentLibraryProps) {
  const [filter, setFilter] = useState('');

  const handleDragStart = (e: React.DragEvent, template: ComponentTemplate) => {
    e.dataTransfer.setData('componentType', template.type);
    e.dataTransfer.setData('componentConfig', JSON.stringify(template.defaultConfig));
  };

  const handleClick = (template: ComponentTemplate) => {
    const newElement: CrestronElement = {
      id: `element_${Date.now()}`,
      type: template.type,
      name: `${template.label} ${Date.now()}`,
      x: 100,
      y: 100,
      width: template.defaultConfig.width || 100,
      height: template.defaultConfig.height || 100,
      joins: {},
      style: template.defaultConfig.style || {},
      ...template.defaultConfig,
    };

    addElement(newElement);
  };

  const filteredTemplates = componentTemplates.filter((t) =>
    t.label.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0">
      <div className="p-3 border-b border-zinc-800">
        <h2 className="mb-2">Component Library</h2>
        <input
          type="text"
          placeholder="Search components..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTemplates.map((template) => (
          <div
            key={template.type}
            draggable
            onDragStart={(e) => handleDragStart(e, template)}
            onClick={() => handleClick(template)}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded cursor-move flex items-center gap-3 transition-colors w-full"
          >
            <div className="text-blue-400">{template.icon}</div>
            <span className="text-sm">{template.label}</span>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-zinc-800 text-xs text-zinc-500">
        Drag or click to add components
      </div>
    </div>
  );
}
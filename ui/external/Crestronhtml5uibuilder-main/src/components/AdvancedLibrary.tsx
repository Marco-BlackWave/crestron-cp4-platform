import { useState } from 'react';
import { 
  Thermometer, 
  Tv, 
  Volume2, 
  Sun, 
  Droplets,
  Wind,
  Music,
  Camera,
  Lock,
  Lightbulb,
  Gauge,
  Activity,
  Film,
  Wifi
} from 'lucide-react';
import { CrestronElement } from '../types/crestron';

interface AdvancedLibraryProps {
  addElement: (element: CrestronElement) => void;
}

export function AdvancedLibrary({ addElement }: AdvancedLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<'climate' | 'entertainment' | 'lighting' | 'security'>('climate');

  const categories = {
    climate: {
      name: 'Climate Control',
      icon: Thermometer,
      components: [
        {
          name: 'Modern Thermostat',
          type: 'thermostat',
          icon: Thermometer,
          config: {
            width: 400,
            height: 580,
            advanced: {
              mode: 'modern',
            }
          }
        },
        {
          name: 'Mini Thermostat',
          type: 'mini-thermostat',
          icon: Thermometer,
          config: {
            width: 200,
            height: 200,
            style: {
              shape: 'circular',
            }
          }
        },
        {
          name: 'Humidity Control',
          type: 'humidity',
          icon: Droplets,
          config: {
            width: 300,
            height: 400,
          }
        },
        {
          name: 'Fan Control',
          type: 'fan',
          icon: Wind,
          config: {
            width: 250,
            height: 350,
          }
        },
      ]
    },
    entertainment: {
      name: 'Entertainment',
      icon: Tv,
      components: [
        {
          name: 'TV Remote',
          type: 'tv-remote',
          icon: Tv,
          config: {
            width: 300,
            height: 520,
          }
        },
        {
          name: 'Media Player',
          type: 'media-player',
          icon: Film,
          config: {
            width: 400,
            height: 480,
          }
        },
        {
          name: 'Volume Control',
          type: 'volume-control',
          icon: Volume2,
          config: {
            width: 300,
            height: 400,
          }
        },
        {
          name: 'Audio Zone Control',
          type: 'audio-zone',
          icon: Music,
          config: {
            width: 450,
            height: 550,
          }
        },
      ]
    },
    lighting: {
      name: 'Lighting',
      icon: Lightbulb,
      components: [
        {
          name: 'Dimmer Control',
          type: 'dimmer',
          icon: Lightbulb,
          config: {
            width: 250,
            height: 400,
          }
        },
        {
          name: 'RGB Light Control',
          type: 'rgb-light',
          icon: Sun,
          config: {
            width: 400,
            height: 450,
          }
        },
        {
          name: 'Scene Selector',
          type: 'scene-selector',
          icon: Activity,
          config: {
            width: 450,
            height: 300,
          }
        },
      ]
    },
    security: {
      name: 'Security',
      icon: Lock,
      components: [
        {
          name: 'Door Lock',
          type: 'door-lock',
          icon: Lock,
          config: {
            width: 300,
            height: 450,
          }
        },
        {
          name: 'Camera View',
          type: 'camera-view',
          icon: Camera,
          config: {
            width: 500,
            height: 350,
          }
        },
        {
          name: 'Security Panel',
          type: 'security-panel',
          icon: Lock,
          config: {
            width: 450,
            height: 600,
          }
        },
      ]
    }
  };

  const handleDragStart = (e: React.DragEvent, component: any) => {
    e.dataTransfer.setData('componentType', component.type);
    e.dataTransfer.setData('componentConfig', JSON.stringify(component.config));
  };

  const handleClick = (component: any) => {
    const newElement: CrestronElement = {
      id: `element_${Date.now()}`,
      type: component.type as any,
      name: component.name,
      x: 100,
      y: 100,
      width: component.config.width,
      height: component.config.height,
      joins: {},
      style: component.config.style || {},
    };
    addElement(newElement);
  };

  const activeComponents = categories[activeCategory].components;

  return (
    <div className="w-80 bg-zinc-900 border-l border-r border-zinc-800 flex flex-col h-full flex-shrink-0">
      <div className="border-b border-zinc-800 px-4 py-4 flex-shrink-0">
        <h2 className="text-white text-lg mb-4">Advanced Components</h2>
        
        {/* Category Tabs */}
        <div className="flex flex-col gap-2">
          {Object.entries(categories).map(([key, cat]) => {
            const Icon = cat.icon;
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key as any)}
                className={`px-4 py-3 rounded-xl flex items-center gap-3 transition-all w-full ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-[1.02]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Components Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {activeComponents.map((component, index) => {
            const Icon = component.icon;
            return (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
                onClick={() => handleClick(component)}
                className="group relative bg-zinc-800 hover:bg-zinc-750 rounded-2xl p-4 cursor-pointer transition-all duration-200 border border-zinc-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 w-full"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white group-hover:text-blue-300 transition-colors font-medium truncate">
                      {component.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {component.config.width} × {component.config.height}
                    </p>
                  </div>
                </div>
                
                {/* Hover indicator */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-purple-600/0 group-hover:from-blue-500/5 group-hover:to-purple-600/5 transition-all pointer-events-none" />
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
          <p className="text-sm text-blue-300 leading-relaxed">
            <strong>💡 Tip:</strong> Click or drag components to add them to your canvas. All components are fully interactive and customizable!
          </p>
        </div>
      </div>
    </div>
  );
}
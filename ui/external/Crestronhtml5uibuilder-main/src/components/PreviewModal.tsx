import { X, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Project, CrestronElement } from '../types/crestron';
import { useState, useRef, useEffect } from 'react';
import { ThermostatControl } from './advanced/ThermostatControl';
import { MediaPlayer } from './advanced/MediaPlayer';
import { TVRemoteControl } from './advanced/TVRemoteControl';
import { MiniThermostat } from './advanced/MiniThermostat';
import { FanControl } from './advanced/FanControl';
import { VolumeControl } from './advanced/VolumeControl';
import { DimmerControl } from './advanced/DimmerControl';
import { DoorLockControl } from './advanced/DoorLockControl';
import { HumidityControl } from './advanced/HumidityControl';
import { SecurityPanel } from './advanced/SecurityPanel';
import { AudioZoneControl } from './advanced/AudioZoneControl';
import { LightZoneCard } from './premium/LightZoneCard';
import { SceneButton } from './premium/SceneButton';
import { RoomCard } from './premium/RoomCard';
import { AnimatedBackground } from './backgrounds/AnimatedBackground';
import { Header } from './ui/Header';
import { Sidebar } from './ui/Sidebar';
import { 
  Square, Circle, Home, Lightbulb, Music, Video, Shield, Thermometer, 
  Waves, Sparkles, Power, Sun, Moon, Calendar, Volume2, Lock, Fan,
  Droplet, Camera, Speaker, Lamp, LampFloor, Bed, Sofa, Film, Car,
  UtensilsCrossed, Sunrise, Play, Pause, SkipForward, SkipBack,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Minus
} from 'lucide-react';

interface PreviewModalProps {
  project: Project;
  currentPageId: string;
  onClose: () => void;
}

// Icon mapping for buttons
const iconMap: Record<string, any> = {
  Square, Circle, Home, Lightbulb, Music, Video, Shield, Thermometer,
  Waves, Sparkles, Power, Sun, Moon, Calendar, Volume2, Lock, Fan,
  Droplet, Camera, Speaker, Lamp, LampFloor, Bed, Sofa, Film, Car,
  UtensilsCrossed, Sunrise, Play, Pause, SkipForward, SkipBack,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Minus
};

// Component base dimensions
const COMPONENT_BASE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'thermostat': { width: 320, height: 380 },
  'media-player': { width: 600, height: 400 },
  'tv-remote': { width: 280, height: 500 },
  'mini-thermostat': { width: 200, height: 220 },
  'fan': { width: 200, height: 220 },
  'volume-control': { width: 200, height: 220 },
  'dimmer': { width: 200, height: 220 },
  'door-lock': { width: 200, height: 220 },
  'humidity': { width: 200, height: 220 },
  'security-panel': { width: 600, height: 500 },
  'audio-zone': { width: 280, height: 320 },
};

export function PreviewModal({ project, currentPageId, onClose }: PreviewModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(0.5); // Default safe zoom
  const [pan, setPan] = useState({ x: 50, y: 50 }); // Default safe pan
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentPage = project.pages.find((p) => p.id === currentPageId);

  if (!currentPage) {
    return null;
  }

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Calculate initial zoom to fit
  useEffect(() => {
    // Wait for container to be rendered
    const timer = setTimeout(() => {
      if (containerRef.current && currentPage) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth - 100; // padding
        const containerHeight = container.clientHeight - 100;
        
        // Prevent NaN values
        if (containerWidth <= 0 || containerHeight <= 0 || !currentPage.width || !currentPage.height) {
          console.log('Invalid dimensions:', { containerWidth, containerHeight, pageWidth: currentPage.width, pageHeight: currentPage.height });
          return;
        }
        
        const scaleX = containerWidth / currentPage.width;
        const scaleY = containerHeight / currentPage.height;
        const initialZoom = Math.min(scaleX, scaleY, 1);
        
        console.log('Calculating zoom:', { scaleX, scaleY, initialZoom, containerWidth, containerHeight, pageWidth: currentPage.width, pageHeight: currentPage.height });
        
        // Ensure zoom is valid
        if (!isNaN(initialZoom) && isFinite(initialZoom) && initialZoom > 0) {
          setZoom(initialZoom);
          
          // Center the canvas
          const offsetX = (containerWidth - currentPage.width * initialZoom) / 2 + 50; // Add margin
          const offsetY = (containerHeight - currentPage.height * initialZoom) / 2 + 50; // Add margin
          setPan({ x: offsetX, y: offsetY });
          
          console.log('Set pan:', { x: offsetX, y: offsetY });
        }
      }
    }, 100); // Wait 100ms for render
    
    return () => clearTimeout(timer);
  }, [currentPage, isFullscreen]);

  // Pan handlers (TRACKPAD SUPPORT!)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click or trackpad
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // Check if it's a pinch-to-zoom gesture (ctrlKey is set on trackpad pinch)
    if (e.ctrlKey) {
      // Zoom
      const delta = -e.deltaY * 0.01;
      const newZoom = Math.max(0.1, Math.min(3, zoom + delta));
      setZoom(newZoom);
    } else {
      // Pan with trackpad
      setPan({
        x: pan.x - e.deltaX,
        y: pan.y - e.deltaY,
      });
    }
  };

  // Render element with REAL components
  const renderElement = (element: CrestronElement) => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      backgroundColor: element.style?.backgroundColor,
      borderColor: element.style?.borderColor,
      borderWidth: element.style?.borderWidth,
      borderStyle: element.style?.borderWidth ? 'solid' : 'none',
      borderRadius: element.style?.borderRadius,
      opacity: element.style?.opacity ?? 1,
      overflow: 'hidden',
      pointerEvents: 'none', // Disable interactions in preview
    };

    switch (element.type) {
      case 'button':
        const IconComponent = element.icon ? iconMap[element.icon] || Square : Square;
        return (
          <div key={element.id} style={baseStyle}>
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-2">
              {element.icon && (
                <IconComponent 
                  style={{ 
                    width: Math.min(element.width * 0.3, element.height * 0.3),
                    height: Math.min(element.width * 0.3, element.height * 0.3),
                    color: element.style?.textColor,
                  }} 
                />
              )}
              {element.text && (
                <div 
                  className="text-center whitespace-pre-line"
                  style={{
                    color: element.style?.textColor,
                    fontSize: element.style?.fontSize,
                    fontFamily: element.style?.fontFamily,
                  }}
                >
                  {element.text}
                </div>
              )}
            </div>
          </div>
        );

      case 'slider':
        const isHorizontal = element.orientation === 'horizontal';
        const sliderValue = element.value || 50;
        return (
          <div key={element.id} style={baseStyle}>
            <div className="w-full h-full flex items-center justify-center p-4">
              {isHorizontal ? (
                <div className="w-full h-3 bg-white/20 rounded-full relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      width: `${sliderValue}%`,
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    }}
                  />
                </div>
              ) : (
                <div className="w-3 h-full bg-white/20 rounded-full relative overflow-hidden">
                  <div
                    className="absolute left-0 bottom-0 w-full rounded-full"
                    style={{
                      height: `${sliderValue}%`,
                      background: 'linear-gradient(0deg, #667eea 0%, #764ba2 100%)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'gauge':
        return (
          <div key={element.id} style={baseStyle}>
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div 
                className="text-center"
                style={{
                  color: element.style?.textColor,
                  fontSize: element.style?.fontSize ? element.style.fontSize * 2 : 48,
                  fontFamily: element.style?.fontFamily,
                }}
              >
                {element.value || 0}
              </div>
              {element.text && (
                <div 
                  className="text-center mt-2"
                  style={{
                    color: element.style?.textColor,
                    fontSize: element.style?.fontSize,
                    fontFamily: element.style?.fontFamily,
                    opacity: 0.6,
                  }}
                >
                  {element.text}
                </div>
              )}
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={element.id} style={baseStyle}>
            <div 
              className="w-full h-full flex items-center justify-center text-center px-2"
              style={{
                color: element.style?.textColor,
                fontSize: element.style?.fontSize,
                fontFamily: element.style?.fontFamily,
              }}
            >
              {element.text || 'Text'}
            </div>
          </div>
        );

      case 'image':
        return (
          <div key={element.id} style={baseStyle}>
            <img
              src={element.text || 'https://via.placeholder.com/400x300/667eea/ffffff?text=IMAGE'}
              alt="Element"
              className="w-full h-full object-cover"
            />
          </div>
        );

      // ADVANCED COMPONENTS - Scaled
      case 'thermostat':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['thermostat'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <ThermostatControl width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      case 'media-player':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['media-player'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <MediaPlayer width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      case 'tv-remote':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['tv-remote'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <TVRemoteControl width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      case 'mini-thermostat':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['mini-thermostat'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <MiniThermostat width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      case 'fan':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['fan'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <FanControl width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      case 'volume-control':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['volume-control'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <VolumeControl width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      case 'dimmer':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['dimmer'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <DimmerControl width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      case 'door-lock':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['door-lock'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <DoorLockControl width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      case 'humidity':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['humidity'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <HumidityControl width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      case 'security-panel':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['security-panel'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <SecurityPanel width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      case 'audio-zone':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['audio-zone'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div key={element.id} style={baseStyle}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <AudioZoneControl width={baseDim.width} height={baseDim.height} />
                </div>
              </div>
            </div>
          );
        })();

      // PREMIUM COMPONENTS
      case 'light-zone-card':
        return (
          <div key={element.id} style={baseStyle}>
            <LightZoneCard 
              width={element.width} 
              height={element.height}
              name={element.text || element.name}
              value={element.value || 75}
            />
          </div>
        );

      case 'scene-button':
        return (
          <div key={element.id} style={baseStyle}>
            <SceneButton 
              width={element.width} 
              height={element.height}
              name={element.text || element.name}
              active={true}
            />
          </div>
        );

      case 'room-card':
        return (
          <div key={element.id} style={baseStyle}>
            <RoomCard 
              width={element.width} 
              height={element.height}
              name={element.text || element.name}
              subtitle={element.subtitle || 'Room'}
            />
          </div>
        );

      case 'camera-view':
        return (
          <div key={element.id} style={baseStyle}>
            <div className="w-full h-full bg-zinc-900 rounded-xl border-2 border-orange-500/40 flex flex-col overflow-hidden">
              <div className="flex-1 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                <Camera style={{ width: 64, height: 64, color: '#f59e0b', opacity: 0.4 }} />
              </div>
              <div className="p-3 bg-zinc-950/50 border-t border-orange-500/20">
                <div className="text-sm font-semibold text-orange-500">{element.text || 'Camera'}</div>
                <div className="text-xs text-zinc-400 mt-1">LIVE FEED</div>
              </div>
            </div>
          </div>
        );

      // UI LAYOUT COMPONENTS
      case 'header':
        return (
          <div key={element.id} style={baseStyle}>
            <Header element={element} isPreview={true} />
          </div>
        );

      case 'sidebar':
        return (
          <div key={element.id} style={baseStyle}>
            <Sidebar element={element} isPreview={true} />
          </div>
        );

      default:
        return (
          <div key={element.id} style={baseStyle}>
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
              <div className="text-2xl opacity-60">⚙️</div>
              <div className="text-xs text-center opacity-60">{element.name || element.type}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-[10000] animate-in fade-in duration-300">
      <div className={`${isFullscreen ? 'w-full h-full' : 'w-[98vw] h-[98vh]'} flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 ${!isFullscreen && 'rounded-2xl border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20'} overflow-hidden backdrop-blur-xl`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700/50 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 backdrop-blur-sm">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2 text-lg">
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">👁️ Live Preview</span>
              <span className="text-xs text-zinc-500 font-normal">• {currentPage.name}</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              {currentPage.width}×{currentPage.height}px • Zoom: {Math.round(zoom * 100)}% • Pan with trackpad/drag
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
              className="p-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-all duration-200 hover:scale-110"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-xs transition-all duration-200"
              title="Reset Zoom"
            >
              100%
            </button>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-all duration-200 hover:scale-110"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-zinc-700 mx-1" />
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg flex items-center gap-2 text-sm transition-all duration-200"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-all duration-200 hover:scale-110"
              title="Close (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Area - WITH TRACKPAD SUPPORT! */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden bg-zinc-900 relative"
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            style={{
              position: 'absolute',
              left: pan.x,
              top: pan.y,
              width: currentPage.width,
              height: currentPage.height,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              backgroundColor: currentPage.backgroundColor || '#000000',
              backgroundImage: currentPage.backgroundImage ? `url(${currentPage.backgroundImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.05)',
              overflow: 'hidden',
            }}
          >
            {/* Animated Background Layer */}
            {currentPage.backgroundAnimation && currentPage.backgroundAnimation !== 'none' && (
              <AnimatedBackground
                type={currentPage.backgroundAnimation}
                width={currentPage.width}
                height={currentPage.height}
                baseColor={currentPage.backgroundColor || '#000000'}
              />
            )}

            {/* Render ALL elements */}
            {currentPage.elements.map((element) => renderElement(element))}
          </div>
        </div>

        {/* Footer with tips */}
        <div className="p-2 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm flex items-center justify-center gap-4 text-xs text-zinc-500">
          <span>💡 Drag to pan</span>
          <span>•</span>
          <span>🖱️ Trackpad scroll to pan</span>
          <span>•</span>
          <span>🤏 Pinch to zoom</span>
          <span>•</span>
          <span>⌨️ ESC to close</span>
        </div>
      </div>
    </div>
  );
}
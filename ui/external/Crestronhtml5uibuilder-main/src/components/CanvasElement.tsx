import { LightZoneCard } from './premium/LightZoneCard';
import { SceneButton } from './premium/SceneButton';
import { RoomCard } from './premium/RoomCard';
import { customComponents, getCustomComponent } from './custom/registry';

import { useState, useEffect, useRef } from 'react';
import { CrestronElement } from '../types/crestron';
import { 
  Square, SlidersHorizontal, Gauge, Image, Hash, List, Layers, X,
  Lightbulb, Lamp, LampFloor, Sun, Sunset, Moon, Film, Home, Sofa, ChefHat, Bed,
  Baby, Bath, Briefcase, UtensilsCrossed, Car, Trees, Power, Shield, Sparkles,
  Thermometer, Music, Play, Tv, Camera, DoorOpen, DoorClosed, Warehouse, Fence, 
  ArrowLeft, Lock, Group,
  // V2 template icons
  Menu, ChevronDown, ChevronUp, CalendarDays, Droplets, Flame, Snowflake, Zap,
  SkipBack, SkipForward, FastForward, Rewind, ChevronsLeft, ChevronsRight,
  Shuffle, Repeat, Volume1, Volume2, Headphones, Waves,
  ToggleRight, ToggleLeft, ShieldAlert, ShieldCheck, ShieldOff, LayoutGrid,
  // V2 redesign icons
  BedDouble, Monitor, TreePine, Cloud, Minus, Plus, Wind, Armchair, Wine,
  Speaker, RotateCcw, Wrench, CheckCircle, Sunrise, CircleDot,
  type LucideIcon
} from 'lucide-react';
import { ThermostatControl } from './advanced/ThermostatControl';
import { TVRemoteControl } from './advanced/TVRemoteControl';
import { MiniThermostat } from './advanced/MiniThermostat';
import { FanControl } from './advanced/FanControl';
import { VolumeControl } from './advanced/VolumeControl';
import { DimmerControl } from './advanced/DimmerControl';
import { DoorLockControl } from './advanced/DoorLockControl';
import { HumidityControl } from './advanced/HumidityControl';
import { MediaPlayer } from './advanced/MediaPlayer';
import { AudioZoneControl } from './advanced/AudioZoneControl';
import { SecurityPanel } from './advanced/SecurityPanel';
import { Header } from './ui/Header';
import { Sidebar } from './ui/Sidebar';
import { calculateSnapGuides } from '../utils/snapGuides';

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, LucideIcon> = {
  'Square': Square,
  'Lightbulb': Lightbulb,
  'Lamp': Lamp,
  'LampFloor': LampFloor,
  'Sun': Sun,
  'Sunset': Sunset,
  'Moon': Moon,
  'Film': Film,
  'Home': Home,
  'Sofa': Sofa,
  'ChefHat': ChefHat,
  'Bed': Bed,
  'Baby': Baby,
  'Bath': Bath,
  'Briefcase': Briefcase,
  'UtensilsCrossed': UtensilsCrossed,
  'Car': Car,
  'Trees': Trees,
  'Power': Power,
  'Shield': Shield,
  'Sparkles': Sparkles,
  'Thermometer': Thermometer,
  'Music': Music,
  'Play': Play,
  'Tv': Tv,
  'Camera': Camera,
  'DoorOpen': DoorOpen,
  'DoorClosed': DoorClosed,
  'Warehouse': Warehouse,
  'Fence': Fence,
  'ArrowLeft': ArrowLeft,
  'Lock': Lock,
  'Group': Group,
  'Gauge': Gauge,
  'Image': Image,
  'Hash': Hash,
  'List': List,
  'Layers': Layers,
  'SlidersHorizontal': SlidersHorizontal,
  // V2 template icons
  'Menu': Menu,
  'ChevronDown': ChevronDown,
  'ChevronUp': ChevronUp,
  'CalendarDays': CalendarDays,
  'Droplets': Droplets,
  'Flame': Flame,
  'Snowflake': Snowflake,
  'Zap': Zap,
  'SkipBack': SkipBack,
  'SkipForward': SkipForward,
  'FastForward': FastForward,
  'Rewind': Rewind,
  'ChevronsLeft': ChevronsLeft,
  'ChevronsRight': ChevronsRight,
  'Shuffle': Shuffle,
  'Repeat': Repeat,
  'Volume1': Volume1,
  'Volume2': Volume2,
  'Headphones': Headphones,
  'Waves': Waves,
  'ToggleRight': ToggleRight,
  'ToggleLeft': ToggleLeft,
  'ShieldAlert': ShieldAlert,
  'ShieldCheck': ShieldCheck,
  'ShieldOff': ShieldOff,
  'LayoutGrid': LayoutGrid,
  // V2 redesign icons
  'BedDouble': BedDouble,
  'Monitor': Monitor,
  'TreePine': TreePine,
  'Cloud': Cloud,
  'Minus': Minus,
  'Plus': Plus,
  'Wind': Wind,
  'Armchair': Armchair,
  'Wine': Wine,
  'Speaker': Speaker,
  'RotateCcw': RotateCcw,
  'Wrench': Wrench,
  'CheckCircle': CheckCircle,
  'Sunrise': Sunrise,
  'CircleDot': CircleDot,
};

// Base dimensions for advanced components (for aspect ratio preservation)
const COMPONENT_BASE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'thermostat': { width: 400, height: 580 },
  'tv-remote': { width: 300, height: 520 },
  'mini-thermostat': { width: 200, height: 200 },
  'fan': { width: 250, height: 350 },
  'volume-control': { width: 300, height: 400 },
  'dimmer': { width: 280, height: 400 },
  'door-lock': { width: 250, height: 350 },
  'humidity': { width: 300, height: 400 },
  'media-player': { width: 400, height: 480 },
  'audio-zone': { width: 450, height: 550 },
  'security-panel': { width: 380, height: 520 },
};

interface CanvasElementProps {
  element: CrestronElement;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onUpdate: (updates: Partial<CrestronElement>) => void;
  onDelete: () => void;
  zoom: number;
  snapToGrid?: boolean;
  gridSize?: number;
  hasOverlap?: boolean;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDragEnd?: () => void;
  onDragStart?: () => void;
  isGrouped?: boolean;
  allElements?: CrestronElement[];
  pageWidth?: number;
  pageHeight?: number;
  onSnapGuides?: (guides: import('../utils/snapGuides').SnapGuide[]) => void;
  renderIndex?: number;
}

export function CanvasElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  zoom,
  snapToGrid = false,
  gridSize = 20,
  hasOverlap = false,
  onDoubleClick,
  onContextMenu,
  onDragEnd,
  onDragStart,
  isGrouped = false,
  allElements = [],
  pageWidth = 1920,
  pageHeight = 1080,
  onSnapGuides,
  renderIndex = 0,
}: CanvasElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const snapValue = (value: number) => {
    if (snapToGrid) {
      return Math.round(value / gridSize) * gridSize;
    }
    return value;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Only change selection on left-click, not right-click
    if (e.button === 0) {
      onSelect(e);
    }

    // Don't allow drag/resize on locked elements
    if (element.locked) return;

    // Store mouse down position for drag threshold
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;

    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: element.width,
        height: element.height,
      });
    } else {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - element.x * zoom,
        y: e.clientY - element.y * zoom,
      });
    }

    // Call onDragStart if provided
    if (onDragStart) {
      onDragStart();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // Calculate distance moved since mousedown
      const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Only start actual dragging if moved more than 5 pixels (drag threshold)
      if (!hasMovedRef.current && distance < 5) {
        return; // Don't move yet - below threshold
      }

      hasMovedRef.current = true;

      let newX = (e.clientX - dragStart.x) / zoom;
      let newY = (e.clientY - dragStart.y) / zoom;
      
      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      // Smart snap guides (only when not snapping to grid)
      if (!snapToGrid && onSnapGuides && allElements.length > 0) {
        const snapResult = calculateSnapGuides(
          { x: newX, y: newY, width: element.width, height: element.height, id: element.id },
          allElements,
          pageWidth,
          pageHeight
        );
        newX = snapResult.x;
        newY = snapResult.y;
        onSnapGuides(snapResult.guides);
      }

      onUpdate({ 
        x: Math.max(0, newX), 
        y: Math.max(0, newY) 
      });
    } else if (isResizing) {
      const deltaX = (e.clientX - resizeStart.x) / zoom;
      const deltaY = (e.clientY - resizeStart.y) / zoom;
      
      // Set min and max constraints
      const minSize = 50;
      const maxSize = 2000;
      
      onUpdate({
        width: Math.max(minSize, Math.min(maxSize, snapValue(resizeStart.width + deltaX))),
        height: Math.max(minSize, Math.min(maxSize, snapValue(resizeStart.height + deltaY))),
      });
    }
  };

  const handleMouseUp = () => {
    // Save history only if we actually dragged or resized
    const wasDragging = isDragging;
    const wasResizing = isResizing;
    
    setIsDragging(false);
    setIsResizing(false);
    hasMovedRef.current = false;
    
    // Clear snap guides on mouse up
    if (onSnapGuides) {
      onSnapGuides([]);
    }
    
    // Call onDragEnd only if there was actual drag or resize
    if ((wasDragging || wasResizing) && onDragEnd) {
      onDragEnd();
    }
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing]);

  const renderElementContent = () => {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: element.style?.textColor || '#ffffff',
      fontSize: element.style?.fontSize || 14,
      fontFamily: element.style?.fontFamily || 'inherit',
      overflow: 'hidden', // Prevent content from escaping
    };

    switch (element.type) {
      case 'button':
        const hasIcon = element.icon && element.icon.trim() !== '';
        const hasText = element.text && element.text.trim() !== '';
        const IconComponent = hasIcon ? (iconMap[element.icon!] || null) : null;
        
        // Responsive icon sizing based on element dimensions
        const minDim = Math.min(element.width, element.height);
        const iconSize = Math.max(12, Math.min(minDim * 0.45, 28));
        
        // If no icon and no text, render as pure visual container (background card)
        if (!IconComponent && !hasText) {
          return <div style={baseStyle} />;
        }
        
        // Smart layout: icon-only, text-only, or icon+text
        const isCompact = minDim <= 40;
        const isWide = element.width > element.height * 2;
        
        return (
          <div style={{
            ...baseStyle,
            flexDirection: isWide ? 'row' : 'column',
            gap: isCompact ? '2px' : isWide ? '8px' : '4px',
            padding: isCompact ? '2px' : '6px',
          }}>
            {IconComponent && (
              <IconComponent 
                style={{ 
                  width: iconSize, height: iconSize, flexShrink: 0,
                  color: element.style?.textColor || '#ffffff',
                }} 
              />
            )}
            {hasText && (
              <div style={{ 
                textAlign: 'center', 
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: hasText && element.text!.includes('\n') ? 'pre-line' : 'nowrap',
                maxWidth: '100%',
              }}>
                {element.text}
              </div>
            )}
          </div>
        );

      case 'slider':
        const isHorizontal = element.orientation === 'horizontal';
        const sliderValue = element.value || 50;
        const sliderMin = element.min || 0;
        const sliderMax = element.max || 100;
        const sliderPct = ((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100;
        const sliderColor = element.style?.textColor || '#667eea';
        const isSliderCompact = element.height <= 20;
        
        return (
          <div style={{
            ...baseStyle,
            flexDirection: isHorizontal ? 'row' : 'column',
            padding: isSliderCompact ? '2px 4px' : '6px 10px',
            gap: '6px',
            alignItems: 'center',
          }}>
            {isHorizontal ? (
              <>
                <div style={{
                  flex: 1,
                  height: isSliderCompact ? '4px' : '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '3px',
                  position: 'relative',
                  overflow: 'visible',
                }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${sliderPct}%`,
                    background: `linear-gradient(90deg, ${sliderColor}90, ${sliderColor})`,
                    borderRadius: '3px',
                  }} />
                  {!isSliderCompact && (
                    <div style={{
                      position: 'absolute',
                      left: `${sliderPct}%`, top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '14px', height: '14px',
                      backgroundColor: sliderColor,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.9)',
                      boxShadow: `0 0 8px ${sliderColor}60`,
                    }} />
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{
                  flex: 1, width: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '3px',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', left: 0, bottom: 0, width: '100%',
                    height: `${sliderPct}%`,
                    background: `linear-gradient(0deg, ${sliderColor}90, ${sliderColor})`,
                    borderRadius: '3px',
                  }} />
                </div>
              </>
            )}
          </div>
        );

      case 'gauge':
        return (
          <div style={baseStyle}>
            <Gauge className="w-12 h-12 text-zinc-400" />
          </div>
        );

      case 'image':
        return (
          <div style={baseStyle}>
            {element.imageUrl ? (
              <img src={element.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Image className="w-12 h-12 text-zinc-400" />
            )}
          </div>
        );

      case 'keypad':
        return (
          <div style={baseStyle}>
            <Hash className="w-12 h-12 text-zinc-400" />
          </div>
        );

      case 'list':
        return (
          <div style={baseStyle}>
            <List className="w-12 h-12 text-zinc-400" />
          </div>
        );

      case 'subpage':
        return (
          <div style={baseStyle}>
            <Layers className="w-12 h-12 text-zinc-400" />
          </div>
        );

      case 'text':
        const textHasIcon = element.icon && element.icon.trim() !== '' && iconMap[element.icon];
        const TextIcon = textHasIcon ? iconMap[element.icon!] : null;
        const textIconSize = Math.max(10, Math.min(element.height * 0.6, 20));
        return (
          <div style={{
            ...baseStyle,
            justifyContent: 'flex-start',
            gap: '6px',
            padding: '2px 4px',
            whiteSpace: element.text?.includes('\n') ? 'pre-line' : 'nowrap',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}>
            {TextIcon && (
              <TextIcon style={{ width: textIconSize, height: textIconSize, flexShrink: 0, color: element.style?.textColor || '#ffffff' }} />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.text || 'Text'}</span>
          </div>
        );

      case 'thermostat':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['thermostat'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <ThermostatControl width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'tv-remote':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['tv-remote'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <TVRemoteControl width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'mini-thermostat':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['mini-thermostat'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <MiniThermostat width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'fan':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['fan'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <FanControl width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'volume-control':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['volume-control'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <VolumeControl width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'dimmer':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['dimmer'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <DimmerControl width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'door-lock':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['door-lock'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <DoorLockControl width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'humidity':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['humidity'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <HumidityControl width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'media-player':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['media-player'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <MediaPlayer width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'audio-zone':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['audio-zone'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <AudioZoneControl width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'security-panel':
        return (() => {
          const baseDim = COMPONENT_BASE_DIMENSIONS['security-panel'];
          const scale = Math.min(element.width / baseDim.width, element.height / baseDim.height);
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <SecurityPanel width={baseDim.width} height={baseDim.height} />
              </div>
            </div>
          );
        })();

      case 'header':
        return <Header element={element} />;

      case 'sidebar':
        return <Sidebar element={element} onUpdate={onUpdate} zoom={zoom} />;

      // Premium Components
      case 'light-zone-card':
        return (
          <LightZoneCard 
            width={element.width} 
            height={element.height}
            zoneName={element.text || 'Light Zone'}
            icon={element.icon || 'Lightbulb'}
            color={element.style?.textColor || '#667eea'}
            initialValue={element.value || 50}
          />
        );

      case 'scene-button':
        return (
          <SceneButton 
            width={element.width} 
            height={element.height}
            sceneName={element.text || 'Scene'}
            icon={element.icon || 'Sparkles'}
            color={element.style?.textColor || '#667eea'}
          />
        );

      case 'rgb-light':
        const rgbBg = element.style?.backgroundColor || '#18181b';
        const rgbAccent = element.style?.textColor || '#667eea';
        const selectedColor = element.config?.selectedColor || '#667eea';
        const brightness = element.config?.brightness || 75;
        
        return (
          <div style={{
            ...baseStyle, 
            background: rgbBg,
            border: `1px solid ${rgbAccent}30`,
            padding: '16px'
          }}>
            <div className="text-white h-full flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${rgbAccent}20` }}
                >
                  <Sun className="w-5 h-5" style={{ color: rgbAccent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{element.name || 'RGB Light'}</div>
                  <div className="text-xs text-zinc-500">Color Control</div>
                </div>
              </div>
              
              {/* TRUE Color Wheel - Ring with Empty Center */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative" style={{ width: '220px', height: '220px' }}>
                  {/* Color Ring - Full Spectrum */}
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(
                        from 0deg,
                        hsl(0, 100%, 50%) 0deg,
                        hsl(30, 100%, 50%) 30deg,
                        hsl(60, 100%, 50%) 60deg,
                        hsl(90, 100%, 50%) 90deg,
                        hsl(120, 100%, 50%) 120deg,
                        hsl(150, 100%, 50%) 150deg,
                        hsl(180, 100%, 50%) 180deg,
                        hsl(210, 100%, 50%) 210deg,
                        hsl(240, 100%, 50%) 240deg,
                        hsl(270, 100%, 50%) 270deg,
                        hsl(300, 100%, 50%) 300deg,
                        hsl(330, 100%, 50%) 330deg,
                        hsl(360, 100%, 50%) 360deg
                      )`,
                    }}
                  />
                  
                  {/* Empty Center - Dark */}
                  <div 
                    className="absolute rounded-full"
                    style={{
                      top: '35px',
                      left: '35px',
                      right: '35px',
                      bottom: '35px',
                      backgroundColor: '#09090b',
                      boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)',
                    }}
                  >
                    {/* Small Color Indicator Dot */}
                    <div 
                      className="absolute top-1/2 left-1/2 rounded-full"
                      style={{
                        width: '40px',
                        height: '40px',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: selectedColor,
                        boxShadow: `0 0 20px ${selectedColor}90, 0 0 40px ${selectedColor}60`,
                        border: '3px solid rgba(255,255,255,0.2)',
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Brightness Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Brightness</span>
                  <span className="text-zinc-300 font-medium">{brightness}%</span>
                </div>
                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${brightness}%`,
                      background: `linear-gradient(to right, ${selectedColor}20, ${selectedColor})`
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'scene-selector':
        const sceneBg = element.style?.backgroundColor || '#18181b';
        const sceneAccent = element.style?.textColor || '#667eea';
        const scenes = element.config?.scenes || [
          { name: 'Relax', icon: 'Sunset' },
          { name: 'Work', icon: 'Briefcase' },
          { name: 'Movie', icon: 'Film' },
          { name: 'Party', icon: 'Music' }
        ];
        const activeSceneIndex = element.config?.activeSceneIndex || 0;
        const sceneLayout = element.config?.sceneLayout || 'grid'; // 'grid' or 'list'
        const sceneCols = element.config?.sceneCols || 2;
        
        return (
          <div style={{
            ...baseStyle, 
            background: sceneBg,
            border: `1px solid ${sceneAccent}30`,
            padding: '16px'
          }}>
            <div className="text-white h-full flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${sceneAccent}20` }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: sceneAccent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{element.name || 'Scene Selector'}</div>
                  <div className="text-xs text-zinc-500">{scenes.length} Scenes</div>
                </div>
              </div>
              
              {/* Scenes */}
              <div 
                className={sceneLayout === 'grid' ? 'grid gap-2 flex-1' : 'flex flex-col gap-2 flex-1 overflow-y-auto'}
                style={sceneLayout === 'grid' ? { 
                  gridTemplateColumns: `repeat(${sceneCols}, 1fr)`,
                  gridAutoRows: 'minmax(0, 1fr)'
                } : {}}
              >
                {scenes.map((scene: any, idx: number) => {
                  const SceneIcon = scene.icon ? iconMap[scene.icon] || Sparkles : Sparkles;
                  const isActive = idx === activeSceneIndex;
                  
                  return (
                    <button
                      key={idx}
                      className="p-2 rounded-lg text-xs font-medium transition-all hover:scale-105 flex items-center gap-2"
                      style={{
                        backgroundColor: isActive ? `${sceneAccent}30` : '#27272a',
                        border: `1px solid ${isActive ? sceneAccent : '#3f3f46'}`,
                        color: isActive ? sceneAccent : '#a1a1aa',
                        justifyContent: sceneLayout === 'list' ? 'flex-start' : 'center',
                        flexDirection: sceneLayout === 'list' ? 'row' : 'column',
                      }}
                    >
                      <SceneIcon className={sceneLayout === 'list' ? 'w-4 h-4' : 'w-5 h-5'} />
                      <span className="truncate">{scene.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'room-card':
        return (
          <RoomCard
            width={element.width}
            height={element.height}
            roomName={element.text || 'Room'}
            icon={element.icon || 'Home'}
            color={element.style?.textColor || '#667eea'}
          />
        );

      default:
        // Custom library components - render from registry
        const customComp = getCustomComponent(element.type);
        if (customComp) {
          const CustomComponent = customComp.component;
          return (
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
              <CustomComponent element={element} />
            </div>
          );
        }
        
        // Unknown component - show placeholder
        return (
          <div 
            style={{
              ...baseStyle,
              border: '2px dashed #3b82f6',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
            }}
          >
            <Layers className="w-8 h-8 text-blue-400" />
            <div className="text-xs text-zinc-300 text-center font-medium">
              {element.name || element.type}
            </div>
            <div className="text-[10px] text-zinc-500 text-center">
              Custom Component
            </div>
          </div>
        );
    }
  };

  // Z-index layering:
  //   10 + renderIndex   — regular content elements (array order = visual order)
  //   200 + renderIndex  — chrome elements (sidebar, header) always above content
  //   500               — selected element (always on top during interaction)
  const CHROME_TYPES = new Set(['sidebar', 'header']);
  const isChrome = CHROME_TYPES.has(element.type);
  const baseZ = isChrome ? 200 : 10;
  const computedZ = isSelected ? 500 + renderIndex : baseZ + renderIndex;

  const elementStyle: React.CSSProperties = {
    gridArea: '1 / 1 / 2 / 2',
    alignSelf: 'start' as const,
    justifySelf: 'start' as const,
    transform: `translate(${element.x}px, ${element.y}px)`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    backgroundColor: element.style?.backgroundColor || 'transparent',
    borderColor: element.style?.borderColor || 'transparent',
    borderWidth: element.style?.borderWidth || 0,
    borderStyle: element.style?.borderWidth ? 'solid' : 'none',
    borderRadius: element.style?.borderRadius || 0,
    opacity: element.style?.opacity ?? 1,
    cursor: element.locked ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
    userSelect: 'none' as const,
    zIndex: computedZ,
    willChange: isDragging ? 'transform' : 'auto',
  };

  return (
    <div
      ref={elementRef}
      style={elementStyle}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        console.log('🎯 CanvasElement double-click:', element.type, element.name);
        if (onDoubleClick) {
          e.stopPropagation();
          onDoubleClick(e); // Pass the event!
        }
      }}
      onContextMenu={onContextMenu}
    >
      {renderElementContent()}

      {/* Locked indicator */}
      {element.locked && (
        <div
          className="absolute -top-1 -left-1 bg-red-500 rounded-full p-1 pointer-events-none"
          style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'top left' }}
          title="Element is locked"
        >
          <Lock className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      {/* Group indicator */}
      {isGrouped && !isSelected && (
        <>
          <div
            className="absolute inset-0 border-2 border-dashed border-emerald-500/40 pointer-events-none"
            style={{ borderRadius: element.style?.borderRadius || 0 }}
          />
          <div
            className="absolute -top-1 -right-1 bg-emerald-600 rounded-full p-0.5 pointer-events-none"
            style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'top right' }}
            title={`Group: ${element.groupId}`}
          >
            <Group className="w-2.5 h-2.5 text-white" />
          </div>
        </>
      )}

      {isSelected && (
        <>
          {/* Selection Border */}
          <div
            className={`absolute inset-0 border-2 pointer-events-none ${
              isGrouped ? 'border-emerald-500' : 'border-blue-500'
            }`}
            style={{ borderRadius: element.style?.borderRadius || 0 }}
          />

          {/* Resize Handle */}
          <div
            className={`resize-handle absolute bottom-0 right-0 w-3 h-3 cursor-se-resize ${isGrouped ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'bottom right' }}
          />

          {/* Element Label */}
          <div
            className={`absolute -top-6 left-0 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap flex items-center gap-1 ${
              isGrouped ? 'bg-emerald-600' : 'bg-blue-500'
            }`}
            style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'bottom left' }}
          >
            {isGrouped && <Group className="w-3 h-3" />}
            {element.name}
          </div>
        </>
      )}
    </div>
  );
}
import { useState, useEffect, useRef, useCallback } from 'react';
import { CrestronElement } from '../../types/crestron';
import * as Icons from 'lucide-react';
import {
  Home,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';

interface SidebarProps {
  element: CrestronElement;
  isPreview?: boolean;
  onDigitalJoin?: (join: number, value: boolean) => void;
  onUpdate?: (updates: Partial<CrestronElement>) => void;
  zoom?: number;
}

const COLLAPSED_WIDTH = 56;
const MIN_EXPANDED_WIDTH = 120;
const MAX_WIDTH = 400;
const LABEL_THRESHOLD = 100; // below this, icons only

export function Sidebar({
  element,
  isPreview = false,
  onDigitalJoin,
  onUpdate,
  zoom = 1,
}: SidebarProps) {
  const config = element.config || {};
  const position = config.position || 'left';
  const backgroundColor = config.backgroundColor || '#18181b';
  const textColor = config.textColor || '#ffffff';
  const activeColor = config.activeColor || '#3b82f6';
  const collapsible = config.collapsible !== false;
  const autoCollapse = config.autoCollapse === true;
  const autoCollapseDelay = config.autoCollapseDelay || 3000;

  // Derive collapsed state from actual element width
  const isCollapsed = element.width <= COLLAPSED_WIDTH + 8;
  const showLabels = element.width >= LABEL_THRESHOLD;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEdgeDragging, setIsEdgeDragging] = useState(false);
  const edgeDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const autoCollapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stored expanded width — remember last expanded width for toggle restore
  const expandedWidthRef = useRef(
    element.width > COLLAPSED_WIDTH + 8
      ? element.width
      : config.expandedWidth || 240
  );

  // Keep expandedWidthRef in sync when user manually resizes to a wider state
  useEffect(() => {
    if (element.width > COLLAPSED_WIDTH + 8) {
      expandedWidthRef.current = element.width;
    }
  }, [element.width]);

  // Default menu items
  const menuItems = config.menuItems || [
    { icon: 'Home', label: 'Home' },
    { icon: 'Lightbulb', label: 'Lighting' },
    { icon: 'Thermometer', label: 'Climate' },
    { icon: 'Video', label: 'Media' },
    { icon: 'Camera', label: 'Security' },
    { icon: 'Settings', label: 'Settings' },
  ];

  // Auto-collapse
  useEffect(() => {
    if (autoCollapse && !isCollapsed) {
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = setTimeout(() => {
        onUpdate?.({ width: COLLAPSED_WIDTH });
      }, autoCollapseDelay);
      return () => {
        if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
      };
    }
  }, [isCollapsed, autoCollapse, autoCollapseDelay, onUpdate]);

  // --- Toggle collapse/expand ---
  const handleToggle = useCallback(() => {
    if (!onUpdate) return;
    if (isCollapsed) {
      onUpdate({ width: expandedWidthRef.current });
    } else {
      onUpdate({ width: COLLAPSED_WIDTH });
    }
  }, [isCollapsed, onUpdate]);

  // --- Edge drag resize ---
  const handleEdgeDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEdgeDragging(true);
    edgeDragRef.current = { startX: e.clientX, startWidth: element.width };
  }, [element.width]);

  useEffect(() => {
    if (!isEdgeDragging) return;

    const handleMove = (e: MouseEvent) => {
      if (!edgeDragRef.current || !onUpdate) return;
      const delta = (e.clientX - edgeDragRef.current.startX) / zoom;
      const direction = position === 'right' ? -1 : 1;
      const newWidth = Math.round(
        Math.max(COLLAPSED_WIDTH, Math.min(MAX_WIDTH, edgeDragRef.current.startWidth + delta * direction))
      );
      onUpdate({ width: newWidth });
    };

    const handleUp = () => {
      setIsEdgeDragging(false);
      edgeDragRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isEdgeDragging, zoom, position, onUpdate]);

  // --- Menu item click ---
  const handleItemClick = (index: number) => {
    setSelectedIndex(index);
    if (element.digitalJoin && onDigitalJoin) {
      onDigitalJoin(element.digitalJoin + index, true);
      setTimeout(() => onDigitalJoin(element.digitalJoin! + index, false), 200);
    }
    if (isCollapsed) {
      onUpdate?.({ width: expandedWidthRef.current });
    }
  };

  // Edge handle position
  const isRight = position === 'right';
  const edgeHandleSide = isRight ? 'left' : 'right';

  return (
    <div
      className="w-full h-full flex flex-col relative select-none"
      style={{
        backgroundColor,
        borderLeft: isRight ? '1px solid rgba(255,255,255,0.08)' : undefined,
        borderRight: !isRight ? '1px solid rgba(255,255,255,0.08)' : undefined,
      }}
    >
      {/* ── Toggle Button ── */}
      {collapsible && (
        <button
          onClick={handleToggle}
          className="shrink-0 flex items-center justify-center py-3 transition-colors duration-150 hover:bg-white/10"
          style={{
            color: textColor,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {isRight ? (
            isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      )}

      {/* ── Menu Items ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {menuItems.map((item: any, index: number) => {
          const IconComponent = (Icons as any)[item.icon] || Home;
          const isActive = selectedIndex === index;

          return (
            <button
              key={index}
              onClick={() => handleItemClick(index)}
              className="w-full flex items-center gap-3 transition-colors duration-100 hover:bg-white/[0.07]"
              style={{
                backgroundColor: isActive ? `${activeColor}18` : 'transparent',
                borderLeft: !isRight && isActive ? `2px solid ${activeColor}` : !isRight ? '2px solid transparent' : undefined,
                borderRight: isRight && isActive ? `2px solid ${activeColor}` : isRight ? '2px solid transparent' : undefined,
                color: isActive ? activeColor : textColor,
                justifyContent: showLabels ? 'flex-start' : 'center',
                padding: showLabels ? '10px 14px' : '10px 0',
              }}
              title={!showLabels ? item.label : undefined}
            >
              <IconComponent className="w-[18px] h-[18px] shrink-0" />
              {showLabels && (
                <span className="text-[13px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Footer ── */}
      {config.showFooter && showLabels && (
        <div
          className="px-3 py-3 text-[11px] opacity-60 shrink-0"
          style={{
            color: textColor,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {config.footerText || 'Crestron Control'}
        </div>
      )}

      {/* ── Edge Resize Handle ── */}
      {onUpdate && (
        <div
          onMouseDown={handleEdgeDragStart}
          className="absolute top-0 h-full group"
          style={{
            [edgeHandleSide]: 0,
            width: 10,
            cursor: 'col-resize',
            zIndex: 50,
          }}
        >
          {/* Visible grip indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-sm transition-all duration-150 opacity-0 group-hover:opacity-100"
            style={{
              [edgeHandleSide]: 1,
              width: 6,
              height: 48,
              backgroundColor: isEdgeDragging ? activeColor : 'rgba(255,255,255,0.15)',
              opacity: isEdgeDragging ? 1 : undefined,
              ...(isEdgeDragging ? { boxShadow: `0 0 8px ${activeColor}60` } : {}),
            }}
          >
            <GripVertical
              className="transition-opacity duration-150"
              style={{
                width: 10,
                height: 10,
                color: isEdgeDragging ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            />
          </div>

          {/* Active highlight line */}
          {isEdgeDragging && (
            <div
              className="absolute top-0 h-full"
              style={{
                [edgeHandleSide]: 0,
                width: 2,
                backgroundColor: activeColor,
                borderRadius: 1,
              }}
            />
          )}
        </div>
      )}

      {/* ── Width indicator during drag ── */}
      {isEdgeDragging && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] tracking-wide pointer-events-none"
          style={{
            backgroundColor: activeColor,
            color: '#fff',
            zIndex: 60,
            whiteSpace: 'nowrap',
          }}
        >
          {element.width}px
        </div>
      )}
    </div>
  );
}
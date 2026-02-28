import { useRef, useState, useEffect, useCallback } from 'react';
import { CrestronElement, Page } from '../types/crestron';
import { CanvasElement } from './CanvasElement';
import { ContextMenu } from './ContextMenu';
import { AnimatedBackground } from './backgrounds/AnimatedBackground';
import { SnapGuide } from '../utils/snapGuides';

interface CanvasProps {
  page?: Page;
  selectedElements: CrestronElement[];
  setSelectedElements: (elements: CrestronElement[]) => void;
  updateElement: (elementId: string, updates: Partial<CrestronElement>) => void;
  deleteElement: (elementId: string) => void;
  deleteMultipleElements: () => void;
  addElement: (element: CrestronElement) => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  onElementDoubleClick?: (element: CrestronElement, screenX: number, screenY: number) => void;
  onUpdateComplete?: () => void;
  onDragStart?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onLockElement?: (elementId: string) => void;
  onGroupElements?: () => void;
  onUngroupElements?: () => void;
  onCopyStyle?: () => void;
  onPasteStyle?: () => void;
  hasCopiedStyle?: boolean;
  onAutoLayout?: () => void;
  onAutoLayoutSelected?: () => void;
  onImportCSharpJoins?: () => void;
  onSaveToLibrary?: () => void;
}

export function Canvas({
  page,
  selectedElements,
  setSelectedElements,
  updateElement,
  deleteElement,
  deleteMultipleElements,
  addElement,
  onCopy,
  onPaste,
  onDuplicate,
  zoom,
  setZoom,
  showGrid,
  setShowGrid,
  snapToGrid,
  setSnapToGrid,
  onElementDoubleClick,
  onUpdateComplete,
  onDragStart,
  onBringToFront,
  onSendToBack,
  onLockElement,
  onGroupElements,
  onUngroupElements,
  onCopyStyle,
  onPasteStyle,
  hasCopiedStyle = false,
  onAutoLayout,
  onAutoLayoutSelected,
  onImportCSharpJoins,
  onSaveToLibrary,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridSize] = useState(20);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Snap guides state
  const [activeSnapGuides, setActiveSnapGuides] = useState<SnapGuide[]>([]);

  // Track initialization
  const initializedForPageRef = useRef<string | null>(null);


  // Compute minimum zoom: panel must never be smaller than the container (for Ctrl+scroll only)
  const getMinZoom = useCallback(() => {
    if (!containerRef.current || !page) return 0.25;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    if (cw === 0 || ch === 0) return 0.25;
    return Math.min(cw / page.width, ch / page.height);
  }, [page]);

  // Helper: compute centered pan
  const computeCenteredPan = useCallback((pageWidth: number, pageHeight: number, z: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    return {
      x: (cw - pageWidth * z) / 2,
      y: (ch - pageHeight * z) / 2,
    };
  }, []);

  // Helper: clamp pan to keep canvas visible
  const clampPan = useCallback((newPan: { x: number; y: number }, pageWidth: number, pageHeight: number, z: number) => {
    if (!containerRef.current) return newPan;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const sw = pageWidth * z;
    const sh = pageHeight * z;
    const margin = 100;
    const minX = cw - sw - margin;
    const maxX = margin;
    const minY = ch - sh - margin;
    const maxY = margin;
    if (sw <= cw) {
      return { x: (cw - sw) / 2, y: Math.max(minY, Math.min(maxY, newPan.y)) };
    }
    if (sh <= ch) {
      return { x: Math.max(minX, Math.min(maxX, newPan.x)), y: (ch - sh) / 2 };
    }
    return {
      x: Math.max(minX, Math.min(maxX, newPan.x)),
      y: Math.max(minY, Math.min(maxY, newPan.y)),
    };
  }, []);

  // Initialize on first mount and when page changes: set zoom to fit, center canvas
  useEffect(() => {
    if (!containerRef.current || !page) return;
    if (initializedForPageRef.current === page.id) return;

    const initCanvas = () => {
      if (!containerRef.current || !page) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      if (cw === 0 || ch === 0) return false; // Container not laid out yet
      const fz = Math.min(cw / page.width, ch / page.height);
      setZoom(fz);
      setPan({
        x: (cw - page.width * fz) / 2,
        y: (ch - page.height * fz) / 2,
      });
      initializedForPageRef.current = page.id;
      return true;
    };

    // Try immediately, then via rAF, then via ResizeObserver as fallback
    if (!initCanvas()) {
      const raf = requestAnimationFrame(() => {
        if (!initCanvas()) {
          const obs = new ResizeObserver(() => {
            if (initCanvas()) obs.disconnect();
          });
          if (containerRef.current) obs.observe(containerRef.current);
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [page?.id, setZoom]);

  // When zoom changes: adjust pan to keep canvas properly positioned
  useEffect(() => {
    if (!containerRef.current || !page) return;
    if (!initializedForPageRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const sw = page.width * zoom;
    const sh = page.height * zoom;

    // Keep viewport deterministic: always center after zoom changes.
    setPan({
      x: (cw - sw) / 2,
      y: (ch - sh) / 2,
    });
  }, [zoom]);

  // Keep workspace aligned on container resize.
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const observer = new ResizeObserver(() => {
      if (!page || !container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw === 0 || ch === 0) return;

      const sw = page.width * zoom;
      const sh = page.height * zoom;
      setPan({
        x: (cw - sw) / 2,
        y: (ch - sh) / 2,
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [page, zoom, clampPan]);

  // Multi-selection rectangle
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [selectionStartScreen, setSelectionStartScreen] = useState({ x: 0, y: 0 });
  const [selectionEndScreen, setSelectionEndScreen] = useState({ x: 0, y: 0 });
  const selectionMouseDownRef = useRef({ x: 0, y: 0 });
  const hasStartedSelectionRef = useRef(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elements: CrestronElement[];
  } | null>(null);

  // Get overlapping elements
  // Overlap detection removed — users found the yellow warnings distracting in dense templates
  // const overlappingElementIds = page ? getElementsWithOverlaps(page.elements) : new Set<string>();

  // --- Convert screen coords to canvas coords ---
  const screenToCanvas = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  const handleElementClick = (element: CrestronElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      const isAlreadySelected = selectedElements.some(el => el.id === element.id);
      if (isAlreadySelected) {
        setSelectedElements(selectedElements.filter(el => el.id !== element.id));
      } else {
        setSelectedElements([...selectedElements, element]);
      }
    } else {
      if (element.groupId && page) {
        const groupMembers = pageElements.filter(el => el.groupId === element.groupId);
        setSelectedElements(groupMembers);
      } else {
        setSelectedElements([element]);
      }
    }
  };

  const handleElementDoubleClick = (element: CrestronElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedElements.some(el => el.id === element.id)) {
      setSelectedElements([element]);
    }
    if (onElementDoubleClick) {
      onElementDoubleClick(element, e.clientX, e.clientY);
    }
  };

  const handleElementContextMenu = (element: CrestronElement, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let elementsForMenu: CrestronElement[];
    if (selectedElements.some(el => el.id === element.id)) {
      elementsForMenu = selectedElements;
    } else {
      setSelectedElements([element]);
      elementsForMenu = [element];
    }
    setContextMenu({ x: e.clientX, y: e.clientY, elements: elementsForMenu });
  };

  // Trackpad pan + Ctrl+scroll zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !page) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.quick-edit-popup') || target.closest('[role="dialog"]')) return;

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.97 : 1.03;
        const minZ = getMinZoom();
        const newZoom = Math.max(minZ, Math.min(2, zoom * delta));
        setZoom(newZoom);
        return;
      }

      e.preventDefault();
      setPan(prev => clampPan({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }, page.width, page.height, zoom));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [page, zoom, clampPan, setZoom, getMinZoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElements.length > 0) { e.preventDefault(); deleteMultipleElements(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); onCopy(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); onPaste(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); onDuplicate(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (page) setSelectedElements(pageElements);
      }
      if (e.key === 'Escape') setSelectedElements([]);
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) setShowGrid(!showGrid);
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) setSnapToGrid(!snapToGrid);

      // Auto Layout: Ctrl+L (all) or Ctrl+Shift+L (selected)
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        if (e.shiftKey && selectedElements.length >= 2 && onAutoLayoutSelected) {
          onAutoLayoutSelected();
        } else if (!e.shiftKey && onAutoLayout) {
          onAutoLayout();
        }
      }

      // Import C# Joins: Ctrl+J
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        if (onImportCSharpJoins) onImportCSharpJoins();
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElements.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (onDragStart) onDragStart();
        const firstElement = selectedElements.find(el => !el.locked);
        if (firstElement) {
          updateElement(firstElement.id, {
            x: Math.max(0, firstElement.x + dx),
            y: Math.max(0, firstElement.y + dy),
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElements, onCopy, onPaste, onDuplicate, deleteMultipleElements, page, setSelectedElements, showGrid, snapToGrid, updateElement]);

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-500">No page selected</p>
      </div>
    );
  }

  // Guard against malformed imported/saved pages where elements may be missing.
  const pageElements = Array.isArray(page.elements) ? page.elements : [];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const componentType = e.dataTransfer.getData('componentType');
    const componentConfig = e.dataTransfer.getData('componentConfig');
    if (!componentType) return;

    let { x, y } = screenToCanvas(e.clientX, e.clientY);
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    const config = componentConfig ? JSON.parse(componentConfig) : {};
    const newElement: CrestronElement = {
      id: `element_${Date.now()}`,
      type: componentType as any,
      name: config.name || `${componentType}`,
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: config.width || 100,
      height: config.height || 100,
      joins: config.joins || {},
      style: config.style || {},
      ...(config.digitalJoin !== undefined && { digitalJoin: config.digitalJoin }),
      ...(config.analogJoin !== undefined && { analogJoin: config.analogJoin }),
      ...(config.serialJoin !== undefined && { serialJoin: config.serialJoin }),
      ...(config.config && { config: config.config }),
    };
    addElement(newElement);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (hasStartedSelectionRef.current) return;
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).classList.contains('canvas-working-area')
    ) {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) setSelectedElements([]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      selectionMouseDownRef.current = { x: e.clientX, y: e.clientY };
      hasStartedSelectionRef.current = false;
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      if (
        e.target === e.currentTarget ||
        (e.target as HTMLElement).classList.contains('canvas-working-area')
      ) {
        setIsSelecting(true);
        setSelectionStart({ x, y });
        setSelectionEnd({ x, y });
        setSelectionStartScreen({ x: e.clientX, y: e.clientY });
        setSelectionEndScreen({ x: e.clientX, y: e.clientY });
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) setSelectedElements([]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting) {
      if (!hasStartedSelectionRef.current) {
        const dx = Math.abs(e.clientX - selectionMouseDownRef.current.x);
        const dy = Math.abs(e.clientY - selectionMouseDownRef.current.y);
        if (Math.sqrt(dx * dx + dy * dy) < 5) return;
        hasStartedSelectionRef.current = true;
      }
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      setSelectionEnd({ x, y });
      setSelectionEndScreen({ x: e.clientX, y: e.clientY });

      const minX = Math.min(selectionStart.x, x);
      const maxX = Math.max(selectionStart.x, x);
      const minY = Math.min(selectionStart.y, y);
      const maxY = Math.max(selectionStart.y, y);
      setSelectedElements(pageElements.filter(el =>
        el.x + el.width >= minX && el.x <= maxX &&
        el.y + el.height >= minY && el.y <= maxY
      ));
    }
  };

  const handleMouseUp = () => {
    if (isSelecting) {
      setIsSelecting(false);
      setTimeout(() => { hasStartedSelectionRef.current = false; }, 10);
    } else if (isPanning) {
      setIsPanning(false);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden' as const,
        backgroundColor: '#09090b',
      }}
    >
      {/* Canvas surface — uses CSS Grid so children stack via grid-area:1/1 + transform */}
      <div
        ref={canvasRef}
        className="canvas-working-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: 'grid' as const,
          gridTemplate: '1fr / 1fr',
          marginLeft: `${pan.x}px`,
          marginTop: `${pan.y}px`,
          width: `${page.width}px`,
          height: `${page.height}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          backgroundColor: page.backgroundColor || '#18181b',
          backgroundImage: page.backgroundImage ? `url(${page.backgroundImage})` : 'none',
          backgroundSize: page.backgroundImage ? 'cover' : 'auto',
          backgroundPosition: page.backgroundImage ? 'center' : '0 0',
          backgroundRepeat: 'no-repeat',
          cursor: isSelecting ? 'crosshair' : isPanning ? 'grabbing' : 'default',
          overflow: 'hidden' as const,
          boxShadow: '0 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Animated background */}
        {page.animatedBackground && (
          <div style={{ gridArea: '1 / 1 / 2 / 2', width: '100%', height: '100%', pointerEvents: 'none' as const }}>
            <AnimatedBackground
              type={typeof page.animatedBackground === 'string' ? page.animatedBackground : page.animatedBackground?.type || 'none'}
              speed={typeof page.animatedBackground === 'object' ? page.animatedBackground?.speed : undefined}
              intensity={typeof page.animatedBackground === 'object' ? page.animatedBackground?.intensity : undefined}
            />
          </div>
        )}

        {/* Grid overlay */}
        {showGrid && (
          <div
            style={{
              gridArea: '1 / 1 / 2 / 2',
              width: `${page.width}px`,
              height: `${page.height}px`,
              pointerEvents: 'none' as const,
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${gridSize}px ${gridSize}px`,
              zIndex: 5,
            }}
          />
        )}

        {/* Snap guides */}
        {activeSnapGuides.map((guide, i) => (
          <div
            key={`snap-${i}`}
            style={{
              gridArea: '1 / 1 / 2 / 2',
              width: guide.orientation === 'vertical' ? '1px' : `${page.width}px`,
              height: guide.orientation === 'horizontal' ? '1px' : `${page.height}px`,
              transform: guide.orientation === 'vertical'
                ? `translateX(${guide.position}px)`
                : `translateY(${guide.position}px)`,
              backgroundColor: '#3b82f6',
              pointerEvents: 'none' as const,
              zIndex: 9000,
            }}
          />
        ))}

        {/* Render elements */}
        {pageElements.map((element, index) => (
          <CanvasElement
            key={element.id}
            element={element}
            isSelected={selectedElements.some(el => el.id === element.id)}
            onSelect={(e) => handleElementClick(element, e)}
            onDoubleClick={(e) => handleElementDoubleClick(element, e)}
            onContextMenu={(e) => handleElementContextMenu(element, e)}
            onUpdate={(updates) => updateElement(element.id, updates)}
            onDelete={() => deleteElement(element.id)}
            onDragEnd={onUpdateComplete}
            onDragStart={onDragStart}
            zoom={zoom}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
            allElements={pageElements}
            pageWidth={page.width}
            pageHeight={page.height}
            onSnapGuides={setActiveSnapGuides}
            renderIndex={index}
            isGrouped={!!element.groupId}
          />
        ))}

        {/* Selection rectangle */}
        {isSelecting && hasStartedSelectionRef.current && (
          <div
            style={{
              gridArea: '1 / 1 / 2 / 2',
              width: `${Math.abs(selectionEnd.x - selectionStart.x)}px`,
              height: `${Math.abs(selectionEnd.y - selectionStart.y)}px`,
              transform: `translate(${Math.min(selectionStart.x, selectionEnd.x)}px, ${Math.min(selectionStart.y, selectionEnd.y)}px)`,
              border: '1px solid #3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              zIndex: 10000,
              pointerEvents: 'none' as const,
            }}
          />
        )}
      </div>

      {/* Status bar */}
      <div
        style={{
          position: 'absolute' as const,
          bottom: '0px',
          left: '0px',
          right: '0px',
          height: '24px',
          backgroundColor: '#18181b',
          borderTop: '1px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '12px',
          paddingRight: '12px',
          fontSize: '10px',
          color: '#71717a',
          gap: '16px',
          zIndex: 50000,
        }}
      >
        <span>{page.width} × {page.height}</span>
        <span>{pageElements.length} elements</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        {selectedElements.length > 0 && (
          <span style={{ color: '#60a5fa' }}>{selectedElements.length} selected</span>
        )}
        {snapToGrid && <span style={{ color: '#34d399' }}>Snap: {gridSize}px</span>}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          elements={contextMenu.elements}
          onClose={() => setContextMenu(null)}
          onDelete={() => { deleteMultipleElements(); setContextMenu(null); }}
          onDuplicate={() => { onDuplicate(); setContextMenu(null); }}
          onBringToFront={() => { if (onBringToFront) onBringToFront(); setContextMenu(null); }}
          onSendToBack={() => { if (onSendToBack) onSendToBack(); setContextMenu(null); }}
          onLock={() => { if (onLockElement && contextMenu.elements[0]) onLockElement(contextMenu.elements[0].id); setContextMenu(null); }}
          onGroup={() => { if (onGroupElements) onGroupElements(); setContextMenu(null); }}
          onUngroup={() => { if (onUngroupElements) onUngroupElements(); setContextMenu(null); }}
          onCopyStyle={() => { if (onCopyStyle) onCopyStyle(); setContextMenu(null); }}
          onPasteStyle={() => { if (onPasteStyle) onPasteStyle(); setContextMenu(null); }}
          hasCopiedStyle={hasCopiedStyle}
          onSaveToLibrary={() => { if (onSaveToLibrary) onSaveToLibrary(); setContextMenu(null); }}
        />
      )}
    </div>
  );
}
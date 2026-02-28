import { useState, useEffect, useRef } from 'react';
import { Canvas } from './components/Canvas';
import { RightPanel } from './components/RightPanel';
import { Toolbar } from './components/Toolbar';
import { ProjectTree } from './components/ProjectTree';
import { LibrarySidebar } from './components/LibrarySidebar';
import { ExternalLibrariesModal } from './components/ExternalLibrariesModal';
import { CSharpImportModal } from './components/CSharpImportModal';
import { ComponentImportModal } from './components/ComponentImportModal';
import { QuickEditSidebar } from './components/QuickEditSidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CrestronElement, Project, Page, HistoryState, ExternalLibrary } from './types/crestron';
import { alignElements, scaleElement } from './utils/alignment';
import { autoLayoutElements, tidyLayoutElements } from './utils/autoLayout';
import { AlignmentToolbar } from './components/AlignmentToolbar';
import { DeviceSelector } from './components/DeviceSelector';
import { Grid3x3, ZoomIn, ZoomOut, Maximize, FolderTree, LayoutGrid, SlidersHorizontal, Wand2, FileCode2 } from 'lucide-react';
import { getCustomComponent } from './components/custom/registry';
import { createCrestronProV2Template } from './utils/crestronProV2Template';
import { createCrestronHomeTemplate } from './utils/crestronHomeTemplate';

const createDefaultProject = (): Project => ({
  name: 'New Project',
  pages: [
    {
      id: '1',
      name: 'Main Page',
      elements: [],
      width: 1920,
      height: 1080,
    },
  ],
  templates: [],
  libraries: [],
  externalLibraries: [],
});

const toFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

function normalizeProject(raw: unknown): Project {
  const fallback = createDefaultProject();
  const candidate = (raw && typeof raw === 'object') ? (raw as any) : fallback;
  const pages = Array.isArray(candidate.pages) ? candidate.pages : fallback.pages;

  const normalizedPages = pages
    .filter((p: any) => p && typeof p === 'object')
    .map((p: any, index: number) => {
      const width = toFiniteNumber(p.width, 1920);
      const height = toFiniteNumber(p.height, 1080);
      const safeWidth = width > 0 ? width : 1920;
      const safeHeight = height > 0 ? height : 1080;

      let safeElements = Array.isArray(p.elements)
        ? p.elements
            .filter((el: any) => el && typeof el === 'object')
            .map((el: any, elIndex: number) => {
              const elementWidth = Math.max(1, toFiniteNumber(el.width, 100));
              const elementHeight = Math.max(1, toFiniteNumber(el.height, 100));
              const maxX = Math.max(0, safeWidth - elementWidth);
              const maxY = Math.max(0, safeHeight - elementHeight);
              const x = clamp(toFiniteNumber(el.x, 0), 0, maxX);
              const y = clamp(toFiniteNumber(el.y, 0), 0, maxY);

              return {
                ...el,
                id: typeof el.id === 'string' && el.id.length > 0 ? el.id : `element_${index + 1}_${elIndex + 1}`,
                x,
                y,
                width: elementWidth,
                height: elementHeight,
              };
            })
        : [];

      // Migrate older corrupted states where all elements are shifted right/down.
      if (safeElements.length > 0) {
        const anchorElements = safeElements.filter((el: any) => el.width >= 120 || el.height >= 60);
        const migrationSet = anchorElements.length > 0 ? anchorElements : safeElements;

        const minX = Math.min(...migrationSet.map((el: any) => el.x));
        const minY = Math.min(...migrationSet.map((el: any) => el.y));
        const needsShiftX = minX > safeWidth * 0.25;
        const needsShiftY = minY > safeHeight * 0.25;

        if (needsShiftX || needsShiftY) {
          const shiftX = needsShiftX ? minX : 0;
          const shiftY = needsShiftY ? minY : 0;

          safeElements = safeElements.map((el: any) => {
            const nextX = clamp(el.x - shiftX, 0, Math.max(0, safeWidth - el.width));
            const nextY = clamp(el.y - shiftY, 0, Math.max(0, safeHeight - el.height));
            return {
              ...el,
              x: nextX,
              y: nextY,
            };
          });
        }
      }

      return {
        ...p,
        id: typeof p.id === 'string' && p.id.length > 0 ? p.id : `page_${index + 1}`,
        name: typeof p.name === 'string' && p.name.length > 0 ? p.name : `Page ${index + 1}`,
        width: safeWidth,
        height: safeHeight,
        elements: safeElements,
      };
    });

  return {
    ...candidate,
    name: typeof candidate.name === 'string' && candidate.name.length > 0 ? candidate.name : fallback.name,
    pages: normalizedPages.length > 0 ? normalizedPages : fallback.pages,
    templates: Array.isArray(candidate.templates) ? candidate.templates : [],
    libraries: Array.isArray(candidate.libraries) ? candidate.libraries : [],
    externalLibraries: Array.isArray(candidate.externalLibraries) ? candidate.externalLibraries : [],
  };
}

// Crestron HTML5 UI Builder - v2.0
export default function App() {
  const [project, setProject] = useState<Project>(() => {
    // Try to load from localStorage on init
    try {
      const saved = localStorage.getItem('crestron-project');
      if (saved) {
        return normalizeProject(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading project from localStorage:', error);
    }

    // Default project
    return createDefaultProject();
  });

  const [currentPageId, setCurrentPageId] = useState<string>(() => {
    // Try to match saved project's first page ID
    try {
      const saved = localStorage.getItem('crestron-project');
      if (saved) {
        const parsed = normalizeProject(JSON.parse(saved));
        if (parsed.pages.length > 0) {
          return parsed.pages[0].id;
        }
      }
    } catch (_e) { /* ignore */ }
    return '1';
  });
  const [selectedElements, setSelectedElements] = useState<CrestronElement[]>([]);
  const [showProjectTree, setShowProjectTree] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showProperties, setShowProperties] = useState(false);
  const [clipboard, setClipboard] = useState<CrestronElement[]>([]);
  
  // Quick Edit Sidebar state - opens only on double-click
  const [quickEditElement, setQuickEditElement] = useState<CrestronElement | null>(null);
  
  // External Libraries Modal state
  const [showExternalLibsModal, setShowExternalLibsModal] = useState(false);
  
  // C# Import Modal state
  const [showCSharpImportModal, setShowCSharpImportModal] = useState(false);
  
  // Component Import Modal state (from Import Hub)
  const [showComponentImportModal, setShowComponentImportModal] = useState(false);
  
  // Undo/Redo state
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Canvas display settings
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  
  // Quick Edit Popup position
  const [quickEditPosition, setQuickEditPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Auto-save indicator
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Copied style for paste style feature
  const [copiedStyle, setCopiedStyle] = useState<CrestronElement['style'] | null>(null);

  const currentPage = project.pages.find((p) => p.id === currentPageId);

  // Auto-load CRESTRON PRO V2 template when project is empty (first load / localStorage cleared)
  useEffect(() => {
    const totalElements = project.pages.reduce((sum, p) => sum + p.elements.length, 0);
    if (totalElements === 0 && project.pages.length <= 1) {
      const template = createCrestronHomeTemplate(1920, 1080, 'TSW-1070');
      setProject(prev => ({
        ...prev,
        name: template.name,
        pages: template.pages,
      }));
      setCurrentPageId(template.pages[0].id);
    }
  }, []); // Run only once on mount

  // Auto-save to localStorage whenever project changes
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setAutoSaveStatus('saving');
    autoSaveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('crestron-project', JSON.stringify(project));
        console.log('💾 Project auto-saved to localStorage', {
          libraries: project.libraries?.length || 0,
          pages: project.pages?.length || 0
        });
        setAutoSaveStatus('saved');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        setAutoSaveStatus('unsaved');
      }
    }, 1000);
  }, [project]);

  // Close Quick Edit Sidebar when selection is cleared; keep data in sync on move/resize
  useEffect(() => {
    if (selectedElements.length === 0) {
      setQuickEditElement(null);
      setShowProperties(false);
    }
    // Update quickEditElement data when the selected element changes (e.g. moved/resized)
    if (quickEditElement && selectedElements.length === 1 && selectedElements[0].id === quickEditElement.id) {
      setQuickEditElement(selectedElements[0]);
    }
  }, [selectedElements]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      // Ctrl+G for Group
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        if (selectedElements.length >= 2) {
          groupElements();
        }
      }

      // Ctrl+Shift+G for Ungroup
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        if (selectedElements.some(el => !!el.groupId)) {
          ungroupElements();
        }
      }

      // Ctrl+Shift+C for Copy Style
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        copyStyle();
      }

      // Ctrl+Shift+V for Paste Style
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        pasteStyle();
      }

      // J for Joins configuration
      if (e.key.toLowerCase() === 'j' && selectedElements.length > 0) {
        e.preventDefault();
        const propertiesPanel = document.querySelector('.properties-panel');
        if (propertiesPanel) {
          propertiesPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // Optionally highlight the joins section
        setTimeout(() => {
          const joinsSection = document.querySelector('[data-section="joins"]');
          if (joinsSection) {
            joinsSection.classList.add('ring-2', 'ring-blue-500');
            setTimeout(() => {
              joinsSection.classList.remove('ring-2', 'ring-blue-500');
            }, 2000);
          }
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, selectedElements]);

  // Save state to history
  const saveHistory = () => {
    const newHistory = [...history];
    
    // Truncate any future states beyond current index (discard redo history on new action)
    newHistory.splice(historyIndex + 1);
    
    // Add new state
    newHistory.push({
      project: JSON.parse(JSON.stringify(project)),
      currentPageId,
      timestamp: Date.now(),
    });
    
    // Keep only last 70 states
    if (newHistory.length > 70) {
      const excess = newHistory.length - 70;
      newHistory.splice(0, excess);
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo
  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setProject(JSON.parse(JSON.stringify(prevState.project)));
      setCurrentPageId(prevState.currentPageId);
      setHistoryIndex(historyIndex - 1);
      setSelectedElements([]);
    }
  };

  // Redo
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setProject(JSON.parse(JSON.stringify(nextState.project)));
      setCurrentPageId(nextState.currentPageId);
      setHistoryIndex(historyIndex + 1);
      setSelectedElements([]);
    }
  };

  // Jump to specific history state
  const jumpToHistoryState = (index: number) => {
    if (index >= 0 && index < history.length) {
      const targetState = history[index];
      setProject(JSON.parse(JSON.stringify(targetState.project)));
      setCurrentPageId(targetState.currentPageId);
      setHistoryIndex(index);
      setSelectedElements([]);
    }
  };

  const addElement = (element: CrestronElement) => {
    if (!currentPage) return;

    // Check if this is a custom component and initialize joins from registry
    const customComp = getCustomComponent(element.type);
    let initializedElement = { ...element };
    
    if (customComp && customComp.joins) {
      // Initialize joins from registry if not already set
      if (!initializedElement.joins || Object.keys(initializedElement.joins).length === 0) {
        initializedElement.joins = {};
        
        // Digital joins
        if (customComp.joins.digital && customComp.joins.digital.length > 0) {
          initializedElement.joins.digital = customComp.joins.digital[0].defaultJoin;
        }
        
        // Analog joins
        if (customComp.joins.analog && customComp.joins.analog.length > 0) {
          initializedElement.joins.analog = customComp.joins.analog[0].defaultJoin;
        }
        
        // Serial joins
        if (customComp.joins.serial && customComp.joins.serial.length > 0) {
          initializedElement.joins.serial = customComp.joins.serial[0].defaultJoin;
        }
      }
      
      // Initialize config from defaultProps if not set
      if (!initializedElement.config) {
        initializedElement.config = { ...customComp.defaultProps };
      }
    }

    // Validate element dimensions to prevent NaN errors
    const validatedElement = {
      ...initializedElement,
      x: isNaN(initializedElement.x) ? 0 : initializedElement.x,
      y: isNaN(initializedElement.y) ? 0 : initializedElement.y,
      width: isNaN(initializedElement.width) || initializedElement.width <= 0 ? 100 : initializedElement.width,
      height: isNaN(initializedElement.height) || initializedElement.height <= 0 ? 100 : initializedElement.height,
    };

    saveHistory();
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? { ...p, elements: [...p.elements, validatedElement] }
          : p
      ),
    });
  };

  const updateElement = (elementId: string, updates: Partial<CrestronElement>) => {
    // Group drag: when x/y changes on a grouped element, move all group members
    const element = currentPage?.elements.find(el => el.id === elementId);
    const isPositionChange = updates.x !== undefined || updates.y !== undefined;

    // ── Sidebar-content coupling: when a sidebar element resizes (width change),
    //    proportionally rescale all content elements within the new content area ──
    if (element?.type === 'sidebar' && updates.width !== undefined && currentPage) {
      const oldSidebarWidth = element.width;
      const newSidebarWidth = updates.width;
      const deltaW = newSidebarWidth - oldSidebarWidth;
      if (deltaW !== 0) {
        const isLeftSidebar = (element.config?.position || 'left') === 'left';
        if (isLeftSidebar) {
          const pageW = currentPage.width;
          const oldContentStart = element.x + oldSidebarWidth;
          const newContentStart = element.x + newSidebarWidth;
          const oldContentWidth = pageW - oldContentStart;
          const newContentWidth = pageW - newContentStart;

          // Avoid division by zero / negative content area
          if (newContentWidth > 50 && oldContentWidth > 0) {
            const scaleX = newContentWidth / oldContentWidth;

            setProject({
              ...project,
              pages: project.pages.map((p) =>
                p.id === currentPageId
                  ? {
                      ...p,
                      elements: p.elements.map((el) => {
                        if (el.id === elementId) return { ...el, ...updates };
                        // Only rescale elements in the content area (right of sidebar)
                        if (el.type !== 'sidebar' && el.x >= oldContentStart - 10) {
                          // Proportionally rescale position and width within new content area
                          const relativeX = el.x - oldContentStart;
                          const newX = Math.max(newContentStart, newContentStart + relativeX * scaleX);
                          const newW = Math.max(30, el.width * scaleX);
                          // Clamp to page bounds
                          const clampedW = Math.min(newW, pageW - newX);
                          return {
                            ...el,
                            x: Math.round(newX),
                            width: Math.round(Math.max(30, clampedW)),
                          };
                        }
                        return el;
                      }),
                    }
                  : p
              ),
            });
            setSelectedElements(prev =>
              prev.map(el => (el.id === elementId ? { ...el, ...updates } : el))
            );
            return;
          }
        }
      }
    }
    
    if (element?.groupId && isPositionChange && currentPage) {
      const deltaX = (updates.x !== undefined ? updates.x - element.x : 0);
      const deltaY = (updates.y !== undefined ? updates.y - element.y : 0);
      
      if (deltaX !== 0 || deltaY !== 0) {
        setProject({
          ...project,
          pages: project.pages.map((p) =>
            p.id === currentPageId
              ? {
                  ...p,
                  elements: p.elements.map((el) => {
                    if (el.id === elementId) {
                      return { ...el, ...updates };
                    }
                    if (el.groupId === element.groupId) {
                      return {
                        ...el,
                        x: Math.max(0, el.x + deltaX),
                        y: Math.max(0, el.y + deltaY),
                      };
                    }
                    return el;
                  }),
                }
              : p
          ),
        });

        // Update selected elements
        setSelectedElements(prev =>
          prev.map(el => {
            if (el.id === elementId) return { ...el, ...updates };
            if (el.groupId === element.groupId) {
              return { ...el, x: Math.max(0, el.x + deltaX), y: Math.max(0, el.y + deltaY) };
            }
            return el;
          })
        );
        return;
      }
    }

    // Multi-select drag: when dragging a selected element, move all selected elements
    if (isPositionChange && element && selectedElements.length > 1 && selectedElements.some(el => el.id === elementId)) {
      const deltaX = (updates.x !== undefined ? updates.x - element.x : 0);
      const deltaY = (updates.y !== undefined ? updates.y - element.y : 0);
      
      if (deltaX !== 0 || deltaY !== 0) {
        const selectedIds = new Set(selectedElements.map(el => el.id));
        
        setProject({
          ...project,
          pages: project.pages.map((p) =>
            p.id === currentPageId
              ? {
                  ...p,
                  elements: p.elements.map((el) => {
                    if (el.id === elementId) {
                      return { ...el, ...updates };
                    }
                    if (selectedIds.has(el.id) && !el.locked) {
                      return {
                        ...el,
                        x: Math.max(0, el.x + deltaX),
                        y: Math.max(0, el.y + deltaY),
                      };
                    }
                    return el;
                  }),
                }
              : p
          ),
        });

        // Update selected elements in state
        setSelectedElements(prev =>
          prev.map(el => {
            if (el.id === elementId) return { ...el, ...updates };
            if (!el.locked) {
              return { ...el, x: Math.max(0, el.x + deltaX), y: Math.max(0, el.y + deltaY) };
            }
            return el;
          })
        );
        return;
      }
    }
    
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.map((el) =>
                el.id === elementId ? { ...el, ...updates } : el
              ),
            }
          : p
      ),
    });

    // Update selected elements
    setSelectedElements(prev =>
      prev.map(el => (el.id === elementId ? { ...el, ...updates } : el))
    );
  };

  const updateMultipleElements = (updates: Array<{ id: string; updates: Partial<CrestronElement> }>) => {
    saveHistory();
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.map((el) => {
                const update = updates.find(u => u.id === el.id);
                return update ? { ...el, ...update.updates } : el;
              }),
            }
          : p
      ),
    });
  };

  const deleteElement = (elementId: string) => {
    saveHistory();
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.filter((el) => el.id !== elementId),
            }
          : p
      ),
    });

    setSelectedElements(prev => prev.filter(el => el.id !== elementId));
  };

  const deleteMultipleElements = () => {
    if (selectedElements.length === 0) return;
    saveHistory();
    const idsToDelete = new Set(selectedElements.map(el => el.id));
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.filter((el) => !idsToDelete.has(el.id)),
            }
          : p
      ),
    });
    setSelectedElements([]);
  };

  // Copy selected elements
  const copyElements = () => {
    if (selectedElements.length > 0) {
      setClipboard(JSON.parse(JSON.stringify(selectedElements)));
    }
  };

  // Paste elements
  const pasteElements = () => {
    if (clipboard.length === 0 || !currentPage) return;
    saveHistory();
    
    const newElements = clipboard.map(el => ({
      ...el,
      id: `element_${Date.now()}_${Math.random()}`,
      x: el.x + 20,
      y: el.y + 20,
    }));

    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? { ...p, elements: [...p.elements, ...newElements] }
          : p
      ),
    });

    setSelectedElements(newElements);
  };

  // Duplicate selected elements
  const duplicateElements = () => {
    if (selectedElements.length === 0 || !currentPage) return;
    saveHistory();
    
    const newElements = selectedElements.map(el => ({
      ...el,
      id: `element_${Date.now()}_${Math.random()}`,
      x: el.x + 20,
      y: el.y + 20,
    }));

    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? { ...p, elements: [...p.elements, ...newElements] }
          : p
      ),
    });

    setSelectedElements(newElements);
  };

  // Align elements
  const handleAlign = (type: string) => {
    if (selectedElements.length < 2) return;

    const alignmentUpdates = alignElements(selectedElements, type as any);
    updateMultipleElements(
      alignmentUpdates.map(update => ({
        id: update.id as string,
        updates: update,
      }))
    );
  };

  // Bring to front
  const bringToFront = () => {
    if (selectedElements.length === 0 || !currentPage) return;
    saveHistory();

    const selectedIds = new Set(selectedElements.map(el => el.id));
    const otherElements = currentPage.elements.filter(el => !selectedIds.has(el.id));
    const selectedElementsFromPage = currentPage.elements.filter(el => selectedIds.has(el.id));

    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? { ...p, elements: [...otherElements, ...selectedElementsFromPage] }
          : p
      ),
    });
  };

  // Send to back
  const sendToBack = () => {
    if (selectedElements.length === 0 || !currentPage) return;
    saveHistory();

    const selectedIds = new Set(selectedElements.map(el => el.id));
    const otherElements = currentPage.elements.filter(el => !selectedIds.has(el.id));
    const selectedElementsFromPage = currentPage.elements.filter(el => selectedIds.has(el.id));

    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? { ...p, elements: [...selectedElementsFromPage, ...otherElements] }
          : p
      ),
    });
  };

  // Lock/Unlock element
  const toggleLockElement = (elementId: string) => {
    const element = currentPage?.elements.find(el => el.id === elementId);
    if (!element) return;
    saveHistory();
    updateElement(elementId, { locked: !element.locked });
  };

  // Group selected elements
  const groupElements = () => {
    if (selectedElements.length < 2 || !currentPage) return;
    saveHistory();
    const groupId = `group_${Date.now()}`;
    const updates = selectedElements.map(el => ({
      id: el.id,
      updates: { groupId } as Partial<CrestronElement>,
    }));
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.map((el) => {
                const update = updates.find(u => u.id === el.id);
                return update ? { ...el, ...update.updates } : el;
              }),
            }
          : p
      ),
    });
    // Update selection to reflect group
    setSelectedElements(selectedElements.map(el => ({ ...el, groupId })));
  };

  // Ungroup selected elements
  const ungroupElements = () => {
    if (selectedElements.length === 0 || !currentPage) return;
    saveHistory();
    // Find all groupIds from selected elements
    const groupIds = new Set(selectedElements.map(el => el.groupId).filter(Boolean));
    if (groupIds.size === 0) return;
    
    // Remove groupId from all elements in those groups
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.map((el) =>
                el.groupId && groupIds.has(el.groupId)
                  ? { ...el, groupId: undefined }
                  : el
              ),
            }
          : p
      ),
    });
    setSelectedElements(selectedElements.map(el => ({ ...el, groupId: undefined })));
  };

  // Copy style from selected element
  const copyStyle = () => {
    if (selectedElements.length !== 1) return;
    setCopiedStyle(JSON.parse(JSON.stringify(selectedElements[0].style)));
  };

  // Paste style to selected elements
  const pasteStyle = () => {
    if (!copiedStyle || selectedElements.length === 0 || !currentPage) return;
    saveHistory();
    const updates = selectedElements.map(el => ({
      id: el.id,
      updates: { style: { ...copiedStyle } } as Partial<CrestronElement>,
    }));
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.map((el) => {
                const update = updates.find(u => u.id === el.id);
                return update ? { ...el, ...update.updates } : el;
              }),
            }
          : p
      ),
    });
    setSelectedElements(selectedElements.map(el => ({ ...el, style: { ...copiedStyle } })));
  };

  // Handle device/panel size change
  const handleDeviceChange = (newWidth: number, newHeight: number) => {
    if (!currentPage) return;
    saveHistory();

    const scaledElements = currentPage.elements.map(el =>
      scaleElement(el, currentPage.width, currentPage.height, newWidth, newHeight)
    );

    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              width: newWidth,
              height: newHeight,
              elements: p.elements.map((el, idx) => ({
                ...el,
                ...scaledElements[idx],
              })),
            }
          : p
      ),
    });

    setSelectedElements([]);
  };

  const addPage = (page: Page) => {
    saveHistory();
    setProject({
      ...project,
      pages: [...project.pages, page],
    });
    setCurrentPageId(page.id);
  };

  const deletePage = (pageId: string) => {
    if (project.pages.length === 1) return;

    saveHistory();
    const newPages = project.pages.filter((p) => p.id !== pageId);
    setProject({
      ...project,
      pages: newPages,
    });

    if (currentPageId === pageId) {
      setCurrentPageId(newPages[0].id);
    }
  };

  const updatePage = (pageId: string, updates: Partial<Page>) => {
    saveHistory();
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === pageId ? { ...p, ...updates } : p
      ),
    });
  };

  const handleElementDoubleClick = (element: CrestronElement, screenX: number, screenY: number) => {
    // DOGMA RULE: Doppio click apre sempre una popup di editing vicino all'oggetto
    setQuickEditElement(element);
    setQuickEditPosition({ x: screenX + 10, y: screenY + 10 });
    // Also open Properties sidebar on double-click
    setShowProperties(true);
  };

  const handleInstallExternalLibrary = (library: ExternalLibrary) => {
    setProject({
      ...project,
      externalLibraries: [
        ...(project.externalLibraries || []).map(lib => 
          lib.id === library.id ? { ...lib, installed: false } : lib
        ),
        { ...library, installed: true },
      ],
    });
  };

  // Auto-layout: arrange all elements on current page
  const handleAutoLayout = () => {
    if (!currentPage || currentPage.elements.length === 0) return;
    saveHistory();
    const layouts = autoLayoutElements(currentPage.elements, currentPage.width, currentPage.height);
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.map((el) => {
                const layout = layouts.find(l => l.id === el.id);
                return layout ? { ...el, x: layout.x, y: layout.y, width: layout.width, height: layout.height } : el;
              }),
            }
          : p
      ),
    });
    setSelectedElements([]);
  };

  // Auto-layout selected elements only (within their bounding box area)
  const handleAutoLayoutSelected = () => {
    if (!currentPage || selectedElements.length < 2) return;
    saveHistory();
    const layouts = autoLayoutElements(selectedElements, currentPage.width, currentPage.height);
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.map((el) => {
                const layout = layouts.find(l => l.id === el.id);
                return layout ? { ...el, x: layout.x, y: layout.y, width: layout.width, height: layout.height } : el;
              }),
            }
          : p
      ),
    });
    // Update selected elements with new positions
    setSelectedElements(prev =>
      prev.map(el => {
        const layout = layouts.find(l => l.id === el.id);
        return layout ? { ...el, x: layout.x, y: layout.y, width: layout.width, height: layout.height } : el;
      })
    );
  };

  // Tidy layout: snap to grid and resolve overlaps
  const handleTidyLayout = () => {
    if (!currentPage || currentPage.elements.length === 0) return;
    saveHistory();
    const layouts = tidyLayoutElements(currentPage.elements, currentPage.width, currentPage.height);
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.map((el) => {
                const layout = layouts.find(l => l.id === el.id);
                return layout ? { ...el, x: layout.x, y: layout.y, width: layout.width, height: layout.height } : el;
              }),
            }
          : p
      ),
    });
    setSelectedElements([]);
  };

  // Apply C# join mappings to elements
  const handleApplyJoinMappings = (mappings: any[]) => {
    if (!currentPage) return;
    saveHistory();
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              elements: p.elements.map((el) => {
                const mapping = mappings.find(m => m.elementId === el.id);
                if (mapping) {
                  return {
                    ...el,
                    joins: { ...el.joins, ...mapping.mappedJoins },
                  };
                }
                return el;
              }),
            }
          : p
      ),
    });
  };

  // Apply multiplied join blocks (create elements from blocks)
  const handleApplyMultipliedBlocks = (blocks: any[], templateElement: CrestronElement) => {
    if (!currentPage) return;
    saveHistory();
    const newElements: CrestronElement[] = [];
    const cols = Math.ceil(Math.sqrt(blocks.length));
    
    blocks.forEach((block, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 20 + col * (templateElement.width + 20);
      const y = 20 + row * (templateElement.height + 20);
      
      const joins: Record<string, any> = {};
      block.joins.forEach((j: any) => {
        const key = j.type === 'digital' ? 'press' : j.type === 'analog' ? 'value' : 'text';
        if (!joins[key]) joins[key] = j.number;
      });
      
      newElements.push({
        ...templateElement,
        id: `element_${Date.now()}_${Math.random()}_${i}`,
        name: block.label,
        text: block.label,
        x: Math.min(x, currentPage.width - templateElement.width),
        y: Math.min(y, currentPage.height - templateElement.height),
        joins,
      });
    });
    
    setProject({
      ...project,
      pages: project.pages.map((p) =>
        p.id === currentPageId
          ? { ...p, elements: [...p.elements, ...newElements] }
          : p
      ),
    });
  };

  return (
    <ErrorBoundary>
    <>
    <div className="h-screen flex flex-col bg-zinc-900 text-white overflow-hidden">
      <Toolbar
        project={project}
        setProject={setProject}
        currentPageId={currentPageId}
        showProjectTree={showProjectTree}
        setShowProjectTree={setShowProjectTree}
        showLibrary={showLibrary}
        setShowLibrary={setShowLibrary}
        showProperties={showProperties}
        setShowProperties={setShowProperties}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onCopy={copyElements}
        onPaste={pasteElements}
        canCopy={selectedElements.length > 0}
        canPaste={clipboard.length > 0}
        history={history}
        historyIndex={historyIndex}
        onJumpToHistory={jumpToHistoryState}
        onAutoLayout={handleAutoLayout}
        onImportCSharpJoins={() => setShowCSharpImportModal(true)}
        onShowComponentImport={() => setShowComponentImportModal(true)}
        onShowExternalLibs={() => setShowExternalLibsModal(true)}
      />

      <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center px-2 gap-2 overflow-x-auto">
        <DeviceSelector
          currentWidth={currentPage?.width || 1920}
          currentHeight={currentPage?.height || 1080}
          onDeviceChange={handleDeviceChange}
        />
        
        {/* Alignment Toolbar ALWAYS in Header */}
        <AlignmentToolbar
          selectedElements={selectedElements}
          onAlign={handleAlign}
          onDuplicate={duplicateElements}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onAutoLayoutSelected={handleAutoLayoutSelected}
          onConfigureJoins={() => {
            const propertiesPanel = document.querySelector('.properties-panel');
            if (propertiesPanel) {
              propertiesPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        />
        
        <div className="flex-1" />
        
        {/* Sidebar Toggle Icons */}
        <div className="flex items-center gap-1 mr-2 border-r border-zinc-700 pr-3">
          <button
            onClick={() => setShowProjectTree(!showProjectTree)}
            className={`p-2 rounded transition-colors ${showProjectTree ? 'bg-zinc-700 text-white' : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
            title={showProjectTree ? 'Hide Project Tree' : 'Show Project Tree'}
          >
            <FolderTree className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className={`p-2 rounded transition-colors ${showLibrary ? 'bg-zinc-700 text-white' : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
            title={showLibrary ? 'Hide Component Library' : 'Show Component Library'}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowProperties(!showProperties)}
            className={`p-2 rounded transition-colors ${showProperties ? 'bg-zinc-700 text-white' : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
            title={showProperties ? 'Hide Properties Panel' : 'Show Properties Panel'}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Auto Layout & C# Import */}
        <div className="flex items-center gap-1 mr-2 border-r border-zinc-700 pr-3">
          <button
            onClick={handleAutoLayout}
            disabled={!currentPage || currentPage.elements.length === 0}
            className={`p-2 rounded transition-colors ${
              currentPage && currentPage.elements.length > 0
                ? 'bg-gradient-to-r from-violet-600/20 to-blue-600/20 hover:from-violet-600/40 hover:to-blue-600/40 text-violet-300'
                : 'bg-transparent text-zinc-600 cursor-not-allowed'
            }`}
            title="Auto Layout - Organize all elements"
          >
            <Wand2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCSharpImportModal(true)}
            className="p-2 rounded transition-colors bg-transparent text-zinc-500 hover:text-cyan-300 hover:bg-cyan-600/20"
            title="Import Joins from C# Crestron Project"
          >
            <FileCode2 className="w-4 h-4" />
          </button>
        </div>

        {/* Auto-save status */}
        <div className="flex items-center gap-1.5 mr-2">
          {autoSaveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500/70">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Saved
            </span>
          )}
          {autoSaveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-[10px] text-amber-500/70 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Saving...
            </span>
          )}
          {autoSaveStatus === 'unsaved' && (
            <span className="flex items-center gap-1 text-[10px] text-red-500/70">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Error
            </span>
          )}
        </div>

        {/* Zoom and Grid Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded ${showGrid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            title="Toggle Grid (G)"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(Math.max(zoom / 1.1, 0.1))}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
            }}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm min-w-[60px]"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom(Math.min(zoom * 1.1, 2))}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              // Calculate optimal zoom to fit page in viewport
              if (currentPage) {
                // Get the actual canvas container width dynamically
                const canvasContainer = document.querySelector('.flex-1.relative');
                const viewportWidth = canvasContainer ? canvasContainer.clientWidth - 40 : window.innerWidth - 400;
                const viewportHeight = canvasContainer ? canvasContainer.clientHeight - 40 : window.innerHeight - 200;
                
                // Calculate zoom to fit width and height
                const zoomToFitWidth = viewportWidth / currentPage.width;
                const zoomToFitHeight = viewportHeight / currentPage.height;
                
                // Use the smaller zoom to ensure entire page fits
                const optimalZoom = Math.min(zoomToFitWidth, zoomToFitHeight, 1); // Max 1 (100%)
                
                setZoom(Math.max(0.25, optimalZoom)); // Min 25%
              }
            }}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded"
            title="Adapt to View"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {showProjectTree && (
          <ProjectTree
            project={project}
            currentPageId={currentPageId}
            setCurrentPageId={setCurrentPageId}
            addPage={addPage}
            deletePage={deletePage}
            updatePage={updatePage}
            selectedElement={selectedElements[0] || null}
            setSelectedElement={(el) => setSelectedElements(el ? [el] : [])}
            deleteElement={deleteElement}
          />
        )}

        {showLibrary && (
          <LibrarySidebar
            project={project}
            setProject={setProject}
            onShowExternalLibs={() => setShowExternalLibsModal(true)}
            addElement={addElement}
          />
        )}

        <div className="flex-1 relative min-w-0 overflow-hidden">
          <Canvas
            page={currentPage}
            selectedElements={selectedElements}
            setSelectedElements={setSelectedElements}
            updateElement={updateElement}
            deleteElement={deleteElement}
            deleteMultipleElements={deleteMultipleElements}
            addElement={addElement}
            onCopy={copyElements}
            onPaste={pasteElements}
            onDuplicate={duplicateElements}
            zoom={zoom}
            setZoom={setZoom}
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            snapToGrid={snapToGrid}
            setSnapToGrid={setSnapToGrid}
            onUpdateComplete={saveHistory}
            onDragStart={saveHistory}
            onBringToFront={bringToFront}
            onSendToBack={sendToBack}
            onLockElement={toggleLockElement}
            onGroupElements={groupElements}
            onUngroupElements={ungroupElements}
            onCopyStyle={copyStyle}
            onPasteStyle={pasteStyle}
            hasCopiedStyle={!!copiedStyle}
            onElementDoubleClick={handleElementDoubleClick}
            onAutoLayout={handleAutoLayout}
            onAutoLayoutSelected={handleAutoLayoutSelected}
            onImportCSharpJoins={() => setShowCSharpImportModal(true)}
          />
        </div>

        {/* QuickEditSidebar - In-flow, never overlaps canvas */}
        {quickEditElement && (
          <div className="flex-shrink-0">
            <QuickEditSidebar
              element={quickEditElement}
              pages={project.pages}
              onUpdate={(updates) => {
                updateElement(quickEditElement.id, updates);
                setQuickEditElement({ ...quickEditElement, ...updates });
              }}
              onClose={() => setQuickEditElement(null)}
            />
          </div>
        )}

        {/* Properties Panel - only show when no quick edit open */}
        {showProperties && !quickEditElement && selectedElements.length > 0 && (
          <RightPanel
            selectedElements={selectedElements}
            setSelectedElements={setSelectedElements}
            updateElement={updateElement}
            updateMultipleElements={updateMultipleElements}
            page={currentPage}
          />
        )}
      </div>

      {/* External Libraries Modal */}
      {showExternalLibsModal && (
        <ExternalLibrariesModal
          onClose={() => setShowExternalLibsModal(false)}
          onInstall={handleInstallExternalLibrary}
          installedLibraries={project.externalLibraries || []}
        />
      )}

      {/* C# Import Modal */}
      {showCSharpImportModal && (
        <CSharpImportModal
          onClose={() => setShowCSharpImportModal(false)}
          project={project}
          setProject={setProject}
        />
      )}

      {/* Component Import Modal */}
      {showComponentImportModal && (
        <ComponentImportModal
          isOpen={showComponentImportModal}
          onClose={() => setShowComponentImportModal(false)}
          project={project}
          onImport={(components, targetLibraryId) => {
            // Same logic as LibrarySidebar's handleComponentImport
            setProject((prev: Project) => {
              let libraries = [...prev.libraries];
              let targetLibrary = libraries.find(l => l.id === targetLibraryId);
              if (!targetLibrary) {
                targetLibrary = { id: targetLibraryId, name: 'Imported Components', components: [] };
                libraries.push(targetLibrary);
              }
              const newComponents = components.map((comp: any) => ({
                name: comp.customName,
                type: `custom-${comp.originalName.toLowerCase().replace(/\s+/g, '-')}`,
                icon: comp.icon,
                config: { ...comp.config, componentCode: comp.code, joins: comp.joins },
              }));
              libraries = libraries.map(lib =>
                lib.id === targetLibraryId
                  ? { ...lib, components: [...lib.components, ...newComponents] }
                  : lib
              );
              return { ...prev, libraries };
            });
          }}
        />
      )}
    </div>
    </>
    </ErrorBoundary>
  );
}
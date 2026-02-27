import { useState, useEffect } from 'react';
import { 
  Plus, Upload, Download, Trash2, Package, FolderOpen, X, Edit2, Check,
  Thermometer, Tv, Volume2, Sun, Droplets, Wind, Music, Camera, Lock, Lightbulb, 
  Activity, Film, Box, Layers, Grid, Sparkles, ChevronDown, ChevronRight, Copy, AlertTriangle,
  LayoutDashboard, PanelLeft
} from 'lucide-react';
import { Project, ExternalLibrary, CrestronElement, ComponentCategory } from '../types/crestron';
import { customComponents, isCustomComponent } from './custom/registry';
import { ComponentImportModal } from './ComponentImportModal';
import { ConfirmDialog } from './ConfirmDialog';

interface LibrarySidebarProps {
  project: Project;
  setProject: (project: Project | ((prev: Project) => Project)) => void;
  onShowExternalLibs: () => void;
  addElement: (element: CrestronElement) => void;
}

// Icon map for string-based icon names
const ICON_MAP: Record<string, any> = {
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
  Activity,
  Film,
  Box,
  Grid,
  Sparkles,
  AlertTriangle,
  LayoutDashboard,
  PanelLeft,
};

// Default categories (used if project doesn't have custom ones)
const DEFAULT_CATEGORIES: ComponentCategory[] = [
  {
    id: 'layout',
    name: 'Layout',
    icon: 'LayoutDashboard',
    components: [
      {
        name: 'Header',
        type: 'header',
        icon: 'LayoutDashboard',
        config: { 
          width: 1024, 
          height: 80,
          digitalJoin: 1,
          analogJoin: 1,
          serialJoin: 1,
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
          joins: {
            digital: [
              { number: 1, name: 'Menu Button', direction: 'output' },
              { number: 2, name: 'Settings Button', direction: 'output' },
              { number: 3, name: 'Notifications Button', direction: 'output' },
              { number: 4, name: 'Search Button', direction: 'output' },
            ],
            analog: [
              { number: 1, name: 'Notification Count', direction: 'input' },
            ],
            serial: [
              { number: 1, name: 'Title Text', direction: 'input' },
              { number: 2, name: 'Subtitle Text', direction: 'input' },
              { number: 3, name: 'Logo Text', direction: 'input' },
            ],
          },
        }
      },
      {
        name: 'Sidebar',
        type: 'sidebar',
        icon: 'PanelLeft',
        config: { 
          width: 240, 
          height: 768,
          digitalJoin: 10,
          analogJoin: 10,
          serialJoin: 10,
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
          joins: {
            digital: [
              { number: 10, name: 'Home Button', direction: 'output' },
              { number: 11, name: 'Lighting Button', direction: 'output' },
              { number: 12, name: 'Climate Button', direction: 'output' },
              { number: 13, name: 'Media Button', direction: 'output' },
              { number: 14, name: 'Security Button', direction: 'output' },
              { number: 15, name: 'Settings Button', direction: 'output' },
            ],
            analog: [
              { number: 10, name: 'Selected Index', direction: 'output' },
            ],
            serial: [
              { number: 10, name: 'Footer Text', direction: 'input' },
            ],
          },
        }
      },
    ]
  },
  {
    id: 'climate',
    name: 'Climate Control',
    icon: 'Thermometer',
    components: [
      {
        name: 'Modern Thermostat',
        type: 'thermostat',
        icon: 'Thermometer',
        config: { width: 400, height: 580, advanced: { mode: 'modern' } }
      },
      {
        name: 'Mini Thermostat',
        type: 'mini-thermostat',
        icon: 'Thermometer',
        config: { width: 200, height: 200, style: { shape: 'circular' } }
      },
      {
        name: 'Humidity Control',
        type: 'humidity',
        icon: 'Droplets',
        config: { width: 300, height: 400 }
      },
      {
        name: 'Fan Control',
        type: 'fan',
        icon: 'Wind',
        config: { width: 250, height: 350 }
      },
    ]
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'Tv',
    components: [
      {
        name: 'TV Remote',
        type: 'tv-remote',
        icon: 'Tv',
        config: { width: 300, height: 520 }
      },
      {
        name: 'Media Player',
        type: 'media-player',
        icon: 'Film',
        config: { width: 400, height: 480 }
      },
      {
        name: 'Volume Control',
        type: 'volume-control',
        icon: 'Volume2',
        config: { width: 300, height: 400 }
      },
      {
        name: 'Audio Zone Control',
        type: 'audio-zone',
        icon: 'Music',
        config: { width: 450, height: 550 }
      },
    ]
  },
  {
    id: 'lighting',
    name: 'Lighting',
    icon: 'Lightbulb',
    components: [
      {
        name: 'Dimmer Control',
        type: 'dimmer',
        icon: 'Lightbulb',
        config: { width: 250, height: 400 }
      },
      {
        name: 'RGB Light Control',
        type: 'rgb-light',
        icon: 'Sun',
        config: { width: 400, height: 450 }
      },
      {
        name: 'Scene Selector',
        type: 'scene-selector',
        icon: 'Activity',
        config: { width: 450, height: 300 }
      },
    ]
  },
  {
    id: 'security',
    name: 'Security',
    icon: 'Lock',
    components: [
      {
        name: 'Door Lock',
        type: 'door-lock',
        icon: 'Lock',
        config: { width: 300, height: 450 }
      },
      {
        name: 'Camera View',
        type: 'camera-view',
        icon: 'Camera',
        config: { width: 500, height: 350 }
      },
      {
        name: 'Security Panel',
        type: 'security-panel',
        icon: 'Lock',
        config: { width: 450, height: 600 }
      },
    ]
  }
];

export function LibrarySidebar({ project, setProject, onShowExternalLibs, addElement }: LibrarySidebarProps) {
  const [activeTab, setActiveTab] = useState<'components' | 'libraries'>('components');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('layout');
  const [showDropZone, setShowDropZone] = useState(false);
  const [editingLibraryId, setEditingLibraryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');
  
  // Category editing
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [creatingNewCategory, setCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Library expansion
  const [expandedLibraryId, setExpandedLibraryId] = useState<string | null>(null);
  
  // Component Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Confirm dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'delete-category' | 'delete-library';
    id: string;
    name: string;
  } | null>(null);

  // â”€â”€ Add Component to Category â”€â”€
  const [addingComponentToCategoryId, setAddingComponentToCategoryId] = useState<string | null>(null);
  const [newCompName, setNewCompName] = useState('');
  const [newCompType, setNewCompType] = useState<string>('button');
  const [newCompIcon, setNewCompIcon] = useState('Lightbulb');
  const [newCompWidth, setNewCompWidth] = useState(200);
  const [newCompHeight, setNewCompHeight] = useState(100);

  // Get categories from project or use defaults
  const categories = project.componentCategories || DEFAULT_CATEGORIES;

  // Add Custom Components category dynamically
  const categoriesWithCustom = [
    ...categories,
    // Auto-generate Custom Components category from registry
    ...(customComponents.length > 0 ? [{
      id: 'custom',
      name: 'ðŸŽ¨ Custom Components',
      icon: 'Sparkles',
      components: customComponents.map(cc => ({
        name: cc.name,
        type: cc.type,
        icon: cc.icon,
        config: cc.defaultProps,
      }))
    }] : [])
  ];

  // AUTO-MIGRATE: Add Layout category if missing
  useEffect(() => {
    if (!project.componentCategories) {
      setProject(prev => ({
        ...prev,
        componentCategories: DEFAULT_CATEGORIES
      }));
    } else {
      // Check if Layout category exists
      const hasLayoutCategory = project.componentCategories.some(c => c.id === 'layout');
      if (!hasLayoutCategory) {
        // Add Layout category at the beginning
        const layoutCategory = DEFAULT_CATEGORIES.find(c => c.id === 'layout');
        if (layoutCategory) {
          setProject(prev => ({
            ...prev,
            componentCategories: [layoutCategory, ...(prev.componentCategories || [])]
          }));
        }
      }
    }
  }, []);

  const handleComponentClick = (component: any) => {
    const newElement: CrestronElement = {
      id: `element_${Date.now()}`,
      type: component.type as any,
      name: component.name,
      x: 100,
      y: 100,
      width: component.config.width,
      height: component.config.height,
      joins: component.config.joins || {},
      style: component.config.style || {},
      // Pass through all relevant config properties
      ...(component.config.digitalJoin !== undefined && { digitalJoin: component.config.digitalJoin }),
      ...(component.config.analogJoin !== undefined && { analogJoin: component.config.analogJoin }),
      ...(component.config.serialJoin !== undefined && { serialJoin: component.config.serialJoin }),
      ...(component.config.config && { config: component.config.config }),
    };
    addElement(newElement);
  };

  const handleComponentDragStart = (e: React.DragEvent, component: any) => {
    console.log('ðŸŽ¨ Drag started:', component);
    // Include name in config for proper rendering
    const config = {
      ...component.config,
      name: component.name,
    };
    e.dataTransfer.setData('componentType', component.type);
    e.dataTransfer.setData('componentConfig', JSON.stringify(config));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCreateCategory = () => {
    setCreatingNewCategory(true);
  };

  const handleSaveNewCategory = () => {
    if (!newCategoryName) return;

    const newCategory: ComponentCategory = {
      id: `category_${Date.now()}`,
      name: newCategoryName,
      icon: 'Box',
      components: []
    };

    setProject(prev => ({
      ...prev,
      componentCategories: [...(prev.componentCategories || DEFAULT_CATEGORIES), newCategory]
    }));

    setCreatingNewCategory(false);
    setNewCategoryName('');
    setActiveCategoryId(newCategory.id);
  };

  const handleEditCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setEditingCategoryId(categoryId);
      setEditingCategoryName(category.name);
    }
  };

  const handleSaveCategoryName = () => {
    if (!editingCategoryName) return;

    setProject(prev => ({
      ...prev,
      componentCategories: (prev.componentCategories || DEFAULT_CATEGORIES).map(c =>
        c.id === editingCategoryId ? { ...c, name: editingCategoryName } : c
      )
    }));

    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleDeleteCategory = (categoryId: string) => {
    setConfirmDialog({ type: 'delete-category', id: categoryId, name: categories.find(c => c.id === categoryId)?.name || 'Category' });
  };

  const handleImportLibrary = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.crestron-library,.zip';
    input.multiple = true;
    
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      Array.from(files).forEach(file => {
        if (file.name.endsWith('.zip')) {
          // Handle ZIP files
          handleZipImport(file);
        } else {
          // Handle JSON/crestron-library files
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const library = JSON.parse(event.target?.result as string);
              if (!library.id) library.id = `library_${Date.now()}_${Math.random()}`;
              if (!library.name) library.name = file.name.replace(/\.(json|crestron-library)$/, '');
              if (!library.components) library.components = [];
              
              setProject(prev => ({
                ...prev,
                libraries: [...prev.libraries, library],
              }));
            } catch (error) {
              alert(`Error importing ${file.name}: Invalid library file`);
            }
          };
          reader.readAsText(file);
        }
      });
    };
    
    input.click();
  };

  // Handle ZIP file import (for UI kits like Catalyst)
  const handleZipImport = async (file: File) => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Look for manifest.json or library.json
      let manifest = null;
      const manifestFile = zipContent.file('manifest.json') || zipContent.file('library.json');
      
      if (manifestFile) {
        const manifestText = await manifestFile.async('text');
        manifest = JSON.parse(manifestText);
      }
      
      // Scan for TSX/JSX files
      const componentFiles: string[] = [];
      zipContent.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && (relativePath.endsWith('.tsx') || relativePath.endsWith('.jsx'))) {
          componentFiles.push(relativePath);
        }
      });
      
      // Create library from manifest or auto-generate
      const library = {
        id: manifest?.id || `library_${Date.now()}`,
        name: manifest?.name || file.name.replace(/\.zip$/, ''),
        description: manifest?.description || `Imported from ${file.name}`,
        components: manifest?.components || componentFiles.map(path => {
          const fileName = path.split('/').pop()?.replace(/\.(tsx|jsx)$/, '') || 'Component';
          return {
            name: fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/[-_]/g, ' '),
            type: fileName.toLowerCase().replace(/[-_]/g, '-'),
            icon: 'Box',
            config: {
              width: 300,
              height: 200,
              source: 'external',
              filePath: path,
            }
          };
        })
      };
      
      setProject(prev => ({
        ...prev,
        libraries: [...prev.libraries, library],
      }));
      
      // Expand the newly imported library automatically
      setExpandedLibraryId(library.id);
      
      console.log('âœ… Library imported:', library);
      alert(`âœ… Imported "${library.name}"\n\n${library.components.length} components found\n\nExpand in Libraries tab to use them!`);
    } catch (error) {
      console.error('ZIP import error:', error);
      alert(`âŒ Error importing ${file.name}:\n\n${error instanceof Error ? error.message : 'Invalid ZIP file'}`);
    }
  };

  const handleExportLibrary = (library: any) => {
    const libraryData = JSON.stringify(library, null, 2);
    const blob = new Blob([libraryData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${library.name.replace(/\s+/g, '_')}.crestron-library`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteLibrary = (libraryId: string) => {
    setConfirmDialog({ type: 'delete-library', id: libraryId, name: project.libraries.find(l => l.id === libraryId)?.name || 'Library' });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setShowDropZone(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setShowDropZone(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setShowDropZone(false);

    const files = e.dataTransfer.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.name.endsWith('.zip')) {
        // Handle ZIP files
        handleZipImport(file);
      } else if (file.name.endsWith('.json') || file.name.endsWith('.crestron-library')) {
        // Handle JSON/crestron-library files
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const library = JSON.parse(event.target?.result as string);
            if (!library.id) library.id = `library_${Date.now()}_${Math.random()}`;
            if (!library.name) library.name = file.name.replace(/\.(json|crestron-library)$/, '');
            if (!library.components) library.components = [];
            
            setProject(prev => ({
              ...prev,
              libraries: [...prev.libraries, library],
            }));
          } catch (error) {
            alert(`Error importing ${file.name}: Invalid library file`);
          }
        };
        reader.readAsText(file);
      }
    });
  };

  const handleCreateLibrary = () => {
    setCreatingNew(true);
  };

  const handleSaveNewLibrary = () => {
    if (!newLibraryName) return;

    const newLibrary = {
      id: `library_${Date.now()}`,
      name: newLibraryName,
      components: [],
    };

    setProject(prev => ({
      ...prev,
      libraries: [...prev.libraries, newLibrary],
    }));

    setCreatingNew(false);
    setNewLibraryName('');
  };

  const handleEditLibrary = (libraryId: string) => {
    const library = project.libraries.find(l => l.id === libraryId);
    if (library) {
      setEditingLibraryId(libraryId);
      setEditingName(library.name);
    }
  };

  const handleSaveLibraryName = () => {
    if (!editingName) return;

    setProject(prev => ({
      ...prev,
      libraries: prev.libraries.map(l => 
        l.id === editingLibraryId ? { ...l, name: editingName } : l
      ),
    }));

    setEditingLibraryId(null);
    setEditingName('');
  };

  // Handle component import from modal
  const handleComponentImport = (components: any[], targetLibraryId: string) => {
    setProject(prev => {
      let libraries = [...prev.libraries];
      
      // Find or create target library
      let targetLibrary = libraries.find(l => l.id === targetLibraryId);
      
      if (!targetLibrary) {
        // Create new library
        targetLibrary = {
          id: targetLibraryId,
          name: 'Imported Components',
          components: []
        };
        libraries.push(targetLibrary);
      }

      // Add imported components to library
      const newComponents = components.map(comp => ({
        name: comp.customName,
        type: `custom-${comp.originalName.toLowerCase().replace(/\s+/g, '-')}`,
        icon: comp.icon,
        config: {
          ...comp.config,
          componentCode: comp.code, // Save original code
          joins: comp.joins,
        }
      }));

      // Update library with new components
      libraries = libraries.map(lib => 
        lib.id === targetLibraryId
          ? { ...lib, components: [...lib.components, ...newComponents] }
          : lib
      );

      return { ...prev, libraries };
    });

    console.log('âœ… Imported components:', components);
    alert(`âœ… Imported ${components.length} component${components.length !== 1 ? 's' : ''}!`);
  };

  const activeCategory = categoriesWithCustom.find(c => c.id === activeCategoryId);
  const activeComponents = activeCategory?.components || [];

  // Available base element types for the "Add Component" form
  const BASE_ELEMENT_TYPES = [
    { value: 'button', label: 'Button' },
    { value: 'slider', label: 'Slider' },
    { value: 'text', label: 'Text' },
    { value: 'image', label: 'Image' },
    { value: 'gauge', label: 'Gauge' },
    { value: 'list', label: 'List' },
    { value: 'subpage', label: 'Subpage' },
    { value: 'keypad', label: 'Keypad' },
  ];

  const AVAILABLE_ICONS = [
    'Lightbulb', 'Lamp', 'LampFloor', 'Sun', 'Sunset', 'Moon', 'Sparkles',
    'Thermometer', 'Droplets', 'Wind', 'Flame', 'Snowflake', 'Cloud',
    'Home', 'Sofa', 'Bed', 'BedDouble', 'Bath', 'ChefHat', 'Armchair',
    'Tv', 'Monitor', 'Music', 'Speaker', 'Headphones', 'Film', 'Play',
    'Camera', 'Shield', 'Lock', 'Power', 'Zap',
    'Plus', 'Minus', 'Volume1', 'Volume2',
    'DoorOpen', 'DoorClosed', 'Car', 'Trees', 'TreePine', 'Fence', 'Warehouse',
    'LayoutGrid', 'Layers', 'SlidersHorizontal', 'Gauge', 'Hash',
    'Menu', 'ArrowLeft', 'ChevronDown', 'ChevronUp',
    'RotateCcw', 'Wrench', 'CheckCircle', 'CircleDot', 'Waves', 'Wine',
    'ToggleRight', 'ToggleLeft', 'ShieldAlert', 'ShieldCheck', 'ShieldOff',
    'Briefcase', 'UtensilsCrossed', 'Baby', 'Sunrise',
  ];

  const handleSaveNewComponent = () => {
    if (!newCompName.trim() || !addingComponentToCategoryId) return;

    const newComponent = {
      name: newCompName.trim(),
      type: newCompType,
      icon: newCompIcon,
      config: {
        width: newCompWidth,
        height: newCompHeight,
        joins: newCompType === 'button' 
          ? { press: { type: 'digital' as const, number: 1, description: `${newCompName} press` } }
          : newCompType === 'slider'
          ? { value: { type: 'analog' as const, number: 1, description: `${newCompName} value` } }
          : newCompType === 'text'
          ? { text: { type: 'serial' as const, number: 1, description: `${newCompName} text` } }
          : {},
      },
    };

    setProject((prev: Project) => ({
      ...prev,
      componentCategories: (prev.componentCategories || DEFAULT_CATEGORIES).map(c =>
        c.id === addingComponentToCategoryId
          ? { ...c, components: [...c.components, newComponent] }
          : c
      ),
    }));

    // Reset form
    setAddingComponentToCategoryId(null);
    setNewCompName('');
    setNewCompType('button');
    setNewCompIcon('Lightbulb');
    setNewCompWidth(200);
    setNewCompHeight(100);
  };

  const handleDeleteComponentFromCategory = (categoryId: string, compIndex: number) => {
    setProject((prev: Project) => ({
      ...prev,
      componentCategories: (prev.componentCategories || DEFAULT_CATEGORIES).map(c =>
        c.id === categoryId
          ? { ...c, components: c.components.filter((_, i) => i !== compIndex) }
          : c
      ),
    }));
  };

  return (
    <div className="w-64 flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('components')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'components'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
          }`}
        >
          <Box className="w-4 h-4" />
          Components
        </button>
        <button
          onClick={() => setActiveTab('libraries')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'libraries'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Libraries
        </button>
      </div>

      {/* CRESTRON COMPONENTS TAB */}
      {activeTab === 'components' && (
        <>
          {/* Category Tabs */}
          <div className="p-3 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Categories</h3>
              <button
                onClick={handleCreateCategory}
                className="p-1 hover:bg-zinc-800 rounded"
                title="Add Category"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {/* New Category Creation */}
              {creatingNewCategory && (
                <div className="p-2 bg-blue-950/30 rounded border-2 border-blue-500 border-dashed">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveNewCategory();
                        if (e.key === 'Escape') {
                          setCreatingNewCategory(false);
                          setNewCategoryName('');
                        }
                      }}
                      placeholder="Category Name"
                      className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveNewCategory}
                      className="p-1 bg-blue-600 hover:bg-blue-700 rounded"
                      title="Create"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setCreatingNewCategory(false);
                        setNewCategoryName('');
                      }}
                      className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {categoriesWithCustom.map((cat) => {
                const Icon = ICON_MAP[cat.icon] || Box;
                const isActive = activeCategoryId === cat.id;
                
                return (
                  <div
                    key={cat.id}
                    className={`group px-3 py-2 rounded flex items-center gap-2 transition-all text-sm ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {editingCategoryId === cat.id ? (
                      <>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCategoryName();
                            if (e.key === 'Escape') {
                              setEditingCategoryId(null);
                              setEditingCategoryName('');
                            }
                          }}
                          className="flex-1 px-1 py-0.5 bg-zinc-900 rounded text-xs"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveCategoryName}
                          className="p-0.5 hover:bg-black/30 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <button
                          onClick={() => setActiveCategoryId(cat.id)}
                          className="flex-1 text-left font-medium"
                        >
                          {cat.name}
                        </button>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCategory(cat.id);
                            }}
                            className="p-0.5 hover:bg-black/30 rounded"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat.id);
                            }}
                            className="p-0.5 hover:bg-red-600 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Components List */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeComponents.length === 0 ? (
              <div className="text-center py-8">
                <Box className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                <p className="text-xs text-zinc-500">No components in this category</p>
                <p className="text-xs text-zinc-600 mt-1">Add components from Libraries tab</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeComponents.map((component, index) => {
                  const Icon = ICON_MAP[component.icon] || Box;
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleComponentDragStart(e, component)}
                      onClick={() => handleComponentClick(component)}
                      className="group bg-zinc-800 hover:bg-zinc-750 rounded-lg p-3 cursor-pointer transition-all border border-zinc-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white group-hover:text-blue-300 transition-colors font-medium truncate">
                            {component.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {component.config.width} Ã— {component.config.height}
                          </p>
                        </div>
                        {/* Delete component from category */}
                        {activeCategoryId !== 'custom' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteComponentFromCategory(activeCategoryId, index);
                            }}
                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-600 rounded transition-all"
                            title="Remove from category"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* â”€â”€ Add Component to Category â”€â”€ */}
            {activeCategoryId !== 'custom' && (
              <>
                {addingComponentToCategoryId === activeCategoryId ? (
                  <div className="mt-3 p-3 bg-indigo-950/30 rounded-lg border-2 border-indigo-500/50 border-dashed space-y-2">
                    <p className="text-xs text-indigo-300 mb-2">New Element</p>
                    <input
                      type="text"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      placeholder="Component Name"
                      className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded text-xs text-white"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNewComponent(); if (e.key === 'Escape') setAddingComponentToCategoryId(null); }}
                    />
                    <div className="flex gap-2">
                      <select
                        value={newCompType}
                        onChange={(e) => setNewCompType(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded text-xs text-white"
                      >
                        {BASE_ELEMENT_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <select
                        value={newCompIcon}
                        onChange={(e) => setNewCompIcon(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded text-xs text-white"
                      >
                        {AVAILABLE_ICONS.map(ic => (
                          <option key={ic} value={ic}>{ic}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500">Width</label>
                        <input type="number" value={newCompWidth} onChange={(e) => setNewCompWidth(Number(e.target.value))} min={30} max={2000}
                          className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-xs text-white" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500">Height</label>
                        <input type="number" value={newCompHeight} onChange={(e) => setNewCompHeight(Number(e.target.value))} min={20} max={2000}
                          className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-xs text-white" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={handleSaveNewComponent} disabled={!newCompName.trim()}
                        className="flex-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" /> Add
                      </button>
                      <button onClick={() => setAddingComponentToCategoryId(null)}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingComponentToCategoryId(activeCategoryId)}
                    className="mt-3 w-full px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-dashed border-indigo-500/40 rounded-lg text-xs text-indigo-300 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Element to Category
                  </button>
                )}
              </>
            )}

            {/* Info Tip */}
            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <p className="text-xs text-blue-300 leading-relaxed">
                <strong>ðŸ’¡ Tip:</strong> Click or drag components to canvas. Use "Add Element" to define custom reusable components!
              </p>
            </div>
          </div>
        </>
      )}
      
      {/* MY LIBRARIES TAB */}
      {activeTab === 'libraries' && (
        <>
          {/* Library Actions */}
          <div className="p-3 border-b border-zinc-800">
            <div className="space-y-2">
              <button
                onClick={handleCreateLibrary}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-2 justify-center"
              >
                <Plus className="w-4 h-4" />
                New Library
              </button>
              
              <button
                onClick={() => setShowImportModal(true)}
                className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded text-sm flex items-center gap-2 justify-center"
              >
                <Sparkles className="w-4 h-4" />
                Import Components
              </button>

              <button
                onClick={handleImportLibrary}
                className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2 justify-center"
              >
                <Upload className="w-4 h-4" />
                Import Files
              </button>

              <button
                onClick={onShowExternalLibs}
                className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded text-sm flex items-center gap-2 justify-center"
              >
                <Package className="w-4 h-4" />
                Browse Libraries
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Component Import Modal */}
      <ComponentImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        project={project}
        onImport={handleComponentImport}
      />
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog !== null}
        title={confirmDialog?.type === 'delete-category' ? 'Delete Category' : 'Delete Library'}
        message={`Are you sure you want to delete "${confirmDialog?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          if (confirmDialog?.type === 'delete-category') {
            const remainingCategories = categories.filter(c => c.id !== confirmDialog.id);
            setProject(prev => ({
              ...prev,
              componentCategories: remainingCategories
            }));
            // Switch to first category if current is deleted
            if (activeCategoryId === confirmDialog.id && remainingCategories.length > 0) {
              setActiveCategoryId(remainingCategories[0].id);
            }
          } else if (confirmDialog?.type === 'delete-library') {
            setProject(prev => ({
              ...prev,
              libraries: prev.libraries.filter((l) => l.id !== confirmDialog.id),
            }));
          }
          setConfirmDialog(null);
        }}
      />
    </div>
  );
}

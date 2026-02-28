import { useState } from 'react';
import { Project, Page, CrestronElement } from '../types/crestron';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  FileText,
  Layers,
  Edit2,
  Settings,
} from 'lucide-react';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { PageSettingsModal } from './PageSettingsModal';

interface ProjectTreeProps {
  project: Project;
  currentPageId: string;
  setCurrentPageId: (id: string) => void;
  addPage: (page: Page) => void;
  deletePage: (id: string) => void;
  updatePage: (id: string, updates: Partial<Page>) => void;
  selectedElement: CrestronElement | null;
  setSelectedElement: (element: CrestronElement | null) => void;
  onElementDoubleClick?: (element: CrestronElement, screenX: number, screenY: number) => void;
  deleteElement?: (elementId: string) => void;
}

export function ProjectTree({
  project,
  currentPageId,
  setCurrentPageId,
  addPage,
  deletePage,
  updatePage,
  selectedElement,
  setSelectedElement,
  onElementDoubleClick,
  deleteElement,
}: ProjectTreeProps) {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set([currentPageId]));
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    element: CrestronElement;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    pageId: string;
    pageName: string;
  } | null>(null);
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);

  const togglePage = (pageId: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  const handleAddPage = () => {
    const newPage: Page = {
      id: `page_${Date.now()}`,
      name: `Page ${project.pages.length + 1}`,
      elements: [],
      width: 1920,
      height: 1080,
    };
    addPage(newPage);
    setExpandedPages(new Set([...expandedPages, newPage.id]));
  };

  const startEditing = (page: Page) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const finishEditing = () => {
    if (editingPageId && editingName.trim()) {
      updatePage(editingPageId, { name: editingName.trim() });
    }
    setEditingPageId(null);
    setEditingName('');
  };

  const currentPage = project.pages.find((p) => p.id === currentPageId);

  return (
    <>
      <div className="w-48 bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <h2>Project Tree</h2>
          <button
            onClick={handleAddPage}
            className="p-1 hover:bg-zinc-800 rounded"
            title="Add Page"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Pages */}
          <div className="p-2">
            {project.pages.map((page) => {
              const isExpanded = expandedPages.has(page.id);
              const isActive = page.id === currentPageId;

              return (
                <div key={page.id} className="mb-1">
                  <div
                    className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer group ${
                      isActive ? 'bg-blue-600' : 'hover:bg-zinc-800'
                    }`}
                  >
                    <button
                      onClick={() => togglePage(page.id)}
                      className="p-0.5 hover:bg-zinc-700 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>

                    <FileText className="w-4 h-4" />

                    {editingPageId === page.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={finishEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishEditing();
                          if (e.key === 'Escape') {
                            setEditingPageId(null);
                            setEditingName('');
                          }
                        }}
                        autoFocus
                        className="flex-1 px-1 py-0 bg-zinc-700 border border-zinc-600 rounded text-sm"
                      />
                    ) : (
                      <span
                        className="flex-1 text-sm truncate"
                        onClick={() => setCurrentPageId(page.id)}
                      >
                        {page.name}
                      </span>
                    )}

                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(page);
                        }}
                        className="p-0.5 hover:bg-zinc-700 rounded"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {project.pages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ pageId: page.id, pageName: page.name });
                          }}
                          className="p-0.5 hover:bg-zinc-700 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPage(page);
                          setShowPageSettings(true);
                        }}
                        className="p-0.5 hover:bg-zinc-700 rounded"
                        title="Settings"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Elements */}
                  {isExpanded && page.elements.length > 0 && (
                    <div className="ml-6 mt-1 space-y-1">
                      {page.elements.map((element) => (
                        <div
                          key={element.id}
                          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${
                            selectedElement?.id === element.id
                              ? 'bg-blue-600'
                              : 'hover:bg-zinc-800'
                          }`}
                          onClick={() => {
                            setCurrentPageId(page.id);
                            setSelectedElement(element);
                          }}
                          onDoubleClick={(e) => {
                            if (onElementDoubleClick) {
                              onElementDoubleClick(element, e.clientX, e.clientY);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, element });
                          }}
                        >
                          <Layers className="w-3 h-3" />
                          <span className="truncate">{element.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && page.elements.length === 0 && (
                    <div className="ml-6 mt-1 px-2 py-1 text-xs text-zinc-500">
                      No elements
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Page Info */}
        {currentPage && (
          <div className="p-3 border-t border-zinc-800 text-xs text-zinc-400">
            <div className="mb-1">
              <span className="text-zinc-500">Size:</span> {currentPage.width} x {currentPage.height}
            </div>
            <div>
              <span className="text-zinc-500">Elements:</span> {currentPage.elements.length}
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            if (onElementDoubleClick) {
              onElementDoubleClick(contextMenu.element, contextMenu.x, contextMenu.y);
            }
          }}
          onDelete={() => {
            if (deleteElement) {
              deleteElement(contextMenu.element.id);
            }
          }}
        />
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Page"
          message={`Are you sure you want to delete the page "${confirmDelete.pageName}"?`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            deletePage(confirmDelete.pageId);
            setConfirmDelete(null);
          }}
        />
      )}

      {/* Page Settings Modal */}
      {showPageSettings && selectedPage && (
        <PageSettingsModal
          page={selectedPage}
          onClose={() => setShowPageSettings(false)}
          onUpdate={(updates) => updatePage(selectedPage.id, updates)}
        />
      )}
    </>
  );
}
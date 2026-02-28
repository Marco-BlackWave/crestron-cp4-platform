import { useEffect, useRef } from 'react';
import { 
  Edit3, Trash2, Copy, Clipboard, Layers, ArrowUp, ArrowDown, 
  Lock, Unlock, Eye, EyeOff, AlignLeft, Pipette, FlipHorizontal2,
  Group, Ungroup, PaintBucket, Wand2, FileCode2, BookmarkPlus
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onLock?: () => void;
  onToggleVisibility?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onCopyStyle?: () => void;
  onPasteStyle?: () => void;
  onAutoLayout?: () => void;
  onAutoLayoutSelected?: () => void;
  onImportCSharpJoins?: () => void;
  onSaveToLibrary?: () => void;
  selectedCount?: number;
  isLocked?: boolean;
  isVisible?: boolean;
  isGrouped?: boolean;
  canPaste?: boolean;
  canPasteStyle?: boolean;
  totalElements?: number;
}

export function ContextMenu({ 
  x, y, onClose, onEdit, onDelete, 
  onCopy, onPaste, onDuplicate,
  onBringToFront, onSendToBack,
  onLock, onToggleVisibility,
  onGroup, onUngroup,
  onCopyStyle, onPasteStyle,
  onAutoLayout, onAutoLayoutSelected,
  onImportCSharpJoins,
  onSaveToLibrary,
  selectedCount = 1,
  isLocked = false,
  isVisible = true,
  isGrouped = false,
  canPaste = false,
  canPasteStyle = false,
  totalElements = 0,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      if (rect.right > vw) {
        menuRef.current.style.left = `${vw - rect.width - 8}px`;
      }
      if (rect.bottom > vh) {
        menuRef.current.style.top = `${vh - rect.height - 8}px`;
      }
    }
  }, [x, y]);

  const MenuItem = ({ 
    icon: Icon, label, shortcut, onClick, danger, disabled 
  }: { 
    icon: any; label: string; shortcut?: string; onClick?: () => void; danger?: boolean; disabled?: boolean 
  }) => (
    <button
      className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2.5 transition-colors ${
        disabled 
          ? 'text-zinc-600 cursor-not-allowed' 
          : danger 
            ? 'text-red-400 hover:bg-red-500/10' 
            : 'text-zinc-300 hover:bg-zinc-700/80'
      }`}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        onClose();
      }}
      disabled={disabled}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-[10px] text-zinc-600 ml-4">{shortcut}</span>}
    </button>
  );

  const Separator = () => <div className="h-px bg-zinc-700/50 my-1" />;

  return (
    <div
      ref={menuRef}
      className="fixed bg-zinc-800/95 backdrop-blur-xl border border-zinc-600/50 rounded-xl shadow-2xl shadow-black/50 py-1.5 z-[10000] min-w-[200px] overflow-hidden"
      style={{ left: x, top: y }}
    >
      {/* Header - selection info */}
      <div className="px-3 py-1.5 text-[10px] text-zinc-500 border-b border-zinc-700/50 mb-1">
        {selectedCount > 1 ? `${selectedCount} elements selected` : 'Element'}
      </div>

      {/* Edit */}
      {onEdit && (
        <MenuItem 
          icon={Edit3} 
          label={selectedCount > 1 ? `Edit ${selectedCount} Elements` : 'Edit Properties'} 
          shortcut="Dbl-click"
          onClick={onEdit} 
        />
      )}

      {/* Copy/Paste/Duplicate */}
      {(onCopy || onPaste || onDuplicate) && (
        <>
          <Separator />
          {onCopy && <MenuItem icon={Copy} label="Copy" shortcut="Ctrl+C" onClick={onCopy} />}
          {onPaste && <MenuItem icon={Clipboard} label="Paste" shortcut="Ctrl+V" onClick={onPaste} disabled={!canPaste} />}
          {onDuplicate && <MenuItem icon={FlipHorizontal2} label="Duplicate" shortcut="Ctrl+D" onClick={onDuplicate} />}
        </>
      )}

      {/* Layer Order */}
      {(onBringToFront || onSendToBack) && (
        <>
          <Separator />
          {onBringToFront && <MenuItem icon={ArrowUp} label="Bring to Front" onClick={onBringToFront} />}
          {onSendToBack && <MenuItem icon={ArrowDown} label="Send to Back" onClick={onSendToBack} />}
        </>
      )}

      {/* Lock/Unlock */}
      {onLock && (
        <>
          <Separator />
          <MenuItem 
            icon={isLocked ? Unlock : Lock} 
            label={isLocked ? 'Unlock Element' : 'Lock Element'} 
            onClick={onLock} 
          />
        </>
      )}

      {/* Group/Ungroup */}
      {(onGroup || onUngroup) && (
        <>
          <Separator />
          {onGroup && !isGrouped && (
            <MenuItem 
              icon={Group} 
              label={`Group ${selectedCount} Elements`} 
              shortcut="Ctrl+G"
              onClick={onGroup} 
            />
          )}
          {onUngroup && isGrouped && (
            <MenuItem 
              icon={Ungroup} 
              label="Ungroup" 
              shortcut="Ctrl+Shift+G"
              onClick={onUngroup} 
            />
          )}
        </>
      )}

      {/* Copy/Paste Style */}
      {(onCopyStyle || onPasteStyle) && (
        <>
          <Separator />
          {onCopyStyle && <MenuItem icon={PaintBucket} label="Copy Style" shortcut="Ctrl+Shift+C" onClick={onCopyStyle} />}
          {onPasteStyle && <MenuItem icon={PaintBucket} label="Paste Style" shortcut="Ctrl+Shift+V" onClick={onPasteStyle} disabled={!canPasteStyle} />}
        </>
      )}

      {/* Auto Layout */}
      {(onAutoLayout || onAutoLayoutSelected) && (
        <>
          <Separator />
          {onAutoLayout && <MenuItem icon={Wand2} label="Auto Layout" shortcut="Ctrl+L" onClick={onAutoLayout} />}
          {onAutoLayoutSelected && <MenuItem icon={Wand2} label="Auto Layout Selected" shortcut="Ctrl+Shift+L" onClick={onAutoLayoutSelected} />}
        </>
      )}

      {/* Import C# Joins */}
      {onImportCSharpJoins && (
        <>
          <Separator />
          <MenuItem 
            icon={FileCode2} 
            label="Import C# Joins" 
            shortcut="Ctrl+J"
            onClick={onImportCSharpJoins} 
          />
        </>
      )}

      {/* Save to Library */}
      {onSaveToLibrary && (
        <>
          <Separator />
          <MenuItem 
            icon={BookmarkPlus} 
            label="Save to Library" 
            shortcut="Ctrl+S"
            onClick={onSaveToLibrary} 
          />
        </>
      )}

      {/* Delete */}
      <Separator />
      <MenuItem 
        icon={Trash2} 
        label={selectedCount > 1 ? `Delete ${selectedCount} Elements` : 'Delete'} 
        shortcut="Del"
        onClick={onDelete} 
        danger 
      />
    </div>
  );
}
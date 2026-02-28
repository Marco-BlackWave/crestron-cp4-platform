import {
  AlignLeft,
  AlignRight,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Copy,
  Layers,
  FlipVertical2,
  Link2,
  Wand2,
} from 'lucide-react';
import { CrestronElement } from '../types/crestron';

interface AlignmentToolbarProps {
  selectedElements: CrestronElement[];
  onAlign: (type: string) => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onConfigureJoins?: () => void;
  onAutoLayoutSelected?: () => void;
}

export function AlignmentToolbar({
  selectedElements,
  onAlign,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onConfigureJoins,
  onAutoLayoutSelected,
}: AlignmentToolbarProps) {
  const isMultiSelect = selectedElements.length > 1;
  const hasSelection = selectedElements.length > 0;

  return (
    <div
      className="flex items-center gap-1"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {hasSelection && (
        <>
          <div className="text-xs text-zinc-400 px-2">
            {selectedElements.length} selected
          </div>

          <div className="w-px h-6 bg-zinc-700 mx-1" />
        </>
      )}

      {/* Alignment Tools - only show for multiple selection */}
      {isMultiSelect && (
        <>
          <button
            onClick={() => onAlign('left')}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => onAlign('centerH')}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Align Center Horizontal"
          >
            <AlignCenterHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={() => onAlign('right')}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-zinc-700 mx-1" />

          <button
            onClick={() => onAlign('top')}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Align Top"
          >
            <ArrowUpToLine className="w-4 h-4" />
          </button>

          <button
            onClick={() => onAlign('centerV')}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Align Center Vertical"
          >
            <AlignCenterVertical className="w-4 h-4" />
          </button>

          <button
            onClick={() => onAlign('bottom')}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Align Bottom"
          >
            <ArrowDownToLine className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-zinc-700 mx-1" />

          <button
            onClick={() => onAlign('distributeH')}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Distribute Horizontally"
          >
            <AlignHorizontalSpaceAround className="w-4 h-4" />
          </button>

          <button
            onClick={() => onAlign('distributeV')}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Distribute Vertically"
          >
            <AlignVerticalSpaceAround className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-zinc-700 mx-1" />
        </>
      )}

      {/* Copy/Duplicate */}
      {hasSelection && (
        <>
          <button
            onClick={onDuplicate}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-zinc-700 mx-1" />

          {/* Layering */}
          <button
            onClick={onBringToFront}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Bring to Front"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={onSendToBack}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
            title="Send to Back"
          >
            <FlipVertical2 className="w-4 h-4" />
          </button>

          {/* Configure Joins */}
          {onConfigureJoins && (
            <>
              <div className="w-px h-6 bg-zinc-700 mx-1" />
              <button
                onClick={onConfigureJoins}
                className="p-2 hover:bg-zinc-800 rounded transition-all bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 relative"
                title="Configure Joins - Look in Properties Panel on the right →"
              >
                <Link2 className="w-4 h-4 text-blue-400" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </button>
            </>
          )}

          {/* Auto Layout Selected */}
          {onAutoLayoutSelected && isMultiSelect && (
            <>
              <div className="w-px h-6 bg-zinc-700 mx-1" />
              <button
                onClick={onAutoLayoutSelected}
                className="p-2 hover:bg-zinc-800 rounded transition-colors bg-gradient-to-r from-violet-600/10 to-blue-600/10 hover:from-violet-600/30 hover:to-blue-600/30"
                title="Auto Layout Selected (Ctrl+Shift+L)"
              >
                <Wand2 className="w-4 h-4 text-violet-400" />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
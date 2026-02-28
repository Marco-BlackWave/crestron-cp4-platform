import { useState, useRef, useEffect } from 'react';
import { Undo, Redo } from 'lucide-react';
import { HistoryState } from '../types/crestron';
import { HistoryDropdown } from './HistoryDropdown';

interface HistoryButtonsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  history: HistoryState[];
  historyIndex: number;
  onJumpToHistory: (index: number) => void;
}

export function HistoryButtons({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  history,
  historyIndex,
  onJumpToHistory,
}: HistoryButtonsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownType, setDropdownType] = useState<'undo' | 'redo'>('undo');
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  
  const undoButtonRef = useRef<HTMLButtonElement>(null);
  const redoButtonRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle long press for undo button
  const handleUndoMouseDown = (e: React.MouseEvent) => {
    if (!canUndo) return;
    
    // Clear any existing timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    // Set timer for long press (500ms)
    longPressTimerRef.current = setTimeout(() => {
      if (undoButtonRef.current) {
        const rect = undoButtonRef.current.getBoundingClientRect();
        setDropdownPosition({
          x: rect.left,
          y: rect.bottom + 5,
        });
        setDropdownType('undo');
        setShowDropdown(true);
      }
    }, 500);
  };

  // Handle long press for redo button
  const handleRedoMouseDown = (e: React.MouseEvent) => {
    if (!canRedo) return;
    
    // Clear any existing timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    // Set timer for long press (500ms)
    longPressTimerRef.current = setTimeout(() => {
      if (redoButtonRef.current) {
        const rect = redoButtonRef.current.getBoundingClientRect();
        setDropdownPosition({
          x: rect.left,
          y: rect.bottom + 5,
        });
        setDropdownType('redo');
        setShowDropdown(true);
      }
    }, 500);
  };

  // Handle mouse up - execute action if not long press
  const handleUndoMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      
      // If dropdown is not showing, it was a quick click - execute undo
      if (!showDropdown && canUndo) {
        onUndo();
      }
    }
  };

  const handleRedoMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      
      // If dropdown is not showing, it was a quick click - execute redo
      if (!showDropdown && canRedo) {
        onRedo();
      }
    }
  };

  // Clear timer on mouse leave
  const handleMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <button
        ref={undoButtonRef}
        onMouseDown={handleUndoMouseDown}
        onMouseUp={handleUndoMouseUp}
        onMouseLeave={handleMouseLeave}
        disabled={!canUndo}
        className={`p-1.5 rounded-lg transition-all ${
          canUndo ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'text-zinc-700 cursor-not-allowed'
        }`}
        title="Undo (Ctrl+Z) | Hold for history"
      >
        <Undo className="w-4 h-4" />
      </button>

      <button
        ref={redoButtonRef}
        onMouseDown={handleRedoMouseDown}
        onMouseUp={handleRedoMouseUp}
        onMouseLeave={handleMouseLeave}
        disabled={!canRedo}
        className={`p-1.5 rounded-lg transition-all ${
          canRedo ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'text-zinc-700 cursor-not-allowed'
        }`}
        title="Redo (Ctrl+Y) | Hold for history"
      >
        <Redo className="w-4 h-4" />
      </button>

      {showDropdown && (
        <HistoryDropdown
          history={history}
          currentIndex={historyIndex}
          onJumpTo={onJumpToHistory}
          position={dropdownPosition}
          onClose={() => setShowDropdown(false)}
          type={dropdownType}
        />
      )}
    </>
  );
}
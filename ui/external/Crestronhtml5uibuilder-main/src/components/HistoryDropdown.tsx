import { useEffect, useRef, useState } from 'react';
import { HistoryState } from '../types/crestron';
import { Clock, Undo2, Redo2 } from 'lucide-react';

interface HistoryDropdownProps {
  history: HistoryState[];
  currentIndex: number;
  onJumpTo: (index: number) => void;
  position: { x: number; y: number };
  onClose: () => void;
  type: 'undo' | 'redo';
}

export function HistoryDropdown({
  history,
  currentIndex,
  onJumpTo,
  position,
  onClose,
  type,
}: HistoryDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Get relevant states based on type
  const relevantStates = type === 'undo'
    ? history.slice(0, currentIndex + 1).reverse() // Show from current to oldest
    : history.slice(currentIndex + 1); // Show future states

  const getActionDescription = (state: HistoryState, index: number): string => {
    const actualIndex = type === 'undo' 
      ? currentIndex - index 
      : currentIndex + 1 + index;
    
    if (actualIndex === 0) return 'Initial State';
    
    const prevState = history[actualIndex - 1];
    if (!prevState) return 'Unknown Action';

    // Detect what changed
    const prevElements = prevState.project.pages.flatMap(p => p.elements);
    const currElements = state.project.pages.flatMap(p => p.elements);

    if (currElements.length > prevElements.length) {
      const newEl = currElements.find(el => !prevElements.some(prev => prev.id === el.id));
      return `Added ${newEl?.type || 'element'}`;
    }

    if (currElements.length < prevElements.length) {
      const deletedEl = prevElements.find(el => !currElements.some(curr => curr.id === el.id));
      return `Deleted ${deletedEl?.type || 'element'}`;
    }

    // Check if elements moved or resized
    for (const currEl of currElements) {
      const prevEl = prevElements.find(el => el.id === currEl.id);
      if (prevEl) {
        if (prevEl.x !== currEl.x || prevEl.y !== currEl.y) {
          return `Moved ${currEl.type}`;
        }
        if (prevEl.width !== currEl.width || prevEl.height !== currEl.height) {
          return `Resized ${currEl.type}`;
        }
      }
    }

    // Check pages
    if (prevState.project.pages.length !== state.project.pages.length) {
      return state.project.pages.length > prevState.project.pages.length
        ? 'Added page'
        : 'Deleted page';
    }

    return 'Modified';
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (relevantStates.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl z-[10000] min-w-[300px] max-w-[400px]"
      style={{
        left: position.x,
        top: position.y,
        maxHeight: '400px',
      }}
    >
      <div className="p-3 border-b border-zinc-700 flex items-center gap-2">
        {type === 'undo' ? (
          <>
            <Undo2 className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">Undo History</span>
          </>
        ) : (
          <>
            <Redo2 className="w-4 h-4 text-green-400" />
            <span className="font-semibold">Redo History</span>
          </>
        )}
        <span className="ml-auto text-xs text-zinc-400">
          {relevantStates.length} {relevantStates.length === 1 ? 'state' : 'states'}
        </span>
      </div>

      <div className="overflow-y-auto max-h-[340px]">
        {relevantStates.map((state, index) => {
          const actualIndex = type === 'undo' 
            ? currentIndex - index 
            : currentIndex + 1 + index;
          const isCurrent = actualIndex === currentIndex;

          return (
            <button
              key={state.timestamp}
              onClick={() => {
                onJumpTo(actualIndex);
                onClose();
              }}
              className={`w-full px-4 py-2.5 text-left hover:bg-zinc-700 transition-colors border-l-2 ${
                isCurrent
                  ? 'bg-zinc-700 border-blue-500'
                  : 'border-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${isCurrent ? 'text-blue-400' : 'text-zinc-500'}`}>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${
                    isCurrent ? 'text-white' : 'text-zinc-200'
                  }`}>
                    {getActionDescription(state, index)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {formatTime(state.timestamp)}
                  </div>
                </div>
                <div className="text-xs text-zinc-500 shrink-0">
                  #{actualIndex}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-2 border-t border-zinc-700 text-xs text-zinc-500 text-center">
        Click to jump to state • Max 70 states
      </div>
    </div>
  );
}

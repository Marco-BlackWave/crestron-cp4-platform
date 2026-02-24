import { useState, useCallback } from "react";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export function useContextMenu() {
  const [menuPos, setMenuPos] = useState<ContextMenuPosition | null>(null);

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  const closeMenu = useCallback(() => {
    setMenuPos(null);
  }, []);

  return { menuPos, openMenu, closeMenu };
}

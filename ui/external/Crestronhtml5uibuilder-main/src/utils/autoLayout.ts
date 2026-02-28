import type { CrestronElement } from "../types/crestron";

type LayoutResult = { id: string; x: number; y: number; width: number; height: number };

function asLayout(elements: CrestronElement[]): LayoutResult[] {
  return elements.map((e) => ({ id: e.id, x: e.x, y: e.y, width: e.width, height: e.height }));
}

export function autoLayoutElements(elements: CrestronElement[], pageWidth: number, pageHeight: number): LayoutResult[] {
  if (elements.length === 0) return [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(elements.length)));
  const cellW = Math.max(120, Math.floor(pageWidth / cols));
  const rows = Math.ceil(elements.length / cols);
  const cellH = Math.max(80, Math.floor(pageHeight / Math.max(1, rows)));

  return elements.map((el, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: el.id,
      x: col * cellW + 8,
      y: row * cellH + 8,
      width: Math.min(el.width, cellW - 16),
      height: Math.min(el.height, cellH - 16),
    };
  });
}

export function tidyLayoutElements(elements: CrestronElement[], _pageWidth: number, _pageHeight: number): LayoutResult[] {
  if (elements.length === 0) return [];
  const grid = 8;
  return asLayout(elements).map((e) => ({
    ...e,
    x: Math.round(e.x / grid) * grid,
    y: Math.round(e.y / grid) * grid,
  }));
}

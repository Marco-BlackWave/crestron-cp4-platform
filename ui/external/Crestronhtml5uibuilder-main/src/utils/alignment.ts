import type { CrestronElement } from "../types/crestron";

export type AlignKind = "left" | "right" | "top" | "bottom" | "center-h" | "center-v" | "distribute-h" | "distribute-v";

export function alignElements(elements: CrestronElement[], type: AlignKind | string): Array<Partial<CrestronElement> & { id: string }> {
  if (elements.length < 2) return [];

  const sortedX = [...elements].sort((a, b) => a.x - b.x);
  const sortedY = [...elements].sort((a, b) => a.y - b.y);
  const minX = Math.min(...elements.map((e) => e.x));
  const maxX = Math.max(...elements.map((e) => e.x + e.width));
  const minY = Math.min(...elements.map((e) => e.y));
  const maxY = Math.max(...elements.map((e) => e.y + e.height));
  const centerX = minX + (maxX - minX) / 2;
  const centerY = minY + (maxY - minY) / 2;

  if (type === "distribute-h" && elements.length > 2) {
    const first = sortedX[0];
    const last = sortedX[sortedX.length - 1];
    const middle = sortedX.slice(1, -1);
    const totalMiddleWidth = middle.reduce((s, e) => s + e.width, 0);
    const span = last.x - (first.x + first.width);
    const gap = middle.length > 0 ? Math.max(0, (span - totalMiddleWidth) / (middle.length + 1)) : 0;
    let cursor = first.x + first.width + gap;
    return sortedX.map((e, i) => {
      if (i === 0 || i === sortedX.length - 1) return { id: e.id };
      const next = { id: e.id, x: Math.round(cursor) };
      cursor += e.width + gap;
      return next;
    });
  }

  if (type === "distribute-v" && elements.length > 2) {
    const first = sortedY[0];
    const last = sortedY[sortedY.length - 1];
    const middle = sortedY.slice(1, -1);
    const totalMiddleHeight = middle.reduce((s, e) => s + e.height, 0);
    const span = last.y - (first.y + first.height);
    const gap = middle.length > 0 ? Math.max(0, (span - totalMiddleHeight) / (middle.length + 1)) : 0;
    let cursor = first.y + first.height + gap;
    return sortedY.map((e, i) => {
      if (i === 0 || i === sortedY.length - 1) return { id: e.id };
      const next = { id: e.id, y: Math.round(cursor) };
      cursor += e.height + gap;
      return next;
    });
  }

  return elements.map((e) => {
    switch (type) {
      case "left": return { id: e.id, x: Math.round(minX) };
      case "right": return { id: e.id, x: Math.round(maxX - e.width) };
      case "top": return { id: e.id, y: Math.round(minY) };
      case "bottom": return { id: e.id, y: Math.round(maxY - e.height) };
      case "center-h": return { id: e.id, x: Math.round(centerX - e.width / 2) };
      case "center-v": return { id: e.id, y: Math.round(centerY - e.height / 2) };
      default: return { id: e.id };
    }
  });
}

export function scaleElement(
  element: CrestronElement,
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
): Partial<CrestronElement> {
  const sx = fromWidth > 0 ? toWidth / fromWidth : 1;
  const sy = fromHeight > 0 ? toHeight / fromHeight : 1;
  return {
    x: Math.round(element.x * sx),
    y: Math.round(element.y * sy),
    width: Math.max(1, Math.round(element.width * sx)),
    height: Math.max(1, Math.round(element.height * sy)),
  };
}

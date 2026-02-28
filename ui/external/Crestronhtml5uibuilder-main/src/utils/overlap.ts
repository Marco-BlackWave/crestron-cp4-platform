import type { CrestronElement } from "../types/crestron";

export type OverlapInfo = {
  a: string;
  b: string;
  intersectionArea: number;
};

function intersects(a: CrestronElement, b: CrestronElement): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return x * y;
}

export function findOverlappingElements(elements: CrestronElement[]): OverlapInfo[] {
  const out: OverlapInfo[] = [];
  for (let i = 0; i < elements.length; i += 1) {
    for (let j = i + 1; j < elements.length; j += 1) {
      const area = intersects(elements[i], elements[j]);
      if (area > 0) out.push({ a: elements[i].id, b: elements[j].id, intersectionArea: area });
    }
  }
  return out;
}

export function separateOverlappingElements(elements: CrestronElement[]): CrestronElement[] {
  const placed: CrestronElement[] = [];
  for (const el of elements) {
    let next = { ...el };
    while (placed.some((p) => intersects(p, next) > 0)) {
      next = { ...next, x: next.x + 8, y: next.y + 8 };
    }
    placed.push(next);
  }
  return placed;
}

export function arrangeElementsInGrid(elements: CrestronElement[], cols = 4): CrestronElement[] {
  return elements.map((el, i) => ({
    ...el,
    x: (i % cols) * (el.width + 16),
    y: Math.floor(i / cols) * (el.height + 16),
  }));
}

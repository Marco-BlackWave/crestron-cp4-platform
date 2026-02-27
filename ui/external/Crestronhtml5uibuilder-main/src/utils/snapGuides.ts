import type { CrestronElement } from "../types/crestron";

export type SnapGuide = {
  orientation: "horizontal" | "vertical";
  position: number;
  sourceId?: string;
};

export function calculateSnapGuides(
  moving: CrestronElement,
  allElements: CrestronElement[],
  threshold = 6,
  _pageWidth = 1920,
  _pageHeight = 1080,
): SnapGuide[] {
  const guides: SnapGuide[] = [];
  const movingCenterX = moving.x + moving.width / 2;
  const movingCenterY = moving.y + moving.height / 2;

  for (const el of allElements) {
    if (el.id === moving.id) continue;
    const centerX = el.x + el.width / 2;
    const centerY = el.y + el.height / 2;

    if (Math.abs(centerX - movingCenterX) <= threshold) {
      guides.push({ orientation: "vertical", position: Math.round(centerX), sourceId: el.id });
    }
    if (Math.abs(centerY - movingCenterY) <= threshold) {
      guides.push({ orientation: "horizontal", position: Math.round(centerY), sourceId: el.id });
    }
  }

  return guides;
}

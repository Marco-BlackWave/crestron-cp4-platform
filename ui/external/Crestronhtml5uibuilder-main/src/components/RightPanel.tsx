import { CrestronElement, Page } from '../types/crestron';
import { PropertiesPanel } from './PropertiesPanel';

interface RightPanelProps {
  selectedElements: CrestronElement[];
  setSelectedElements: (elements: CrestronElement[]) => void;
  updateElement: (elementId: string, updates: Partial<CrestronElement>) => void;
  updateMultipleElements: (updates: Array<{ id: string; updates: Partial<CrestronElement> }>) => void;
  page?: Page;
}

export function RightPanel({
  selectedElements,
  setSelectedElements,
  updateElement,
  updateMultipleElements,
  page,
}: RightPanelProps) {
  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col properties-panel flex-shrink-0 overflow-hidden">
      <div className="border-b border-zinc-800 px-4 py-3 flex-shrink-0">
        <h2 className="text-sm">Properties</h2>
      </div>
      <div className="flex-1 overflow-y-auto properties-scroll-container">
        <PropertiesPanel
          selectedElement={selectedElements[0] || null}
          updateElement={updateElement}
        />
      </div>
    </div>
  );
}
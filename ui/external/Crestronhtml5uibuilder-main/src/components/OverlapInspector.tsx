import { useState, useEffect } from 'react';
import { CrestronElement, Page } from '../types/crestron';
import { findOverlappingElements, OverlapInfo, separateOverlappingElements, arrangeElementsInGrid } from '../utils/overlap';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { AlertTriangle, Grid3x3, Shuffle, Eye, EyeOff } from 'lucide-react';

interface OverlapInspectorProps {
  page?: Page;
  selectedElements: CrestronElement[];
  setSelectedElements: (elements: CrestronElement[]) => void;
  updateMultipleElements: (updates: Array<{ id: string; updates: Partial<CrestronElement> }>) => void;
}

export function OverlapInspector({
  page,
  selectedElements,
  setSelectedElements,
  updateMultipleElements,
}: OverlapInspectorProps) {
  const [overlaps, setOverlaps] = useState<OverlapInfo[]>([]);
  const [highlightedPair, setHighlightedPair] = useState<[string, string] | null>(null);

  // Update overlaps when page elements change
  useEffect(() => {
    if (!page) {
      setOverlaps([]);
      return;
    }

    const foundOverlaps = findOverlappingElements(page.elements);
    setOverlaps(foundOverlaps);
  }, [page?.elements]);

  const handleSelectOverlappingPair = (overlap: OverlapInfo) => {
    setSelectedElements([overlap.element1, overlap.element2]);
    setHighlightedPair([overlap.element1.id, overlap.element2.id]);
  };

  const handleSeparateElements = () => {
    if (!page) return;

    const updates = separateOverlappingElements(page.elements, 10);
    if (updates.length > 0) {
      updateMultipleElements(updates);
    }
  };

  const handleArrangeInGrid = () => {
    if (!page) return;

    const updates = arrangeElementsInGrid(page.elements, page.width, 20);
    if (updates.length > 0) {
      updateMultipleElements(updates);
    }
  };

  const getSeverityColor = (percentage: number): string => {
    if (percentage > 75) return 'destructive';
    if (percentage > 50) return 'default';
    if (percentage > 25) return 'secondary';
    return 'outline';
  };

  const getSeverityLabel = (percentage: number): string => {
    if (percentage > 75) return 'Critical';
    if (percentage > 50) return 'Major';
    if (percentage > 25) return 'Minor';
    return 'Slight';
  };

  if (!page) {
    return null;
  }

  const totalElements = page.elements.length;
  const overlappingElementsSet = new Set<string>();
  overlaps.forEach((o) => {
    overlappingElementsSet.add(o.element1.id);
    overlappingElementsSet.add(o.element2.id);
  });
  const overlappingCount = overlappingElementsSet.size;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Overlap Detection
          {overlaps.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {overlaps.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
        {/* Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Elements:</span>
            <span>{totalElements}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overlapping:</span>
            <span className={overlappingCount > 0 ? 'text-destructive' : ''}>
              {overlappingCount}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overlap Pairs:</span>
            <span className={overlaps.length > 0 ? 'text-destructive' : ''}>
              {overlaps.length}
            </span>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        {overlaps.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSeparateElements}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Auto-Separate Overlaps
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleArrangeInGrid}
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Arrange in Grid
            </Button>
          </div>
        )}

        <Separator />

        {/* Overlap List */}
        <div className="flex-1 min-h-0">
          {overlaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Eye className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No overlapping elements detected
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-4">
                {overlaps.map((overlap, index) => {
                  const severity = getSeverityLabel(overlap.overlapPercentage);
                  const severityColor = getSeverityColor(overlap.overlapPercentage);
                  const isHighlighted =
                    highlightedPair &&
                    ((highlightedPair[0] === overlap.element1.id &&
                      highlightedPair[1] === overlap.element2.id) ||
                      (highlightedPair[1] === overlap.element1.id &&
                        highlightedPair[0] === overlap.element2.id));

                  return (
                    <div
                      key={`${overlap.element1.id}-${overlap.element2.id}-${index}`}
                      className={`p-3 rounded-lg border ${
                        isHighlighted
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      } cursor-pointer transition-colors`}
                      onClick={() => handleSelectOverlappingPair(overlap)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="text-sm">Overlap #{index + 1}</span>
                        </div>
                        <Badge variant={severityColor as any} className="text-xs">
                          {severity}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded border border-border"
                            style={{
                              backgroundColor:
                                overlap.element1.style.backgroundColor || '#3b82f6',
                            }}
                          />
                          <span className="flex-1 truncate">
                            {overlap.element1.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded border border-border"
                            style={{
                              backgroundColor:
                                overlap.element2.style.backgroundColor || '#3b82f6',
                            }}
                          />
                          <span className="flex-1 truncate">
                            {overlap.element2.name}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Overlap:</span>
                          <span>{overlap.overlapPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Area:</span>
                          <span>{Math.round(overlap.overlapArea)} px²</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
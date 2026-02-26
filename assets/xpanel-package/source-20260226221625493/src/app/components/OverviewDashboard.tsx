import React, { useState, useCallback, useRef, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { LightingCard } from "./LightingCard";
import { ClimateCard } from "./ClimateCard";
import { PowerCard } from "./PowerCard";
import { MediaCard } from "./MediaCard";
import { SecurityCard } from "./SecurityCard";
import { BiometricCard } from "./BiometricCard";
import { AirConditionerCard } from "./AirConditionerCard";
import { LightningControlCard } from "./LightningControlCard";
import { ExportableCard } from "./CardExporter";

/* ─── Types ─── */
type CardSize = 1 | 2 | 3;

interface CardConfig {
  id: string;
  size: CardSize;
}

interface DragItem {
  index: number;
  /** Index we just swapped FROM — used to prevent reverse-thrash */
  _prevIdx?: number;
  _swapTime?: number;
}

/* Height tiers */
const SIZE_H: Record<CardSize, number> = { 1: 340, 2: 500, 3: 700 };

/*
 * Masonry row-span approach:
 * grid-auto-rows = 20px,  gap = 20px
 * Actual px height for N spans = N×20 + (N−1)×20 = 40N − 20
 * Size 1: 9 spans → 340px
 * Size 2: 13 spans → 500px
 * Size 3: 18 spans → 700px
 */
const ROW_SPAN: Record<CardSize, number> = { 1: 9, 2: 13, 3: 18 };

/* Nearest-tier snap */
function snap(h: number): CardSize {
  const d1 = Math.abs(h - SIZE_H[1]);
  const d2 = Math.abs(h - SIZE_H[2]);
  const d3 = Math.abs(h - SIZE_H[3]);
  if (d1 <= d2 && d1 <= d3) return 1;
  if (d2 <= d3) return 2;
  return 3;
}

/* ─── Default layout ─── */
const DEFAULT_CARDS: CardConfig[] = [
  { id: "lighting", size: 1 },
  { id: "climate", size: 1 },
  { id: "power", size: 1 },
  { id: "media", size: 1 },
  { id: "security", size: 1 },
  { id: "biometric", size: 1 },
  { id: "thermostat", size: 2 },
  { id: "lightning", size: 1 },
];

const DND_TYPE = "CARD";

/* Anti-thrash: block exact reverse swap for this long (ms) */
const REVERSE_BLOCK_MS = 450;

/* ─── Auto-scroll during edge drag ─── */
const EDGE_PX = 70;
const SCROLL_SPEED = 8;

/* ─── Props ─── */
interface OverviewDashboardProps {
  albumImage: string;
  cameraImage: string;
}

/* ─── DashboardCard ─── */
function DashboardCard({
  card,
  index,
  moveCard,
  onSetSize,
  children,
}: {
  card: CardConfig;
  index: number;
  moveCard: (from: number, to: number) => void;
  onSetSize: (id: string, size: CardSize) => void;
  children: React.ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  /* ── Resize ── */
  const [liveH, setLiveH] = useState<number | null>(null);
  const [resizing, setResizing] = useState(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const scrollAF = useRef(0);
  const pointerY = useRef(0);

  const startEdgeScroll = useCallback(() => {
    const tick = () => {
      if (!resizing) return;
      const dist = window.innerHeight - pointerY.current;
      if (dist < EDGE_PX && dist > 0) {
        const speed = Math.round(SCROLL_SPEED * (1 - dist / EDGE_PX));
        window.scrollBy(0, speed);
        startY.current -= speed;
        const raw = startH.current + (pointerY.current - startY.current);
        setLiveH(Math.max(SIZE_H[1], Math.min(SIZE_H[3] + 30, raw)));
      }
      scrollAF.current = requestAnimationFrame(tick);
    };
    scrollAF.current = requestAnimationFrame(tick);
  }, [resizing]);

  useEffect(() => {
    if (resizing) startEdgeScroll();
    return () => cancelAnimationFrame(scrollAF.current);
  }, [resizing, startEdgeScroll]);

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      startY.current = e.clientY;
      startH.current = SIZE_H[card.size];
      pointerY.current = e.clientY;
      setLiveH(SIZE_H[card.size]);
      setResizing(true);
    },
    [card.size]
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizing) return;
      e.preventDefault();
      pointerY.current = e.clientY;
      const raw = startH.current + (e.clientY - startY.current);
      setLiveH(Math.max(SIZE_H[1], Math.min(SIZE_H[3] + 30, raw)));
    },
    [resizing]
  );

  const onUp = useCallback(() => {
    if (!resizing) return;
    setResizing(false);
    cancelAnimationFrame(scrollAF.current);
    if (liveH !== null) onSetSize(card.id, snap(liveH));
    setLiveH(null);
  }, [resizing, liveH, card.id, onSetSize]);

  /* ── DnD — header-only drag source ── */

  const [{ isDragging }, drag] = useDrag({
    type: DND_TYPE,
    item: (): DragItem => ({ index }),
    canDrag: () => !resizing,
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: DND_TYPE,
    hover: (item: DragItem) => {
      if (item.index === index) return;

      /* Anti-thrash: block the exact reverse of the last swap for a cooldown.
         After swapping A→B, the displaced card slides under the cursor which
         would instantly trigger B→A. Blocking this for ~450ms lets the grid
         settle and makes L↔R reorder work reliably in CSS grid layouts. */
      const now = Date.now();
      if (
        item._prevIdx === index &&
        now - (item._swapTime || 0) < REVERSE_BLOCK_MS
      ) {
        return;
      }

      item._prevIdx = item.index;
      item._swapTime = now;
      moveCard(item.index, index);
      item.index = index;
    },
    collect: (m) => ({ isOver: m.isOver() }),
  });

  /* Drag handle → header only; drop target → whole card */
  drag(dragHandleRef);
  drop(cardRef);

  const h = liveH ?? SIZE_H[card.size];

  /* During resize use explicit height; at rest let grid-row span control it */
  const rowSpan = resizing
    ? undefined
    : ROW_SPAN[card.size];

  return (
    <div
      ref={cardRef}
      className="relative group"
      style={{
        gridRow: rowSpan ? `span ${rowSpan}` : undefined,
        height: resizing ? h : undefined,
        opacity: isDragging ? 0.2 : 1,
        transition: resizing
          ? "opacity 0.1s"
          : "opacity 0.15s",
      }}
    >
      {/* ── Drag handle: top header strip ── */}
      <div
        ref={dragHandleRef}
        className="absolute top-0 left-0 right-0 z-10 cursor-grab active:cursor-grabbing"
        style={{ height: 38 }}
      >
      </div>

      {isOver && !isDragging && (
        <div
          className="absolute inset-0 z-10 rounded-2xl pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 2px rgba(59,130,246,0.35)" }}
        />
      )}

      {/* Resize handle — bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-center"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{ height: 22, cursor: "ns-resize", touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          setResizing(false);
          setLiveH(null);
          cancelAnimationFrame(scrollAF.current);
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: resizing ? 44 : 26,
            height: 3,
            marginBottom: 5,
            background: resizing
              ? "rgba(255,255,255,0.25)"
              : "rgba(255,255,255,0.07)",
            transition: "width 0.2s, background 0.15s",
          }}
        />
      </div>

      {/* Content */}
      <ExportableCard cardId={card.id} className="h-full overflow-hidden rounded-2xl">
        {children}
      </ExportableCard>
    </div>
  );
}

/* ─── Dashboard ─── */
export function OverviewDashboard({
  albumImage,
  cameraImage,
}: OverviewDashboardProps) {
  const [cards, setCards] = useState<CardConfig[]>(DEFAULT_CARDS);

  const moveCard = useCallback((from: number, to: number) => {
    setCards((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const setSize = useCallback((id: string, size: CardSize) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, size } : c))
    );
  }, []);

  const renderCard = (card: CardConfig) => {
    switch (card.id) {
      case "lighting":
        return <LightingCard cardSize={card.size} />;
      case "climate":
        return <ClimateCard cardSize={card.size} />;
      case "power":
        return <PowerCard cardSize={card.size} />;
      case "media":
        return <MediaCard albumImage={albumImage} cardSize={card.size} />;
      case "security":
        return <SecurityCard cameraImage={cameraImage} cardSize={card.size} />;
      case "biometric":
        return <BiometricCard cardSize={card.size} />;
      case "thermostat":
        return <AirConditionerCard cardSize={card.size} />;
      case "lightning":
        return <LightningControlCard cardSize={card.size} />;
      default:
        return null;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-5">
        <h2 className="text-white text-xl">Dashboard Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" style={{ gridAutoRows: 20 }}>
          {cards.map((card, i) => (
            <DashboardCard
              key={card.id}
              card={card}
              index={i}
              moveCard={moveCard}
              onSetSize={setSize}
            >
              {renderCard(card)}
            </DashboardCard>
          ))}
        </div>
      </div>
    </DndProvider>
  );
}
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Lightbulb,
  Plus,
  Save,
  Trash2,
  Edit3,
  X,
  Power,
  Sun,
  Volume2,
  Tv,
  Music,
  Palette,
  Layers,
  Sliders,
  ChevronRight,
} from "lucide-react";
import { AppleTVRemote } from "./AppleTVRemote";
import { AppleTVRemoteWhite } from "./AppleTVRemoteWhite";
import { AppleTVRemoteBlack } from "./AppleTVRemoteBlack";
import { BeoRemoteOne } from "./BeoRemoteOne";

/* ─── Glass Card ─── */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.07] shadow-lg shadow-black/10 ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Types ─── */
interface LightCircuit {
  id: string;
  name: string;
  on: boolean;
  brightness: number;
  color: string; // hex
}

interface LightScene {
  id: string;
  name: string;
  circuits: { circuitId: string; on: boolean; brightness: number; color: string }[];
}

interface AVSource {
  id: string;
  name: string;
  type: "audio" | "video";
  active: boolean;
  source: string;
  volume?: number;
}

/* ─── Room Data (mock per room) ─── */
const ROOM_CIRCUITS: Record<string, LightCircuit[]> = {
  living: [
    { id: "l1", name: "Ceiling Spots", on: true, brightness: 80, color: "#f5a623" },
    { id: "l2", name: "Wall Sconces", on: true, brightness: 45, color: "#ff6b6b" },
    { id: "l3", name: "Floor Uplights", on: false, brightness: 60, color: "#4ecdc4" },
    { id: "l4", name: "LED Strip", on: true, brightness: 100, color: "#a855f7" },
    { id: "l5", name: "Reading Lamp", on: false, brightness: 70, color: "#fbbf24" },
  ],
  kitchen: [
    { id: "k1", name: "Under-cabinet LEDs", on: true, brightness: 90, color: "#ffffff" },
    { id: "k2", name: "Island Pendants", on: true, brightness: 75, color: "#f5a623" },
    { id: "k3", name: "Pantry Light", on: false, brightness: 50, color: "#ffffff" },
    { id: "k4", name: "Accent Strip", on: true, brightness: 60, color: "#3b82f6" },
  ],
  bedroom: [
    { id: "b1", name: "Bedside Left", on: true, brightness: 30, color: "#ff9f43" },
    { id: "b2", name: "Bedside Right", on: true, brightness: 30, color: "#ff9f43" },
    { id: "b3", name: "Ceiling Cove", on: false, brightness: 20, color: "#6c5ce7" },
    { id: "b4", name: "Closet Light", on: false, brightness: 100, color: "#ffffff" },
  ],
  cinema: [
    { id: "c1", name: "Star Ceiling", on: true, brightness: 15, color: "#3b82f6" },
    { id: "c2", name: "Aisle Lights", on: true, brightness: 10, color: "#ef4444" },
    { id: "c3", name: "Screen Bias", on: true, brightness: 25, color: "#6366f1" },
    { id: "c4", name: "Entry Spots", on: false, brightness: 80, color: "#ffffff" },
  ],
  display: [
    { id: "d1", name: "Track Lighting", on: true, brightness: 85, color: "#ffffff" },
    { id: "d2", name: "Display Spots", on: true, brightness: 90, color: "#f5a623" },
    { id: "d3", name: "Ambient LEDs", on: true, brightness: 50, color: "#ec4899" },
  ],
  outdoor: [
    { id: "o1", name: "Path Lights", on: true, brightness: 60, color: "#fbbf24" },
    { id: "o2", name: "Pool Lights", on: true, brightness: 100, color: "#06b6d4" },
    { id: "o3", name: "Garden Spots", on: false, brightness: 70, color: "#22c55e" },
    { id: "o4", name: "Deck Strip", on: true, brightness: 55, color: "#a855f7" },
    { id: "o5", name: "Facade Wash", on: true, brightness: 40, color: "#3b82f6" },
  ],
};

const ROOM_SCENES: Record<string, LightScene[]> = {
  living: [
    { id: "s1", name: "Movie Night", circuits: [{ circuitId: "l1", on: false, brightness: 0, color: "#f5a623" }, { circuitId: "l2", on: true, brightness: 15, color: "#6c5ce7" }, { circuitId: "l4", on: true, brightness: 30, color: "#6366f1" }] },
    { id: "s2", name: "Reading", circuits: [{ circuitId: "l1", on: true, brightness: 90, color: "#ffffff" }, { circuitId: "l5", on: true, brightness: 100, color: "#fbbf24" }] },
    { id: "s3", name: "Party", circuits: [{ circuitId: "l1", on: true, brightness: 60, color: "#ec4899" }, { circuitId: "l4", on: true, brightness: 100, color: "#a855f7" }, { circuitId: "l3", on: true, brightness: 80, color: "#06b6d4" }] },
  ],
  kitchen: [
    { id: "s1", name: "Cooking", circuits: [{ circuitId: "k1", on: true, brightness: 100, color: "#ffffff" }, { circuitId: "k2", on: true, brightness: 90, color: "#ffffff" }] },
    { id: "s2", name: "Dinner", circuits: [{ circuitId: "k2", on: true, brightness: 40, color: "#f5a623" }, { circuitId: "k4", on: true, brightness: 30, color: "#ff6b6b" }] },
  ],
  bedroom: [
    { id: "s1", name: "Sleep", circuits: [{ circuitId: "b1", on: true, brightness: 5, color: "#ff6347" }, { circuitId: "b2", on: true, brightness: 5, color: "#ff6347" }] },
    { id: "s2", name: "Wake Up", circuits: [{ circuitId: "b1", on: true, brightness: 70, color: "#ffffff" }, { circuitId: "b3", on: true, brightness: 80, color: "#fbbf24" }] },
  ],
  cinema: [
    { id: "s1", name: "Showtime", circuits: [{ circuitId: "c1", on: true, brightness: 10, color: "#1e3a5f" }, { circuitId: "c2", on: true, brightness: 5, color: "#ef4444" }, { circuitId: "c3", on: true, brightness: 20, color: "#6366f1" }] },
  ],
  display: [
    { id: "s1", name: "Gallery", circuits: [{ circuitId: "d1", on: true, brightness: 90, color: "#ffffff" }, { circuitId: "d2", on: true, brightness: 95, color: "#f5a623" }] },
  ],
  outdoor: [
    { id: "s1", name: "Evening", circuits: [{ circuitId: "o1", on: true, brightness: 60, color: "#fbbf24" }, { circuitId: "o4", on: true, brightness: 50, color: "#a855f7" }] },
    { id: "s2", name: "Pool Party", circuits: [{ circuitId: "o2", on: true, brightness: 100, color: "#06b6d4" }, { circuitId: "o4", on: true, brightness: 100, color: "#ec4899" }] },
  ],
};

const ROOM_AV: Record<string, AVSource[]> = {
  living: [
    { id: "av1", name: "Sonos Arc", type: "audio", active: true, source: "Spotify", volume: 45 },
    { id: "av2", name: "LG OLED 77\"", type: "video", active: false, source: "Apple TV" },
  ],
  kitchen: [
    { id: "av1", name: "Sonos One", type: "audio", active: true, source: "Radio", volume: 30 },
  ],
  bedroom: [
    { id: "av1", name: "HomePod Mini", type: "audio", active: false, source: "Apple Music", volume: 20 },
    { id: "av2", name: "Samsung 55\"", type: "video", active: false, source: "Netflix" },
  ],
  cinema: [
    { id: "av1", name: "Dolby 7.1.4", type: "audio", active: true, source: "Receiver", volume: 65 },
    { id: "av2", name: "Projector 4K", type: "video", active: true, source: "Blu-ray" },
    { id: "av3", name: "Subwoofer", type: "audio", active: true, source: "Receiver", volume: 70 },
  ],
  display: [
    { id: "av1", name: "Soundbar", type: "audio", active: true, source: "Spotify", volume: 35 },
    { id: "av2", name: "Samsung 85\"", type: "video", active: true, source: "HDMI 1" },
  ],
  outdoor: [
    { id: "av1", name: "Garden Speakers", type: "audio", active: true, source: "AirPlay", volume: 50 },
  ],
};

/* ─── Helpers ─── */
function hsvToHex(h: number, s: number, v: number): string {
  const sv = s / 100;
  const vv = v / 100;
  const c = vv * sv;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vv - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return [Math.round(h), Math.round(s), Math.round(v)];
}

/* ─── Pure CSS HSB Color Wheel ─── */
function RGBColorWheel({
  value,
  onChange,
  size = 220,
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const [initH, initS, initV] = hexToHsv(value);
  const [hue, setHue] = useState(initH);
  const [sat, setSat] = useState(initS);
  const [brightness, setBrightness] = useState(initV);

  /* Sync internal HSV when external value changes (e.g. swatch click) */
  const prevValue = useRef(value);
  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      const [h, s, v] = hexToHsv(value);
      setHue(h);
      setSat(s);
      setBrightness(v);
    }
  }, [value]);

  const currentHex = hsvToHex(hue, sat, brightness);
  const radius = size / 2;

  // Thumb on wheel: angle = hue, distance from center = saturation
  const thumbAngle = ((hue - 90) * Math.PI) / 180;
  const thumbDist = (sat / 100) * (radius - 14); // leave margin from edge
  const thumbX = radius + thumbDist * Math.cos(thumbAngle);
  const thumbY = radius + thumbDist * Math.sin(thumbAngle);

  const handleWheelInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!wheelRef.current) return;
      const rect = wheelRef.current.getBoundingClientRect();
      const x = clientX - rect.left - radius;
      const y = clientY - rect.top - radius;
      const dist = Math.sqrt(x * x + y * y);
      const maxDist = radius - 2;

      // Hue from angle
      let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      const newHue = Math.round(angle) % 360;

      // Saturation from distance (clamped)
      const newSat = Math.round(Math.min(100, (dist / maxDist) * 100));

      setHue(newHue);
      setSat(newSat);
      onChange(hsvToHex(newHue, newSat, brightness));
    },
    [radius, brightness, onChange]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    handleWheelInteraction(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging) handleWheelInteraction(e.clientX, e.clientY);
  };
  const onPointerUp = () => setDragging(false);

  const handleSatSlider = (val: number) => {
    setSat(val);
    onChange(hsvToHex(hue, val, brightness));
  };
  const handleBrightSlider = (val: number) => {
    setBrightness(val);
    onChange(hsvToHex(hue, sat, val));
  };

  return (
    <div className="flex flex-col items-center justify-between gap-5 w-full flex-1">
      {/* Wheel */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Soft glow behind */}
        <div
          className="absolute rounded-full blur-3xl opacity-30"
          style={{
            inset: -20,
            background: `conic-gradient(from 0deg, #ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)`,
          }}
        />

        {/* Main wheel surface */}
        <div
          ref={wheelRef}
          className="absolute inset-0 rounded-full cursor-crosshair"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Layer 1: Conic hue gradient */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg,
                hsl(0,100%,50%), hsl(15,100%,50%), hsl(30,100%,50%), hsl(45,100%,50%),
                hsl(60,100%,50%), hsl(75,100%,50%), hsl(90,100%,50%), hsl(105,100%,50%),
                hsl(120,100%,50%), hsl(135,100%,50%), hsl(150,100%,50%), hsl(165,100%,50%),
                hsl(180,100%,50%), hsl(195,100%,50%), hsl(210,100%,50%), hsl(225,100%,50%),
                hsl(240,100%,50%), hsl(255,100%,50%), hsl(270,100%,50%), hsl(285,100%,50%),
                hsl(300,100%,50%), hsl(315,100%,50%), hsl(330,100%,50%), hsl(345,100%,50%),
                hsl(360,100%,50%))`,
            }}
          />
          {/* Layer 2: Radial white→transparent (creates saturation: white center = low sat) */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at center,
                rgba(255,255,255,1) 0%,
                rgba(255,255,255,0.85) 15%,
                rgba(255,255,255,0.45) 35%,
                rgba(255,255,255,0.1) 55%,
                transparent 72%)`,
            }}
          />
          {/* Layer 3: Brightness darkening overlay */}
          {brightness < 100 && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: `rgba(0,0,0,${1 - brightness / 100})`,
              }}
            />
          )}
          {/* Subtle inner shadow for depth */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: "inset 0 0 30px 8px rgba(0,0,0,0.12)",
            }}
          />
        </div>

        {/* Thumb: hollow white ring */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: thumbX - 14,
            top: thumbY - 14,
            width: 28,
            height: 28,
            transition: dragging ? "none" : "left 0.12s ease, top 0.12s ease",
          }}
        >
          <div
            className="w-full h-full rounded-full border-[3px] border-white"
            style={{
              backgroundColor: "transparent",
              boxShadow: "0 0 8px rgba(0,0,0,0.6), inset 0 0 4px rgba(0,0,0,0.3)",
            }}
          />
        </div>

      </div>

      {/* Sliders */}
      <div className="w-full self-stretch space-y-5 px-1">
        {/* Saturation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/30 text-[10px] tracking-[0.15em] uppercase">Saturation</span>
            <span className="text-white/50 text-xs tabular-nums">{sat}%</span>
          </div>
          <div className="relative h-[9px] rounded-full" style={{
            background: `linear-gradient(to right, ${hsvToHex(hue, 0, brightness)}, ${hsvToHex(hue, 100, brightness)})`,
            boxShadow: `inset 0 1px 2px rgba(0,0,0,0.25), 0 0 8px ${hsvToHex(hue, 100, brightness)}20`,
          }}>
            <input
              type="range" min="0" max="100" value={sat}
              onChange={(e) => handleSatSlider(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ margin: 0 }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border-[2.5px] border-white pointer-events-none"
              style={{
                left: `calc(${sat}% - 9px)`,
                backgroundColor: "transparent",
                boxShadow: "0 0 6px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)",
              }}
            />
          </div>
        </div>

        {/* Brightness */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/30 text-[10px] tracking-[0.15em] uppercase">Brightness</span>
            <span className="text-white/50 text-xs tabular-nums">{brightness}%</span>
          </div>
          <div className="relative h-[9px] rounded-full" style={{
            background: `linear-gradient(to right, #000000, ${hsvToHex(hue, sat, 100)}, ${hsvToHex(hue, Math.max(10, sat - 30), 100)})`,
            boxShadow: `inset 0 1px 2px rgba(0,0,0,0.25), 0 0 8px ${hsvToHex(hue, sat, 100)}20`,
          }}>
            <input
              type="range" min="0" max="100" value={brightness}
              onChange={(e) => handleBrightSlider(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ margin: 0 }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border-[2.5px] border-white pointer-events-none"
              style={{
                left: `calc(${brightness}% - 9px)`,
                backgroundColor: "transparent",
                boxShadow: "0 0 6px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Hex output */}
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-full"
          style={{
            backgroundColor: currentHex,
            boxShadow: `0 0 16px ${currentHex}80`,
          }}
        />
        <span className="text-white/50 text-sm font-mono uppercase tracking-wider">
          {currentHex}
        </span>
      </div>
    </div>
  );
}

/* ─── Room Detail Section ─── */
export function RoomDetailSection({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) {
  const [circuits, setCircuits] = useState<LightCircuit[]>(
    () => ROOM_CIRCUITS[roomId] || []
  );
  const [scenes, setScenes] = useState<LightScene[]>(
    () => ROOM_SCENES[roomId] || []
  );
  const [avSources, setAvSources] = useState<AVSource[]>(
    () => ROOM_AV[roomId] || []
  );
  const [selectedCircuit, setSelectedCircuit] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"lights" | "scenes" | "av">("lights");
  const [sceneEditor, setSceneEditor] = useState<{ scene: LightScene; isNew: boolean } | null>(null);
  const [sceneNextId, setSceneNextId] = useState(100);
  const [avRemoteTab, setAvRemoteTab] = useState<"main" | "appletv" | "beo">("main");
  const [remoteSkin, setRemoteSkin] = useState<"silver" | "white" | "black">("silver");
  const [beoSkin, setBeoSkin] = useState<"black" | "silver">("black");

  // Reset state when room changes
  useEffect(() => {
    setCircuits(ROOM_CIRCUITS[roomId] || []);
    setScenes(ROOM_SCENES[roomId] || []);
    setAvSources(ROOM_AV[roomId] || []);
    setSelectedCircuit(null);
    setActiveTab("lights");
    setSceneEditor(null);
  }, [roomId]);

  const toggleCircuit = (id: string) => {
    setCircuits((prev) =>
      prev.map((c) => (c.id === id ? { ...c, on: !c.on } : c))
    );
  };

  const setBrightness = (id: string, brightness: number) => {
    setCircuits((prev) =>
      prev.map((c) => (c.id === id ? { ...c, brightness } : c))
    );
  };

  const setColor = (id: string, color: string) => {
    setCircuits((prev) =>
      prev.map((c) => (c.id === id ? { ...c, color } : c))
    );
  };

  const applyScene = (scene: LightScene) => {
    setCircuits((prev) =>
      prev.map((c) => {
        const sceneCircuit = scene.circuits.find((sc) => sc.circuitId === c.id);
        if (sceneCircuit) {
          return { ...c, on: sceneCircuit.on, brightness: sceneCircuit.brightness, color: sceneCircuit.color };
        }
        return { ...c, on: false };
      })
    );
  };

  /* ─── Scene Editor helpers ─── */
  const openNewScene = () => {
    // Create a new scene pre-populated with ALL circuits in their default off state
    const blankCircuits = circuits.map((c) => ({
      circuitId: c.id,
      on: false,
      brightness: 50,
      color: c.color,
    }));
    setSceneEditor({
      scene: { id: "new", name: "", circuits: blankCircuits },
      isNew: true,
    });
  };

  const openNewSceneFromCurrent = () => {
    // Capture current live state as starting point
    const currentCircuits = circuits.map((c) => ({
      circuitId: c.id,
      on: c.on,
      brightness: c.brightness,
      color: c.color,
    }));
    setSceneEditor({
      scene: { id: "new", name: "", circuits: currentCircuits },
      isNew: true,
    });
  };

  const openEditScene = (scene: LightScene) => {
    // Deep clone and ensure all room circuits are represented
    const editorCircuits = circuits.map((c) => {
      const existing = scene.circuits.find((sc) => sc.circuitId === c.id);
      return existing
        ? { ...existing }
        : { circuitId: c.id, on: false, brightness: 50, color: c.color };
    });
    setSceneEditor({
      scene: { ...scene, circuits: editorCircuits },
      isNew: false,
    });
  };

  const saveScene = () => {
    if (!sceneEditor || !sceneEditor.scene.name.trim()) return;
    const saved: LightScene = {
      id: sceneEditor.isNew ? `custom-${sceneNextId}` : sceneEditor.scene.id,
      name: sceneEditor.scene.name.trim(),
      // Only store circuits that are ON
      circuits: sceneEditor.scene.circuits.filter((sc) => sc.on),
    };
    setScenes((prev) => {
      if (sceneEditor.isNew) return [...prev, saved];
      return prev.map((s) => (s.id === saved.id ? saved : s));
    });
    if (sceneEditor.isNew) setSceneNextId((n) => n + 1);
    setSceneEditor(null);
  };

  const updateEditorCircuit = (
    circuitId: string,
    patch: Partial<{ on: boolean; brightness: number; color: string }>
  ) => {
    if (!sceneEditor) return;
    setSceneEditor({
      ...sceneEditor,
      scene: {
        ...sceneEditor.scene,
        circuits: sceneEditor.scene.circuits.map((sc) =>
          sc.circuitId === circuitId ? { ...sc, ...patch } : sc
        ),
      },
    });
  };

  const updateEditorName = (name: string) => {
    if (!sceneEditor) return;
    setSceneEditor({
      ...sceneEditor,
      scene: { ...sceneEditor.scene, name },
    });
  };

  const deleteScene = (sceneId: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
  };

  const toggleAV = (id: string) => {
    setAvSources((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const setAVVolume = (id: string, volume: number) => {
    setAvSources((prev) =>
      prev.map((a) => (a.id === id ? { ...a, volume } : a))
    );
  };

  const selectedCircuitData = circuits.find((c) => c.id === selectedCircuit);
  const tabs = [
    { id: "lights" as const, label: "Lights", icon: Lightbulb },
    { id: "scenes" as const, label: "Scenes", icon: Layers },
    { id: "av" as const, label: "A/V", icon: Sliders },
  ];

  return (
    <div className="space-y-4">
      {/* Room Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl">{roomName}</h2>
          <p className="text-white/30 text-xs mt-0.5">
            {circuits.filter((c) => c.on).length} of {circuits.length} lights on
            {" "}&middot;{" "}
            {avSources.filter((a) => a.active).length} A/V active
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-colors ${
                  activeTab === tab.id
                    ? "bg-white/15 border-white/20 text-white"
                    : "bg-white/[0.04] border-white/[0.06] text-white/35 hover:text-white/60 hover:bg-white/[0.08]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ LIGHTS TAB ═══ */}
      {activeTab === "lights" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Circuit List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white/50 text-xs tracking-widest uppercase">
                Light Circuits
              </h3>
              <button
                onClick={() => {
                  const allOn = circuits.every((c) => c.on);
                  setCircuits((prev) => prev.map((c) => ({ ...c, on: !allOn })));
                }}
                className="text-xs text-white/25 hover:text-white/50 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.06]"
              >
                {circuits.every((c) => c.on) ? "All Off" : "All On"}
              </button>
            </div>

            {circuits.map((circuit) => (
              <GlassCard
                key={circuit.id}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedCircuit === circuit.id
                    ? "border-white/20 bg-white/[0.10]"
                    : ""
                }`}
              >
                <div
                  onClick={() =>
                    setSelectedCircuit(
                      selectedCircuit === circuit.id ? null : circuit.id
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors"
                        style={{
                          backgroundColor: circuit.on
                            ? `${circuit.color}20`
                            : "rgba(255,255,255,0.04)",
                          borderColor: circuit.on
                            ? `${circuit.color}40`
                            : "rgba(255,255,255,0.06)",
                        }}
                      >
                        <Lightbulb
                          className="w-4 h-4 transition-colors"
                          style={{
                            color: circuit.on
                              ? circuit.color
                              : "rgba(255,255,255,0.2)",
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-white text-sm">{circuit.name}</p>
                        <p className="text-white/25 text-xs">
                          {circuit.on
                            ? `${circuit.brightness}% brightness`
                            : "Off"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {circuit.on && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: circuit.color,
                            boxShadow: `0 0 8px ${circuit.color}80`,
                          }}
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCircuit(circuit.id);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                          circuit.on
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                            : "bg-white/[0.04] border-white/[0.06] text-white/20"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight
                        className={`w-4 h-4 text-white/15 transition-transform ${
                          selectedCircuit === circuit.id ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Brightness Slider inline */}
                  {circuit.on && (
                    <div className="mt-3 flex items-center gap-3">
                      <Sun className="w-3 h-3 text-white/20" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={circuit.brightness}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setBrightness(circuit.id, Number(e.target.value))
                        }
                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${circuit.color}cc 0%, ${circuit.color}cc ${circuit.brightness}%, rgba(255,255,255,0.1) ${circuit.brightness}%, rgba(255,255,255,0.1) 100%)`,
                        }}
                      />
                      <span className="text-white/30 text-xs w-8 text-right">
                        {circuit.brightness}%
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* RGB Color Wheel Panel */}
          <div className="lg:col-span-5 lg:mt-[26px]">
            <GlassCard className="p-6 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-white/30" />
                <h3 className="text-white/50 text-xs tracking-widest uppercase">
                  Color Control
                </h3>
              </div>

              {selectedCircuitData && selectedCircuitData.on ? (
                <div className="flex-1 flex flex-col items-center">
                  <p className="text-white text-sm mb-3">
                    {selectedCircuitData.name}
                  </p>
                  <RGBColorWheel
                    value={selectedCircuitData.color}
                    onChange={(hex) => setColor(selectedCircuitData.id, hex)}
                    size={260}
                  />
                  {/* Quick color presets */}
                  <div className="flex gap-2.5 mt-3 mb-1">
                    {[
                      "#ffffff",
                      "#fbbf24",
                      "#f97316",
                      "#ef4444",
                      "#ec4899",
                      "#a855f7",
                      "#6366f1",
                      "#3b82f6",
                      "#06b6d4",
                      "#22c55e",
                    ].map((c) => (
                      <button
                        key={c}
                        onClick={() =>
                          setColor(selectedCircuitData.id, c)
                        }
                        className="w-7 h-7 rounded-full border border-white/10 hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: c,
                          boxShadow:
                            selectedCircuitData.color === c
                              ? `0 0 12px ${c}80`
                              : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
                    <Palette className="w-7 h-7 text-white/10" />
                  </div>
                  <p className="text-white/20 text-sm">
                    Select an active light to control color
                  </p>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {/* ═══ SCENES TAB ═══ */}
      {activeTab === "scenes" && (
        <div className="space-y-4">
          {/* ── Scene Editor ── */}
          {sceneEditor ? (
            <GlassCard className="p-5">
              {/* Editor Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Scene name..."
                    value={sceneEditor.scene.name}
                    onChange={(e) => updateEditorName(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/[0.08] border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-white/25 transition-colors"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!sceneEditor.isNew && (
                    <button
                      onClick={() => {
                        deleteScene(sceneEditor.scene.id);
                        setSceneEditor(null);
                      }}
                      className="h-9 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => setSceneEditor(null)}
                    className="h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.06] text-white/30 text-xs flex items-center gap-1.5 hover:text-white/50 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                  <button
                    onClick={saveScene}
                    disabled={!sceneEditor.scene.name.trim()}
                    className="h-9 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1.5 disabled:opacity-30 hover:bg-emerald-500/25 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    {sceneEditor.isNew ? "Create" : "Save"}
                  </button>
                </div>
              </div>

              {/* Active count summary */}
              <div className="mb-4 flex items-center gap-3">
                <p className="text-white/25 text-xs">
                  {sceneEditor.scene.circuits.filter((sc) => sc.on).length} of{" "}
                  {circuits.length} circuits active in this scene
                </p>
                <button
                  onClick={() => {
                    const allOn = sceneEditor.scene.circuits.every((sc) => sc.on);
                    setSceneEditor({
                      ...sceneEditor,
                      scene: {
                        ...sceneEditor.scene,
                        circuits: sceneEditor.scene.circuits.map((sc) => ({
                          ...sc,
                          on: !allOn,
                        })),
                      },
                    });
                  }}
                  className="text-[10px] text-white/20 hover:text-white/40 uppercase tracking-wider transition-colors"
                >
                  {sceneEditor.scene.circuits.every((sc) => sc.on) ? "All Off" : "All On"}
                </button>
              </div>

              {/* Circuit rows */}
              <div className="space-y-2">
                {sceneEditor.scene.circuits.map((sc) => {
                  const roomCircuit = circuits.find((c) => c.id === sc.circuitId);
                  if (!roomCircuit) return null;
                  return (
                    <div
                      key={sc.circuitId}
                      className={`rounded-xl border p-3 transition-colors ${
                        sc.on
                          ? "bg-white/[0.05] border-white/[0.10]"
                          : "bg-white/[0.02] border-white/[0.05]"
                      }`}
                    >
                      {/* Row top: icon, name, on/off toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
                            style={{
                              backgroundColor: sc.on ? `${sc.color}18` : "rgba(255,255,255,0.03)",
                              borderColor: sc.on ? `${sc.color}35` : "rgba(255,255,255,0.05)",
                            }}
                          >
                            <Lightbulb
                              className="w-3.5 h-3.5"
                              style={{ color: sc.on ? sc.color : "rgba(255,255,255,0.15)" }}
                            />
                          </div>
                          <div>
                            <p className={`text-sm transition-colors ${sc.on ? "text-white" : "text-white/30"}`}>
                              {roomCircuit.name}
                            </p>
                            {sc.on && (
                              <p className="text-white/20 text-[10px]">
                                {sc.brightness}% &middot; {sc.color}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => updateEditorCircuit(sc.circuitId, { on: !sc.on })}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                            sc.on
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                              : "bg-white/[0.04] border-white/[0.06] text-white/15"
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Expanded controls when ON */}
                      {sc.on && (
                        <div className="mt-3 space-y-2.5 pl-11">
                          {/* Brightness slider */}
                          <div className="flex items-center gap-3">
                            <Sun className="w-3 h-3 text-white/20 shrink-0" />
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={sc.brightness}
                              onChange={(e) =>
                                updateEditorCircuit(sc.circuitId, {
                                  brightness: Number(e.target.value),
                                })
                              }
                              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, ${sc.color}cc 0%, ${sc.color}cc ${sc.brightness}%, rgba(255,255,255,0.08) ${sc.brightness}%, rgba(255,255,255,0.08) 100%)`,
                              }}
                            />
                            <span className="text-white/30 text-xs w-9 text-right tabular-nums">
                              {sc.brightness}%
                            </span>
                          </div>

                          {/* Color presets */}
                          <div className="flex items-center gap-2">
                            <Palette className="w-3 h-3 text-white/20 shrink-0" />
                            <div className="flex gap-1.5 flex-wrap">
                              {[
                                "#ffffff",
                                "#fbbf24",
                                "#f97316",
                                "#ef4444",
                                "#ec4899",
                                "#a855f7",
                                "#6366f1",
                                "#3b82f6",
                                "#06b6d4",
                                "#22c55e",
                              ].map((color) => (
                                <button
                                  key={color}
                                  onClick={() =>
                                    updateEditorCircuit(sc.circuitId, { color })
                                  }
                                  className={`w-5 h-5 rounded-full border transition-transform hover:scale-125 ${
                                    sc.color === color
                                      ? "border-white/50 scale-110"
                                      : "border-white/10"
                                  }`}
                                  style={{
                                    backgroundColor: color,
                                    boxShadow: sc.color === color ? `0 0 8px ${color}60` : "none",
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          ) : (
            /* ── Scene List (no editor open) ── */
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-white/50 text-xs tracking-widest uppercase">
                  Saved Scenes
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openNewSceneFromCurrent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.06] text-white/35 text-xs hover:bg-white/[0.10] hover:text-white/60 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    Save Current
                  </button>
                  <button
                    onClick={openNewScene}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs hover:bg-blue-500/25 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    New Scene
                  </button>
                </div>
              </div>

              {scenes.length === 0 && (
                <GlassCard className="p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                    <Layers className="w-6 h-6 text-white/10" />
                  </div>
                  <p className="text-white/20 text-sm">No scenes yet</p>
                  <p className="text-white/10 text-xs mt-1">
                    Create a scene to save and recall light settings
                  </p>
                </GlassCard>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {scenes.map((scene) => {
                  const activeCount = scene.circuits.filter((sc) => sc.on).length;
                  return (
                    <GlassCard key={scene.id} className="p-4 group">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white text-sm">{scene.name}</h4>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditScene(scene)}
                            className="w-6 h-6 rounded-lg bg-white/[0.06] text-white/30 flex items-center justify-center hover:text-white/60"
                            title="Edit scene"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteScene(scene.id)}
                            className="w-6 h-6 rounded-lg text-white/15 flex items-center justify-center hover:text-red-400 hover:bg-red-500/10"
                            title="Delete scene"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Scene preview — circuit chips */}
                      <div className="flex gap-1.5 mb-3 flex-wrap">
                        {scene.circuits.map((sc) => {
                          const circ = circuits.find((c) => c.id === sc.circuitId);
                          return (
                            <div
                              key={sc.circuitId}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: sc.on ? sc.color : "rgba(255,255,255,0.15)",
                                  boxShadow: sc.on ? `0 0 6px ${sc.color}60` : "none",
                                }}
                              />
                              <span className="text-white/30 text-[10px]">
                                {circ?.name.split(" ")[0] || sc.circuitId}
                              </span>
                              {sc.on && (
                                <span className="text-white/15 text-[9px]">
                                  {sc.brightness}%
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-white/15 text-[10px] mb-2">
                        {activeCount} circuit{activeCount !== 1 ? "s" : ""} active
                      </p>

                      <button
                        onClick={() => applyScene(scene)}
                        className="w-full py-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-white/40 text-xs hover:bg-white/[0.12] hover:text-white/70 transition-colors"
                      >
                        Apply Scene
                      </button>
                    </GlassCard>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ A/V TAB ═══ */}
      {activeTab === "av" && (
        <div className="space-y-4">
          {/* ── Remote Toggle (segmented control) ── */}
          <div className="flex items-center justify-between">
            <h3 className="text-white/50 text-xs tracking-widest uppercase">
              Remotes &amp; Sources
            </h3>
            {/* Segmented toggle — only functional on mobile (<md), hidden on desktop */}
            <div className="flex md:hidden rounded-xl bg-white/[0.05] border border-white/[0.06] p-0.5">
              {([
                { id: "main" as const, label: "Main Remote" },
                { id: "appletv" as const, label: "Apple TV" },
                { id: "beo" as const, label: "BeoRemote" },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setAvRemoteTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    avRemoteTab === t.id
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-white/30 hover:text-white/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Remote Panels ── */}
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* Left: Main Remote (AV Sources) */}
            <div
              className={`flex-1 min-w-0 w-full ${
                avRemoteTab !== "main" ? "hidden md:block" : ""
              }`}
            >
              {/* Desktop-only label */}
              <p className="hidden md:block text-white/25 text-[10px] tracking-widest uppercase mb-2">
                Main Remote
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {avSources.map((av) => (
                  <GlassCard key={av.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
                            av.active
                              ? av.type === "audio"
                                ? "bg-violet-500/15 border-violet-500/30"
                                : "bg-blue-500/15 border-blue-500/30"
                              : "bg-white/[0.04] border-white/[0.06]"
                          }`}
                        >
                          {av.type === "audio" ? (
                            <Music
                              className="w-4 h-4"
                              style={{
                                color: av.active
                                  ? "#a78bfa"
                                  : "rgba(255,255,255,0.2)",
                              }}
                            />
                          ) : (
                            <Tv
                              className="w-4 h-4"
                              style={{
                                color: av.active
                                  ? "#60a5fa"
                                  : "rgba(255,255,255,0.2)",
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm">{av.name}</p>
                          <p className="text-white/25 text-xs">
                            {av.active ? av.source : "Standby"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleAV(av.id)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                          av.active
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                            : "bg-white/[0.04] border-white/[0.06] text-white/20"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {av.active && av.type === "audio" && av.volume !== undefined && (
                      <div className="flex items-center gap-3 mt-1">
                        <Volume2 className="w-3 h-3 text-white/20" />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={av.volume}
                          onChange={(e) => setAVVolume(av.id, Number(e.target.value))}
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, rgba(139,92,246,0.7) 0%, rgba(139,92,246,0.7) ${av.volume}%, rgba(255,255,255,0.1) ${av.volume}%, rgba(255,255,255,0.1) 100%)`,
                          }}
                        />
                        <span className="text-white/30 text-xs w-8 text-right">
                          {av.volume}%
                        </span>
                      </div>
                    )}
                  </GlassCard>
                ))}

                {avSources.length === 0 && (
                  <GlassCard className="p-8 sm:col-span-2 text-center">
                    <p className="text-white/20 text-sm">
                      No A/V sources configured for this room
                    </p>
                  </GlassCard>
                )}
              </div>
            </div>

            {/* Right: Apple TV Remote */}
            <div
              className={`shrink-0 w-full md:w-auto flex flex-col items-center ${
                avRemoteTab !== "appletv" ? "hidden md:flex" : ""
              }`}
            >
              {/* Desktop-only label */}
              <p className="hidden md:block text-white/25 text-[10px] tracking-widest uppercase mb-2 self-start">
                Apple TV
              </p>

              {/* Remote Skin Selector */}
              <div className="flex rounded-xl bg-white/[0.05] border border-white/[0.06] p-0.5 mb-3">
                {([
                  { id: "silver" as const, label: "Silver" },
                  { id: "white" as const, label: "White" },
                  { id: "black" as const, label: "Black" },
                ]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setRemoteSkin(s.id)}
                    className={`px-3 py-1 rounded-lg text-[11px] transition-all ${
                      remoteSkin === s.id
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/25 hover:text-white/45"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <GlassCard className="p-5 inline-flex">
                {remoteSkin === "silver" && (
                  <AppleTVRemote
                    onCommand={(cmd) => console.log(`[AppleTV Silver] ${cmd}`)}
                  />
                )}
                {remoteSkin === "white" && (
                  <AppleTVRemoteWhite
                    onCommand={(cmd) => console.log(`[AppleTV White] ${cmd}`)}
                  />
                )}
                {remoteSkin === "black" && (
                  <AppleTVRemoteBlack
                    onCommand={(cmd) => console.log(`[AppleTV Black] ${cmd}`)}
                  />
                )}
              </GlassCard>
            </div>

            {/* Right: BeoRemote */}
            <div
              className={`shrink-0 w-full md:w-auto flex flex-col items-center ${
                avRemoteTab !== "beo" ? "hidden md:flex" : ""
              }`}
            >
              {/* Desktop-only label */}
              <p className="hidden md:block text-white/25 text-[10px] tracking-widest uppercase mb-2 self-start">
                BeoRemote
              </p>

              {/* Remote Skin Selector */}
              <div className="flex rounded-xl bg-white/[0.05] border border-white/[0.06] p-0.5 mb-3">
                {([
                  { id: "black" as const, label: "Black" },
                  { id: "silver" as const, label: "Silver" },
                ]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setBeoSkin(s.id)}
                    className={`px-3 py-1 rounded-lg text-[11px] transition-all ${
                      beoSkin === s.id
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/25 hover:text-white/45"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <GlassCard className="p-5 inline-flex">
                <BeoRemoteOne
                  onCommand={(cmd) => console.log(`[BeoRemote] ${cmd}`)}
                  aesthetic={beoSkin}
                />
              </GlassCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
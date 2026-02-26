import React, { useState } from "react";
import {
  Settings,
  Bell,
  Wifi,
  Clock,
  Home,
  UtensilsCrossed,
  BedDouble,
  Sparkles,
  MonitorPlay,
  TreePine,
  Music,
  Tv,
  Shield,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  CalendarDays,
  FlaskConical,
  Cpu,
} from "lucide-react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { AudioSection } from "./components/AudioSection";
import { VideoSection } from "./components/VideoSection";
import { SecuritySection } from "./components/SecuritySection";
import { SettingsSection } from "./components/SettingsSection";
import { KeypadSection } from "./components/KeypadSection";
import { CalendarSection } from "./components/CalendarSection";
import { RoomDetailSection } from "./components/RoomDetailSection";
import { LightGroupLab } from "./components/LightGroupLab";
import { OverviewDashboard } from "./components/OverviewDashboard";
import { TechControlPanel } from "./components/TechControlPanel";
import { ProjectExportButton } from "./components/ProjectExporter";

/* ─── Constants ─── */
const BG_IMAGE =
  "https://images.unsplash.com/photo-1698864551603-0f7aefaebeb4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsdXh1cnklMjBob3VzZSUyMGludGVyaW9yJTIwZGFyayUyMGFtYmllbnR8ZW58MXx8fHwxNzcxNzU4NjkzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

const CAMERA_IMAGE =
  "https://images.unsplash.com/photo-1668973291514-f6a88e4096cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsdXh1cnklMjBob21lJTIwZW50cmFuY2UlMjBnYXRlJTIwbmlnaHR8ZW58MXx8fHwxNzcxNzU4NjkyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

const ALBUM_IMAGE =
  "https://images.unsplash.com/photo-1771301455501-694654813e1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbGJ1bSUyMGNvdmVyJTIwYXJ0JTIwYWJzdHJhY3QlMjBtdXNpY3xlbnwxfHx8fDE3NzE3NTg2OTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

const rooms = [
  { id: "living", name: "Living Room", icon: Home },
  { id: "kitchen", name: "Kitchen", icon: UtensilsCrossed },
  { id: "bedroom", name: "Master Bedroom", icon: BedDouble },
  { id: "cinema", name: "Cinema", icon: Sparkles },
  { id: "display", name: "Media Room", icon: MonitorPlay },
  { id: "outdoor", name: "Outdoor", icon: TreePine },
];

const sections = [
  { id: "overview", name: "Overview", icon: LayoutGrid },
  { id: "techcontrol", name: "Tech Control", icon: Cpu },
  { id: "audio", name: "Audio", icon: Music },
  { id: "video", name: "Video", icon: Tv },
  { id: "security", name: "Security", icon: Shield },
  { id: "keypad", name: "Keypad", icon: Lock },
  { id: "calendar", name: "Calendar", icon: CalendarDays },
  { id: "settings", name: "Settings", icon: Settings },
];

const labSections = [
  { id: "lightlab", name: "Light Group Lab", icon: FlaskConical },
];

/* ─── App ─── */
export default function App() {
  const [activeSection, setActiveSection] = useState("overview");
  const [bgImage, setBgImage] = useState(BG_IMAGE);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeRoom, setActiveRoom] = useState("living");

  const handleRoomClick = (roomId: string) => {
    setActiveRoom(roomId);
    setActiveSection("room-detail");
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  const renderContent = () => {
    switch (activeSection) {
      case "audio": return <AudioSection />;
      case "video": return <VideoSection />;
      case "security": return <SecuritySection />;
      case "keypad": return <KeypadSection />;
      case "calendar": return <CalendarSection />;
      case "settings": return <SettingsSection currentBg={bgImage} onBgChange={setBgImage} />;
      case "techcontrol": return <TechControlPanel />;
      case "lightlab": return <LightGroupLab />;
      case "room-detail": {
        const room = rooms.find((r) => r.id === activeRoom);
        return <RoomDetailSection roomId={activeRoom} roomName={room?.name || "Room"} />;
      }
      default:
        return (
          <OverviewDashboard albumImage={ALBUM_IMAGE} cameraImage={CAMERA_IMAGE} />
        );
    }
  };

  return (
    <div data-export-root className="relative min-h-screen w-full overflow-hidden text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Background image */}
      <ImageWithFallback src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
      {/* Single dark overlay with backdrop-blur */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ─── Top Bar ─── */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.10] transition-all"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <span className="text-white/80 text-sm tracking-wide">Crestron Home</span>
          </div>
          <div className="flex items-center gap-4">
            <ProjectExportButton />
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeStr}</span>
              <span className="text-white/20 mx-1">·</span>
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400/60" />
              <button className="relative w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
                <Bell className="w-4 h-4" />
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
              </button>
            </div>
          </div>
        </header>

        {/* ─── Main Layout ─── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav
            className={`shrink-0 border-r border-white/[0.06] overflow-y-auto py-4 transition-all duration-300 ${
              sidebarCollapsed ? "w-16" : "w-52"
            }`}
          >
            <div className="space-y-1 px-2">
              {sections.map((s) => {
                const Icon = s.icon;
                const active = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                      active
                        ? "bg-white/[0.10] text-white"
                        : "text-white/40 hover:bg-white/[0.05] hover:text-white/60"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{s.name}</span>}
                  </button>
                );
              })}
            </div>

            {/* Rooms */}
            <div className="mt-6 px-2">
              {!sidebarCollapsed && (
                <span className="text-white/20 text-[10px] tracking-widest uppercase px-3 mb-2 block">
                  Rooms
                </span>
              )}
              <div className="space-y-1">
                {rooms.map((r) => {
                  const Icon = r.icon;
                  const active = activeSection === "room-detail" && activeRoom === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleRoomClick(r.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                        active
                          ? "bg-white/[0.10] text-white"
                          : "text-white/30 hover:bg-white/[0.05] hover:text-white/50"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{r.name}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Labs */}
            <div className="mt-6 px-2">
              {!sidebarCollapsed && (
                <span className="text-white/20 text-[10px] tracking-widest uppercase px-3 mb-2 block">
                  Labs
                </span>
              )}
              <div className="space-y-1">
                {labSections.map((s) => {
                  const Icon = s.icon;
                  const active = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                        active
                          ? "bg-amber-500/15 text-amber-400"
                          : "text-white/30 hover:bg-white/[0.05] hover:text-white/50"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{s.name}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>
        </div>
      </div>
    </div>
  );
}
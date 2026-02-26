import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  X,
  Trash2,
  Lightbulb,
  Music,
  Tv,
  Thermometer,
  Shield,
  Zap,
  GripVertical,
  ChevronDown,
} from "lucide-react";

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
type CommandType = "lighting" | "audio" | "video" | "climate" | "security";

interface MacroCommand {
  id: number;
  type: CommandType;
  room: string;
  action: string;
  value: string;
  circuit?: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  category: Category;
  location?: string;
  commands: MacroCommand[];
}

type Category = "automation" | "personal" | "system" | "maintenance";

const CATEGORY_META: Record<
  Category,
  { label: string; color: string; bg: string; border: string; dot: string; glow: string }
> = {
  automation: {
    label: "Automation",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/25",
    dot: "bg-blue-400",
    glow: "shadow-[0_0_10px_rgba(59,130,246,0.4)]",
  },
  personal: {
    label: "Personal",
    color: "text-violet-400",
    bg: "bg-violet-500/15",
    border: "border-violet-500/25",
    dot: "bg-violet-400",
    glow: "shadow-[0_0_10px_rgba(139,92,246,0.4)]",
  },
  system: {
    label: "System",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/25",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_10px_rgba(52,211,153,0.4)]",
  },
  maintenance: {
    label: "Maintenance",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/25",
    dot: "bg-amber-400",
    glow: "shadow-[0_0_10px_rgba(251,191,36,0.4)]",
  },
};

const COMMAND_META: Record<CommandType, { label: string; icon: typeof Lightbulb; color: string; bg: string; border: string }> = {
  lighting: { label: "Lighting", icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/25" },
  audio: { label: "Audio", icon: Music, color: "text-violet-400", bg: "bg-violet-500/15", border: "border-violet-500/25" },
  video: { label: "Video", icon: Tv, color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/25" },
  climate: { label: "Climate", icon: Thermometer, color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/25" },
  security: { label: "Security", icon: Shield, color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/25" },
};

const ROOMS = ["Living Room", "Kitchen", "Master Bedroom", "Cinema", "Media Room", "Outdoor", "All Zones"];

/* ─── Room → Circuit mapping (mirrors RoomDetailSection data) ─── */
const ROOM_CIRCUITS_MAP: Record<string, string[]> = {
  "Living Room": ["Ceiling Spots", "Wall Sconces", "Floor Uplights", "LED Strip", "Reading Lamp"],
  "Kitchen": ["Under-cabinet LEDs", "Island Pendants", "Pantry Light", "Accent Strip"],
  "Master Bedroom": ["Bedside Left", "Bedside Right", "Ceiling Cove", "Closet Light"],
  "Cinema": ["Star Ceiling", "Aisle Lights", "Screen Bias", "Entry Spots"],
  "Media Room": ["Track Lighting", "Display Spots", "Ambient LEDs"],
  "Outdoor": ["Path Lights", "Pool Lights", "Garden Spots", "Deck Strip", "Facade Wash"],
  "All Zones": [],
};

/* ─── Room → Scenes mapping ─── */
const ROOM_SCENES_MAP: Record<string, string[]> = {
  "Living Room": ["Movie Night", "Reading", "Party"],
  "Kitchen": ["Cooking", "Dinner"],
  "Master Bedroom": ["Sleep", "Wake Up"],
  "Cinema": ["Showtime"],
  "Media Room": ["Gallery"],
  "Outdoor": ["Evening", "Pool Party"],
  "All Zones": ["All Off", "All On"],
};

/* ─── Room → AV sources mapping ─── */
const ROOM_AV_MAP: Record<string, string[]> = {
  "Living Room": ["Sonos Arc", "LG OLED 77\""],
  "Kitchen": ["Sonos One"],
  "Master Bedroom": ["HomePod Mini", "Samsung 55\""],
  "Cinema": ["Dolby 7.1.4", "Projector 4K", "Subwoofer"],
  "Media Room": ["Soundbar", "Samsung 85\""],
  "Outdoor": ["Garden Speakers"],
  "All Zones": [],
};

const COMMAND_ACTIONS: Record<CommandType, { action: string; values: string[] }[]> = {
  lighting: [
    { action: "Set Scene", values: ["Movie Night", "Reading", "Party", "Evening", "Sleep", "Wake Up", "Cooking", "Dinner"] },
    { action: "Set Brightness", values: ["0%", "25%", "50%", "75%", "100%"] },
    { action: "Set Color", values: ["Warm White", "Cool White", "Red", "Blue", "Purple", "Cyan", "Green", "Amber"] },
    { action: "All Off", values: ["Confirm"] },
    { action: "All On", values: ["Confirm"] },
  ],
  audio: [
    { action: "Play Playlist", values: ["Chill Vibes", "Focus Mode", "Evening Jazz", "Workout Energy", "Deep House", "Classical"] },
    { action: "Set Volume", values: ["10%", "25%", "50%", "75%", "100%"] },
    { action: "Switch Source", values: ["Spotify", "Apple Music", "AirPlay", "Radio", "Bluetooth", "Line In"] },
    { action: "Stop Playback", values: ["Confirm"] },
  ],
  video: [
    { action: "Power On", values: ["Confirm"] },
    { action: "Power Off", values: ["Confirm"] },
    { action: "Switch Source", values: ["Apple TV", "Netflix", "HDMI 1", "HDMI 2", "Blu-ray", "Cable"] },
    { action: "Set Channel", values: ["CNN", "HBO", "ESPN", "Discovery", "National Geographic"] },
  ],
  climate: [
    { action: "Set Temperature", values: ["18°C", "20°C", "22°C", "24°C", "26°C"] },
    { action: "Set Mode", values: ["Cooling", "Heating", "Auto", "Fan Only"] },
    { action: "Turn Off", values: ["Confirm"] },
  ],
  security: [
    { action: "Arm System", values: ["All Zones", "Perimeter Only", "Night Mode"] },
    { action: "Disarm System", values: ["Confirm"] },
    { action: "Lock Doors", values: ["All Doors", "Front Door", "Back Door", "Garage"] },
    { action: "Unlock Doors", values: ["All Doors", "Front Door", "Back Door", "Garage"] },
  ],
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ─── Helpers ─── */
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayStr() {
  const d = new Date();
  return formatDate(d.getFullYear(), d.getMonth(), d.getDate());
}

/* ─── Seed Events ─── */
const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 1,
    title: "Morning Routine",
    date: "2026-02-22",
    startTime: "07:00",
    endTime: "07:30",
    category: "automation",
    location: "All Zones",
    commands: [
      { id: 1, type: "lighting", room: "Master Bedroom", action: "Set Scene", value: "Wake Up" },
      { id: 2, type: "audio", room: "Kitchen", action: "Play Playlist", value: "Chill Vibes" },
      { id: 3, type: "climate", room: "All Zones", action: "Set Temperature", value: "22°C" },
    ],
  },
  {
    id: 2,
    title: "Cinema Night",
    date: "2026-02-22",
    startTime: "19:00",
    endTime: "22:00",
    category: "personal",
    location: "Cinema",
    commands: [
      { id: 1, type: "lighting", room: "Cinema", action: "Set Scene", value: "Movie Night" },
      { id: 2, type: "video", room: "Cinema", action: "Power On", value: "Confirm" },
      { id: 3, type: "audio", room: "Cinema", action: "Set Volume", value: "75%" },
      { id: 4, type: "lighting", room: "Living Room", action: "Set Brightness", value: "25%" },
    ],
  },
  {
    id: 3,
    title: "HVAC Maintenance",
    date: "2026-02-23",
    startTime: "08:00",
    endTime: "12:00",
    category: "maintenance",
    location: "Mechanical Room",
    commands: [],
  },
  {
    id: 4,
    title: "Night Lockdown",
    date: "2026-02-22",
    startTime: "23:00",
    endTime: "23:05",
    category: "automation",
    location: "All Zones",
    commands: [
      { id: 1, type: "security", room: "All Zones", action: "Arm System", value: "All Zones" },
      { id: 2, type: "security", room: "All Zones", action: "Lock Doors", value: "All Doors" },
      { id: 3, type: "lighting", room: "All Zones", action: "All Off", value: "Confirm" },
      { id: 4, type: "climate", room: "All Zones", action: "Set Temperature", value: "20°C" },
    ],
  },
  {
    id: 5,
    title: "Pool Pump Inspection",
    date: "2026-02-25",
    startTime: "10:00",
    endTime: "11:00",
    category: "maintenance",
    location: "Pool Area",
    commands: [],
  },
  {
    id: 6,
    title: "Firmware Update",
    date: "2026-02-26",
    startTime: "03:00",
    endTime: "03:30",
    category: "system",
    commands: [],
  },
  {
    id: 7,
    title: "Party Mode",
    date: "2026-02-28",
    startTime: "18:00",
    endTime: "23:00",
    category: "automation",
    location: "Living Room",
    commands: [
      { id: 1, type: "lighting", room: "Living Room", action: "Set Scene", value: "Party" },
      { id: 2, type: "audio", room: "Living Room", action: "Play Playlist", value: "Deep House" },
      { id: 3, type: "audio", room: "Living Room", action: "Set Volume", value: "75%" },
      { id: 4, type: "lighting", room: "Outdoor", action: "Set Color", value: "Purple" },
    ],
  },
  {
    id: 8,
    title: "Landscaping Visit",
    date: "2026-03-02",
    startTime: "07:00",
    endTime: "12:00",
    category: "maintenance",
    location: "Garden",
    commands: [],
  },
  {
    id: 9,
    title: "Network Check",
    date: "2026-03-05",
    startTime: "02:00",
    endTime: "02:15",
    category: "system",
    commands: [],
  },
];

/* ─── Calendar Section ─── */
export function CalendarSection() {
  const [currentMonth, setCurrentMonth] = useState(1);
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [showForm, setShowForm] = useState(false);
  const [time, setTime] = useState(new Date());
  const [nextId, setNextId] = useState(20);
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");
  const [formCategory, setFormCategory] = useState<Category>("automation");
  const [formLocation, setFormLocation] = useState("");
  const [formCommands, setFormCommands] = useState<MacroCommand[]>([]);
  const [cmdNextId, setCmdNextId] = useState(1);

  // Add command form
  const [showAddCmd, setShowAddCmd] = useState(false);
  const [cmdType, setCmdType] = useState<CommandType>("lighting");
  const [cmdRoom, setCmdRoom] = useState("Living Room");
  const [cmdAction, setCmdAction] = useState("");
  const [cmdValue, setCmdValue] = useState("");
  const [cmdCircuit, setCmdCircuit] = useState("All Circuits");

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = todayStr();

  const eventsForDate = (dateStr: string) =>
    events.filter((e) => e.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const selectedEvents = eventsForDate(selectedDate);
  const todayEvents = eventsForDate(today);

  const openForm = () => {
    setFormTitle("");
    setFormDate(selectedDate);
    setFormStart("09:00");
    setFormEnd("10:00");
    setFormCategory("automation");
    setFormLocation("");
    setFormCommands([]);
    setCmdNextId(1);
    setShowAddCmd(false);
    setShowForm(true);
  };

  const addCommand = () => {
    if (!cmdAction || !cmdValue) return;
    const newCmd: MacroCommand = {
      id: cmdNextId,
      type: cmdType,
      room: cmdRoom,
      action: cmdAction,
      value: cmdValue,
      circuit: cmdCircuit,
    };
    setFormCommands((prev) => [...prev, newCmd]);
    setCmdNextId((n) => n + 1);
    setCmdAction("");
    setCmdValue("");
    setShowAddCmd(false);
  };

  const removeCommand = (id: number) => {
    setFormCommands((prev) => prev.filter((c) => c.id !== id));
  };

  const submitEvent = () => {
    if (!formTitle.trim()) return;
    const newEvent: CalendarEvent = {
      id: nextId,
      title: formTitle.trim(),
      date: formDate,
      startTime: formStart,
      endTime: formEnd,
      category: formCategory,
      location: formLocation.trim() || undefined,
      commands: formCommands,
    };
    setEvents((prev) => [...prev, newEvent]);
    setNextId((n) => n + 1);
    setShowForm(false);
  };

  const deleteEvent = (id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (viewingEvent?.id === id) setViewingEvent(null);
  };

  // Clock
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Left: Clock + Stats ── */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <GlassCard className="p-6">
            <div className="flex flex-col items-center">
              <div className="relative w-[200px] h-[200px] mb-4">
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
                  <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i * 30 - 90) * (Math.PI / 180);
                    const x1 = 100 + 80 * Math.cos(angle);
                    const y1 = 100 + 80 * Math.sin(angle);
                    const x2 = 100 + (i % 3 === 0 ? 70 : 74) * Math.cos(angle);
                    const y2 = 100 + (i % 3 === 0 ? 70 : 74) * Math.sin(angle);
                    return (
                      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={i % 3 === 0 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}
                        strokeWidth={i % 3 === 0 ? 2 : 1} strokeLinecap="round" />
                    );
                  })}
                  {Array.from({ length: 60 }).map((_, i) => {
                    if (i % 5 === 0) return null;
                    const angle = (i * 6 - 90) * (Math.PI / 180);
                    return (
                      <line key={`m${i}`}
                        x1={100 + 80 * Math.cos(angle)} y1={100 + 80 * Math.sin(angle)}
                        x2={100 + 77 * Math.cos(angle)} y2={100 + 77 * Math.sin(angle)}
                        stroke="rgba(255,255,255,0.06)" strokeWidth={0.8} strokeLinecap="round" />
                    );
                  })}
                  <line x1="100" y1="100"
                    x2={100 + 45 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
                    y2={100 + 45 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
                    stroke="rgba(255,255,255,0.9)" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="100" y1="100"
                    x2={100 + 62 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
                    y2={100 + 62 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
                    stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" />
                  <line
                    x1={100 - 15 * Math.cos((secondAngle - 90) * (Math.PI / 180))}
                    y1={100 - 15 * Math.sin((secondAngle - 90) * (Math.PI / 180))}
                    x2={100 + 70 * Math.cos((secondAngle - 90) * (Math.PI / 180))}
                    y2={100 + 70 * Math.sin((secondAngle - 90) * (Math.PI / 180))}
                    stroke="rgba(59,130,246,0.9)" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="100" cy="100" r="4" fill="rgba(59,130,246,0.9)" />
                  <circle cx="100" cy="100" r="2" fill="white" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-white text-3xl tracking-widest tabular-nums">
                  {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                </p>
                <p className="text-white/30 text-sm mt-1">
                  {time.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Today's Timeline */}
          <GlassCard className="p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/40" />
                <h3 className="text-white/60 text-xs tracking-widest uppercase">
                  Today&apos;s Schedule
                </h3>
              </div>
              <span className="text-white/20 text-xs">
                {todayEvents.length} event{todayEvents.length !== 1 ? "s" : ""}
              </span>
            </div>

            {todayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/20">
                <CalendarDays className="w-8 h-8 mb-2" />
                <p className="text-xs">No events today</p>
              </div>
            ) : (
              <div className="space-y-0 relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/[0.08]" />
                {todayEvents.map((event) => {
                  const meta = CATEGORY_META[event.category];
                  return (
                    <button
                      key={event.id}
                      onClick={() => setViewingEvent(event)}
                      className="relative flex items-start gap-4 py-3 w-full text-left hover:bg-white/[0.03] rounded-lg transition-colors"
                    >
                      <div className="relative z-10 shrink-0 mt-1">
                        <div className={`w-[10px] h-[10px] rounded-full ${meta.dot} ${meta.glow}`} style={{ marginLeft: "10px" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm truncate">{event.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-white/30 text-[11px]">{event.startTime} - {event.endTime}</span>
                          {event.commands.length > 0 && (
                            <span className="text-white/15 text-[10px] flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" />
                              {event.commands.length} cmd
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`text-[9px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} shrink-0 mt-0.5`}>
                        {meta.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* ── Center: Calendar Grid ── */}
        <div className="lg:col-span-5">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/15 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="text-white text-lg">{MONTHS[currentMonth]}</p>
                <p className="text-white/30 text-xs">{currentYear}</p>
              </div>
              <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/15 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-white/25 text-[10px] tracking-wider uppercase py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDate(currentYear, currentMonth, day);
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const dayEvents = eventsForDate(dateStr);
                const hasEvents = dayEvents.length > 0;
                const cats = [...new Set(dayEvents.map((e) => e.category))].slice(0, 3);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-colors border ${
                      isSelected
                        ? "bg-blue-500/25 border-blue-400/40 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                        : isToday
                        ? "bg-white/15 border-white/20 text-white"
                        : hasEvents
                        ? "bg-white/[0.04] border-white/[0.06] text-white/80 hover:bg-white/10"
                        : "border-transparent text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                    }`}
                  >
                    <span className="text-sm">{day}</span>
                    {hasEvents && (
                      <div className="flex gap-0.5 mt-0.5">
                        {cats.map((cat) => (
                          <div key={cat} className={`w-1 h-1 rounded-full ${CATEGORY_META[cat].dot}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-white/[0.06]">
              {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
                const meta = CATEGORY_META[cat];
                return (
                  <div key={cat} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    <span className="text-white/30 text-[10px]">{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* ── Right: Selected Day Events ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <GlassCard className="p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white/60 text-xs tracking-widest uppercase">Events</h3>
                <p className="text-white/30 text-[11px] mt-0.5">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                </p>
              </div>
              <button onClick={openForm} className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 hover:bg-blue-500/25 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-white/15">
                <CalendarDays className="w-6 h-6 mb-2" />
                <p className="text-xs">No events</p>
                <button onClick={openForm} className="text-blue-400/50 text-[11px] mt-2 hover:text-blue-400 transition-colors">
                  + Create macro
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
                {selectedEvents.map((event) => {
                  const meta = CATEGORY_META[event.category];
                  return (
                    <button
                      key={event.id}
                      onClick={() => setViewingEvent(event)}
                      className={`p-3 rounded-xl border transition-colors w-full text-left ${meta.bg} ${meta.border} hover:brightness-125`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${meta.color}`}>{event.title}</p>
                          <p className="text-white/30 text-[11px] mt-1">{event.startTime} - {event.endTime}</p>
                          {event.commands.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Zap className="w-2.5 h-2.5 text-white/20" />
                              <span className="text-white/20 text-[10px]">{event.commands.length} commands</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-white text-xl">{events.filter((e) => e.date >= today).length}</p>
                <p className="text-white/25 text-[10px] mt-0.5">Upcoming</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-white text-xl">{events.filter((e) => e.commands.length > 0).length}</p>
                <p className="text-white/25 text-[10px] mt-0.5">Macros</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ══════ Event Detail / Macro Viewer Modal ══════ */}
      {viewingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setViewingEvent(null)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[rgba(15,18,30,0.95)] shadow-2xl p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${CATEGORY_META[viewingEvent.category].bg} ${CATEGORY_META[viewingEvent.category].border} border flex items-center justify-center`}>
                  <Zap className={`w-5 h-5 ${CATEGORY_META[viewingEvent.category].color}`} />
                </div>
                <div>
                  <h2 className="text-white text-lg">{viewingEvent.title}</h2>
                  <p className="text-white/30 text-xs">
                    {viewingEvent.startTime} - {viewingEvent.endTime}
                    {viewingEvent.location && ` · ${viewingEvent.location}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingEvent(null)} className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/15 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {viewingEvent.commands.length > 0 ? (
              <div className="space-y-2">
                <p className="text-white/40 text-xs tracking-widest uppercase mb-2">Command Sequence</p>
                {viewingEvent.commands.map((cmd, idx) => {
                  const cmdMeta = COMMAND_META[cmd.type];
                  const Icon = cmdMeta.icon;
                  return (
                    <div key={cmd.id} className={`flex items-center gap-3 p-3 rounded-xl border ${cmdMeta.bg} ${cmdMeta.border}`}>
                      <div className="w-6 h-6 rounded-lg bg-white/[0.08] flex items-center justify-center text-white/30 text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <Icon className={`w-4 h-4 ${cmdMeta.color} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${cmdMeta.color}`}>{cmd.action}</p>
                        <p className="text-white/25 text-[10px]">{cmd.room} · {cmd.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-white/20 text-sm">
                No automation commands — manual event
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setViewingEvent(null)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white/40 text-sm hover:text-white/60 hover:bg-white/10 transition-colors">
                Close
              </button>
              <button onClick={() => { deleteEvent(viewingEvent.id); }} className="px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm hover:bg-red-500/25 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Macro Creation Modal ══════ */}
      {showForm && (() => {
        /* Dynamic data based on cmdType + cmdRoom */
        const roomCircuits = ROOM_CIRCUITS_MAP[cmdRoom] || [];
        const roomScenes = ROOM_SCENES_MAP[cmdRoom] || [];
        const roomAVSources = ROOM_AV_MAP[cmdRoom] || [];

        const getDynamicActions = (): { action: string; values: string[] }[] => {
          if (cmdType === "lighting") {
            const a: { action: string; values: string[] }[] = [];
            if (roomScenes.length > 0) a.push({ action: "Set Scene", values: roomScenes });
            a.push({ action: "Set Brightness", values: ["0%", "25%", "50%", "75%", "100%"] });
            a.push({ action: "Set Color", values: ["Warm White", "Cool White", "Red", "Blue", "Purple", "Cyan", "Green", "Amber"] });
            a.push({ action: "All Off", values: ["Confirm"] });
            a.push({ action: "All On", values: ["Confirm"] });
            return a;
          }
          if (cmdType === "audio") {
            const a: { action: string; values: string[] }[] = [
              { action: "Play Playlist", values: ["Chill Vibes", "Focus Mode", "Evening Jazz", "Workout Energy", "Deep House", "Classical"] },
              { action: "Set Volume", values: ["10%", "25%", "50%", "75%", "100%"] },
              { action: "Switch Source", values: roomAVSources.length > 0 ? roomAVSources : ["Spotify", "Apple Music", "AirPlay", "Radio", "Bluetooth", "Line In"] },
              { action: "Stop Playback", values: ["Confirm"] },
            ];
            return a;
          }
          if (cmdType === "video") {
            return [
              { action: "Power On", values: ["Confirm"] },
              { action: "Power Off", values: ["Confirm"] },
              { action: "Switch Source", values: roomAVSources.length > 0 ? roomAVSources : ["Apple TV", "Netflix", "HDMI 1", "HDMI 2", "Blu-ray", "Cable"] },
              { action: "Set Channel", values: ["CNN", "HBO", "ESPN", "Discovery", "National Geographic"] },
            ];
          }
          return COMMAND_ACTIONS[cmdType] || [];
        };

        const dynamicActions = getDynamicActions();
        const dynamicValues = dynamicActions.find((a) => a.action === cmdAction)?.values || [];
        const showCircuitSelector = cmdType === "lighting" && roomCircuits.length > 0;
        const circuitOptions = ["All Circuits", ...roomCircuits];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80" onClick={() => setShowForm(false)} />
            <div
              className="relative w-full max-w-2xl rounded-2xl z-10 max-h-[90vh] overflow-y-auto"
              style={{
                background: "linear-gradient(145deg, rgba(18,21,35,0.98) 0%, rgba(10,12,22,0.99) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(59,130,246,0.04), inset 0 1px 0 rgba(255,255,255,0.05)",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(255,255,255,0.06) transparent",
              }}
            >
              {/* Top highlight line */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />

              <div className="p-6">
                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-7">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(99,102,241,0.2) 100%)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        boxShadow: "0 0 20px rgba(59,130,246,0.15)",
                      }}
                    >
                      <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-white text-lg">Create Macro</h2>
                      <p className="text-white/30 text-xs">Schedule automation commands</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* ── Macro Name ── */}
                  <div>
                    <label className="text-white/40 text-xs block mb-2">Macro Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Movie Night Setup, Morning Routine..."
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-white/20 outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                      autoFocus
                    />
                  </div>

                  {/* ── Date / Start / End ── */}
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <label className="text-white/40 text-xs block mb-2">Date</label>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl text-white text-sm outline-none transition-colors [color-scheme:dark]"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs block mb-2">Start</label>
                      <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl text-white text-sm outline-none transition-colors [color-scheme:dark]"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs block mb-2">End</label>
                      <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl text-white text-sm outline-none transition-colors [color-scheme:dark]"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                  </div>

                  {/* ── Category ── */}
                  <div>
                    <label className="text-white/40 text-xs block mb-2">Category</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
                        const meta = CATEGORY_META[cat];
                        const isActive = formCategory === cat;
                        const catColor = cat === "automation" ? "59,130,246" : cat === "personal" ? "139,92,246" : cat === "system" ? "52,211,153" : "251,191,36";
                        return (
                          <button key={cat} onClick={() => setFormCategory(cat)}
                            className="flex flex-col items-center gap-2 py-3.5 rounded-xl transition-all"
                            style={{
                              background: isActive ? `linear-gradient(135deg, rgba(${catColor},0.2) 0%, transparent 100%)` : "rgba(255,255,255,0.025)",
                              border: isActive ? `1px solid rgba(${catColor},0.35)` : "1px solid rgba(255,255,255,0.05)",
                            }}>
                            <div className={`w-2.5 h-2.5 rounded-full ${isActive ? meta.dot : "bg-white/15"}`} />
                            <span className={`text-[10px] ${isActive ? meta.color : "text-white/25"}`}>{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Trigger Location ── */}
                  <div>
                    <label className="text-white/40 text-xs block mb-2">Trigger Location (optional)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/12" />
                      <input type="text" placeholder="e.g. Living Room, All Zones..." value={formLocation} onChange={(e) => setFormLocation(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm placeholder-white/15 outline-none transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                    </div>
                  </div>

                  {/* ═══ Separator ═══ */}
                  <div className="relative py-1"><div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" /></div>

                  {/* ═══ Command Sequence Builder ═══ */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-white/25" />
                        <label className="text-white/50 text-xs tracking-[0.15em] uppercase">Command Sequence</label>
                      </div>
                      <span className="text-white/15 text-[10px]">{formCommands.length} step{formCommands.length !== 1 ? "s" : ""}</span>
                    </div>

                    {/* Existing commands */}
                    {formCommands.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {formCommands.map((cmd, idx) => {
                          const cmdMeta = COMMAND_META[cmd.type];
                          const Icon = cmdMeta.icon;
                          const typeColor = cmd.type === "lighting" ? "251,191,36" : cmd.type === "audio" ? "139,92,246" : cmd.type === "video" ? "59,130,246" : cmd.type === "climate" ? "52,211,153" : "239,68,68";
                          return (
                            <div key={cmd.id} className="flex items-center gap-3 p-3 rounded-xl group"
                              style={{ background: `rgba(${typeColor},0.06)`, border: `1px solid rgba(${typeColor},0.15)` }}>
                              <GripVertical className="w-3 h-3 text-white/8 shrink-0" />
                              <div className="w-5 h-5 rounded flex items-center justify-center text-white/20 text-[10px] shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>{idx + 1}</div>
                              <Icon className={`w-3.5 h-3.5 ${cmdMeta.color} shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${cmdMeta.color}`}>{cmd.action}</span>
                                <span className="text-white/15 text-xs ml-2">
                                  {cmd.room}{cmd.circuit && cmd.circuit !== "All Circuits" ? ` › ${cmd.circuit}` : ""} · {cmd.value}
                                </span>
                              </div>
                              <button onClick={() => removeCommand(cmd.id)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-white/8 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Command Builder */}
                    {showAddCmd ? (
                      <div className="p-4 rounded-xl space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {/* Subsystem tabs */}
                        <div className="flex gap-1.5 flex-wrap">
                          {(Object.keys(COMMAND_META) as CommandType[]).map((type) => {
                            const meta = COMMAND_META[type];
                            const Icon = meta.icon;
                            const typeColor = type === "lighting" ? "251,191,36" : type === "audio" ? "139,92,246" : type === "video" ? "59,130,246" : type === "climate" ? "52,211,153" : "239,68,68";
                            return (
                              <button key={type}
                                onClick={() => { setCmdType(type); setCmdAction(""); setCmdValue(""); setCmdCircuit("All Circuits"); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                                style={{
                                  background: cmdType === type ? `rgba(${typeColor},0.12)` : "rgba(255,255,255,0.02)",
                                  border: cmdType === type ? `1px solid rgba(${typeColor},0.25)` : "1px solid rgba(255,255,255,0.05)",
                                  color: cmdType === type ? undefined : "rgba(255,255,255,0.25)",
                                }}>
                                <Icon className={`w-3 h-3 ${cmdType === type ? meta.color : ""}`} />
                                <span className={cmdType === type ? meta.color : ""}>{meta.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Room / Zone */}
                        <div>
                          <label className="text-white/25 text-[10px] tracking-wider uppercase block mb-1.5">Room / Zone</label>
                          <div className="relative">
                            <select value={cmdRoom}
                              onChange={(e) => { setCmdRoom(e.target.value); setCmdCircuit("All Circuits"); setCmdAction(""); setCmdValue(""); }}
                              className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none appearance-none cursor-pointer"
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              {ROOMS.map((r) => (<option key={r} value={r} style={{ background: "#141826" }}>{r}</option>))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/15 pointer-events-none" />
                          </div>
                        </div>

                        {/* Circuit selector (lighting only) */}
                        {showCircuitSelector && (
                          <div>
                            <label className="text-white/25 text-[10px] tracking-wider uppercase block mb-1.5">Circuit</label>
                            <div className="flex gap-1.5 flex-wrap">
                              {circuitOptions.map((c) => (
                                <button key={c} onClick={() => setCmdCircuit(c)}
                                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                                  style={{
                                    background: cmdCircuit === c ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.03)",
                                    border: cmdCircuit === c ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(255,255,255,0.06)",
                                    color: cmdCircuit === c ? "#fbbf24" : "rgba(255,255,255,0.3)",
                                  }}>
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action */}
                        <div>
                          <label className="text-white/25 text-[10px] tracking-wider uppercase block mb-1.5">Action</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {dynamicActions.map((a) => (
                              <button key={a.action}
                                onClick={() => { setCmdAction(a.action); setCmdValue(a.values[0] || ""); }}
                                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                                style={{
                                  background: cmdAction === a.action ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                                  border: cmdAction === a.action ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                                  color: cmdAction === a.action ? "white" : "rgba(255,255,255,0.3)",
                                }}>
                                {a.action}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Value */}
                        {cmdAction && dynamicValues.length > 0 && (
                          <div>
                            <label className="text-white/25 text-[10px] tracking-wider uppercase block mb-1.5">Value</label>
                            <div className="flex gap-1.5 flex-wrap">
                              {dynamicValues.map((v) => (
                                <button key={v} onClick={() => setCmdValue(v)}
                                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                                  style={{
                                    background: cmdValue === v ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                                    border: cmdValue === v ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                                    color: cmdValue === v ? "white" : "rgba(255,255,255,0.3)",
                                  }}>
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cancel / Add Step */}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setShowAddCmd(false)}
                            className="flex-1 py-2.5 rounded-xl text-white/30 text-xs hover:text-white/50 transition-colors"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            Cancel
                          </button>
                          <button onClick={addCommand} disabled={!cmdAction || !cmdValue}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                            style={{
                              background: "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(99,102,241,0.15) 100%)",
                              border: "1px solid rgba(59,130,246,0.3)",
                              color: "#60a5fa",
                            }}>
                            <Plus className="w-3 h-3" />
                            Add Step
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddCmd(true)}
                        className="w-full py-3.5 rounded-xl text-white/18 text-xs hover:text-white/35 transition-all flex items-center justify-center gap-2"
                        style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
                        <Plus className="w-3.5 h-3.5" />
                        Add Command Step
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Bottom Actions ── */}
                <div className="flex gap-3 mt-7">
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl text-white/35 text-sm hover:text-white/55 hover:bg-white/[0.04] transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    Cancel
                  </button>
                  <button onClick={submitEvent} disabled={!formTitle.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, rgba(59,130,246,0.22) 0%, rgba(99,102,241,0.18) 100%)",
                      border: "1px solid rgba(59,130,246,0.35)",
                      color: "#60a5fa",
                      boxShadow: "0 0 20px rgba(59,130,246,0.08)",
                    }}>
                    <Plus className="w-4 h-4" />
                    Create Macro
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
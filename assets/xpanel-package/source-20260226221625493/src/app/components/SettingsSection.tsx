import React, { useState } from "react";
import {
  Image,
  User,
  Users,
  Sliders,
  Wifi,
  Bell,
  Monitor,
  Globe,
  Lock,
  KeyRound,
  Check,
  Clock,
  Shield,
  Fingerprint,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  ChevronRight,
  Info,
  Edit3,
  AlertTriangle,
  X,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

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

/* ─── Data ─── */
const WALLPAPERS = [
  {
    id: "default",
    name: "Luxury Interior",
    url: "https://images.unsplash.com/photo-1698864551603-0f7aefaebeb4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsdXh1cnklMjBodXNlJTIwZGFyayUyMGFtYmllbnR8ZW58MXx8fHwxNzcxNzU4NjkzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "penthouse",
    name: "Penthouse",
    url: "https://images.unsplash.com/photo-1642976975710-1d8890dbf5ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsdXh1cnklMjBwZW50aG91c2UlMjBpbnRlcmlvciUyMGRhcmt8ZW58MXx8fHwxNzcxNzY4MTg3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "fireplace",
    name: "Fireplace Lounge",
    url: "https://images.unsplash.com/photo-1678686425633-84fc103e2727?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsJTIwZGFyayUyMGxpdmluZyUyMHJvb20lMjBmaXJlcGxhY2UlMjBuaWdodHxlbnwxfHx8fDE3NzE3NjgxODd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "kitchen",
    name: "Modern Kitchen",
    url: "https://images.unsplash.com/photo-1636628751643-2a8c9fd001d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBtb2Rlcm4lMjBraXRjaGVuJTIwbWFyYmxlJTIwZGFyayUyMGFtYmllbnR8ZW58MXx8fHwxNzcxNzY4MTg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "cinema",
    name: "Home Cinema",
    url: "https://images.unsplash.com/photo-1759230766134-e3ff1c27d20e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkYXJrJTIwaG9tZSUyMGNpbmVtYSUyMHJvb20lMjBsdXh1cnl8ZW58MXx8fHwxNzcxNzY4MTg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "pool",
    name: "Pool Night",
    url: "https://images.unsplash.com/photo-1687686772869-2d6913f70c7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBwb29sJTIwaG91c2UlMjBuaWdodCUyMGV4dGVyaW9yJTIwYW1iaWVudHxlbnwxfHx8fDE3NzE3NjgxODh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "abstract",
    name: "Abstract Dark",
    url: "https://images.unsplash.com/photo-1698157063712-b271ad0fbc4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjBncmFkaWVudCUyMHdhbGxwYXBlciUyMG1vb2R5fGVufDF8fHx8MTc3MTc2ODE4OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
];

const AREAS = ["Living Room", "Kitchen", "Master Bedroom", "Cinema", "Media Room", "Outdoor"];

interface ActivityEntry {
  id: number;
  action: string;
  time: string;
  success: boolean;
}

interface UserAccount {
  id: string;
  name: string;
  role: string;
  avatar: string;
  lastLogin: string;
  method: string;
  active: boolean;
  permissions: Record<string, boolean>;
  activityLog: ActivityEntry[];
}

const ALL_AREAS_ON = Object.fromEntries(AREAS.map((a) => [a, true]));
const GUEST_AREAS = Object.fromEntries(AREAS.map((a) => [a, a === "Living Room" || a === "Kitchen"]));

const INITIAL_USERS: UserAccount[] = [
  {
    id: "1",
    name: "Sarah Thompson",
    role: "Admin",
    avatar: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
    lastLogin: "Today, 8:02 AM",
    method: "Fingerprint",
    active: true,
    permissions: { ...ALL_AREAS_ON },
    activityLog: [
      { id: 1, action: "Logged in via Fingerprint", time: "Today, 8:02 AM", success: true },
      { id: 2, action: "Changed system settings", time: "Yesterday, 4:30 PM", success: true },
      { id: 3, action: "Updated Cinema permissions", time: "Yesterday, 2:15 PM", success: true },
      { id: 4, action: "Logged in via Fingerprint", time: "Yesterday, 9:00 AM", success: true },
      { id: 5, action: "Added user Michael Chen", time: "Feb 20, 3:00 PM", success: true },
    ],
  },
  {
    id: "2",
    name: "James Wilson",
    role: "User",
    avatar: "https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
    lastLogin: "Today, 7:45 AM",
    method: "PIN Code",
    active: true,
    permissions: { ...ALL_AREAS_ON, Cinema: false },
    activityLog: [
      { id: 1, action: "Logged in via PIN Code", time: "Today, 7:45 AM", success: true },
      { id: 2, action: "Adjusted Kitchen lighting", time: "Yesterday, 8:00 PM", success: true },
      { id: 3, action: "Failed login attempt", time: "Yesterday, 7:40 AM", success: false },
      { id: 4, action: "Logged in via PIN Code", time: "Feb 21, 7:50 AM", success: true },
    ],
  },
  {
    id: "3",
    name: "Emily Davis",
    role: "User",
    avatar: "https://images.unsplash.com/photo-1618661148759-0d481c0c2116?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
    lastLogin: "Yesterday, 6:30 PM",
    method: "Face ID",
    active: false,
    permissions: { ...ALL_AREAS_ON, Outdoor: false },
    activityLog: [
      { id: 1, action: "Logged out (auto)", time: "Yesterday, 6:30 PM", success: true },
      { id: 2, action: "Logged in via Face ID", time: "Yesterday, 5:00 PM", success: true },
      { id: 3, action: "Set Bedroom scene to Sleep", time: "Feb 20, 10:30 PM", success: true },
    ],
  },
  {
    id: "4",
    name: "Michael Chen",
    role: "Guest",
    avatar: "https://images.unsplash.com/photo-1616565441139-06d7c5c6da11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
    lastLogin: "Feb 20, 2:15 PM",
    method: "Key Card",
    active: false,
    permissions: { ...GUEST_AREAS },
    activityLog: [
      { id: 1, action: "Logged in via Key Card", time: "Feb 20, 2:15 PM", success: true },
      { id: 2, action: "Access denied: Cinema", time: "Feb 20, 2:20 PM", success: false },
      { id: 3, action: "Logged out (auto)", time: "Feb 20, 5:00 PM", success: true },
    ],
  },
];

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "https://images.unsplash.com/photo-1618661148759-0d481c0c2116?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "https://images.unsplash.com/photo-1616565441139-06d7c5c6da11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
];

const ROLES = ["Admin", "User", "Guest"];
const AUTH_METHODS = ["Fingerprint", "PIN Code", "Face ID", "Key Card"];

const LOGIN_HISTORY = [
  { id: 1, user: "Sarah Thompson", action: "Logged in", method: "Fingerprint", time: "8:02 AM", success: true },
  { id: 2, user: "James Wilson", action: "Logged in", method: "PIN Code", time: "7:45 AM", success: true },
  { id: 3, user: "Unknown", action: "Failed attempt", method: "Key Card", time: "6:30 AM", success: false },
  { id: 4, user: "Emily Davis", action: "Logged out", method: "Auto", time: "Yesterday", success: true },
  { id: 5, user: "Sarah Thompson", action: "Settings changed", method: "Admin", time: "Yesterday", success: true },
  { id: 6, user: "Unknown", action: "Failed attempt", method: "PIN Code", time: "Feb 20", success: false },
];

const tabs = [
  { id: "background", label: "Background", icon: Image },
  { id: "logins", label: "Logins", icon: Users },
  { id: "config", label: "Configuration", icon: Sliders },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ─── Settings Section ─── */
export function SettingsSection({
  currentBg,
  onBgChange,
}: {
  currentBg: string;
  onBgChange: (url: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("background");
  const [customUrl, setCustomUrl] = useState("");
  const [overlayOpacity, setOverlayOpacity] = useState(60);
  const [blurEnabled, setBlurEnabled] = useState(true);

  /* Config state */
  const [systemName, setSystemName] = useState("Crestron Home");
  const [timezone, setTimezone] = useState("UTC+0 (London)");
  const [language, setLanguage] = useState("English");
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [autoLockTime, setAutoLockTime] = useState("5");
  const [displayMode, setDisplayMode] = useState<"dark" | "auto">("dark");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [wifiNetwork] = useState("CrestronHome_5G");
  const [showPinFor, setShowPinFor] = useState<string | null>(null);

  /* User CRUD state */
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [userNextId, setUserNextId] = useState(10);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null); // null = add new
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserAccount | null>(null);

  /* User form fields */
  const [ufName, setUfName] = useState("");
  const [ufRole, setUfRole] = useState("User");
  const [ufMethod, setUfMethod] = useState("PIN Code");
  const [ufAvatar, setUfAvatar] = useState(AVATAR_PRESETS[0]);
  const [ufActive, setUfActive] = useState(true);
  const [ufPermissions, setUfPermissions] = useState<Record<string, boolean>>({ ...ALL_AREAS_ON });

  /* Bulk select state */
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  };

  const confirmBulkDelete = () => {
    setUsers((prev) => prev.filter((u) => !selectedUserIds.has(u.id)));
    setSelectedUserIds(new Set());
    setBulkDeleteConfirm(false);
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUfName("");
    setUfRole("User");
    setUfMethod("PIN Code");
    setUfAvatar(AVATAR_PRESETS[0]);
    setUfActive(true);
    setUfPermissions({ ...ALL_AREAS_ON });
    setShowUserForm(true);
  };

  const openEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setUfName(user.name);
    setUfRole(user.role);
    setUfMethod(user.method);
    setUfAvatar(user.avatar);
    setUfActive(user.active);
    setUfPermissions({ ...user.permissions });
    setShowUserForm(true);
  };

  const submitUserForm = () => {
    if (!ufName.trim()) return;
    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: ufName.trim(), role: ufRole, method: ufMethod, avatar: ufAvatar, active: ufActive, permissions: { ...ufPermissions } }
            : u
        )
      );
    } else {
      const newUser: UserAccount = {
        id: String(userNextId),
        name: ufName.trim(),
        role: ufRole,
        avatar: ufAvatar,
        lastLogin: "Never",
        method: ufMethod,
        active: ufActive,
        permissions: { ...ufPermissions },
        activityLog: [],
      };
      setUsers((prev) => [...prev, newUser]);
      setUserNextId((n) => n + 1);
    }
    setShowUserForm(false);
  };

  const confirmDeleteUser = () => {
    if (!deleteConfirmUser) return;
    setUsers((prev) => prev.filter((u) => u.id !== deleteConfirmUser.id));
    setDeleteConfirmUser(null);
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <GlassCard className="p-2">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all border ${
                  isActive
                    ? "bg-white/15 border-white/20 text-white shadow-md"
                    : "border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* ─── Background Tab ─── */}
      {activeTab === "background" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Wallpaper Grid */}
          <div className="lg:col-span-8">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-white/40" />
                  <h3 className="text-white/60 text-xs tracking-widest uppercase">
                    Wallpaper Gallery
                  </h3>
                </div>
                <span className="text-white/25 text-xs">
                  {WALLPAPERS.length} available
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {WALLPAPERS.map((wp) => {
                  const isSelected = currentBg === wp.url;
                  return (
                    <button
                      key={wp.id}
                      onClick={() => onBgChange(wp.url)}
                      className={`relative rounded-xl overflow-hidden group transition-all ${
                        isSelected
                          ? "ring-2 ring-blue-400/60 shadow-lg shadow-blue-500/10"
                          : "hover:ring-1 hover:ring-white/20"
                      }`}
                      style={{ aspectRatio: "16/10" }}
                    >
                      <ImageWithFallback
                        src={wp.url}
                        alt={wp.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2.5">
                        <p className="text-white text-xs">{wp.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom URL */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <p className="text-white/40 text-xs tracking-widest uppercase mb-3">
                  Custom URL
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/10 text-white text-sm placeholder-white/25 outline-none focus:border-white/25 transition-all"
                  />
                  <button
                    onClick={() => {
                      if (customUrl.trim()) {
                        onBgChange(customUrl.trim());
                        setCustomUrl("");
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/30 transition-all"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Preview & Options */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <GlassCard className="p-5">
              <h3 className="text-white/60 text-xs tracking-widest uppercase mb-3">
                Preview
              </h3>
              <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "16/10" }}>
                <ImageWithFallback
                  src={currentBg}
                  alt="Current wallpaper"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: `rgba(0,0,0,${overlayOpacity / 100})`,
                    backdropFilter: blurEnabled ? "blur(4px)" : "none",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-white text-xs">Dashboard Preview</p>
                    <p className="text-white/30 text-[10px] mt-0.5">
                      {overlayOpacity}% overlay
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="text-white/60 text-xs tracking-widest uppercase mb-4">
                Overlay Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/50 text-xs">Opacity</span>
                    <span className="text-white/70 text-xs">{overlayOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgba(59,130,246,0.8) 0%, rgba(59,130,246,0.8) ${
                        ((overlayOpacity - 20) / 70) * 100
                      }%, rgba(255,255,255,0.12) ${
                        ((overlayOpacity - 20) / 70) * 100
                      }%, rgba(255,255,255,0.12) 100%)`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-xs">Backdrop Blur</span>
                  <SettingsToggle
                    enabled={blurEnabled}
                    onChange={() => setBlurEnabled(!blurEnabled)}
                  />
                </div>
              </div>
            </GlassCard>

            <button
              onClick={() => onBgChange(WALLPAPERS[0].url)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white/40 text-sm hover:text-white/70 hover:bg-white/10 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Default
            </button>
          </div>
        </div>
      )}

      {/* ─── Logins Tab ─── */}
      {activeTab === "logins" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-white/40" />
                  <h3 className="text-white/60 text-xs tracking-widest uppercase">
                    User Accounts
                  </h3>
                  <span className="text-white/15 text-[10px] ml-1">{users.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedUserIds.size > 0 && (
                    <button
                      onClick={() => setBulkDeleteConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete {selectedUserIds.size}
                    </button>
                  )}
                  <button onClick={openAddUser} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs hover:bg-blue-500/25 transition-all">
                    <Plus className="w-3 h-3" />
                    Add User
                  </button>
                </div>
              </div>

              {/* Select All bar */}
              {users.length > 1 && (
                <div className="flex items-center gap-2 mb-3 px-1">
                  <button
                    onClick={toggleSelectAll}
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: selectedUserIds.size === users.length ? "rgba(59,130,246,0.7)" : "rgba(255,255,255,0.06)",
                      border: selectedUserIds.size === users.length ? "1px solid rgba(59,130,246,0.8)" : "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    {selectedUserIds.size === users.length && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <span className="text-white/20 text-[10px]">
                    {selectedUserIds.size === users.length ? "Deselect all" : "Select all"}
                  </span>
                </div>
              )}

              <div className="space-y-2.5">
                {users.map((user) => {
                  const isSelected = selectedUserIds.has(user.id);
                  const permCount = Object.values(user.permissions).filter(Boolean).length;
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-blue-500/[0.08] border-blue-500/25"
                          : user.active
                          ? "bg-white/[0.08] border-white/15"
                          : "bg-white/[0.03] border-white/[0.06]"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelectUser(user.id)}
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: isSelected ? "rgba(59,130,246,0.7)" : "rgba(255,255,255,0.06)",
                          border: isSelected ? "1px solid rgba(59,130,246,0.8)" : "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </button>

                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden">
                          <ImageWithFallback
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1a1a2e] ${
                            user.active
                              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                              : "bg-white/25"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm truncate">{user.name}</p>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              user.role === "Admin"
                                ? "bg-blue-500/15 text-blue-400"
                                : user.role === "Guest"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-white/[0.08] text-white/40"
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-white/30 text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {user.lastLogin}
                          </span>
                          <span className="text-white/20 text-[11px]">
                            {user.method}
                          </span>
                          <span className="text-white/12 text-[10px]">
                            {permCount}/{AREAS.length} areas
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEditUser(user)}
                          className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/30 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setShowPinFor(showPinFor === user.id ? null : user.id)
                          }
                          className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all"
                        >
                          {showPinFor === user.id ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmUser(user)}
                          className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-white/40" />
                <h3 className="text-white/60 text-xs tracking-widest uppercase">
                  Authentication Methods
                </h3>
              </div>
              <div className="space-y-2">
                {[
                  { icon: Fingerprint, name: "Fingerprint", enabled: true, color: "text-blue-400" },
                  { icon: KeyRound, name: "PIN Code", enabled: true, color: "text-emerald-400" },
                  { icon: User, name: "Face ID", enabled: true, color: "text-violet-400" },
                  { icon: Lock, name: "Key Card", enabled: false, color: "text-amber-400" },
                ].map((method) => {
                  const Icon = method.icon;
                  return (
                    <div
                      key={method.name}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center">
                          <Icon className={`w-4 h-4 ${method.color}`} />
                        </div>
                        <span className="text-white/70 text-sm">{method.name}</span>
                      </div>
                      <div
                        className={`text-[10px] px-2 py-1 rounded-md ${
                          method.enabled
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-white/[0.05] text-white/25"
                        }`}
                      >
                        {method.enabled ? "Enabled" : "Disabled"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard className="p-5 flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white/40" />
                  <h3 className="text-white/60 text-xs tracking-widest uppercase">
                    Login History
                  </h3>
                </div>
                <span className="text-white/20 text-xs">
                  {LOGIN_HISTORY.length} entries
                </span>
              </div>
              <div
                className="space-y-2 max-h-[300px] overflow-y-auto pr-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.06) transparent",
                }}
              >
                {LOGIN_HISTORY.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]"
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        entry.success ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-xs truncate">
                        {entry.user}
                      </p>
                      <p className="text-white/25 text-[10px]">
                        {entry.action} via {entry.method}
                      </p>
                    </div>
                    <span className="text-white/20 text-[10px] shrink-0">
                      {entry.time}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ─── Configuration Tab ─── */}
      {activeTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 flex flex-col gap-4">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-5">
                <Sliders className="w-4 h-4 text-white/40" />
                <h3 className="text-white/60 text-xs tracking-widest uppercase">
                  General
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-white/40 text-xs block mb-1.5">
                    System Name
                  </label>
                  <input
                    type="text"
                    value={systemName}
                    onChange={(e) => setSystemName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/10 text-white text-sm outline-none focus:border-white/25 transition-all"
                  />
                </div>

                <div>
                  <label className="text-white/40 text-xs block mb-1.5">
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/10 text-white text-sm outline-none focus:border-white/25 transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: "none" }}
                  >
                    <option value="UTC-5 (New York)">UTC-5 (New York)</option>
                    <option value="UTC+0 (London)">UTC+0 (London)</option>
                    <option value="UTC+1 (Paris)">UTC+1 (Paris)</option>
                    <option value="UTC+8 (Singapore)">UTC+8 (Singapore)</option>
                    <option value="UTC+9 (Tokyo)">UTC+9 (Tokyo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/40 text-xs block mb-1.5">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/10 text-white text-sm outline-none focus:border-white/25 transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: "none" }}
                  >
                    <option value="English">English</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/40 text-xs block mb-1.5">
                    Temperature Unit
                  </label>
                  <div className="flex gap-2">
                    {(["C", "F"] as const).map((unit) => (
                      <button
                        key={unit}
                        onClick={() => setTempUnit(unit)}
                        className={`flex-1 py-2.5 rounded-xl text-sm transition-all border ${
                          tempUnit === unit
                            ? "bg-white/15 border-white/20 text-white"
                            : "bg-white/[0.04] border-white/[0.06] text-white/30 hover:text-white/60"
                        }`}
                      >
                        {unit === "C" ? "°Celsius" : "°Fahrenheit"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wifi className="w-4 h-4 text-white/40" />
                <h3 className="text-white/60 text-xs tracking-widest uppercase">
                  Network
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-white/70 text-sm">{wifiNetwork}</p>
                      <p className="text-white/25 text-[10px]">Connected - 5GHz</p>
                    </div>
                  </div>
                  <div className="text-emerald-400 text-[10px] px-2 py-1 rounded-md bg-emerald-500/15">
                    Active
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-white/70 text-sm">IP Address</p>
                      <p className="text-white/25 text-[10px]">192.168.1.100</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-4 h-4 text-violet-400" />
                    <div>
                      <p className="text-white/70 text-sm">Crestron Processor</p>
                      <p className="text-white/25 text-[10px]">CP4-R - v2.8001</p>
                    </div>
                  </div>
                  <div className="text-emerald-400 text-[10px] px-2 py-1 rounded-md bg-emerald-500/15">
                    Online
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-6 flex flex-col gap-4">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-5">
                <Monitor className="w-4 h-4 text-white/40" />
                <h3 className="text-white/60 text-xs tracking-widest uppercase">
                  Display
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-white/40 text-xs block mb-2">
                    Theme Mode
                  </label>
                  <div className="flex gap-2">
                    {(["dark", "auto"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setDisplayMode(mode)}
                        className={`flex-1 py-2.5 rounded-xl text-sm transition-all border ${
                          displayMode === mode
                            ? "bg-white/15 border-white/20 text-white"
                            : "bg-white/[0.04] border-white/[0.06] text-white/30 hover:text-white/60"
                        }`}
                      >
                        {mode === "auto" ? "Auto (Time-based)" : "Dark Mode"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white/70 text-sm block">
                      Auto-Lock Screen
                    </span>
                    <span className="text-white/25 text-[11px]">
                      Lock after inactivity
                    </span>
                  </div>
                  <SettingsToggle
                    enabled={autoLock}
                    onChange={() => setAutoLock(!autoLock)}
                  />
                </div>

                {autoLock && (
                  <div>
                    <label className="text-white/40 text-xs block mb-1.5">
                      Lock Timeout
                    </label>
                    <select
                      value={autoLockTime}
                      onChange={(e) => setAutoLockTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/10 text-white text-sm outline-none focus:border-white/25 transition-all appearance-none cursor-pointer"
                      style={{ backgroundImage: "none" }}
                    >
                      <option value="1">1 minute</option>
                      <option value="3">3 minutes</option>
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="30">30 minutes</option>
                    </select>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-5">
                <Bell className="w-4 h-4 text-white/40" />
                <h3 className="text-white/60 text-xs tracking-widest uppercase">
                  Notifications
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    label: "Push Notifications",
                    desc: "Security & system alerts",
                    enabled: notifications,
                    toggle: () => setNotifications(!notifications),
                  },
                  {
                    label: "Sound Effects",
                    desc: "UI interaction sounds",
                    enabled: soundEffects,
                    toggle: () => setSoundEffects(!soundEffects),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <span className="text-white/70 text-sm block">
                        {item.label}
                      </span>
                      <span className="text-white/25 text-[11px]">
                        {item.desc}
                      </span>
                    </div>
                    <SettingsToggle
                      enabled={item.enabled}
                      onChange={item.toggle}
                    />
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-white/40" />
                <h3 className="text-white/60 text-xs tracking-widest uppercase">
                  System Info
                </h3>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Model", value: "Crestron CP4-R" },
                  { label: "Firmware", value: "v2.8001.00109" },
                  { label: "Serial", value: "CPN-4R-XXXX-7842" },
                  { label: "Uptime", value: "47 days, 12 hours" },
                  { label: "Last Update", value: "Feb 15, 2026" },
                ].map((info) => (
                  <div
                    key={info.label}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-white/30 text-xs">{info.label}</span>
                    <span className="text-white/60 text-xs">{info.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/30 transition-all">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400/60 text-sm hover:bg-red-500/20 hover:text-red-400 transition-all">
                <RotateCcw className="w-4 h-4" />
                Factory Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Add/Edit User Modal ══════ */}
      {showUserForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowUserForm(false)} />
          <div
            className="relative w-full max-w-xl rounded-2xl z-10 max-h-[90vh] overflow-y-auto"
            style={{
              background: "linear-gradient(145deg, rgba(18,21,35,0.98) 0%, rgba(10,12,22,0.99) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.06) transparent",
            }}
          >
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-7">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{
                      background: editingUser
                        ? "linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(99,102,241,0.2) 100%)"
                        : "linear-gradient(135deg, rgba(52,211,153,0.25) 0%, rgba(59,130,246,0.2) 100%)",
                      border: editingUser ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(52,211,153,0.3)",
                      boxShadow: editingUser ? "0 0 20px rgba(59,130,246,0.15)" : "0 0 20px rgba(52,211,153,0.15)",
                    }}
                  >
                    {editingUser ? <Edit3 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <div>
                    <h2 className="text-white text-lg">{editingUser ? "Edit User" : "Add User"}</h2>
                    <p className="text-white/30 text-xs">{editingUser ? "Update account details" : "Create a new account"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserForm(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Avatar Picker */}
                <div>
                  <label className="text-white/40 text-xs block mb-2">Avatar</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0" style={{ border: "2px solid rgba(255,255,255,0.12)" }}>
                      <ImageWithFallback src={ufAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {AVATAR_PRESETS.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setUfAvatar(url)}
                          className="w-10 h-10 rounded-full overflow-hidden transition-all"
                          style={{
                            border: ufAvatar === url ? "2px solid rgba(59,130,246,0.6)" : "2px solid rgba(255,255,255,0.06)",
                            boxShadow: ufAvatar === url ? "0 0 12px rgba(59,130,246,0.2)" : "none",
                          }}
                        >
                          <ImageWithFallback src={url} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="text-white/40 text-xs block mb-2">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter full name..."
                    value={ufName}
                    onChange={(e) => setUfName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-white/20 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    autoFocus
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="text-white/40 text-xs block mb-2">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((role) => {
                      const isActive = ufRole === role;
                      const roleColor = role === "Admin" ? "59,130,246" : role === "Guest" ? "251,191,36" : "255,255,255";
                      return (
                        <button
                          key={role}
                          onClick={() => setUfRole(role)}
                          className="py-2.5 rounded-xl text-xs transition-all text-center"
                          style={{
                            background: isActive ? `rgba(${roleColor},0.15)` : "rgba(255,255,255,0.025)",
                            border: isActive ? `1px solid rgba(${roleColor},0.35)` : "1px solid rgba(255,255,255,0.05)",
                            color: isActive
                              ? role === "Admin" ? "#60a5fa" : role === "Guest" ? "#fbbf24" : "rgba(255,255,255,0.8)"
                              : "rgba(255,255,255,0.25)",
                          }}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Auth Method */}
                <div>
                  <label className="text-white/40 text-xs block mb-2">Authentication Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AUTH_METHODS.map((method) => {
                      const isActive = ufMethod === method;
                      const MethodIcon = method === "Fingerprint" ? Fingerprint : method === "PIN Code" ? KeyRound : method === "Face ID" ? User : Lock;
                      return (
                        <button
                          key={method}
                          onClick={() => setUfMethod(method)}
                          className="flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs transition-all"
                          style={{
                            background: isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.025)",
                            border: isActive ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.05)",
                            color: isActive ? "white" : "rgba(255,255,255,0.25)",
                          }}
                        >
                          <MethodIcon className="w-3.5 h-3.5" />
                          {method}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white/70 text-sm block">Active Status</span>
                    <span className="text-white/25 text-[11px]">Allow system access</span>
                  </div>
                  <SettingsToggle enabled={ufActive} onChange={() => setUfActive(!ufActive)} />
                </div>

                {/* Separator */}
                <div className="relative py-1"><div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" /></div>

                {/* Area Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-white/25" />
                      <label className="text-white/50 text-xs tracking-[0.15em] uppercase">Area Permissions</label>
                    </div>
                    <span className="text-white/15 text-[10px]">
                      {Object.values(ufPermissions).filter(Boolean).length}/{AREAS.length} granted
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {AREAS.map((area) => {
                      const granted = ufPermissions[area] ?? false;
                      return (
                        <button
                          key={area}
                          onClick={() => setUfPermissions((prev) => ({ ...prev, [area]: !prev[area] }))}
                          className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs transition-all"
                          style={{
                            background: granted ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.02)",
                            border: granted ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                            style={{
                              background: granted ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.06)",
                              border: granted ? "1px solid rgba(52,211,153,0.8)" : "1px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            {granted && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span style={{ color: granted ? "#34d399" : "rgba(255,255,255,0.25)" }}>{area}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Quick actions */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setUfPermissions(Object.fromEntries(AREAS.map((a) => [a, true])))}
                      className="text-[10px] px-2 py-1 rounded-md transition-all"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}
                    >
                      Grant All
                    </button>
                    <button
                      onClick={() => setUfPermissions(Object.fromEntries(AREAS.map((a) => [a, false])))}
                      className="text-[10px] px-2 py-1 rounded-md transition-all"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}
                    >
                      Revoke All
                    </button>
                  </div>
                </div>

                {/* Activity Log (edit mode only) */}
                {editingUser && editingUser.activityLog.length > 0 && (
                  <>
                    <div className="relative py-1"><div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" /></div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-white/25" />
                          <label className="text-white/50 text-xs tracking-[0.15em] uppercase">Recent Activity</label>
                        </div>
                        <span className="text-white/15 text-[10px]">{editingUser.activityLog.length} entries</span>
                      </div>
                      <div
                        className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1"
                        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}
                      >
                        {editingUser.activityLog.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center gap-2.5 p-2.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                entry.success ? "bg-emerald-400" : "bg-red-400"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white/50 text-[11px] truncate">{entry.action}</p>
                            </div>
                            <span className="text-white/15 text-[10px] shrink-0">{entry.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-7">
                <button
                  onClick={() => setShowUserForm(false)}
                  className="flex-1 py-3 rounded-xl text-white/35 text-sm hover:text-white/55 hover:bg-white/[0.04] transition-colors"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitUserForm}
                  disabled={!ufName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                  style={{
                    background: editingUser
                      ? "linear-gradient(135deg, rgba(59,130,246,0.22) 0%, rgba(99,102,241,0.18) 100%)"
                      : "linear-gradient(135deg, rgba(52,211,153,0.22) 0%, rgba(59,130,246,0.18) 100%)",
                    border: editingUser ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(52,211,153,0.35)",
                    color: editingUser ? "#60a5fa" : "#34d399",
                    boxShadow: editingUser ? "0 0 20px rgba(59,130,246,0.08)" : "0 0 20px rgba(52,211,153,0.08)",
                  }}
                >
                  {editingUser ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingUser ? "Save Changes" : "Add User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Delete Confirmation Modal ══════ */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteConfirmUser(null)} />
          <div
            className="relative w-full max-w-sm rounded-2xl z-10"
            style={{
              background: "linear-gradient(145deg, rgba(18,21,35,0.98) 0%, rgba(10,12,22,0.99) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-red-400/20 to-transparent" />
            <div className="p-6">
              {/* Warning Icon + Avatar */}
              <div className="flex flex-col items-center mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.08) 100%)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    boxShadow: "0 0 25px rgba(239,68,68,0.1)",
                  }}
                >
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-white text-lg">Delete User</h2>
                <p className="text-white/30 text-xs mt-1 text-center">This action cannot be undone</p>
              </div>

              {/* User being deleted */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl mb-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                  <ImageWithFallback src={deleteConfirmUser.avatar} alt={deleteConfirmUser.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{deleteConfirmUser.name}</p>
                  <p className="text-white/25 text-[11px]">{deleteConfirmUser.role} &middot; {deleteConfirmUser.method}</p>
                </div>
              </div>

              <p className="text-white/25 text-xs text-center mb-5">
                Are you sure you want to remove <span className="text-white/50">{deleteConfirmUser.name}</span> from the system? All access credentials will be revoked.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmUser(null)}
                  className="flex-1 py-3 rounded-xl text-white/35 text-sm hover:text-white/55 hover:bg-white/[0.04] transition-colors"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all"
                  style={{
                    background: "linear-gradient(135deg, rgba(239,68,68,0.22) 0%, rgba(239,68,68,0.12) 100%)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    color: "#f87171",
                    boxShadow: "0 0 20px rgba(239,68,68,0.08)",
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Bulk Delete Confirmation Modal ══════ */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setBulkDeleteConfirm(false)} />
          <div
            className="relative w-full max-w-sm rounded-2xl z-10"
            style={{
              background: "linear-gradient(145deg, rgba(18,21,35,0.98) 0%, rgba(10,12,22,0.99) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-red-400/20 to-transparent" />
            <div className="p-6">
              {/* Warning */}
              <div className="flex flex-col items-center mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.08) 100%)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    boxShadow: "0 0 25px rgba(239,68,68,0.1)",
                  }}
                >
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-white text-lg">Delete {selectedUserIds.size} User{selectedUserIds.size !== 1 ? "s" : ""}</h2>
                <p className="text-white/30 text-xs mt-1 text-center">This action cannot be undone</p>
              </div>

              {/* Users being deleted */}
              <div
                className="space-y-1.5 mb-5 max-h-[180px] overflow-y-auto pr-1"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}
              >
                {users.filter((u) => selectedUserIds.has(u.id)).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      <ImageWithFallback src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-xs truncate">{user.name}</p>
                      <p className="text-white/20 text-[10px]">{user.role}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-white/25 text-xs text-center mb-5">
                Are you sure you want to remove <span className="text-white/50">{selectedUserIds.size} user{selectedUserIds.size !== 1 ? "s" : ""}</span> from the system? All access credentials will be revoked.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setBulkDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-white/35 text-sm hover:text-white/55 hover:bg-white/[0.04] transition-colors"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all"
                  style={{
                    background: "linear-gradient(135deg, rgba(239,68,68,0.22) 0%, rgba(239,68,68,0.12) 100%)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    color: "#f87171",
                    boxShadow: "0 0 20px rgba(239,68,68,0.08)",
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Toggle Switch ─── */
function SettingsToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
        enabled ? "bg-blue-500" : "bg-white/20"
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
          enabled ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
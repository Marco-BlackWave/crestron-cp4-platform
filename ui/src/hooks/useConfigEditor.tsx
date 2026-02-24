import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { SystemConfig, RoomConfig, SourceConfig, SceneConfig, DeviceRef, ProcessorConfig, Subsystem, SourceType, RoomType, ProcessorType } from "../schema/systemConfigSchema";
import { systemConfigWriteSchema } from "../schema/systemConfigSchema";
import { saveSystemConfig } from "../api/saveSystemConfig";
import { loadSystemConfig } from "../api/loadSystemConfig";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function recalcOffsets(rooms: RoomConfig[], processorId?: string): RoomConfig[] {
  if (processorId !== undefined) {
    // Recalc only rooms for this processor
    let offset = 0;
    return rooms.map((room) => {
      if (room.processorId === processorId) {
        const updated = { ...room, joinOffset: offset };
        offset += 100;
        return updated;
      }
      return room;
    });
  }
  return rooms.map((room, i) => ({ ...room, joinOffset: i * 100 }));
}

/** Normalize legacy single-EISC configs to the multi-processor format */
function normalizeConfig(config: SystemConfig): SystemConfig {
  const system = { ...config.system };
  let rooms = [...config.rooms];

  // If no processors array, auto-create one from legacy fields
  if (!system.processors || system.processors.length === 0) {
    system.processors = [{
      id: "main",
      processor: (config.processor ?? "CP4") as ProcessorType,
      eiscIpId: system.eiscIpId ?? "0x03",
      eiscIpAddress: system.eiscIpAddress ?? "127.0.0.2",
    }];
  }

  // Set processorId on rooms that don't have one
  const defaultProcId = system.processors[0]?.id ?? "main";
  rooms = rooms.map((room) =>
    room.processorId ? room : { ...room, processorId: defaultProcId }
  );

  return { ...config, system, rooms };
}

function validateDraft(config: SystemConfig): string[] {
  const result = systemConfigWriteSchema.safeParse(config);
  if (result.success) return [];
  return result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ConfigEditorState {
  draft: SystemConfig | null;
  isDirty: boolean;
  validationErrors: string[];
  saveStatus: SaveStatus;
  saveError: string | null;
  loadStatus: "idle" | "loading" | "error" | "ready";
  loadError: string | null;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Load / persist
  loadFromServer: () => Promise<void>;
  setDraft: (config: SystemConfig) => void;
  save: () => Promise<void>;
  discard: () => Promise<void>;

  // Project info
  setProjectInfo: (projectId: string, systemName: string) => void;
  setEisc: (eiscIpId: string, eiscIpAddress: string) => void;

  // Processors
  addProcessor: (id: string, processor: ProcessorType, eiscIpId: string, eiscIpAddress: string) => void;
  updateProcessor: (id: string, fields: Partial<Omit<ProcessorConfig, "id">>) => void;
  removeProcessor: (id: string) => void;

  // Rooms
  addRoom: (name: string, subsystems?: Subsystem[], roomType?: RoomType, processorId?: string) => void;
  updateRoom: (id: string, updates: Partial<Omit<RoomConfig, "id" | "joinOffset">>) => void;
  removeRoom: (id: string) => void;
  reorderRoom: (id: string, direction: "up" | "down") => void;
  toggleSubsystem: (roomId: string, subsystem: Subsystem) => void;

  // Devices
  assignDevice: (roomId: string, role: string, device: DeviceRef) => void;
  removeDevice: (roomId: string, role: string) => void;
  getDevicesForRole: (roomId: string, baseRole: string) => { role: string; device: DeviceRef }[];
  getNextRoleKey: (roomId: string, baseRole: string) => string;

  // Sources
  addSource: (name: string, type: SourceType) => void;
  updateSource: (id: string, updates: Partial<Omit<SourceConfig, "id">>) => void;
  removeSource: (id: string) => void;
  toggleRoomSource: (roomId: string, sourceId: string) => void;

  // Scenes
  addScene: (name: string) => void;
  updateScene: (id: string, updates: Partial<Omit<SceneConfig, "id">>) => void;
  removeScene: (id: string) => void;
}

const ConfigEditorContext = createContext<ConfigEditorState | null>(null);

export function useConfigEditor(): ConfigEditorState {
  const ctx = useContext(ConfigEditorContext);
  if (!ctx) throw new Error("useConfigEditor must be used within ConfigEditorProvider");
  return ctx;
}

const MAX_HISTORY = 50;

export function ConfigEditorProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftRaw] = useState<SystemConfig | null>(null);
  const [serverSnapshot, setServerSnapshot] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Undo / Redo — past/future stacks
  const pastRef = useRef<SystemConfig[]>([]);
  const futureRef = useRef<SystemConfig[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Auto-save draft to localStorage
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!draft) return;
    const timer = setInterval(() => {
      if (draftRef.current) {
        localStorage.setItem("configEditor-draft", JSON.stringify(draftRef.current));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [draft]);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const updateDraft = useCallback((updater: (prev: SystemConfig) => SystemConfig) => {
    setDraftRaw((prev) => {
      if (!prev) return prev;
      // Push current state onto past stack, clear future (new branch)
      pastRef.current = [...pastRef.current, prev].slice(-MAX_HISTORY);
      futureRef.current = [];

      const next = updater(prev);
      setIsDirty(JSON.stringify(next) !== serverSnapshot);
      setValidationErrors(validateDraft(next));
      setSaveStatus("idle");
      return next;
    });
    syncHistoryFlags();
  }, [serverSnapshot, syncHistoryFlags]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    setDraftRaw((current) => {
      if (!current) return current;
      const prev = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [current, ...futureRef.current];
      setIsDirty(JSON.stringify(prev) !== serverSnapshot);
      setValidationErrors(validateDraft(prev));
      setSaveStatus("idle");
      return prev;
    });
    syncHistoryFlags();
  }, [serverSnapshot, syncHistoryFlags]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    setDraftRaw((current) => {
      if (!current) return current;
      const next = futureRef.current[0];
      futureRef.current = futureRef.current.slice(1);
      pastRef.current = [...pastRef.current, current].slice(-MAX_HISTORY);
      setIsDirty(JSON.stringify(next) !== serverSnapshot);
      setValidationErrors(validateDraft(next));
      setSaveStatus("idle");
      return next;
    });
    syncHistoryFlags();
  }, [serverSnapshot, syncHistoryFlags]);

  const loadFromServer = useCallback(async () => {
    setLoadStatus("loading");
    setLoadError(null);
    try {
      const raw = await loadSystemConfig();
      const data = normalizeConfig(raw);
      const json = JSON.stringify(data);
      setServerSnapshot(json);
      setDraftRaw(data);
      setIsDirty(false);
      setValidationErrors(validateDraft(data));
      setLoadStatus("ready");
      localStorage.removeItem("configEditor-draft");
      clearHistory();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load config");
      setLoadStatus("error");
    }
  }, [clearHistory]);

  const setDraft = useCallback((config: SystemConfig) => {
    const normalized = normalizeConfig(config);
    setDraftRaw(normalized);
    setIsDirty(true);
    setValidationErrors(validateDraft(normalized));
    setSaveStatus("idle");
    clearHistory();
  }, [clearHistory]);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaveStatus("saving");
    setSaveError(null);
    try {
      await saveSystemConfig(draft);
      const json = JSON.stringify(draft);
      setServerSnapshot(json);
      setIsDirty(false);
      setSaveStatus("saved");
      localStorage.removeItem("configEditor-draft");
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
      setSaveStatus("error");
    }
  }, [draft]);

  const discard = useCallback(async () => {
    await loadFromServer();
    setSaveStatus("idle");
    setSaveError(null);
    clearHistory();
  }, [loadFromServer, clearHistory]);

  // Project info
  const setProjectInfo = useCallback((projectId: string, systemName: string) => {
    updateDraft((prev) => ({
      ...prev,
      projectId,
      system: { ...prev.system, name: systemName },
    }));
  }, [updateDraft]);

  const setEisc = useCallback((eiscIpId: string, eiscIpAddress: string) => {
    updateDraft((prev) => ({
      ...prev,
      system: { ...prev.system, eiscIpId, eiscIpAddress },
    }));
  }, [updateDraft]);

  // Processors
  const addProcessor = useCallback((id: string, processor: ProcessorType, eiscIpId: string, eiscIpAddress: string) => {
    updateDraft((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        processors: [...(prev.system.processors ?? []), { id, processor, eiscIpId, eiscIpAddress }],
      },
    }));
  }, [updateDraft]);

  const updateProcessor = useCallback((id: string, fields: Partial<Omit<ProcessorConfig, "id">>) => {
    updateDraft((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        processors: (prev.system.processors ?? []).map((p) =>
          p.id === id ? { ...p, ...fields } : p
        ),
      },
    }));
  }, [updateDraft]);

  const removeProcessor = useCallback((id: string) => {
    updateDraft((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        processors: (prev.system.processors ?? []).filter((p) => p.id !== id),
      },
    }));
  }, [updateDraft]);

  // Rooms
  const addRoom = useCallback((name: string, subsystems: Subsystem[] = ["av", "lighting"], roomType?: RoomType, processorId?: string) => {
    updateDraft((prev) => {
      const id = slugify(name);
      const effectiveSubsystems = roomType === "technical" ? [] as Subsystem[] : subsystems;
      const procId = processorId ?? prev.system.processors?.[0]?.id ?? "main";
      const rooms = recalcOffsets([...prev.rooms, {
        id,
        name,
        joinOffset: 0,
        processorId: procId,
        roomType: roomType ?? "standard",
        subsystems: effectiveSubsystems,
        devices: {} as RoomConfig["devices"],
        sources: [] as string[],
      }], procId);
      return { ...prev, rooms };
    });
  }, [updateDraft]);

  const updateRoom = useCallback((id: string, updates: Partial<Omit<RoomConfig, "id" | "joinOffset">>) => {
    updateDraft((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        if (updates.name && updates.name !== r.name) {
          updated.id = slugify(updates.name);
        }
        return updated;
      }),
    }));
  }, [updateDraft]);

  const removeRoom = useCallback((id: string) => {
    updateDraft((prev) => ({
      ...prev,
      rooms: recalcOffsets(prev.rooms.filter((r) => r.id !== id)),
      scenes: prev.scenes.map((s) => ({
        ...s,
        rooms: s.rooms.filter((r) => r !== id),
      })),
    }));
  }, [updateDraft]);

  const reorderRoom = useCallback((id: string, direction: "up" | "down") => {
    updateDraft((prev) => {
      const idx = prev.rooms.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.rooms.length) return prev;
      const rooms = [...prev.rooms];
      [rooms[idx], rooms[newIdx]] = [rooms[newIdx], rooms[idx]];
      return { ...prev, rooms: recalcOffsets(rooms) };
    });
  }, [updateDraft]);

  const toggleSubsystem = useCallback((roomId: string, subsystem: Subsystem) => {
    updateDraft((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => {
        if (r.id !== roomId) return r;
        const has = r.subsystems.includes(subsystem);
        return {
          ...r,
          subsystems: has
            ? r.subsystems.filter((s) => s !== subsystem)
            : [...r.subsystems, subsystem],
        };
      }),
    }));
  }, [updateDraft]);

  // Devices
  const assignDevice = useCallback((roomId: string, role: string, device: DeviceRef) => {
    updateDraft((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id === roomId ? { ...r, devices: { ...r.devices, [role]: device } } : r
      ),
    }));
  }, [updateDraft]);

  const removeDevice = useCallback((roomId: string, role: string) => {
    updateDraft((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => {
        if (r.id !== roomId) return r;
        const devices = { ...r.devices };
        delete devices[role];
        return { ...r, devices };
      }),
    }));
  }, [updateDraft]);

  /** Get all devices matching a base role (e.g. "display" matches "display", "display-2") */
  const getDevicesForRole = useCallback((roomId: string, baseRole: string) => {
    if (!draft) return [];
    const room = draft.rooms.find((r) => r.id === roomId);
    if (!room) return [];
    return Object.entries(room.devices)
      .filter(([role]) => {
        if (role === baseRole) return true;
        const match = role.match(/^(.+)-(\d+)$/);
        return match ? match[1] === baseRole : false;
      })
      .map(([role, device]) => ({ role, device }));
  }, [draft]);

  /** Get the next available numbered role key (e.g. "display-2", "display-3") */
  const getNextRoleKey = useCallback((roomId: string, baseRole: string) => {
    const existing = getDevicesForRole(roomId, baseRole);
    if (existing.length === 0) return baseRole;
    let n = 2;
    while (existing.some(({ role }) => role === `${baseRole}-${n}`)) n++;
    return `${baseRole}-${n}`;
  }, [getDevicesForRole]);

  // Sources
  const addSource = useCallback((name: string, type: SourceType) => {
    updateDraft((prev) => ({
      ...prev,
      sources: [...prev.sources, { id: slugify(name), name, type }],
    }));
  }, [updateDraft]);

  const updateSource = useCallback((id: string, updates: Partial<Omit<SourceConfig, "id">>) => {
    updateDraft((prev) => ({
      ...prev,
      sources: prev.sources.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  }, [updateDraft]);

  const removeSource = useCallback((id: string) => {
    updateDraft((prev) => ({
      ...prev,
      sources: prev.sources.filter((s) => s.id !== id),
      rooms: prev.rooms.map((r) => ({
        ...r,
        sources: r.sources.filter((s) => s !== id),
      })),
    }));
  }, [updateDraft]);

  const toggleRoomSource = useCallback((roomId: string, sourceId: string) => {
    updateDraft((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => {
        if (r.id !== roomId) return r;
        const has = r.sources.includes(sourceId);
        return {
          ...r,
          sources: has
            ? r.sources.filter((s) => s !== sourceId)
            : [...r.sources, sourceId],
        };
      }),
    }));
  }, [updateDraft]);

  // Scenes
  const addScene = useCallback((name: string) => {
    updateDraft((prev) => ({
      ...prev,
      scenes: [...prev.scenes, { id: slugify(name), name, rooms: [], actions: {} }],
    }));
  }, [updateDraft]);

  const updateScene = useCallback((id: string, updates: Partial<Omit<SceneConfig, "id">>) => {
    updateDraft((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  }, [updateDraft]);

  const removeScene = useCallback((id: string) => {
    updateDraft((prev) => ({
      ...prev,
      scenes: prev.scenes.filter((s) => s.id !== id),
    }));
  }, [updateDraft]);

  const state: ConfigEditorState = {
    draft, isDirty, validationErrors, saveStatus, saveError, loadStatus, loadError,
    undo, redo, canUndo, canRedo,
    loadFromServer, setDraft, save, discard,
    setProjectInfo, setEisc,
    addProcessor, updateProcessor, removeProcessor,
    addRoom, updateRoom, removeRoom, reorderRoom, toggleSubsystem,
    assignDevice, removeDevice, getDevicesForRole, getNextRoleKey,
    addSource, updateSource, removeSource, toggleRoomSource,
    addScene, updateScene, removeScene,
  };

  return (
    <ConfigEditorContext value={state}>
      {children}
    </ConfigEditorContext>
  );
}

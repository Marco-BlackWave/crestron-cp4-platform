import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { SystemConfig, RoomConfig, SourceConfig, SceneConfig, DeviceRef, Subsystem, SourceType } from "../schema/systemConfigSchema";
import { systemConfigWriteSchema } from "../schema/systemConfigSchema";
import { saveSystemConfig } from "../api/saveSystemConfig";
import { useApiKey } from "./useApiKey";
import { loadSystemConfig } from "../api/loadSystemConfig";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function recalcOffsets(rooms: RoomConfig[]): RoomConfig[] {
  return rooms.map((room, i) => ({ ...room, joinOffset: i * 100 }));
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

  // Load / persist
  loadFromServer: () => Promise<void>;
  setDraft: (config: SystemConfig) => void;
  save: () => Promise<void>;
  discard: () => Promise<void>;

  // Project info
  setProjectInfo: (projectId: string, systemName: string) => void;
  setEisc: (eiscIpId: string, eiscIpAddress: string) => void;

  // Rooms
  addRoom: (name: string, subsystems?: Subsystem[]) => void;
  updateRoom: (id: string, updates: Partial<Omit<RoomConfig, "id" | "joinOffset">>) => void;
  removeRoom: (id: string) => void;
  reorderRoom: (id: string, direction: "up" | "down") => void;
  toggleSubsystem: (roomId: string, subsystem: Subsystem) => void;

  // Devices
  assignDevice: (roomId: string, role: string, device: DeviceRef) => void;
  removeDevice: (roomId: string, role: string) => void;

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

export function ConfigEditorProvider({ children }: { children: ReactNode }) {
  const { apiKey } = useApiKey();
  const [draft, setDraftRaw] = useState<SystemConfig | null>(null);
  const [serverSnapshot, setServerSnapshot] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const updateDraft = useCallback((updater: (prev: SystemConfig) => SystemConfig) => {
    setDraftRaw((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setIsDirty(JSON.stringify(next) !== serverSnapshot);
      setValidationErrors(validateDraft(next));
      setSaveStatus("idle");
      return next;
    });
  }, [serverSnapshot]);

  const loadFromServer = useCallback(async () => {
    setLoadStatus("loading");
    setLoadError(null);
    try {
      const data = await loadSystemConfig(apiKey);
      const json = JSON.stringify(data);
      setServerSnapshot(json);
      setDraftRaw(data);
      setIsDirty(false);
      setValidationErrors(validateDraft(data));
      setLoadStatus("ready");
      localStorage.removeItem("configEditor-draft");
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load config");
      setLoadStatus("error");
    }
  }, [apiKey]);

  const setDraft = useCallback((config: SystemConfig) => {
    setDraftRaw(config);
    setIsDirty(true);
    setValidationErrors(validateDraft(config));
    setSaveStatus("idle");
  }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaveStatus("saving");
    setSaveError(null);
    try {
      await saveSystemConfig(apiKey, draft);
      const json = JSON.stringify(draft);
      setServerSnapshot(json);
      setIsDirty(false);
      setSaveStatus("saved");
      localStorage.removeItem("configEditor-draft");
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
      setSaveStatus("error");
    }
  }, [apiKey, draft]);

  const discard = useCallback(async () => {
    await loadFromServer();
    setSaveStatus("idle");
    setSaveError(null);
  }, [loadFromServer]);

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

  // Rooms
  const addRoom = useCallback((name: string, subsystems: Subsystem[] = ["av", "lighting"]) => {
    updateDraft((prev) => {
      const id = slugify(name);
      const rooms = recalcOffsets([...prev.rooms, {
        id,
        name,
        joinOffset: 0,
        subsystems,
        devices: {} as RoomConfig["devices"],
        sources: [] as string[],
      }]);
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
    loadFromServer, setDraft, save, discard,
    setProjectInfo, setEisc,
    addRoom, updateRoom, removeRoom, reorderRoom, toggleSubsystem,
    assignDevice, removeDevice,
    addSource, updateSource, removeSource, toggleRoomSource,
    addScene, updateScene, removeScene,
  };

  return (
    <ConfigEditorContext value={state}>
      {children}
    </ConfigEditorContext>
  );
}

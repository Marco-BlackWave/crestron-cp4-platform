import { useRef, useCallback, useSyncExternalStore, useEffect } from "react";
import { SignalEngine, type SimSignal, type SigType, type SigValue } from "../simulator/SignalEngine";
import { createSubsystemSims, type SubsystemSim } from "../simulator/SubsystemSim";
import type { SystemConfig } from "../schema/systemConfigSchema";

interface EngineState {
  signals: SimSignal[];
  version: number;
}

export function useSignalEngine(config: SystemConfig | null) {
  const engineRef = useRef<SignalEngine | null>(null);
  const subsRef = useRef<SubsystemSim[]>([]);
  const stateRef = useRef<EngineState>({ signals: [], version: 0 });
  const listenersRef = useRef(new Set<() => void>());

  // Initialize engine
  if (!engineRef.current) {
    engineRef.current = new SignalEngine();
    subsRef.current = createSubsystemSims();
  }

  const engine = engineRef.current;

  // Rebuild when config changes
  useEffect(() => {
    if (!config) return;

    const procs = config.system?.processors ?? [{ id: "main" }];
    const rooms = config.rooms.map((r) => ({
      id: r.id,
      joinOffset: r.joinOffset,
      processorId: r.processorId ?? procs[0]?.id ?? "main",
      subsystems: r.subsystems ?? [],
      name: r.name,
    }));

    engine.initFromConfig({ processors: procs, rooms });

    // Wire subsystem simulators to engine
    const unsub = engine.onAnyChange((signal) => {
      if (signal.direction !== "input" || signal.roomId === null) return;

      // Parse type and offset from key
      const parts = signal.key.split(":");
      if (parts.length !== 3) return;
      const [type, roomId, offsetStr] = parts;
      const offset = parseInt(offsetStr, 10);
      if (isNaN(offset)) return;

      // Find room's subsystems
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      // Route to appropriate subsystem sim
      for (const sim of subsRef.current) {
        if (room.subsystems.includes(sim.subsystemType)) {
          sim.processSignal(roomId, type as SigType, offset, signal.value, engine);
        }
      }
    });

    // Update state snapshot
    stateRef.current = { signals: engine.getAllSignals(), version: engine.version };
    for (const cb of listenersRef.current) cb();

    return unsub;
  }, [config, engine]);

  // Subscribe for reactive updates
  useEffect(() => {
    const unsub = engine.onAnyChange(() => {
      stateRef.current = { signals: engine.getAllSignals(), version: engine.version };
      for (const cb of listenersRef.current) cb();
    });
    return unsub;
  }, [engine]);

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  // Actions
  const pressButton = useCallback((roomId: string, offset: number) => {
    engine.setInput("digital", roomId, offset, true);
    // Momentary release after 100ms
    setTimeout(() => engine.setInput("digital", roomId, offset, false), 100);
  }, [engine]);

  const releaseButton = useCallback((roomId: string, offset: number) => {
    engine.setInput("digital", roomId, offset, false);
  }, [engine]);

  const setAnalog = useCallback((roomId: string, offset: number, value: number) => {
    engine.setInput("analog", roomId, offset, value);
  }, [engine]);

  const sendSerial = useCallback((roomId: string, offset: number, text: string) => {
    engine.setInput("serial", roomId, offset, text);
  }, [engine]);

  const toggleConnection = useCallback((processorId: string) => {
    engine.toggleConnection(processorId);
    stateRef.current = { signals: engine.getAllSignals(), version: engine.version };
    for (const cb of listenersRef.current) cb();
  }, [engine]);

  const resetSimulation = useCallback(() => {
    engine.reset();
    stateRef.current = { signals: engine.getAllSignals(), version: engine.version };
    for (const cb of listenersRef.current) cb();
  }, [engine]);

  const setSignalValue = useCallback((key: string, value: SigValue) => {
    engine.setSignalValue(key, value);
  }, [engine]);

  return {
    engine,
    signals: state.signals,
    version: state.version,
    eiscs: engine.getAllEiscs(),
    pressButton,
    releaseButton,
    setAnalog,
    sendSerial,
    toggleConnection,
    resetSimulation,
    setSignalValue,
  };
}

import { useEffect } from "react";
import { loadDevices, loadDevice } from "../api/loadDevices";
import { DeviceProfile } from "../schema/deviceProfileSchema";
import { useDataLoader } from "./useDataLoader";

interface DevicesState {
  status: "idle" | "loading" | "error" | "ready";
  data: DeviceProfile[];
  error: string | null;
  reload: () => void;
}

export function useDevices(): DevicesState {
  const { status, data, error, reload } = useDataLoader<DeviceProfile[]>({
    load: loadDevices,
    initialData: [],
  });

  return { status, data, error, reload };
}

interface DeviceState {
  status: "idle" | "loading" | "error" | "ready";
  data: DeviceProfile | null;
  error: string | null;
}

export function useDevice(id: string | undefined): DeviceState {
  const { status, data, error, reload } = useDataLoader<DeviceProfile | null>({
    load: () => {
      if (!id) {
        return Promise.resolve(null);
      }

      return loadDevice(id);
    },
    initialData: null,
    autoLoad: false,
  });

  useEffect(() => {
    reload();
  }, [id, reload]);

  return { status, data, error };
}

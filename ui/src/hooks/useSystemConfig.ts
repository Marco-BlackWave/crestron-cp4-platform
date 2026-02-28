import { loadSystemConfig } from "../api/loadSystemConfig";
import { SystemConfig } from "../schema/systemConfigSchema";
import { useDataLoader } from "./useDataLoader";

interface SystemConfigState {
  status: "idle" | "loading" | "error" | "ready";
  data: SystemConfig | null;
  error: string | null;
  reload: () => void;
}

export function useSystemConfig(): SystemConfigState {
  const { status, data, error, reload } = useDataLoader<SystemConfig | null>({
    load: loadSystemConfig,
    initialData: null,
  });

  return { status, data, error, reload };
}

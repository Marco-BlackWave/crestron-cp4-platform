import { useCallback, useEffect, useState } from "react";
import { loadSystemConfig } from "../api/loadSystemConfig";
import { SystemConfig } from "../schema/systemConfigSchema";

interface SystemConfigState {
  status: "idle" | "loading" | "error" | "ready";
  data: SystemConfig | null;
  error: string | null;
  reload: () => void;
}

export function useSystemConfig(): SystemConfigState {
  const [status, setStatus] = useState<SystemConfigState["status"]>("idle");
  const [data, setData] = useState<SystemConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setStatus("loading");
    loadSystemConfig()
      .then((result) => {
        setData(result);
        setStatus("ready");
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { status, data, error, reload };
}

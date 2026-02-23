import { useCallback, useEffect, useState } from "react";
import { loadSystemConfig } from "../api/loadSystemConfig";
import { SystemConfig } from "../schema/systemConfigSchema";
import { useApiKey } from "./useApiKey";

interface SystemConfigState {
  status: "idle" | "loading" | "error" | "ready";
  data: SystemConfig | null;
  error: string | null;
  reload: () => void;
}

export function useSystemConfig(): SystemConfigState {
  const { apiKey } = useApiKey();
  const [status, setStatus] = useState<SystemConfigState["status"]>("idle");
  const [data, setData] = useState<SystemConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!apiKey) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    loadSystemConfig(apiKey)
      .then((result) => {
        setData(result);
        setStatus("ready");
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  }, [apiKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { status, data, error, reload };
}

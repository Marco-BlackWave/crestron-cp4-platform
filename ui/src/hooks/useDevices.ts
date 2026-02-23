import { useCallback, useEffect, useState } from "react";
import { loadDevices, loadDevice } from "../api/loadDevices";
import { DeviceProfile } from "../schema/deviceProfileSchema";
import { useApiKey } from "./useApiKey";

interface DevicesState {
  status: "idle" | "loading" | "error" | "ready";
  data: DeviceProfile[];
  error: string | null;
  reload: () => void;
}

export function useDevices(): DevicesState {
  const { apiKey } = useApiKey();
  const [status, setStatus] = useState<DevicesState["status"]>("idle");
  const [data, setData] = useState<DeviceProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!apiKey) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    loadDevices(apiKey)
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

interface DeviceState {
  status: "idle" | "loading" | "error" | "ready";
  data: DeviceProfile | null;
  error: string | null;
}

export function useDevice(id: string | undefined): DeviceState {
  const { apiKey } = useApiKey();
  const [status, setStatus] = useState<DeviceState["status"]>("idle");
  const [data, setData] = useState<DeviceProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !id) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    loadDevice(apiKey, id)
      .then((result) => {
        setData(result);
        setStatus("ready");
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  }, [apiKey, id]);

  return { status, data, error };
}

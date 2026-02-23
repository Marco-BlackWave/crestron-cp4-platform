import { useCallback, useEffect, useState } from "react";
import { loadJoinContract } from "../api/loadJoinContract";
import { JoinContract } from "../schema/joinContractSchema";
import { useApiKey } from "./useApiKey";

interface JoinContractState {
  status: "idle" | "loading" | "error" | "ready";
  data: JoinContract | null;
  error: string | null;
  reload: () => void;
}

export function useJoinContract(): JoinContractState {
  const { apiKey } = useApiKey();
  const [status, setStatus] = useState<JoinContractState["status"]>("idle");
  const [data, setData] = useState<JoinContract | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!apiKey) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    loadJoinContract(apiKey)
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

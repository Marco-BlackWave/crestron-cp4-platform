import { useCallback, useEffect, useState } from "react";
import { loadJoinContract } from "../api/loadJoinContract";
import { JoinContract } from "../schema/joinContractSchema";

interface JoinContractState {
  status: "idle" | "loading" | "error" | "ready";
  data: JoinContract | null;
  error: string | null;
  reload: () => void;
}

export function useJoinContract(): JoinContractState {
  const [status, setStatus] = useState<JoinContractState["status"]>("idle");
  const [data, setData] = useState<JoinContract | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setStatus("loading");
    loadJoinContract()
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

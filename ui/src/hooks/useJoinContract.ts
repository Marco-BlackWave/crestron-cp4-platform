import { loadJoinContract } from "../api/loadJoinContract";
import { JoinContract } from "../schema/joinContractSchema";
import { useDataLoader } from "./useDataLoader";

interface JoinContractState {
  status: "idle" | "loading" | "error" | "ready";
  data: JoinContract | null;
  error: string | null;
  reload: () => void;
}

export function useJoinContract(): JoinContractState {
  const { status, data, error, reload } = useDataLoader<JoinContract | null>({
    load: loadJoinContract,
    initialData: null,
  });

  return { status, data, error, reload };
}

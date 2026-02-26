import { useCallback, useEffect, useRef, useState } from "react";

export type DataLoadStatus = "idle" | "loading" | "error" | "ready";

interface UseDataLoaderOptions<TData> {
  load: () => Promise<TData>;
  initialData: TData;
  autoLoad?: boolean;
}

interface UseDataLoaderResult<TData> {
  status: DataLoadStatus;
  data: TData;
  error: string | null;
  reload: () => void;
}

export function useDataLoader<TData>({
  load,
  initialData,
  autoLoad = true,
}: UseDataLoaderOptions<TData>): UseDataLoaderResult<TData> {
  const [status, setStatus] = useState<DataLoadStatus>("idle");
  const [data, setData] = useState<TData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);

  loadRef.current = load;

  const reload = useCallback(() => {
    setStatus("loading");
    loadRef.current()
      .then((result) => {
        setData(result);
        setStatus("ready");
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    if (autoLoad) {
      reload();
    }
  }, [autoLoad, reload]);

  return { status, data, error, reload };
}

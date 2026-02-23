import { useCallback, useEffect, useState } from "react";
import { useApiKey } from "./useApiKey";

export interface CatalogData {
  version: string;
  generatedAt: string;
  totalProfiles: number;
  categories: Record<string, { count: number; profiles: string[] }>;
  profiles: {
    id: string;
    manufacturer: string;
    model: string;
    category: string;
    protocols: string[];
    sourceModule?: string;
  }[];
}

interface CatalogState {
  status: "idle" | "loading" | "error" | "ready";
  data: CatalogData | null;
  error: string | null;
}

export function useCatalog(): CatalogState {
  const { apiKey } = useApiKey();
  const [status, setStatus] = useState<CatalogState["status"]>("idle");
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!apiKey) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    fetch("/api/catalog", { headers: { "X-API-Key": apiKey } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load catalog");
        return res.json();
      })
      .then((json: CatalogData) => {
        setData(json);
        setStatus("ready");
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  }, [apiKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { status, data, error };
}

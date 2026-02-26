import { useDataLoader } from "./useDataLoader";

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

async function loadCatalog(): Promise<CatalogData | null> {
  const res = await fetch("/api/catalog");
  if (!res.ok) {
    throw new Error("Failed to load catalog");
  }

  const json = await res.json();
  return json as CatalogData;
}

export function useCatalog(): CatalogState {
  const { status, data, error } = useDataLoader<CatalogData | null>({
    load: loadCatalog,
    initialData: null,
  });

  return { status, data, error };
}

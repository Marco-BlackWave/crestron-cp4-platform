import { useCallback, useEffect, useState } from "react";
import {
  listProjects,
  deleteProject,
  activateProject,
  importProject,
  type ProjectSummary,
} from "../api/projectsApi";

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listProjects();
      setProjects(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteProject(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete project");
    }
  }, [refresh]);

  const activate = useCallback(async (id: string) => {
    try {
      await activateProject(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to activate project");
    }
  }, [refresh]);

  const importJson = useCallback(async (json: string) => {
    try {
      const config = JSON.parse(json);
      await importProject(config);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import project");
    }
  }, [refresh]);

  return { projects, loading, error, refresh, remove, activate, importJson };
}

export interface ProjectSummary {
  id: string;
  name: string;
  rooms: number;
  modified: string;
  fileName: string;
}

const BASE = "/api/projects";

export async function listProjects(): Promise<ProjectSummary[]> {
  const resp = await fetch(BASE);
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function getProject(id: string): Promise<unknown> {
  const resp = await fetch(`${BASE}/${id}`);
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function saveProject(config: unknown): Promise<{ message: string; id: string }> {
  const resp = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function deleteProject(id: string): Promise<void> {
  const resp = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!resp.ok) throw new Error(await resp.text());
}

export async function importProject(config: unknown): Promise<{ message: string; id: string }> {
  const resp = await fetch(`${BASE}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function activateProject(id: string): Promise<void> {
  const resp = await fetch(`${BASE}/${id}/activate`, { method: "POST" });
  if (!resp.ok) throw new Error(await resp.text());
}

export interface RepoBootstrapResult {
  message: string;
  repoPath: string;
  gitInitialized: boolean;
  gitMessage: string;
}

export async function bootstrapProjectRepo(
  id: string,
  options?: { initializeGit?: boolean; repoFolderName?: string }
): Promise<RepoBootstrapResult> {
  const resp = await fetch(`${BASE}/${id}/bootstrap-repo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {}),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

import type { SystemConfig } from "../schema/systemConfigSchema";

interface NewProjectInput {
  projectId: string;
  systemName: string;
  rooms: { name: string }[];
}

export async function createSystemConfig(
  apiKey: string,
  input: NewProjectInput
): Promise<SystemConfig> {
  const response = await fetch("/api/systemconfig/new", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.message || "Failed to create project template.");
    } catch (e) {
      if (e instanceof Error && e.message !== "Failed to create project template.") throw e;
      throw new Error(text || "Failed to create project template.");
    }
  }

  return response.json();
}

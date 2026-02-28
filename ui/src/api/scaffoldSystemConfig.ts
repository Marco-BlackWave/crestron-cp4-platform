import { systemConfigSchema, type SystemConfig } from "../schema/systemConfigSchema";

export interface ScaffoldRoomSpec {
  name: string;
  subsystems?: string[];
  roomType?: "standard" | "technical";
  processorId?: string;
}

export interface ScaffoldProcessorSpec {
  id?: string;
  processor?: string;
  eiscIpId?: string;
  eiscIpAddress?: string;
}

export interface ScaffoldRequest {
  systemName: string;
  projectId?: string;
  tasks?: string[];
  integrations?: string[];
  rooms?: ScaffoldRoomSpec[];
  processors?: ScaffoldProcessorSpec[];
}

export interface ScaffoldResponse {
  config: SystemConfig;
  report: {
    taskCount: number;
    integrationCount: number;
    assumptions: string[];
  };
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text();
    const json = JSON.parse(text);
    if (json && typeof json.message === "string") return json.message;
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function scaffoldSystemConfig(payload: ScaffoldRequest): Promise<ScaffoldResponse> {
  const response = await fetch("/api/systemconfig/scaffold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Scaffold request failed."));
  }

  const json = await response.json();
  const parsedConfig = systemConfigSchema.safeParse(json?.config);
  if (!parsedConfig.success) {
    const msg = parsedConfig.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Scaffold response validation failed: ${msg}`);
  }

  return {
    config: parsedConfig.data,
    report: {
      taskCount: Number(json?.report?.taskCount ?? 0),
      integrationCount: Number(json?.report?.integrationCount ?? 0),
      assumptions: Array.isArray(json?.report?.assumptions) ? json.report.assumptions.map(String) : [],
    },
  };
}

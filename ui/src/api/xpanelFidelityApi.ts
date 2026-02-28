export interface XpanelAnalyzeResponse {
  analyzedAtUtc: string;
  source: {
    path: string;
    exists: boolean;
    keyChecks: Array<{ key: string; exists: boolean; path: string }>;
    candidateSourceFileCount: number;
  };
  package: {
    path: string;
    exists: boolean;
    liveDistPath: string;
    liveDistExists: boolean;
    liveUrl: string;
  };
  joinAttributeCounts: {
    dataJoin: number;
    dataJoinDigital: number;
    dataJoinAnalog: number;
    dataJoinSerial: number;
  };
  joinContract: {
    systemConfigPath: string;
    hasSystemConfig: boolean;
    available: boolean;
    roomCount: number;
    joinCount: number;
    error?: string | null;
  };
  note: string;
}

export interface XpanelPrepareRequest {
  runBuild?: boolean;
  processorIp?: string;
  processorPort?: number;
  ipid?: string;
}

export interface XpanelPrepareResponse {
  preparedAtUtc: string;
  source: string;
  package: string;
  runBuild: boolean;
  processorConnection: {
    processorIp: string;
    processorPort: number;
    ipid: string;
  };
  commands: Array<{
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
    ok: boolean;
  }>;
  artifacts: Array<{ relativePath: string; sizeBytes: number }>;
  livePreviewUrl: string;
  liveLaunchUrl: string;
  note: string;
}

async function extractError(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return fallback;
    const json = JSON.parse(text);
    if (json && typeof json.message === "string") return json.message;
    return text;
  } catch {
    return fallback;
  }
}

export async function analyzeXpanel(): Promise<XpanelAnalyzeResponse> {
  const response = await fetch("/api/xpanel/analyze", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to analyze XPanel source."));
  }
  return response.json();
}

export async function prepareXpanelPackage(request: XpanelPrepareRequest): Promise<XpanelPrepareResponse> {
  const response = await fetch("/api/xpanel/prepare-package", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to prepare XPanel package."));
  }

  return response.json();
}

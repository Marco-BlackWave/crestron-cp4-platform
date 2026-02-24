// --- Existing functions ---

export async function testConnection(ip: string, port = 41794): Promise<{ reachable: boolean; latencyMs: number }> {
  const resp = await fetch("/api/network/test-connection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, port }),
  });
  if (!resp.ok) throw new Error("Connection test failed");
  return resp.json();
}

export async function generateJoinList(): Promise<unknown> {
  const resp = await fetch("/api/joinlist/generate");
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

// --- Deploy types ---

export interface SftpCredentials {
  ip: string;
  port: number;
  username: string;
  password: string;
}

export interface AuthTestResult {
  success: boolean;
  serverInfo: string | null;
  message: string;
}

export interface FilePreview {
  name: string;
  targetPath: string;
  sizeBytes: number;
  contentHash: string;
}

export interface FileTransferStatus {
  name: string;
  remotePath: string;
  totalBytes: number;
  bytesTransferred: number;
  status: "pending" | "transferring" | "done" | "error";
  error?: string;
}

export interface DeployStatus {
  id: string;
  status: "preparing" | "transferring" | "completed" | "error" | "cancelled";
  progress: number;
  files: FileTransferStatus[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface VerifyFileResult {
  name: string;
  remotePath: string;
  exists: boolean;
  expectedSize: number;
  remoteSize: number;
  sizeMatch: boolean;
}

export interface VerifyResult {
  success: boolean;
  files: VerifyFileResult[];
  error?: string;
}

export interface RestartResult {
  success: boolean;
  output: string;
}

// --- Deploy API functions ---

export async function testSftpAuth(creds: SftpCredentials): Promise<AuthTestResult> {
  const resp = await fetch("/api/deploy/test-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ message: "Auth test failed" }));
    throw new Error(err.message);
  }
  return resp.json();
}

export async function getDeployPreview(): Promise<{ files: FilePreview[] }> {
  const resp = await fetch("/api/deploy/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ message: "Preview failed" }));
    throw new Error(err.message);
  }
  return resp.json();
}

export async function startDeploy(creds: SftpCredentials): Promise<{ deployId: string }> {
  const resp = await fetch("/api/deploy/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ message: "Deploy failed" }));
    throw new Error(err.message);
  }
  return resp.json();
}

export async function getDeployStatus(deployId: string): Promise<DeployStatus> {
  const resp = await fetch(`/api/deploy/status/${deployId}`);
  if (!resp.ok) throw new Error("Failed to get deploy status");
  return resp.json();
}

export async function cancelDeploy(deployId: string): Promise<void> {
  const resp = await fetch(`/api/deploy/${deployId}`, { method: "DELETE" });
  if (!resp.ok) throw new Error("Failed to cancel deploy");
}

export async function verifyDeploy(deployId: string, creds: SftpCredentials): Promise<VerifyResult> {
  const resp = await fetch(`/api/deploy/verify/${deployId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  if (!resp.ok) throw new Error("Verification failed");
  return resp.json();
}

export async function restartProgram(creds: Omit<SftpCredentials, "port">): Promise<RestartResult> {
  const resp = await fetch("/api/deploy/restart-program", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  if (!resp.ok) throw new Error("Restart failed");
  return resp.json();
}

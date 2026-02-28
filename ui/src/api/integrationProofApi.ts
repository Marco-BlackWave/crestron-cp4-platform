export interface IntegrationEvidence {
  roomId: string;
  role: string;
  profileId: string;
  protocol: string;
  port: string;
  address: string;
}

export interface IntegrationProofItem {
  integration: string;
  configured: boolean;
  count: number;
  evidence: IntegrationEvidence[];
  feedbackReady: boolean;
}

export interface IntegrationProofResponse {
  ready: boolean;
  transferReady?: boolean;
  transferFiles?: Array<{ localName: string; remotePath: string; size: number; sha256: string }>;
  joinCount?: number;
  integrationReport?: IntegrationProofItem[];
  note?: string;
  message?: string;
  validationError?: string;
}

export async function loadIntegrationProof(): Promise<IntegrationProofResponse> {
  const resp = await fetch("/api/integrations/proof");
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export interface XmlLibrarySummary {
  name: string;
  path: string;
  sizeBytes: number;
  memberCount: number;
}

export interface ZipArtifactSummary {
  name: string;
  path: string;
  sizeBytes: number;
}

export interface AttachmentAnalysisResponse {
  analyzedAtUtc: string;
  sdk: {
    path: string;
    exists: boolean;
    topLevel: string[];
    zipArtifacts: ZipArtifactSummary[];
    xmlLibraries: XmlLibrarySummary[];
  };
  ch5ReleaseNotes: { path: string; exists: boolean; sizeBytes?: number; modifiedUtc?: string };
  sdkCdPdf: { path: string; exists: boolean; sizeBytes?: number; modifiedUtc?: string };
  note: string;
}

export async function loadAttachmentAnalysis(): Promise<AttachmentAnalysisResponse> {
  const response = await fetch("/api/attachments/analyze", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

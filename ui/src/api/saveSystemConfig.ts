import { systemConfigWriteSchema } from "../schema/systemConfigSchema";

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text();
    const json = JSON.parse(text);
    if (json && typeof json.message === "string") {
      return json.message;
    }
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function saveSystemConfig(
  config: unknown
): Promise<void> {
  const parsed = systemConfigWriteSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`SystemConfig validation failed: ${message}`);
  }

  const response = await fetch("/api/systemconfig", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parsed.data, null, 2),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response, "Failed to update SystemConfig.");
    throw new Error(message);
  }
}

import { joinListSchema, JoinListConfig } from "../schema/joinListSchema";

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

export async function loadJoinList(
  baseUrl: string,
  apiKey: string
): Promise<JoinListConfig> {
  const response = await fetch(`${baseUrl}/joinlist`, {
    cache: "no-store",
    headers: {
      "X-API-Key": apiKey
    }
  });
  if (!response.ok) {
    const message = await extractErrorMessage(response, "Join List request failed.");
    throw new Error(message);
  }

  const json = await response.json();
  const parsed = joinListSchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Join List validation failed: ${message}`);
  }

  return parsed.data;
}

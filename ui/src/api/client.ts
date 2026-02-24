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

export async function apiFetch(path: string): Promise<unknown> {
  const response = await fetch(`/api${path}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await extractErrorMessage(response, `Request to ${path} failed.`);
    throw new Error(message);
  }
  return response.json();
}

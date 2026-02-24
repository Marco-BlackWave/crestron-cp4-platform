export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export async function validateSystemConfig(
  config: unknown
): Promise<ValidationResult> {
  const response = await fetch("/api/systemconfig/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config, null, 2),
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return { valid: false, errors: [json.message || "Validation request failed."] };
    } catch {
      return { valid: false, errors: [text || "Validation request failed."] };
    }
  }

  return response.json();
}

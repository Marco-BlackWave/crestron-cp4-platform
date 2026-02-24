export async function createDevice(profile: unknown): Promise<unknown> {
  const response = await fetch("/api/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Failed to create device." }));
    throw new Error((err as { message?: string }).message ?? "Failed to create device.");
  }
  return response.json();
}

export async function updateDevice(id: string, profile: unknown): Promise<void> {
  const response = await fetch(`/api/devices/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Failed to update device." }));
    throw new Error((err as { message?: string }).message ?? "Failed to update device.");
  }
}

export async function cloneDevice(id: string): Promise<unknown> {
  const response = await fetch(`/api/devices/${encodeURIComponent(id)}/clone`, {
    method: "POST",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Failed to clone device." }));
    throw new Error((err as { message?: string }).message ?? "Failed to clone device.");
  }
  return response.json();
}

export async function deleteDevice(id: string): Promise<void> {
  const response = await fetch(`/api/devices/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Failed to delete device." }));
    throw new Error((err as { message?: string }).message ?? "Failed to delete device.");
  }
}

import type { JobPayload } from "./api";

export function cleanPayload(v: JobPayload): JobPayload {
  const client = v.client_info ?? {};
  const hasClient = Object.values(client).some(
    (x) => x !== "" && x !== null && x !== undefined,
  );
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    budget: v.budget?.trim() || undefined,
    skills: v.skills,
    client_info: hasClient
      ? {
          country: client.country || undefined,
          hire_rate: client.hire_rate || undefined,
          reviews: client.reviews ?? undefined,
          total_spent: client.total_spent || undefined,
        }
      : undefined,
  };
}
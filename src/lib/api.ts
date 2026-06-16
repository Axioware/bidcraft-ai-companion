export const API_BASE = "http://localhost:8000";

export interface ClientInfo {
  country?: string;
  hire_rate?: string;
  reviews?: number | null;
  total_spent?: string;
}

export interface JobPayload {
  title: string;
  description: string;
  budget?: string;
  skills: string[];
  client_info?: ClientInfo;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  budget?: string;
  skills: string[];
  client_info?: ClientInfo;
  created_at: string;
}

export interface Bid {
  id: string;
  job_id: string;
  bid_text: string;
  is_manual: boolean;
  created_at: string;
}

export async function fetchJobs(skip = 0, limit = 20): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function fetchJobBid(jobId: string): Promise<Bid> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}/bid`);
  if (!res.ok) throw new Error("Failed to fetch bid");
  return res.json();
}

export async function seedBid(payload: JobPayload & { bid_text: string }) {
  const res = await fetch(`${API_BASE}/api/v1/bids/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to seed bid");
  return res.json() as Promise<{ job_id: string; bid_id: string; message: string }>;
}

export interface StreamEvent {
  type: "chunk" | "done";
  content?: string;
  bid_id?: string;
  job_id?: string;
}

export async function streamBid(
  payload: JobPayload,
  onEvent: (e: StreamEvent) => void,
  signal: AbortSignal,
) {
  const res = await fetch(`${API_BASE}/api/v1/jobs/generate-bid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) throw new Error("Stream failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data) continue;
      try {
        onEvent(JSON.parse(data) as StreamEvent);
      } catch {
        // ignore malformed
      }
    }
  }
}
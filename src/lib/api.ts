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

export async function fetchJobBids(jobId: string): Promise<Bid[]> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}/bids`);
  if (!res.ok) throw new Error("Failed to fetch bid versions");
  return res.json();
}

export async function fetchJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch job");
  return res.json();
}

export async function streamRevision(
  jobId: string,
  bidId: string,
  instruction: string,
  onEvent: (e: StreamEvent) => void,
  signal: AbortSignal,
) {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}/bids/${bidId}/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error("Revision stream failed");
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

export async function seedBid(payload: JobPayload & { bid_text: string }) {
  const res = await fetch(`${API_BASE}/api/v1/bids/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to seed bid");
  return res.json() as Promise<{ job_id: string; bid_id: string; message: string }>;
}

export interface Prompt {
  id: string;
  type: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

export async function fetchPrompts(): Promise<Prompt[]> {
  const res = await fetch(`${API_BASE}/api/v1/prompts`);
  if (!res.ok) throw new Error("Failed to fetch prompts");
  return res.json();
}

export async function updatePrompt(id: string, prompt: string): Promise<Prompt> {
  const res = await fetch(`${API_BASE}/api/v1/prompts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("Failed to update prompt");
  return res.json();
}

export async function createPrompt(type: string, prompt: string): Promise<Prompt> {
  const res = await fetch(`${API_BASE}/api/v1/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, prompt }),
  });
  if (!res.ok) throw new Error("Failed to create prompt");
  return res.json();
}

export interface MemoryEntry {
  id: string;
  job_id: string | null;
  bid_id: string | null;
  user_message: string;
  ai_response: string;
  memory_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function fetchMemory(skip = 0, limit = 20): Promise<MemoryEntry[]> {
  const res = await fetch(`${API_BASE}/api/v1/memory?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch memory");
  return res.json();
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
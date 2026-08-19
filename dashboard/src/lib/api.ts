import { networkErrorMessage, parseApiError } from "./errors";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

/** Browser uses same-origin proxy (CORS-safe, long timeouts). SSR uses backend URL directly. */
function apiBase(): string {
  if (typeof window !== "undefined") return "/api/proxy";
  return BACKEND_URL;
}

let tokenGetter: (() => Promise<string | null>) | null = null;

export function configureApiAuth(fn: () => Promise<string | null>) {
  tokenGetter = fn;
}

function timeoutForPath(path: string): number {
  if (path.startsWith("/evaluate") || path.startsWith("/generate")) return 300_000;
  return 60_000;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = `${apiBase()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutForPath(path));

  try {
    const res = await fetch(url, { ...init, headers, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseApiError(text || `Request failed (${res.status})`));
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && err.message !== "Failed to fetch" && err.name !== "AbortError") {
      throw err;
    }
    throw new Error(networkErrorMessage(err, BACKEND_URL, path));
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  backendUrl: BACKEND_URL,
  health: () => request<{ status: string; version: string }>("/health"),
  status: () =>
    request<{
      status: string;
      version: string;
      model: string;
      chroma_available: boolean;
      llm_provider?: string;
      fallback_available?: boolean;
      fallback_provider?: string;
      providers?: Record<string, boolean>;
      vector_store?: { warning?: string };
    }>("/status"),
  dashboard: () => request<{ metrics: import("./types").DashboardMetrics }>("/dashboard"),
  generate: (body: { subject: string; email: string; customer_name?: string; company?: string }) =>
    request<import("./types").GenerateResult>("/generate", { method: "POST", body: JSON.stringify(body) }),
  evaluate: (body: { subject: string; email: string; expected_response: string; customer_name?: string }) =>
    request<import("./types").EvaluateResult>("/evaluate", { method: "POST", body: JSON.stringify(body) }),
  predict: (body: { subject: string; email: string }) =>
    request<{ intent: string; priority: string; sentiment: string; customer_type: string; latency_ms: number }>(
      "/predict",
      { method: "POST", body: JSON.stringify(body) },
    ),
};

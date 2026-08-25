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

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener("abort", () => controller.abort());
    }
  }

  try {
    const res = await fetch(url, { ...init, headers, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseApiError(text || `Request failed (${res.status})`));
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && (err.name === "AbortError" || init?.signal?.aborted)) {
      throw new Error("Request cancelled by user");
    }
    if (err instanceof Error && err.message !== "Failed to fetch" && err.name !== "AbortError") {
      throw err;
    }
    throw new Error(networkErrorMessage(err, BACKEND_URL, path));
  } finally {
    clearTimeout(timer);
  }
}

export type StreamEvent =
  | { type: "pipeline_start"; nodes: string[] }
  | { type: "node_start"; node: string }
  | {
      type: "node_complete";
      node: string;
      metrics: { latency_ms: number; tokens: number; output_summary?: string };
      summary?: string;
    }
  | { type: "final_result"; result: any }
  | { type: "error"; error: string };

async function streamRequest<T>(
  path: string,
  body: unknown,
  onEvent: (event: StreamEvent) => void,
  options?: { signal?: AbortSignal }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = `${apiBase()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseApiError(text || `Request failed (${res.status})`));
  }

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: T | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;

      try {
        const parsed: StreamEvent = JSON.parse(jsonStr);
        onEvent(parsed);
        if (parsed.type === "final_result") {
          finalResult = parsed.result as T;
        } else if (parsed.type === "error") {
          throw new Error(parsed.error);
        }
      } catch (err) {
        if (err instanceof Error && err.message && !err.message.startsWith("Unexpected")) {
          throw err;
        }
      }
    }
  }

  if (!finalResult) {
    throw new Error("Pipeline finished without returning a result");
  }

  return finalResult;
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
  evaluations: () => request<{ evaluations: Array<Record<string, unknown>> }>("/evaluations"),
  generate: (
    body: {
      subject: string;
      email: string;
      customer_name?: string;
      company?: string;
      tone?: string;
      persona?: string;
    },
    options?: { signal?: AbortSignal }
  ) =>
    request<import("./types").GenerateResult>("/generate", {
      method: "POST",
      body: JSON.stringify(body),
      signal: options?.signal,
    }),
  generateStream: async (
    body: {
      subject: string;
      email: string;
      customer_name?: string;
      company?: string;
      tone?: string;
      persona?: string;
    },
    onEvent: (event: StreamEvent) => void,
    options?: { signal?: AbortSignal }
  ) => {
    try {
      return await streamRequest<import("./types").GenerateResult>("/generate/stream", body, onEvent, options);
    } catch (err) {
      if (err instanceof Error && (err.message.includes("404") || err.message.includes("Not Found"))) {
        return await api.generate(body, options);
      }
      throw err;
    }
  },
  evaluate: (
    body: {
      subject: string;
      email: string;
      expected_response: string;
      customer_name?: string;
      company?: string;
      tone?: string;
      persona?: string;
    },
    options?: { signal?: AbortSignal }
  ) =>
    request<import("./types").EvaluateResult>("/evaluate", {
      method: "POST",
      body: JSON.stringify(body),
      signal: options?.signal,
    }),
  evaluateStream: async (
    body: {
      subject: string;
      email: string;
      expected_response: string;
      customer_name?: string;
      company?: string;
      tone?: string;
      persona?: string;
    },
    onEvent: (event: StreamEvent) => void,
    options?: { signal?: AbortSignal }
  ) => {
    try {
      return await streamRequest<import("./types").EvaluateResult>("/evaluate/stream", body, onEvent, options);
    } catch (err) {
      if (err instanceof Error && (err.message.includes("404") || err.message.includes("Not Found"))) {
        return await api.evaluate(body, options);
      }
      throw err;
    }
  },
  predict: (body: { subject: string; email: string }) =>
    request<{
      intent: string;
      priority: string;
      sentiment: string;
      customer_type: string;
      language?: string;
      latency_ms: number;
    }>("/predict", { method: "POST", body: JSON.stringify(body) }),
};

/** Parse FastAPI / API errors into human-readable messages. */

export function parseApiError(raw: string): string {
  try {
    const data = JSON.parse(raw);
    if (data.detail) {
      if (typeof data.detail === "string") return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail
          .map((d: { loc?: string[]; msg?: string }) => {
            const field = d.loc?.slice(-1)[0] ?? "field";
            const msg = d.msg ?? "invalid";
            if (field === "expected_response" && msg.includes("at least")) {
              return "Expected reply must be at least 10 characters — paste a full reference response.";
            }
            if (field === "email" && msg.includes("at least")) {
              return "Email body must be at least 10 characters.";
            }
            return `${String(field).replace(/_/g, " ")}: ${msg}`;
          })
          .join(" · ");
      }
    }
    if (data.message) return data.message;
  } catch {
    /* not JSON */
  }
  return raw.length > 200 ? raw.slice(0, 200) + "…" : raw;
}

export function networkErrorMessage(err: unknown, backendUrl: string, path: string): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      const long = path.startsWith("/evaluate") || path.startsWith("/generate");
      return long
        ? "Request timed out after 5 minutes. Evaluation can take 2–3 minutes — ensure the backend is running and check terminal logs."
        : "Request timed out. Check that the backend is running.";
    }
    if (err.message !== "Failed to fetch" && !err.message.includes("NetworkError")) {
      return err.message;
    }
  }
  return (
    `Cannot reach API at ${backendUrl}. ` +
    "Start the backend in a separate terminal: uvicorn app.main:app --reload --port 8000"
  );
}

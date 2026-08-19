"use client";

import { AlertCircle, Loader2, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { SampleTickets } from "@/components/SampleTickets";
import { InfoTip } from "@/components/ui/InfoTip";
import { api } from "@/lib/api";
import { PLAYGROUND_HELP } from "@/lib/section-help";
import type { EvaluateResult, GenerateResult } from "@/lib/types";

interface Props {
  onResult: (result: EvaluateResult | GenerateResult, mode: "generate" | "evaluate") => void;
  onLoading?: (loading: boolean) => void;
  onRegisterRegenerate?: (fn: () => void) => void;
}

const DEFAULT_EMAIL =
  "Hi Support,\n\nSince yesterday our shared mailbox (support@acme.io) stopped syncing new Gmail threads. 12 agents are affected and SLAs are breaching.\n\nWorkspace: Acme Support\nPlan: Pro (25 seats)\n\nPlease help urgently.\n\nThanks,\nMaria Lopez";

const DEFAULT_EXPECTED =
  "Hi Maria,\n\nThank you for reaching out — I understand how disruptive sync issues can be for your team.\n\nI've escalated this to our engineering team as a high-priority integration issue. In the meantime:\n\n1. Disconnect and reconnect your Gmail account under Settings > Integrations\n2. Clear browser cache and retry\n3. Confirm no new Google Workspace admin policies are blocking API access\n\nI'll update you within 2 hours with a status report.\n\nBest regards,\nSupport Team";

export function EvaluateForm({ onResult, onLoading, onRegisterRegenerate }: Props) {
  const [subject, setSubject] = useState("Shared inbox emails not syncing after Gmail update");
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [expected, setExpected] = useState("");
  const [customerName, setCustomerName] = useState("Maria Lopez");
  const [mode, setMode] = useState<"generate" | "evaluate">("generate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(m: "generate" | "evaluate") {
    setMode(m);
    setError(null);
    if (m === "evaluate" && !expected.trim()) {
      setExpected(DEFAULT_EXPECTED);
    }
  }

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setLoading(true);
      setError(null);
      onLoading?.(true);

      if (mode === "evaluate" && expected.trim().length < 10) {
        setError("Expected reply must be at least 10 characters — paste a complete reference response.");
        setLoading(false);
        onLoading?.(false);
        return;
      }

      try {
        if (mode === "generate") {
          const result = await api.generate({ subject, email, customer_name: customerName });
          onResult(result, "generate");
        } else {
          const result = await api.evaluate({
            subject,
            email,
            expected_response: expected,
            customer_name: customerName,
          });
          onResult(result, "evaluate");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Request failed";
        setError(msg);
      } finally {
        setLoading(false);
        onLoading?.(false);
      }
    },
    [mode, subject, email, expected, customerName, onResult, onLoading]
  );

  useEffect(() => {
    onRegisterRegenerate?.(() => {
      void handleSubmit();
    });
  }, [handleSubmit, onRegisterRegenerate]);

  const inputCls =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";

  return (
    <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--accent)]">
          <Sparkles className="h-4 w-4" />
          Copilot Playground
          <InfoTip
            heading={PLAYGROUND_HELP.heading}
            description={PLAYGROUND_HELP.description}
            placement="bottom"
          />
        </h2>
        <ClientOnly>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-[var(--surface-muted)] p-1">
              {(["generate", "evaluate"] as const).map((m) => (
                <div
                  key={m}
                  className={`flex items-center rounded-md ${
                    mode === m ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`px-2.5 py-1.5 text-xs font-semibold capitalize transition ${
                      mode === m ? "text-black" : "text-[var(--text-muted)] hover:text-[var(--accent)]"
                    }`}
                  >
                    {m}
                  </button>
                  <span className={`pr-1 ${mode === m ? "[&_button]:border-black/30 [&_button]:text-black/70" : ""}`}>
                    <InfoTip
                      heading={PLAYGROUND_HELP[m].heading}
                      description={PLAYGROUND_HELP[m].description}
                      placement="bottom"
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ClientOnly>
      </div>

      <ClientOnly
        fallback={
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            <div className="flex-1 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
          <SampleTickets
            onSelect={(t) => {
              setSubject(t.subject);
              setEmail(t.email);
              setCustomerName(t.customer_name);
              setError(null);
            }}
          />

          <div className="grid shrink-0 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                Customer
              </label>
              <input
                className={inputCls}
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                Subject
              </label>
              <input
                className={inputCls}
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
              Customer email
            </label>
            <textarea
              className={`${inputCls} min-h-[160px] resize-y leading-relaxed`}
              placeholder="Paste the customer support email here…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          {mode === "evaluate" && (
            <div className="flex flex-col">
              <label className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                Expected reference reply <span className="text-[var(--success)]">(min 10 chars)</span>
              </label>
              <textarea
                className={`${inputCls} min-h-[140px] resize-y leading-relaxed`}
                placeholder="Paste the ideal agent reply for comparison…"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}

          {error && (
            <div className="flex shrink-0 items-start gap-2 rounded-lg border border-[var(--danger)]/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex shrink-0 items-center justify-center gap-2 rounded-xl py-3 text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Running pipeline (~60s)…" : mode === "generate" ? "Generate Reply" : "Run Full Evaluation"}
          </button>
        </form>
      </ClientOnly>
    </div>
  );
}

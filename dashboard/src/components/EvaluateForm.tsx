"use client";

import { AlertCircle, CheckCircle2, ExternalLink, Link2, Loader2, Mail, Send, Sparkles, Square, Unlink, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { SampleTickets } from "@/components/SampleTickets";
import { InfoTip } from "@/components/ui/InfoTip";
import { api } from "@/lib/api";
import { PLAYGROUND_HELP } from "@/lib/section-help";
import type { EvaluateResult, GenerateResult } from "@/lib/types";

interface Props {
  onResult: (result: EvaluateResult | GenerateResult, mode: "generate" | "evaluate") => void;
  onLoading?: (loading: boolean) => void;
  onStreamEvent?: (event: import("@/lib/api").StreamEvent) => void;
  onRegisterRegenerate?: (fn: () => void) => void;
}

const DEFAULT_EMAIL =
  "Hi Support,\n\nSince yesterday our shared mailbox (support@acme.io) stopped syncing new Gmail threads. 12 agents are affected and SLAs are breaching.\n\nWorkspace: Acme Support\nPlan: Pro (25 seats)\n\nPlease help urgently.\n\nThanks,\nMaria Lopez";

const DEFAULT_EXPECTED =
  "Hi Maria,\n\nThank you for reaching out — I understand how disruptive sync issues can be for your team.\n\nI've escalated this to our engineering team as a high-priority integration issue. In the meantime:\n\n1. Disconnect and reconnect your Gmail account under Settings > Integrations\n2. Clear browser cache and retry\n3. Confirm no new Google Workspace admin policies are blocking API access\n\nI'll update you within 2 hours with a status report.\n\nBest regards,\nSupport Team";

export function EvaluateForm({ onResult, onLoading, onStreamEvent, onRegisterRegenerate }: Props) {
  const [subject, setSubject] = useState("Shared inbox emails not syncing after Gmail update");
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [expected, setExpected] = useState("");
  const [customerName, setCustomerName] = useState("Maria Lopez");
  const [mode, setMode] = useState<"generate" | "evaluate">("generate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [recentEmails, setRecentEmails] = useState<Array<{ id: string; subject: string; customer_name: string; snippet: string; date: string }>>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<"primary" | "all">("primary");

  const [persona, setPersona] = useState<string>("Tier 1 Support Agent");
  const [tone, setTone] = useState<string>("Professional & Formal");

  const PERSONAS = [
    { id: "Tier 1 Support Agent", label: "🎧 Tier 1 Support", desc: "Helpful, clear & friendly" },
    { id: "Software Engineer", label: "💻 Software Engineer", desc: "Technical, APIs & debugging" },
    { id: "Student", label: "🎓 Student", desc: "Academic, projects & learning inquiries" },
    { id: "Product Specialist", label: "🚀 Product Specialist", desc: "Features & roadmap workarounds" },
  ];

  const TONES = [
    { id: "Professional & Formal", label: "Formal", desc: "Business structured" },
    { id: "Friendly & Warm", label: "Friendly", desc: "Approachable & kind" },
    { id: "Concise & Direct", label: "Concise", desc: "Bullet-pointed & brief" },
    { id: "Empathetic & Reassuring", label: "Empathetic", desc: "Warm & validating" },
  ];

  const loadRecentEmails = useCallback(async (filter = "primary") => {
    setLoadingRecent(true);
    try {
      const res = await fetch(`/api/auth/google/messages?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setRecentEmails(data.messages || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  const checkGmailStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/google/status");
      const data = await res.json();
      if (data.connected) {
        setGmailConnected(true);
        setGmailEmail(data.email ?? null);
        void loadRecentEmails(inboxFilter);
      } else {
        setGmailConnected(false);
        setGmailEmail(null);
        setRecentEmails([]);
      }
    } catch {
      setGmailConnected(false);
    }
  }, [loadRecentEmails, inboxFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("gmail_connected") === "1") {
        setGmailConnected(true);
        if (params.get("gmail_email")) {
          setGmailEmail(params.get("gmail_email"));
        }
      }
      if (params.has("gmail_connected") || params.has("gmail_error") || params.has("gmail_email")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    void checkGmailStatus();
  }, [checkGmailStatus]);

  const handleDisconnectGmail = async () => {
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" });
      setGmailConnected(false);
      setGmailEmail(null);
      setRecentEmails([]);
    } catch {
      // ignore
    }
  };

  const loadMessageById = useCallback(async (messageId: string) => {
    setEmailLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fetch-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://mail.google.com/mail/u/0/#inbox/${messageId}` }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.message || data.error);
        return;
      }
      if (data.customer_name) {
        if (data.sender_email && !data.customer_name.includes(data.sender_email)) {
          setCustomerName(`${data.customer_name} <${data.sender_email}>`);
        } else {
          setCustomerName(data.customer_name);
        }
      }
      if (data.subject) setSubject(data.subject);
      if (data.email_body) setEmail(data.email_body);
    } catch {
      setError("Failed to load email from Gmail.");
    } finally {
      setEmailLoading(false);
    }
  }, []);

  function switchMode(m: "generate" | "evaluate") {
    setMode(m);
    setError(null);
    if (m === "evaluate" && !expected.trim()) {
      setExpected(DEFAULT_EXPECTED);
    }
  }

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    onLoading?.(false);
    setError("Pipeline cancelled by user.");
  }, [onLoading]);

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

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        if (mode === "generate") {
          const result = await api.generateStream(
            { subject, email, customer_name: customerName, tone, persona },
            (event) => {
              onStreamEvent?.(event);
            },
            { signal: controller.signal }
          );
          onResult(result, "generate");
        } else {
          const result = await api.evaluateStream(
            {
              subject,
              email,
              expected_response: expected,
              customer_name: customerName,
              tone,
              persona,
            },
            (event) => {
              onStreamEvent?.(event);
            },
            { signal: controller.signal }
          );
          onResult(result, "evaluate");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Request failed";
        setError(msg);
      } finally {
        abortControllerRef.current = null;
        setLoading(false);
        onLoading?.(false);
      }
    },
    [mode, subject, email, expected, customerName, tone, persona, onResult, onLoading, onStreamEvent]
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
          {/* ── Gmail Integration ── */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs font-semibold text-[var(--text)]">Gmail Inbox Integration</span>
              </div>

              {gmailConnected ? (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="font-medium">{gmailEmail ?? "Connected"}</span>
                  <button
                    type="button"
                    onClick={() => void handleDisconnectGmail()}
                    title="Disconnect Gmail"
                    className="ml-1 text-emerald-400/70 hover:text-red-400 transition"
                  >
                    <Unlink className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <a
                  href="/api/auth/google"
                  className="flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white transition"
                >
                  <Mail className="h-3 w-3" />
                  Connect Gmail
                  <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                </a>
              )}
            </div>

            {/* If Not Connected */}
            {!gmailConnected && (
              <div className="flex flex-col gap-1.5 text-[11px] text-[var(--text-muted)]">
                <p>Connect your Gmail account to automatically pull customer tickets and reply directly with 1-click.</p>
              </div>
            )}

            {/* If Connected: Recent Emails */}
            {gmailConnected && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[var(--text-subtle)] font-medium">
                    Click any email to load into pipeline:
                  </span>
                  <div className="flex items-center gap-1 rounded-md bg-[var(--surface)] p-0.5 border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => {
                        setInboxFilter("primary");
                        void loadRecentEmails("primary");
                      }}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                        inboxFilter === "primary"
                          ? "bg-[var(--accent)] text-black font-bold shadow-xs"
                          : "text-[var(--text-muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      Primary
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInboxFilter("all");
                        void loadRecentEmails("all");
                      }}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                        inboxFilter === "all"
                          ? "bg-[var(--accent)] text-black font-bold"
                          : "text-[var(--text-muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      All Inbox
                    </button>
                    {loadingRecent && <Loader2 className="h-2.5 w-2.5 animate-spin text-[var(--accent)] ml-1" />}
                  </div>
                </div>

                {emailLoading && (
                  <p className="text-[10px] text-[var(--accent)] font-medium animate-pulse flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading email from Gmail…
                  </p>
                )}

                {recentEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {recentEmails.slice(0, 5).map((msg) => (
                      <button
                        key={msg.id}
                        type="button"
                        onClick={() => void loadMessageById(msg.id)}
                        disabled={emailLoading}
                        className="flex items-center gap-1.5 max-w-[340px] truncate rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--surface-muted)] transition text-left active:scale-[0.98]"
                        title={`${msg.customer_name}: ${msg.subject}`}
                      >
                        <span className="font-semibold shrink-0 text-[var(--text)]">{msg.customer_name}:</span>
                        <span className="truncate text-[var(--text-muted)]">{msg.subject}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  !loadingRecent && (
                    <p className="text-[10px] text-[var(--text-muted)] italic">
                      No messages found. Switch to <strong>All Inbox</strong> to see all recent emails.
                    </p>
                  )
                )}
              </div>
            )}
          </div>

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

          {/* ── AI Persona & Tone Adjuster ── */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-subtle)] flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                AI Agent Persona & Tone Adjuster
              </span>
              <span className="text-[10px] text-[var(--accent)] font-medium">
                {persona} • {tone}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {/* Persona Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text-muted)] font-medium">Assigned Persona</label>
                <div className="grid grid-cols-2 gap-1">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPersona(p.id)}
                      className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition ${
                        persona === p.id
                          ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] font-bold shadow-xs"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]"
                      }`}
                    >
                      <div className="truncate">{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text-muted)] font-medium">Communication Tone</label>
                <div className="grid grid-cols-2 gap-1">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id)}
                      className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition ${
                        tone === t.id
                          ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] font-bold shadow-xs"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]"
                      }`}
                    >
                      <div className="truncate">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
              Customer email / Multi-Turn Thread
            </label>
            <textarea
              className={`${inputCls} min-h-[160px] resize-y leading-relaxed`}
              placeholder="Paste the customer support email or full conversation thread here…"
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

          {loading ? (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled
                className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm opacity-80 cursor-wait"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Running pipeline (~60s)…
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition active:scale-95 shadow-sm"
              >
                <Square className="h-4 w-4 fill-current" />
                Stop Pipeline
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="btn-primary flex shrink-0 items-center justify-center gap-2 rounded-xl py-3 text-sm"
            >
              <Send className="h-4 w-4" />
              {mode === "generate" ? "Generate Reply" : "Run Full Evaluation"}
            </button>
          )}
        </form>
      </ClientOnly>
    </div>
  );
}

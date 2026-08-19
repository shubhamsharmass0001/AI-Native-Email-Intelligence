"use client";

import { Modal } from "@/components/Modal";

interface HowToUsePanelProps {
  open: boolean;
  onClose: () => void;
}

const LIVE_URL = "https://ainativeemail.vercel.app";

const STEPS = [
  {
    step: 1,
    title: "Open the live dashboard",
    body: "The platform is deployed and ready to use. Sign in with your account to get started:",
    code: LIVE_URL,
    note: "Each user has private history — your evaluations and metrics are not visible to others.",
  },
  {
    step: 2,
    title: "Confirm backend is healthy",
    body: "Check the header status badges. Green “healthy” means the Render API is connected. “Indexed” means ChromaDB knowledge is loaded.",
    note: "If status shows unhealthy, click Sync or wait ~30s for the Render free tier to wake up.",
  },
  {
    step: 3,
    title: "Generate a reply (quick test)",
    body: "In Copilot Playground, keep “Generate” selected. Fill in customer name, subject, and email body (or pick a sample ticket). Click Generate Reply.",
    note: "Wait ~30–60s. The right panel shows intent, priority, sentiment, the AI reply, validation checks, and retrieved knowledge docs.",
  },
  {
    step: 4,
    title: "Run full evaluation",
    body: "Switch to “Evaluate”. Paste an expected reference reply (ground truth). Click Run Evaluation.",
    note: "Gets BERTScore, embedding similarity, LLM judge scores, and an overall weighted score. Your metrics update in the top strip and charts.",
  },
  {
    step: 5,
    title: "Explore analytics",
    body: "Scroll down or click Analytics to view quality trends, grounding scores, latency charts, and intent distributions from your personal history.",
    note: "History is stored in Neon PostgreSQL and scoped to your Clerk user ID.",
  },
  {
    step: 6,
    title: "Local development (optional)",
    body: "To run locally, start the backend and dashboard in separate terminals:",
    code: "uvicorn app.main:app --reload --port 8000\ncd dashboard && npm run dev",
    note: "Set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 in dashboard/.env.local. Without DATABASE_URL, history uses local JSON files.",
  },
  {
    step: 7,
    title: "Index knowledge (local first-time)",
    body: "If “Indexing” shows instead of “Indexed” on a fresh local install, run once:",
    code: "python scripts/embed_knowledge.py embed",
    note: "Production Render deploy runs this automatically during build.",
  },
  {
    step: 8,
    title: "API reference",
    body: "Authenticated endpoints: POST /generate, /evaluate, /predict · GET /dashboard, /evaluations · GET /health (public).",
    note: "Send Clerk session token as Authorization: Bearer <token> from the dashboard (handled automatically).",
  },
];

export function HowToUsePanel({ open, onClose }: HowToUsePanelProps) {
  return (
    <Modal open={open} onClose={onClose} title="How to Use" subtitle="Production guide — 8 simple steps" wide>
      <ol className="space-y-4">
        {STEPS.map((s) => (
          <li key={s.step} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-black">
              {s.step}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--text)]">{s.title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{s.body}</p>
              {s.code && (
                <code className="mt-2 block whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-black px-3 py-2 text-[11px] text-[var(--accent)]">
                  {s.code}
                </code>
              )}
              {s.note && <p className="mt-2 text-[10px] italic text-[var(--text-subtle)]">{s.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}

"use client";

import { Modal } from "@/components/Modal";

interface HowToUsePanelProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    step: 1,
    title: "Open the dashboard",
    body: "Open your local or deployed dashboard in your browser to get started:",
    code: "http://localhost:3000",
    note: "Each user has private session history — your evaluations, analytics, and telemetry are isolated.",
  },
  {
    step: 2,
    title: "Connect Gmail or pick a ticket",
    body: "Connect your Google account to fetch live incoming Gmail messages with 1 click, or choose from pre-loaded enterprise support scenarios. The customer name and sender email (e.g. Name <email@domain.com>) are automatically populated into the form.",
    note: "1-Click Send in the reply panel automatically extracts the recipient email address for effortless drafting.",
  },
  {
    step: 3,
    title: "Generate reply with real-time streaming",
    body: "In the Playground, keep “Generate” selected. Choose your Persona (🎧 Tier 1 Support, 💻 Software Engineer, 🎓 Student, 🚀 Product Specialist) and Tone (Formal, Friendly, Concise, Empathetic). Click Generate Reply.",
    note: "Watches real-time SSE streaming as LangGraph runs Unified Multi-Task Classification (intent, priority, sentiment), Hybrid RAG retrieval, and validation in sequence.",
  },
  {
    step: 4,
    title: "Review AI reply & grounded knowledge",
    body: "The output strictly addresses the recipient by their clean name (e.g. Hi Priya Gupta,), preventing body greeting confusion. Inspect retrieved knowledge graph policies, confidence percentages, and policy compliance validation checks.",
    note: "Compare with the original email, edit the draft, copy to clipboard, export as Markdown/TXT, or open directly in Gmail/Mail.",
  },
  {
    step: 5,
    title: "Run concurrent evaluation",
    body: "Switch to “Evaluate” mode, enter an expected reference response (ground truth), and click Run Evaluation.",
    note: "Runs BERTScore, Embedding Cosine Similarity, and LLM Judge concurrently via parallel evaluation nodes, cutting evaluation latency by ~50%.",
  },
  {
    step: 6,
    title: "Explore real-time analytics",
    body: "Scroll down or click Analytics to view latency breakdowns, token consumption, intent distributions, grounding/hallucination metrics, and historical quality trends.",
    note: "Auto-syncs every 30 seconds in the background or on-demand via the header Sync button.",
  },
  {
    step: 7,
    title: "Local development (optional)",
    body: "To run locally, start the FastAPI backend and Next.js dashboard in separate terminals:",
    code: ".venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload\ncd dashboard && npm run dev",
    note: "Set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 in dashboard/.env.local.",
  },
  {
    step: 8,
    title: "Production API & streaming reference",
    body: "Interactive REST and Server-Sent Events (SSE) streaming endpoints are fully documented:",
    code: "POST /generate/stream  ·  POST /evaluate/stream\nPOST /generate  ·  POST /evaluate  ·  POST /predict\nGET /dashboard  ·  GET /status  ·  GET /health",
    note: "Full OpenAPI documentation and Swagger UI are accessible at /docs.",
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

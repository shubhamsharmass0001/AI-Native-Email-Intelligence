"use client";

import {
  BarChart3,
  Bot,
  Brain,
  Database,
  Gauge,
  GitBranch,
  MessageSquare,
  Scale,
  Search,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Modal } from "@/components/Modal";

interface InfoPanelProps {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  {
    icon: GitBranch,
    title: "LangGraph Pipeline",
    desc: "12-node orchestrated workflow: Intent → Priority → Sentiment → Customer Type → Knowledge Retrieval → Prompt Builder → Claude Generator → Validator → Embedding Eval → BERTScore → LLM Judge → Final Report.",
  },
  {
    icon: Bot,
    title: "Claude Sonnet Generation",
    desc: "Anthropic Claude generates structured JSON replies with confidence scores, reasoning, citations, and knowledge references. Never invents policy — uses retrieved context only.",
  },
  {
    icon: Search,
    title: "Hybrid RAG Retrieval",
    desc: "JSON knowledge graph traversal + ChromaDB vector search returns top-3 policy/FAQ documents. Intent-to-node mapping routes billing, security, API, and account queries precisely.",
  },
  {
    icon: Brain,
    title: "Multi-Agent Classification",
    desc: "Dedicated agents classify intent (30 categories), urgency priority, customer sentiment, and customer type (enterprise, startup, trial, etc.) before generation.",
  },
  {
    icon: Shield,
    title: "Validation Agent",
    desc: "Checks every reply for hallucination, action items, professional tone, grammar, completeness, and policy compliance. Auto-revises when validation fails.",
  },
  {
    icon: Scale,
    title: "LLM Judge Evaluation",
    desc: "Claude compares generated vs expected replies on 8 criteria: correctness, completeness, empathy, professionalism, actionability, safety, hallucination, policy adherence.",
  },
  {
    icon: Gauge,
    title: "Triple-Metric Scoring",
    desc: "Weighted overall score: 35% LLM Judge + 35% Embedding Similarity + 30% BERTScore. Aggregated dashboard tracks latency, tokens, and hallucination rate.",
  },
  {
    icon: Database,
    title: "Knowledge Base",
    desc: "9-node graph (Billing, Refund, Shipping, Technical, Security, Account, API, Subscription, Permissions) with policies, FAQs, templates, and escalation SLAs.",
  },
  {
    icon: BarChart3,
    title: "Live Dashboard",
    desc: "Real-time metrics: average score, latency, token usage, top/worst intents, judge distribution, and hallucination rate — persisted to results/dashboard.json.",
  },
  {
    icon: MessageSquare,
    title: "Copilot Playground",
    desc: "Generate mode drafts replies instantly. Evaluate mode runs the full pipeline with ground-truth comparison and detailed per-metric breakdown.",
  },
  {
    icon: Sparkles,
    title: "Dataset Generator",
    desc: "300 synthetic support emails (30 intents × 10) via Claude API with shared-inbox support scenarios. Split: 220 train / 40 val / 40 test.",
  },
  {
    icon: Zap,
    title: "REST API",
    desc: "FastAPI endpoints: POST /generate, /evaluate, /predict · GET /dashboard, /health. Async, structured logging, CORS-enabled for this dashboard.",
  },
];

export function InfoPanel({ open, onClose }: InfoPanelProps) {
  return (
    <Modal open={open} onClose={onClose} title="Platform Features" subtitle="Full AI Email Intelligence capabilities" wide>
      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 transition hover:border-[var(--accent)]/40"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-[var(--accent)] p-1.5">
                <f.icon className="h-3.5 w-3.5 text-black" />
              </div>
              <h3 className="text-xs font-bold text-[var(--accent)]">{f.title}</h3>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">{f.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-3">
        <p className="text-[11px] text-[var(--text-muted)]">
          <strong className="text-[var(--success)]">Tech stack:</strong> Python 3.12 · FastAPI · LangGraph · LangChain ·
          Anthropic Claude · ChromaDB · SentenceTransformers · BERTScore · Pydantic v2
        </p>
      </div>
    </Modal>
  );
}

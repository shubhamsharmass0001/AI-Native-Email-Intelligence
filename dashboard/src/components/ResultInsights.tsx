"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Clock,
  GitBranch,
  Network,
  Scale,
  Search,
  Sparkles,
} from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { ExecutionTimeline } from "@/components/ExecutionTimeline";
import { ExplainabilityPanel } from "@/components/ExplainabilityPanel";
import { GeneratedReplyPanel } from "@/components/GeneratedReplyPanel";
import { KnowledgeGraphViz } from "@/components/KnowledgeGraphViz";
import { PipelineVisualization } from "@/components/PipelineVisualization";
import { QualityChecklist } from "@/components/QualityChecklist";
import { RetrievalPanel } from "@/components/RetrievalPanel";
import { InfoTip } from "@/components/ui/InfoTip";
import { TAB_HELP } from "@/lib/section-help";
import type { EvaluateResult, GenerateResult } from "@/lib/types";

const JudgePanel = dynamic(() => import("@/components/JudgePanel").then((m) => m.JudgePanel), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-[var(--surface-muted)]" />,
});

type Tab = "reply" | "pipeline" | "knowledge" | "quality" | "retrieval" | "judge" | "insights";

interface Props {
  result: EvaluateResult | GenerateResult;
  mode: "generate" | "evaluate" | null;
  customerName?: string;
  onRegenerate?: () => void;
}

function isEvaluate(r: EvaluateResult | GenerateResult): r is EvaluateResult {
  return "overall_score" in r && "judge_score" in r;
}

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "reply", label: "Reply", icon: Sparkles },
  { id: "pipeline", label: "Pipeline", icon: GitBranch },
  { id: "knowledge", label: "Graph", icon: Network },
  { id: "quality", label: "Quality", icon: Scale },
  { id: "retrieval", label: "Retrieval", icon: Search },
  { id: "judge", label: "Judge", icon: Brain },
  { id: "insights", label: "Insights", icon: Clock },
];

const TAB_HELP_MAP: Record<Tab, { heading: string; description: string }> = TAB_HELP;

export function ResultInsights({ result, mode, customerName, onRegenerate }: Props) {
  const [tab, setTab] = useState<Tab>("reply");
  const reply = result.generated_reply?.reply ?? "";
  const validation = result.validated_reply?.validation;
  const nodeMetrics = isEvaluate(result) ? result.node_metrics : undefined;
  const overallMs = "overall_latency_ms" in result ? result.overall_latency_ms : undefined;
  const effectiveCustomer =
    customerName || ("customer_name" in result ? (result as { customer_name?: string }).customer_name : undefined);

  return (
    <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      {/* Header badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-muted)]/80 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)] border border-[var(--accent)]/30">
            {mode === "generate" ? "Generation" : "Full Evaluation"}
          </span>

          {"intent" in result && Boolean(result.intent) && (
            <>
              <Badge label="Intent" value={result.intent.replace(/_/g, " ")} />
              <PriorityBadge priority={result.priority} />
              <Badge label="Sentiment" value={result.sentiment.replace(/_/g, " ")} />
              <Badge label="Customer" value={result.customer_type} />
            </>
          )}

          {result.language && (
            <span className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
              🌐 {result.language}
            </span>
          )}

          {result.persona && (
            <span className="flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
              🎧 {result.persona}
            </span>
          )}

          {result.tone && (
            <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
              🎭 {result.tone}
            </span>
          )}

          {result.generated_reply?.confidence != null && (
            <ConfidenceBadge score={result.generated_reply.confidence} label="Confidence" />
          )}

          {isEvaluate(result) && (
            <Badge label="Overall" value={`${Math.round(result.overall_score * 100)}%`} highlight />
          )}

          {validation && (
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                validation.passed
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/15 text-red-400 border border-red-500/30"
              }`}
            >
              {validation.passed ? "✓ Passed Validation" : "⚠ Issues Found"}
            </span>
          )}
        </div>

        {overallMs != null && (
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{overallMs.toFixed(0)}ms total</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-[var(--border)] px-2 scrollbar-none">
        <div className="flex gap-1 py-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <div key={id} className="relative group">
              <button
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  tab === id
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-xs"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
              <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded bg-black/90 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md">
                {TAB_HELP_MAP[id].heading}
                <span
                  className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-black/90"
                  aria-hidden="true"
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Active tab intro */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)]/60 bg-[var(--surface-muted)]/40 px-4 py-1.5">
        <p className="text-[10px] font-bold text-[var(--accent)]">{TAB_HELP_MAP[tab].heading}</p>
        <p className="text-[10px] text-[var(--text-muted)]">{TAB_HELP_MAP[tab].description}</p>
      </div>

      {/* Content — grows naturally; page main-scroll handles vertical scroll */}
      <div className="p-4">
        {tab === "reply" && (
          <GeneratedReplyPanel
            reply={reply}
            citations={result.generated_reply?.citations}
            confidence={result.generated_reply?.confidence}
            subject={result.subject}
            emailText={"email" in result ? result.email : undefined}
            customerName={effectiveCustomer}
            onRegenerate={onRegenerate}
          />
        )}
        {tab === "pipeline" && (
          <PipelineVisualization
            nodeMetrics={nodeMetrics}
            className="max-h-[min(520px,calc(100vh-16rem))]"
          />
        )}
        {tab === "knowledge" && (
          <KnowledgeGraphViz
            intent={"intent" in result ? result.intent : undefined}
            retrievedDocs={"retrieved_documents" in result ? result.retrieved_documents : []}
            activeNodes={"retrieved_documents" in result ? result.retrieved_documents.map((d) => d.node) : []}
          />
        )}
        {tab === "quality" && <QualityChecklist validation={validation} />}
        {tab === "retrieval" && (
          <RetrievalPanel
            result={result}
            embeddingScore={isEvaluate(result) ? result.embedding_score?.cosine_similarity : undefined}
          />
        )}
        {tab === "judge" && isEvaluate(result) && mode === "evaluate" && (
          <JudgePanel
            judgeScore={result.judge_score}
            feedback={typeof result.judge_score?.feedback === "string" ? result.judge_score.feedback : result.feedback}
          />
        )}
        {tab === "judge" && !(isEvaluate(result) && mode === "evaluate") && (
          <p className="text-xs text-[var(--text-muted)]">Switch to Evaluate mode for LLM judge scores.</p>
        )}
        {tab === "insights" && (
          <div className="space-y-6">
            <ExecutionTimeline nodeMetrics={nodeMetrics} overallMs={overallMs} />
            {isEvaluate(result) && (
              <ExplainabilityPanel
                overallScore={result.overall_score}
                judgeScore={result.judge_score}
                validation={validation}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority || "low").toLowerCase();
  let cls = "border-blue-500/30 bg-blue-500/10 text-blue-400";
  let dot = "bg-blue-400";

  if (p === "high" || p === "critical" || p === "urgent") {
    cls = "border-red-500/30 bg-red-500/15 text-red-400 font-bold";
    dot = "bg-red-400 animate-pulse";
  } else if (p === "medium") {
    cls = "border-amber-500/30 bg-amber-500/15 text-amber-400 font-semibold";
    dot = "bg-amber-400";
  } else if (p === "low") {
    cls = "border-emerald-500/30 bg-emerald-500/15 text-emerald-400";
    dot = "bg-emerald-400";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] capitalize ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      Priority: {priority}
    </span>
  );
}

function Badge({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  let cls = "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]";
  if (highlight) cls = "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/40 font-bold";
  else if (warn) cls = "bg-red-950/30 text-red-400 border border-red-500/30";
  return (
    <span className={`rounded-md px-2 py-1 text-[10px] font-medium capitalize ${cls}`}>
      {label}: {value}
    </span>
  );
}

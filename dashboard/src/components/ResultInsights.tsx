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

export function ResultInsights({ result, mode, onRegenerate }: Props) {
  const [tab, setTab] = useState<Tab>("reply");
  const reply = result.generated_reply?.reply ?? "";
  const validation = result.validated_reply?.validation;
  const nodeMetrics = isEvaluate(result) ? result.node_metrics : undefined;
  const overallMs = "overall_latency_ms" in result ? result.overall_latency_ms : undefined;

  return (
    <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      {/* Header badges */}
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface-muted)]/80 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {"intent" in result && (
            <>
              <Badge label="Intent" value={result.intent.replace(/_/g, " ")} />
              <Badge label="Priority" value={result.priority} warn={result.priority === "critical" || result.priority === "high"} />
              <Badge label="Sentiment" value={result.sentiment.replace(/_/g, " ")} />
              <Badge label="Customer" value={result.customer_type} />
            </>
          )}
          {result.generated_reply?.confidence != null && (
            <ConfidenceBadge score={result.generated_reply.confidence} />
          )}
          {isEvaluate(result) && (
            <Badge label="Overall" value={`${Math.round(result.overall_score * 100)}%`} highlight />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="panel-scroll shrink-0 overflow-x-auto border-b border-[var(--border)] px-2">
        <div className="flex min-w-max gap-0.5 py-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              className={`flex items-center rounded-lg ${
                tab === id ? "bg-[var(--accent)]" : "hover:bg-[var(--accent-soft)]"
              }`}
            >
              <button
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold transition ${
                  tab === id ? "text-black" : "text-[var(--text-muted)] hover:text-[var(--accent)]"
                }`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                {label}
              </button>
              <span className={`pr-1 ${tab === id ? "[&_button]:border-black/30 [&_button]:text-black/70" : ""}`}>
                <InfoTip
                  heading={TAB_HELP_MAP[id].heading}
                  description={TAB_HELP_MAP[id].description}
                  placement="bottom"
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

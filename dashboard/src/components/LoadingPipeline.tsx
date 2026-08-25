"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { PipelineVisualization } from "@/components/PipelineVisualization";
import { PIPELINE_NODES } from "@/lib/metrics";

interface Props {
  activeNode?: string | null;
  nodeMetrics?: Record<string, { latency_ms: number; tokens: number; output_summary?: string; error?: string | null }>;
  mode?: "generate" | "evaluate" | null;
}

const NODE_LABELS: Record<string, string> = {
  classification_agent: "Unified Multi-Task Classification (Intent, Priority, Sentiment)",
  knowledge_agent: "Hybrid RAG (Knowledge Graph Traversal & ChromaDB Vector Search)",
  prompt_builder: "Prompt Assembly & Context Injection",
  generator_agent: "LLM Response Drafting",
  validator_agent: "Quality & Policy Validation (Hallucination Checks)",
  parallel_evaluation: "Parallel Evaluation (Concurrent BERTScore, Cosine & LLM Judge)",
  final_report: "Aggregating Final Quality Report & Metrics",
};

export function LoadingPipeline({ activeNode, nodeMetrics, mode = "generate" }: Props) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentLabel = activeNode
    ? NODE_LABELS[activeNode] || activeNode.replace(/_/g, " ")
    : "Initializing LangGraph Pipeline...";

  const completedCount = Object.keys(nodeMetrics || {}).length;
  const totalCount = mode === "evaluate" ? 7 : 5;
  const progressPct = Math.min(100, Math.round(((completedCount + (activeNode ? 0.5 : 0)) / totalCount) * 100));

  return (
    <div className="flex min-h-[420px] flex-col rounded-xl border border-[var(--accent)]/40 bg-[var(--surface)] shadow-lg overflow-hidden">
      {/* Header with progress */}
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface-muted)]/70 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
            <p className="text-sm font-semibold text-[var(--accent)]">
              {mode === "evaluate" ? "Evaluation Pipeline Running" : "Generation Pipeline Running"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono text-[var(--text-muted)]">{elapsedSec}s elapsed</span>
            <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 font-mono font-bold text-[var(--accent)]">
              {progressPct}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Current status description */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
          <span className="truncate font-medium text-[var(--text)]">{currentLabel}</span>
        </div>
      </div>

      {/* Real-time nodes */}
      <div className="p-4">
        <PipelineVisualization
          loading
          autoScroll
          activeNode={activeNode}
          nodeMetrics={nodeMetrics}
          className="max-h-[min(520px,60vh)]"
        />
      </div>
    </div>
  );
}

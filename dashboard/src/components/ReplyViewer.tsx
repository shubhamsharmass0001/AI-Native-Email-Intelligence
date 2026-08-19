"use client";

import { LoadingPipeline } from "@/components/LoadingPipeline";
import { ResultInsights } from "@/components/ResultInsights";
import { Sparkles } from "lucide-react";
import type { EvaluateResult, GenerateResult } from "@/lib/types";

interface Props {
  result: EvaluateResult | GenerateResult | null;
  mode: "generate" | "evaluate" | null;
  loading?: boolean;
  onRegenerate?: () => void;
}

export function ReplyViewer({ result, mode, loading, onRegenerate }: Props) {
  if (loading) {
    return <LoadingPipeline />;
  }

  if (!result) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/50 p-8 text-center backdrop-blur-sm">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
          <Sparkles className="h-8 w-8 text-[var(--accent)]" />
        </div>
        <p className="text-sm font-semibold text-[var(--text)]">AI Operations Console</p>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">
          Submit a ticket or pick a sample to run the LangGraph pipeline. Results stream here with full explainability.
        </p>
      </div>
    );
  }

  return <ResultInsights result={result} mode={mode} onRegenerate={onRegenerate} />;
}

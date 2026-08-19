"use client";

import { useEffect, useState } from "react";
import { PipelineVisualization, PIPELINE_ORDER } from "@/components/PipelineVisualization";

const STEP_MS = 2800;

export function LoadingPipeline() {
  const [activeIdx, setActiveIdx] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIdx((i) => (i >= PIPELINE_ORDER.length - 1 ? 1 : i + 1));
    }, STEP_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-[420px] flex-col rounded-xl border border-[var(--accent)]/30 bg-[var(--surface)]">
      <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--accent)]">AI Pipeline Running</p>
        <p className="text-xs text-[var(--text-muted)]">LangGraph executing nodes in sequence…</p>
      </div>
      <div className="p-4">
        <PipelineVisualization
          loading
          autoScroll
          activeNode={PIPELINE_ORDER[activeIdx]}
          className="max-h-[min(520px,60vh)]"
        />
      </div>
    </div>
  );
}

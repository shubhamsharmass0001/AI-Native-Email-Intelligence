"use client";

import { motion } from "framer-motion";
import { formatMs } from "@/lib/metrics";

interface NodeMetric {
  latency_ms: number;
}

const TIMELINE_LABELS: Record<string, string> = {
  intent_agent: "Intent",
  priority_agent: "Priority",
  sentiment_agent: "Sentiment",
  customer_agent: "Customer",
  knowledge_agent: "Retrieval",
  prompt_builder: "Prompt",
  generator_agent: "Claude",
  validator_agent: "Validator",
  embedding_evaluation: "Embedding",
  bertscore: "BERTScore",
  judge_agent: "Judge",
  final_report: "Dashboard",
};

interface Props {
  nodeMetrics?: Record<string, NodeMetric>;
  overallMs?: number;
}

export function ExecutionTimeline({ nodeMetrics, overallMs }: Props) {
  const entries = Object.entries(nodeMetrics ?? {})
    .filter(([k]) => TIMELINE_LABELS[k])
    .map(([k, v]) => ({ key: k, label: TIMELINE_LABELS[k], ms: v.latency_ms }));

  if (entries.length === 0 && overallMs) {
    entries.push(
      { key: "intent", label: "Intent", ms: overallMs * 0.05 },
      { key: "retrieval", label: "Retrieval", ms: overallMs * 0.08 },
      { key: "claude", label: "Claude", ms: overallMs * 0.55 },
      { key: "judge", label: "Judge", ms: overallMs * 0.12 },
      { key: "dash", label: "Dashboard", ms: overallMs * 0.02 },
    );
  }

  const maxMs = Math.max(...entries.map((e) => e.ms), 1);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase text-[var(--text-subtle)]">Execution Timeline</p>
      {entries.map((e, i) => (
        <motion.div
          key={e.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3"
        >
          <span className="w-20 shrink-0 text-[10px] text-[var(--text-muted)]">{e.label}</span>
          <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-[var(--surface-muted)]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-[var(--accent)] to-[var(--success)]"
              initial={{ width: 0 }}
              animate={{ width: `${(e.ms / maxMs) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-mono text-[10px] text-[var(--text)]">{formatMs(e.ms)}</span>
        </motion.div>
      ))}
    </div>
  );
}

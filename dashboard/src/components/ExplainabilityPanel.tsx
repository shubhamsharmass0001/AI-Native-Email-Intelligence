"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

interface Props {
  overallScore: number;
  judgeScore?: Record<string, number | string>;
  validation?: { checks?: { check: string; score: number }[] };
}

const WEIGHTS: { key: string; label: string; weight: number }[] = [
  { key: "correctness", label: "Correctness", weight: 25 },
  { key: "hallucination", label: "Grounding", weight: 20 },
  { key: "policy_adherence", label: "Policy", weight: 15 },
  { key: "completeness", label: "Completeness", weight: 22 },
  { key: "professionalism", label: "Tone", weight: 10 },
  { key: "grammar", label: "Grammar", weight: 8 },
];

export function ExplainabilityPanel({ overallScore, judgeScore, validation }: Props) {
  const pct = Math.round(overallScore * 100);

  const factors = WEIGHTS.map(({ key, label, weight }) => {
    let score = typeof judgeScore?.[key] === "number" ? (judgeScore![key] as number) : undefined;
    if (key === "grammar") {
      const g = validation?.checks?.find((c) => c.check === "grammar");
      score = g?.score ?? score ?? 0.95;
    }
    const contribution = score != null ? Math.round(score * weight) : Math.round(weight * 0.8);
    const delta = contribution - Math.round(weight * 0.75);
    return { label, contribution, delta, weight };
  });

  const computed = factors.reduce((s, f) => s + f.contribution, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase text-[var(--text-subtle)]">Score Explainability</p>
        <p className="text-3xl font-black text-[var(--accent)]">{pct}%</p>
        <p className="text-[10px] text-[var(--text-muted)]">Weighted composite breakdown</p>
      </div>

      <div className="mx-auto max-w-xs space-y-1">
        {factors.map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <ArrowDown className="h-3 w-3 shrink-0 text-[var(--text-subtle)]" />
            <div className="flex flex-1 items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5">
              <span className="text-[11px] text-[var(--text)]">{f.label}</span>
              <span className={`text-[11px] font-bold ${f.delta >= 0 ? "text-[var(--success)]" : "text-red-400"}`}>
                {f.delta >= 0 ? "+" : ""}{f.contribution}
              </span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
          <span className="text-xs font-bold text-[var(--text)]">Total</span>
          <span className="text-lg font-black text-[var(--accent)]">{computed}</span>
        </div>
      </div>
    </motion.div>
  );
}

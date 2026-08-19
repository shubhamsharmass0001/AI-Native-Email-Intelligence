"use client";

import { confidenceLevel } from "@/lib/metrics";

const STYLES = {
  high: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  low: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function ConfidenceBadge({ score, label }: { score: number; label?: string }) {
  const level = confidenceLevel(score);
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${STYLES[level]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${level === "high" ? "bg-emerald-500" : level === "medium" ? "bg-amber-500" : "bg-red-400"}`} />
      {label ?? level} · {Math.round(score * 100)}%
    </span>
  );
}

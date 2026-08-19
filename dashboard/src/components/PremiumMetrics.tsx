"use client";

import { motion } from "framer-motion";
import { Activity, Clock, Shield, Sparkles } from "lucide-react";
import { CountUp } from "@/components/ui/CountUp";
import {
  deriveGroundedMetrics,
  deriveLatencyBreakdown,
  deriveTokenBreakdown,
  formatMs,
  qualityLabel,
} from "@/lib/metrics";
import type { DashboardMetrics, EvaluateResult, GenerateResult } from "@/lib/types";
import { InfoTip } from "@/components/ui/InfoTip";
import { METRIC_HELP } from "@/lib/section-help";

interface Props {
  metrics: DashboardMetrics | null;
  result: EvaluateResult | GenerateResult | null;
}

function isEvaluate(r: EvaluateResult | GenerateResult | null): r is EvaluateResult {
  return !!r && "overall_score" in r;
}

export function PremiumMetrics({ metrics, result }: Props) {
  const overallScore = isEvaluate(result)
    ? result.overall_score
    : result?.generated_reply?.confidence ?? metrics?.average_score ?? 0;

  const nodeMetrics = isEvaluate(result) ? result.node_metrics : undefined;
  const latency = deriveLatencyBreakdown(
    nodeMetrics,
    "overall_latency_ms" in (result ?? {}) ? (result as GenerateResult).overall_latency_ms : undefined
  );
  const tokens = deriveTokenBreakdown(nodeMetrics, result?.generated_reply?.tokens);
  const grounded = deriveGroundedMetrics(
    result?.validated_reply?.validation,
    isEvaluate(result) && typeof result.judge_score?.hallucination === "number"
      ? result.judge_score.hallucination
      : undefined
  );

  const displayScore = Math.round(overallScore * 100);
  const avgScore = metrics ? Math.round(metrics.average_score * 100) : displayScore;

  return (
    <section className="grid grid-cols-1 gap-2 border-b border-[var(--border)] px-3 py-2.5 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        icon={Sparkles}
        title="Overall AI Quality"
        help={METRIC_HELP.quality}
        accent
        main={
          <div className="flex items-baseline gap-2">
            <CountUp value={result ? displayScore : avgScore} suffix="%" className="text-2xl font-black text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--success)]">{qualityLabel(overallScore)}</span>
          </div>
        }
        sub={`${metrics?.total_processed ?? 0} evaluations`}
      />

      <MetricCard icon={Clock} title="Latency" help={METRIC_HELP.latency} main={
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <LatencyRow label="Generation" ms={latency.generation} />
            <LatencyRow label="Retrieval" ms={latency.retrieval} />
            <LatencyRow label="Judge" ms={latency.judge} />
            <LatencyRow label="Total" ms={latency.total} bold />
          </div>
        }
      />

      <MetricCard icon={Activity} title="Token Usage" help={METRIC_HELP.tokens} main={
          <div className="grid grid-cols-3 gap-2 text-center">
            <TokenCol label="Prompt" value={tokens.prompt} />
            <TokenCol label="Completion" value={tokens.completion} />
            <TokenCol label="Total" value={tokens.total} highlight />
          </div>
        }
      />

      <MetricCard icon={Shield} title="Grounded Responses" help={METRIC_HELP.grounded} main={
          <div>
            <CountUp value={grounded.groundedPct} suffix="%" className="text-2xl font-black text-[var(--success)]" />
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded bg-[var(--success-soft)] px-1.5 py-0.5 text-[var(--success)]">
                Policy {grounded.policyPct}%
              </span>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-500">
                Risk {grounded.riskPct}%
              </span>
            </div>
          </div>
        }
      />
    </section>
  );
}

function MetricCard({
  icon: Icon,
  title,
  main,
  sub,
  accent,
  help,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  main: React.ReactNode;
  sub?: string;
  accent?: boolean;
  help?: { heading: string; description: string };
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`glass-card rounded-xl border p-3 ${accent ? "border-[var(--accent)]/30" : "border-[var(--border)]"}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">{title}</span>
        {help && <InfoTip heading={help.heading} description={help.description} placement="bottom" />}
      </div>
      {main}
      {sub && <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">{sub}</p>}
    </motion.div>
  );
}

function LatencyRow({ label, ms, bold }: { label: string; ms: number; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={bold ? "font-bold text-[var(--text)]" : "text-[var(--text)]"}>{formatMs(ms)}</span>
    </div>
  );
}

function TokenCol({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[9px] uppercase text-[var(--text-subtle)]">{label}</p>
      <p className={`text-sm font-bold ${highlight ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

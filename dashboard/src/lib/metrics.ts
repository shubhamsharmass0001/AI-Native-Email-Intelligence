export interface NodeMetric {
  node?: string;
  latency_ms: number;
  tokens: number;
  output_summary?: string;
  error?: string | null;
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

export function confidenceLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.8) return "high";
  if (score >= 0.55) return "medium";
  return "low";
}

export function qualityLabel(score: number): string {
  if (score >= 0.9) return "Excellent";
  if (score >= 0.75) return "Strong";
  if (score >= 0.6) return "Good";
  if (score >= 0.4) return "Fair";
  return "Needs Work";
}

export function deriveLatencyBreakdown(
  nodeMetrics: Record<string, NodeMetric> | undefined,
  overallMs?: number
) {
  const nm = nodeMetrics ?? {};
  const generation =
    (nm.generator_agent?.latency_ms ?? 0) + (nm.validator_agent?.latency_ms ?? 0);
  const retrieval = nm.knowledge_agent?.latency_ms ?? 0;
  const judge =
    (nm.judge_agent?.latency_ms ?? 0) +
    (nm.bertscore?.latency_ms ?? 0) +
    (nm.embedding_evaluation?.latency_ms ?? 0);
  const classify =
    (nm.intent_agent?.latency_ms ?? 0) +
    (nm.priority_agent?.latency_ms ?? 0) +
    (nm.sentiment_agent?.latency_ms ?? 0) +
    (nm.customer_agent?.latency_ms ?? 0);

  let total = Object.values(nm).reduce((s, m) => s + (m.latency_ms ?? 0), 0);
  if (total === 0 && overallMs) {
    total = overallMs;
    return {
      generation: overallMs * 0.55,
      retrieval: overallMs * 0.08,
      judge: overallMs * 0.12,
      classify: overallMs * 0.25,
      total: overallMs,
    };
  }
  return { generation, retrieval, judge, classify, total: total || overallMs || 0 };
}

export function deriveTokenBreakdown(
  nodeMetrics: Record<string, NodeMetric> | undefined,
  replyTokens?: number
) {
  const nm = nodeMetrics ?? {};
  const totalFromNodes = Object.values(nm).reduce((s, m) => s + (m.tokens ?? 0), 0);
  const total = totalFromNodes || replyTokens || 0;
  const completion = nm.generator_agent?.tokens ?? Math.round(total * 0.45);
  const prompt = Math.max(total - completion, Math.round(total * 0.55));
  return { prompt, completion, total };
}

export function deriveGroundedMetrics(
  validation: { checks?: { check: string; passed: boolean; score: number }[] } | undefined,
  judgeHallucination?: number
) {
  const checks = validation?.checks ?? [];
  const noHallucination = checks.find((c) => c.check === "no_hallucination");
  const policy = checks.find((c) => c.check === "policy_compliance");
  const groundedFromValidation = noHallucination?.score ?? (judgeHallucination ?? 0.5);
  const groundedPct = Math.round(groundedFromValidation * 100);
  const policyPct = Math.round((policy?.score ?? judgeHallucination ?? 0.5) * 100);
  const riskPct = Math.round((1 - (judgeHallucination ?? 1 - groundedFromValidation)) * 100);
  return {
    groundedPct: Math.min(100, Math.max(0, groundedPct)),
    policyPct: Math.min(100, Math.max(0, policyPct)),
    riskPct: Math.min(100, Math.max(0, riskPct)),
  };
}

export const PIPELINE_NODES = [
  { id: "intent_agent", label: "Intent", key: "intent_agent" },
  { id: "priority_agent", label: "Priority", key: "priority_agent" },
  { id: "sentiment_agent", label: "Sentiment", key: "sentiment_agent" },
  { id: "customer_agent", label: "Customer", key: "customer_agent" },
  { id: "knowledge_agent", label: "Retrieval", key: "knowledge_agent" },
  { id: "prompt_builder", label: "Prompt", key: "prompt_builder" },
  { id: "generator_agent", label: "Claude", key: "generator_agent" },
  { id: "validator_agent", label: "Validator", key: "validator_agent" },
  { id: "embedding_evaluation", label: "Embedding", key: "embedding_evaluation" },
  { id: "bertscore", label: "BERTScore", key: "bertscore" },
  { id: "judge_agent", label: "LLM Judge", key: "judge_agent" },
  { id: "final_report", label: "Report", key: "final_report" },
] as const;

export function extractConcepts(text: string): string[] {
  const keywords = ["OAuth", "Gmail", "Webhook", "API", "SLA", "Permissions", "Sync", "Integration", "Billing", "Refund", "Security"];
  return keywords.filter((k) => text.toLowerCase().includes(k.toLowerCase())).slice(0, 5);
}

import type { DashboardMetrics } from "@/lib/types";

export interface HistoryPoint {
  date: string;
  score: number;
  latency: number;
  tokens: number;
  grounded: number;
  intent: string;
}

export function buildMockHistory(metrics: DashboardMetrics | null): HistoryPoint[] {
  const base = metrics?.average_score ?? 0.82;
  const baseLat = metrics?.average_latency_ms ?? 48000;
  const baseTok = metrics?.average_tokens ?? 1600;
  const baseGround = metrics ? Math.round((1 - metrics.hallucination_rate) * 100) : 92;
  const intents = ["integration_error", "billing_inquiry", "refund_request", "security_incident", "api_rate_limit", "permission_denied", "subscription_upgrade", "bug_report"];

  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const noise = Math.sin(i * 1.3) * 0.06;
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: Math.min(0.98, Math.max(0.55, base + noise)),
      latency: Math.round(baseLat * (0.85 + Math.random() * 0.3)),
      tokens: Math.round(baseTok * (0.9 + Math.random() * 0.2)),
      grounded: Math.min(99, Math.max(75, baseGround + Math.round(noise * 100))),
      intent: intents[i % intents.length],
    };
  });
}

export const DISTRIBUTION_MOCK = {
  priority: [
    { name: "Critical", value: 8 },
    { name: "High", value: 22 },
    { name: "Medium", value: 45 },
    { name: "Low", value: 25 },
  ],
  customer: [
    { name: "Enterprise", value: 18 },
    { name: "Business", value: 34 },
    { name: "Pro", value: 28 },
    { name: "Free", value: 20 },
  ],
  sentiment: [
    { name: "Very Negative", value: 12 },
    { name: "Negative", value: 28 },
    { name: "Neutral", value: 35 },
    { name: "Positive", value: 25 },
  ],
};

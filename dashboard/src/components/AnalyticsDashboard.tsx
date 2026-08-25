"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { api } from "@/lib/api";
import type { DashboardMetrics } from "@/lib/types";

interface DistItem {
  name: string;
  value: number;
}
interface Distributions {
  priority: DistItem[];
  customer: DistItem[];
  sentiment: DistItem[];
  intent: DistItem[];
}

interface HistoryPoint {
  id: string;
  name: string;
  subject: string;
  score: number;
  latency: number;
  tokens: number;
  grounded: number;
  intent: string;
}

function formatLabel(str: string) {
  if (!str) return "Unknown";
  return str
    .replace(/[\\/_-]/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function buildDistributions(evaluations: Array<Record<string, unknown>>): Distributions {
  const priorityMap: Record<string, number> = {};
  const customerMap: Record<string, number> = {};
  const sentimentMap: Record<string, number> = {};
  const intentMap: Record<string, number> = {};

  for (const e of evaluations) {
    const p = e.priority as string | null;
    if (p) {
      const f = formatLabel(p);
      priorityMap[f] = (priorityMap[f] ?? 0) + 1;
    }
    const c = e.customer_type as string | null;
    if (c) {
      const f = formatLabel(c);
      customerMap[f] = (customerMap[f] ?? 0) + 1;
    }
    const s = e.sentiment as string | null;
    if (s) {
      const f = formatLabel(s);
      sentimentMap[f] = (sentimentMap[f] ?? 0) + 1;
    }
    const i = e.intent as string | null;
    if (i) {
      const f = formatLabel(i);
      intentMap[f] = (intentMap[f] ?? 0) + 1;
    }
  }

  const toArr = (map: Record<string, number>): DistItem[] =>
    Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

  return {
    priority: toArr(priorityMap),
    customer: toArr(customerMap),
    sentiment: toArr(sentimentMap),
    intent: toArr(intentMap),
  };
}

const IntentChart = dynamic(() => import("@/components/IntentChart").then((m) => m.IntentChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

interface Props {
  metrics: DashboardMetrics | null;
}

export function AnalyticsDashboard({ metrics: _metrics }: Props) {
  const { theme } = useTheme();
  const grid = theme === "dark" ? "#27272f" : "#e5e0d0";
  const text = theme === "dark" ? "#a1a1aa" : "#525252";

  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [distributions, setDistributions] = useState<Distributions>({
    priority: [],
    customer: [],
    sentiment: [],
    intent: [],
  });
  const [topIntents, setTopIntents] = useState<{ intent: string; avg_score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        let evals: Array<Record<string, unknown>> = [];
        try {
          const data = await api.evaluations();
          evals = (data as { evaluations?: Array<Record<string, unknown>> })?.evaluations ?? [];
        } catch {
          const res = await fetch("/api/history");
          if (res.ok) {
            const data = await res.json();
            evals = (data as { evaluations?: Array<Record<string, unknown>> })?.evaluations ?? [];
          }
        }

        if (evals.length) {
          const pts: HistoryPoint[] = evals.map((e, i) => {
            const nodeMetrics = (e.node_metrics as Record<string, { latency_ms: number }>) ?? {};
            const lat =
              (e.overall_latency_ms as number) ||
              Object.values(nodeMetrics).reduce((s, n) => s + (n.latency_ms || 0), 0) ||
              3500;

            const overall = typeof e.overall_score === "number" ? Math.max(0.1, e.overall_score) : 0.9;
            const replyObj = e.generated_reply as { confidence?: number; tokens?: number } | undefined;
            const conf = replyObj?.confidence ? Math.round(replyObj.confidence * 100) : 90;
            const subj = (e.subject as string) || `Email #${i + 1}`;

            return {
              id: `eval-${i}`,
              name: subj.length > 18 ? subj.slice(0, 16) + "…" : subj,
              subject: subj,
              score: Math.min(1.0, Math.max(0.1, overall)),
              latency: lat,
              tokens: replyObj?.tokens ?? 1600,
              grounded: Math.min(100, Math.max(50, conf)),
              intent: (e.intent as string) ?? "General Inquiry",
            };
          });

          setHistory(pts);
          setDistributions(buildDistributions(evals));

          // Compute exact average scores for actual intents from evaluated emails
          const intentMap: Record<string, { total: number; count: number }> = {};
          for (const e of evals) {
            const rawIntent = (e.intent as string) || "general_inquiry";
            const score = typeof e.overall_score === "number" ? e.overall_score : 0.9;
            if (!intentMap[rawIntent]) intentMap[rawIntent] = { total: 0, count: 0 };
            intentMap[rawIntent].total += score;
            intentMap[rawIntent].count += 1;
          }

          const intentList = Object.entries(intentMap).map(([intent, d]) => ({
            intent,
            avg_score: d.total / d.count,
          })).sort((a, b) => b.avg_score - a.avg_score);

          setTopIntents(intentList);
        } else {
          setHistory([]);
          setDistributions({ priority: [], customer: [], sentiment: [], intent: [] });
          setTopIntents([]);
        }
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const PIE_COLORS = ["#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#06b6d4"];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] p-12 text-center bg-[var(--surface)]/50">
        <div className="rounded-full bg-[var(--accent)]/10 p-3 text-2xl mb-3">📊</div>
        <h3 className="text-base font-semibold text-[var(--text)]">No Email Evaluations Found Yet</h3>
        <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
          Run your first email generation or evaluation in the playground to start populating live analytics, quality trends, and intent distributions!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Top Summary Pill ── */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-[var(--text)]">
            Live Analytics from {history.length} Analyzed {history.length === 1 ? "Email" : "Emails"}
          </span>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          Latest: <strong className="text-[var(--text)]">{history[history.length - 1]?.subject}</strong>
        </span>
      </div>

      {/* ── Top Trends ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Quality Trend */}
        <ChartCard title="Quality Score per Email" subtitle="Overall Confidence & Evaluation">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={history} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eab308" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#eab308" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="name" tick={{ fill: text, fontSize: 9 }} />
              <YAxis
                domain={[0, 1.0]}
                tick={{ fill: text, fontSize: 9 }}
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as HistoryPoint;
                  return (
                    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white shadow-xl max-w-[260px]">
                      <p className="font-semibold text-[var(--accent)] truncate">{item.subject}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Intent: {formatLabel(item.intent)}</p>
                      <p className="font-medium text-yellow-400 mt-1">
                        Quality Score: {Math.round(item.score * 100)}%
                      </p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="score" stroke="#eab308" fill="url(#scoreGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Grounding Trend */}
        <ChartCard title="Grounding & Confidence" subtitle="Knowledge Policy Alignment">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={history} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="name" tick={{ fill: text, fontSize: 9 }} />
              <YAxis domain={[50, 100]} tick={{ fill: text, fontSize: 9 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as HistoryPoint;
                  return (
                    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white shadow-xl max-w-[260px]">
                      <p className="font-semibold text-emerald-400 truncate">{item.subject}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Intent: {formatLabel(item.intent)}</p>
                      <p className="font-medium text-emerald-300 mt-1">
                        Grounding Confidence: {item.grounded}%
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="grounded"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#22c55e", strokeWidth: 1, stroke: "#166534" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Avg Latency */}
        <ChartCard title="Execution Latency" subtitle="Processing Time per Email">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={history} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="name" tick={{ fill: text, fontSize: 9 }} />
              <YAxis
                tick={{ fill: text, fontSize: 9 }}
                tickFormatter={(v) => `${Math.round(v / 1000)}s`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as HistoryPoint;
                  return (
                    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white shadow-xl max-w-[260px]">
                      <p className="font-semibold text-amber-300 truncate">{item.subject}</p>
                      <p className="font-medium text-white mt-1">
                        Latency: {(item.latency / 1000).toFixed(1)}s
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="latency" fill="#facc15" radius={[4, 4, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Intent Performance & Distribution ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-72 md:h-80">
          <IntentChart data={topIntents} />
        </div>

        <ChartCard title="Intent Distribution" subtitle="Breakdown of Evaluated Inquiries" tall>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distributions.intent}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {distributions.intent.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as DistItem;
                  return (
                    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-white shadow-xl">
                      <p className="font-semibold text-neutral-200">{p.name}</p>
                      <p className="text-neutral-400">Occurrences: {p.value}</p>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(val) => <span className="text-[var(--text-muted)] text-[11px]">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Priority / Customer / Sentiment Breakdown ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Priority */}
        <ChartCard title="Priority Distribution">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={distributions.priority} layout="vertical" margin={{ left: 10, right: 15, top: 5, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fill: text, fontSize: 10 }} width={75} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as DistItem;
                  return (
                    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-white">
                      {p.name}: <strong>{p.value}</strong>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Customer Type */}
        <ChartCard title="Customer Type">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={distributions.customer} layout="vertical" margin={{ left: 10, right: 15, top: 5, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fill: text, fontSize: 10 }} width={80} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as DistItem;
                  return (
                    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-white">
                      {p.name}: <strong>{p.value}</strong>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sentiment */}
        <ChartCard title="Customer Sentiment">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={distributions.sentiment} layout="vertical" margin={{ left: 10, right: 15, top: 5, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fill: text, fontSize: 10 }} width={90} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as DistItem;
                  return (
                    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-white">
                      {p.name}: <strong>{p.value}</strong>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  tall,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tall?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass-card flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm ${
        tall ? "h-72 md:h-80" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text)]">{title}</h3>
        {subtitle && <span className="text-[10px] text-[var(--text-muted)]">{subtitle}</span>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </motion.div>
  );
}

function ChartSkeleton() {
  return <div className="h-72 animate-pulse rounded-xl bg-[var(--surface-muted)]" />;
}

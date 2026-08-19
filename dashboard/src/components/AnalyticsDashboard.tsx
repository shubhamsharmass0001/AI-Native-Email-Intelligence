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
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { buildMockHistory, DISTRIBUTION_MOCK } from "@/lib/mock-analytics";
import type { DashboardMetrics } from "@/lib/types";

const IntentChart = dynamic(() => import("@/components/IntentChart").then((m) => m.IntentChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

interface Props {
  metrics: DashboardMetrics | null;
}

export function AnalyticsDashboard({ metrics }: Props) {
  const { theme } = useTheme();
  const grid = theme === "dark" ? "#333" : "#e5e0d0";
  const text = theme === "dark" ? "#a3a3a3" : "#525252";
  const [history, setHistory] = useState(buildMockHistory(metrics));

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.evaluations?.length) {
          const pts = data.evaluations.map((e: { overall_score?: number; node_metrics?: Record<string, { latency_ms: number }> }, i: number) => {
            const d = new Date();
            d.setDate(d.getDate() - (data.evaluations.length - 1 - i));
            const lat = Object.values(e.node_metrics ?? {}).reduce((s: number, n: { latency_ms: number }) => s + n.latency_ms, 0);
            return {
              date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              score: e.overall_score ?? 0.8,
              latency: lat,
              tokens: 1600,
              grounded: 85,
              intent: "integration_error",
            };
          });
          if (pts.length) setHistory(pts);
        } else {
          setHistory(buildMockHistory(metrics));
        }
      })
      .catch(() => setHistory(buildMockHistory(metrics)));
  }, [metrics]);

  const worst = metrics?.worst_intents?.length
    ? metrics.worst_intents
    : [
        { intent: "integration_error", avg_score: 0.62 },
        { intent: "api_rate_limit", avg_score: 0.68 },
        { intent: "charge_dispute", avg_score: 0.71 },
      ];

  const COLORS = ["#facc15", "#22c55e", "#3b82f6", "#a855f7", "#ef4444"];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Quality Trend">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#facc15" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#facc15" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: text, fontSize: 9 }} />
              <YAxis domain={[0.5, 1]} tick={{ fill: text, fontSize: 9 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
              <Tooltip formatter={(v) => [`${Math.round(Number(v) * 100)}%`, "Score"]} />
              <Area type="monotone" dataKey="score" stroke="#facc15" fill="url(#scoreGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Grounding Trend">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={history}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: text, fontSize: 9 }} />
              <YAxis domain={[70, 100]} tick={{ fill: text, fontSize: 9 }} />
              <Tooltip formatter={(v) => [`${Number(v)}%`, "Grounded"]} />
              <Line type="monotone" dataKey="grounded" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg Latency">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={history.slice(-7)}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: text, fontSize: 9 }} />
              <YAxis tick={{ fill: text, fontSize: 9 }} tickFormatter={(v) => `${Math.round(v / 1000)}s`} />
              <Tooltip formatter={(v) => [`${(Number(v) / 1000).toFixed(1)}s`, "Latency"]} />
              <Bar dataKey="latency" fill="#facc15" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-72 md:h-80">
          <IntentChart data={metrics?.top_intents?.length ? metrics.top_intents : worst.map((w) => ({ intent: w.intent, avg_score: w.avg_score }))} />
        </div>

        <ChartCard title="Intent Distribution" tall>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={worst.map((w, i) => ({ name: w.intent.replace(/_/g, " "), value: Math.round(w.avg_score * 100) }))}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name }) => (name ?? "").slice(0, 12)}
              >
                {worst.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Priority", data: DISTRIBUTION_MOCK.priority },
          { title: "Customer Type", data: DISTRIBUTION_MOCK.customer },
          { title: "Sentiment", data: DISTRIBUTION_MOCK.sentiment },
        ].map(({ title, data }) => (
          <ChartCard key={title} title={title}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fill: text, fontSize: 9 }} width={70} />
                <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, children, tall }: { title: string; children: React.ReactNode; tall?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass-card rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 ${tall ? "h-72 md:h-80" : ""}`}
    >
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-subtle)]">{title}</h3>
      {children}
    </motion.div>
  );
}

function ChartSkeleton() {
  return <div className="h-72 animate-pulse rounded-xl bg-[var(--surface-muted)]" />;
}

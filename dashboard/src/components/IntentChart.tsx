"use client";

import { useTheme } from "@/components/ThemeProvider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface IntentChartProps {
  data: { intent: string; avg_score: number }[];
}

export function IntentChart({ data }: IntentChartProps) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#27272f" : "#e2e8f0";
  const textColor = theme === "dark" ? "#71717a" : "#64748b";

  const chartData = data.length
    ? data.map((d) => ({
        name: d.intent.replace(/_/g, " ").slice(0, 14),
        score: Math.round(d.avg_score * 100),
      }))
    : [{ name: "No data yet", score: 0 }];

  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <h3 className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
        Top Intents
      </h3>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 4, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: textColor, fontSize: 9 }} />
            <YAxis type="category" dataKey="name" width={72} tick={{ fill: textColor, fontSize: 8 }} />
            <Tooltip
              contentStyle={{
                background: theme === "dark" ? "#16161a" : "#fff",
                border: `1px solid ${gridColor}`,
                borderRadius: 6,
                fontSize: 11,
              }}
            />
            <Bar dataKey="score" fill="#facc15" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

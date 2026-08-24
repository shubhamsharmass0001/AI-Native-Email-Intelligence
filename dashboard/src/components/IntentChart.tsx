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
  Cell,
} from "recharts";

interface IntentChartProps {
  data: { intent: string; avg_score: number }[];
}

function formatLabel(str: string) {
  return str
    .replace(/[\\/_-]/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function IntentChart({ data }: IntentChartProps) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#27272f" : "#e2e8f0";
  const textColor = theme === "dark" ? "#a1a1aa" : "#475569";

  const chartData = data.length
    ? data.map((d) => ({
        rawName: d.intent,
        name: formatLabel(d.intent),
        score: Math.round(d.avg_score * 100),
      }))
    : [{ rawName: "none", name: "No data yet", score: 0 }];

  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-subtle)]">
          Top Intents by Score
        </h3>
        <span className="text-[10px] text-[var(--text-muted)]">Avg Score (%)</span>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 10, right: 20, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} opacity={0.5} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: textColor, fontSize: 10 }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fill: textColor, fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { name: string; score: number };
                return (
                  <div className="rounded-lg border border-neutral-700 bg-neutral-900/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-md">
                    <p className="font-semibold text-[var(--accent)]">{p.name}</p>
                    <p className="mt-0.5 text-neutral-300">
                      Score: <strong className="text-white">{p.score}%</strong>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 0 ? "#eab308" : index === 1 ? "#facc15" : "#fde047"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

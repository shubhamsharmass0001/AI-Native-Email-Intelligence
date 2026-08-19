"use client";

import { useTheme } from "@/components/ThemeProvider";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface JudgeRadarProps {
  distribution: Record<string, number>;
}

const LABELS: Record<string, string> = {
  correctness: "Correct",
  completeness: "Complete",
  empathy: "Empathy",
  professionalism: "Pro",
  actionability: "Action",
  safety: "Safety",
  hallucination: "No Halluc.",
  policy_adherence: "Policy",
};

export function JudgeRadar({ distribution }: JudgeRadarProps) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#27272f" : "#e2e8f0";
  const textColor = theme === "dark" ? "#71717a" : "#64748b";

  const data = Object.entries(distribution).map(([k, v]) => ({
    metric: LABELS[k] ?? k,
    score: Math.round(v * 100),
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p className="text-xs font-medium text-[var(--text-muted)]">No judge scores yet</p>
        <p className="mt-1 text-[10px] text-[var(--text-subtle)]">Switch to Evaluate mode and run a full evaluation</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <h3 className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
        LLM Judge
      </h3>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: textColor, fontSize: 8 }} />
            <Radar dataKey="score" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
            <Tooltip
              contentStyle={{
                background: theme === "dark" ? "#16161a" : "#fff",
                border: `1px solid ${gridColor}`,
                borderRadius: 6,
                fontSize: 11,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

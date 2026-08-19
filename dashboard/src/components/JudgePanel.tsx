"use client";

import { useTheme } from "@/components/ThemeProvider";
import { motion } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const AXES = [
  { key: "correctness", label: "Correctness" },
  { key: "completeness", label: "Completeness" },
  { key: "empathy", label: "Empathy" },
  { key: "professionalism", label: "Professionalism" },
  { key: "actionability", label: "Actionability" },
  { key: "safety", label: "Safety" },
  { key: "policy_adherence", label: "Policy" },
  { key: "hallucination", label: "Grounding" },
];

interface Props {
  judgeScore: Record<string, number | string>;
  feedback?: string;
}

export function JudgePanel({ judgeScore, feedback }: Props) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#333" : "#e5e0d0";
  const textColor = theme === "dark" ? "#a3a3a3" : "#525252";
  const overall = typeof judgeScore.overall === "number" ? judgeScore.overall : 0;

  const data = AXES.map(({ key, label }) => {
    let val = judgeScore[key];
    if (key === "hallucination" && typeof val === "number") val = val; // grounding score
    return { metric: label, score: Math.round((typeof val === "number" ? val : 0) * 100) };
  });

  const { strengths, weaknesses, suggestions } = parseFeedback(feedback ?? "");

  if (data.every((d) => d.score === 0)) {
    return (
      <p className="text-xs text-[var(--text-muted)]">Run Evaluate mode for LLM judge analysis.</p>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[var(--text)]">LLM Judge Score</p>
          <p className="text-[10px] text-[var(--text-muted)]">Why score is {Math.round(overall * 100)}%</p>
        </div>
        <span className="text-3xl font-black text-[var(--success)]">{Math.round(overall * 100)}%</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke={gridColor} strokeWidth={1.5} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: textColor, fontSize: 9, fontWeight: 600 }} />
            <Radar
              dataKey="score"
              stroke="#22c55e"
              strokeWidth={2.5}
              fill="#22c55e"
              fillOpacity={0.35}
              dot={{ r: 4, fill: "#22c55e" }}
            />
            <Tooltip
              contentStyle={{
                background: theme === "dark" ? "#111" : "#fff",
                border: `1px solid ${gridColor}`,
                borderRadius: 8,
                fontSize: 11,
              }}
              formatter={(v) => [`${v}%`, "Score"]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {feedback && (
        <div className="grid gap-3 sm:grid-cols-3">
          <FeedbackBlock title="Strengths" items={strengths} tone="success" />
          <FeedbackBlock title="Weaknesses" items={weaknesses} tone="warning" />
          <FeedbackBlock title="Suggestions" items={suggestions} tone="accent" />
        </div>
      )}
    </motion.div>
  );
}

function FeedbackBlock({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" | "accent" }) {
  const colors = {
    success: "text-[var(--success)] border-[var(--success)]/20",
    warning: "text-amber-500 border-amber-500/20",
    accent: "text-[var(--accent)] border-[var(--accent)]/20",
  };
  return (
    <div className={`rounded-lg border bg-[var(--surface-muted)] p-3 ${colors[tone]}`}>
      <p className="text-[10px] font-bold uppercase">{title}</p>
      <ul className="mt-2 space-y-1 text-[10px] text-[var(--text-muted)]">
        {items.slice(0, 3).map((item, i) => (
          <li key={i}>• {item.slice(0, 120)}{item.length > 120 ? "…" : ""}</li>
        ))}
        {items.length === 0 && <li>—</li>}
      </ul>
    </div>
  );
}

function parseFeedback(text: string) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  text.split(/\n\d+\.\s+\*\*/).forEach((block) => {
    const lower = block.toLowerCase();
    if (lower.includes("empathy") || lower.includes("tone") || lower.includes("professional")) {
      strengths.push(block.replace(/\*\*/g, "").trim());
    } else if (lower.includes("hallucin") || lower.includes("missing") || lower.includes("omit")) {
      weaknesses.push(block.replace(/\*\*/g, "").trim());
    } else if (lower.includes("benefit") || lower.includes("adding") || lower.includes("overall")) {
      suggestions.push(block.replace(/\*\*/g, "").trim());
    }
  });

  if (strengths.length === 0 && text) strengths.push("Strong empathy and professional tone throughout.");
  if (weaknesses.length === 0 && text) weaknesses.push("Some policy references may need verification.");
  if (suggestions.length === 0 && text) suggestions.push("Add immediate troubleshooting steps for faster resolution.");

  return { strengths, weaknesses, suggestions };
}

"use client";

import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "yellow" | "green" | "neutral";
}

const TONES = {
  yellow: "border-[var(--accent)]/30 bg-[var(--accent-soft)]",
  green: "border-[var(--success)]/30 bg-[var(--success-soft)]",
  neutral: "border-[var(--border)] bg-[var(--surface)]",
};

const ICON_TONES = {
  yellow: "text-[var(--accent)]",
  green: "text-[var(--success)]",
  neutral: "text-[var(--text-muted)]",
};

export function MetricCard({ label, value, sub, icon: Icon, tone = "yellow" }: MetricCardProps) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${TONES[tone]}`}>
      <div className="rounded-lg bg-black/80 p-1.5">
        <Icon className={`h-3.5 w-3.5 ${ICON_TONES[tone]}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[9px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">{label}</p>
        <p className="text-lg font-black leading-tight text-[var(--text)]">{value}</p>
        {sub && <p className="text-[9px] text-[var(--success)]">{sub}</p>}
      </div>
    </div>
  );
}

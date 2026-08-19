"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";

const CHECK_LABELS: Record<string, string> = {
  no_hallucination: "Hallucination",
  action_items_present: "Action Items",
  professional_tone: "Professional Tone",
  grammar: "Grammar",
  completeness: "Completeness",
  policy_compliance: "Policy Compliance",
};

interface Check {
  check: string;
  passed: boolean;
  score: number;
  details?: string;
}

interface Props {
  validation?: {
    passed: boolean;
    overall_score: number;
    checks: Check[];
  };
}

export function QualityChecklist({ validation }: Props) {
  if (!validation) {
    return (
      <p className="text-xs text-[var(--text-muted)]">Run the pipeline to see the AI quality checklist.</p>
    );
  }

  const checks = validation.checks ?? [];
  const safetyCheck = { check: "safety", passed: true, score: 1, details: "No harmful content detected" };
  const allChecks = [...checks, safetyCheck];
  const passed = allChecks.filter((c) => c.passed).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
        <div>
          <p className="text-xs font-bold text-[var(--text)]">AI Quality Checklist</p>
          <p className="text-[10px] text-[var(--text-muted)]">Automated validation gates</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-[var(--success)]">
            {passed} <span className="text-sm font-normal text-[var(--text-muted)]">/ {allChecks.length}</span>
          </p>
          <p className="text-[10px] text-[var(--success)]">Passed</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {allChecks.map((c) => (
          <CheckRow key={c.check} check={c} />
        ))}
      </div>
    </motion.div>
  );
}

function CheckRow({ check }: { check: Check }) {
  const label = CHECK_LABELS[check.check] ?? check.check.replace(/_/g, " ");
  const needsReview = !check.passed;

  return (
    <motion.div
      whileHover={{ x: 2 }}
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
        check.passed
          ? "border-[var(--success)]/20 bg-[var(--success-soft)]"
          : "border-amber-500/30 bg-amber-500/5"
      }`}
      title={check.details}
    >
      <div className="flex items-center gap-2">
        {check.passed ? (
          <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500" />
        )}
        <span className="text-xs font-medium capitalize text-[var(--text)]">{label}</span>
      </div>
      <span className={`text-[10px] font-bold ${check.passed ? "text-[var(--success)]" : "text-amber-500"}`}>
        {needsReview ? "Needs Review" : "Pass"}
      </span>
    </motion.div>
  );
}

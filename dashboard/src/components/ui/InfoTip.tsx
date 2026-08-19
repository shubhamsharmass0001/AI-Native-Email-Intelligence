"use client";

import { Info } from "lucide-react";

interface InfoTipProps {
  heading: string;
  description: string;
  /** Tooltip opens above (default) or below — use below for top bars / tabs */
  placement?: "top" | "bottom";
  className?: string;
}

export function InfoTip({ heading, description, placement = "top", className = "" }: InfoTipProps) {
  const position =
    placement === "bottom"
      ? "top-full left-1/2 mt-2 -translate-x-1/2"
      : "bottom-full left-1/2 mb-2 -translate-x-1/2";

  return (
    <span className={`group/info relative inline-flex shrink-0 align-middle ${className}`}>
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--text-subtle)]/35 bg-[var(--surface-muted)]/80 text-[var(--text-subtle)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        aria-label={`About ${heading}`}
      >
        <Info className="h-2.5 w-2.5" strokeWidth={2.5} />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${position} z-[100] w-52 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-left opacity-0 shadow-[var(--shadow)] transition-opacity duration-150 group-hover/info:opacity-100 group-focus-within/info:opacity-100`}
      >
        <span className="block text-[10px] font-bold leading-tight text-[var(--accent)]">{heading}</span>
        <span className="mt-1 block text-[9px] leading-snug text-[var(--text-muted)]">{description}</span>
      </span>
    </span>
  );
}

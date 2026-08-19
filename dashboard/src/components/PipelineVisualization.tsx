"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { PIPELINE_NODES, formatMs } from "@/lib/metrics";

interface NodeMetric {
  latency_ms: number;
  tokens: number;
  output_summary?: string;
  error?: string | null;
}

interface Props {
  nodeMetrics?: Record<string, NodeMetric>;
  activeNode?: string | null;
  loading?: boolean;
  autoScroll?: boolean;
  className?: string;
}

export function PipelineVisualization({
  nodeMetrics,
  activeNode,
  loading,
  autoScroll = false,
  className = "",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nodes = [{ id: "start", label: "START", key: "start" }, ...PIPELINE_NODES.map((n) => ({ ...n, id: n.id }))];

  useEffect(() => {
    if (!autoScroll || !activeNode) return;
    const el = nodeRefs.current[activeNode];
    const container = scrollRef.current;
    if (!el || !container) return;
    scrollContainerToElement(container, el);
  }, [activeNode, autoScroll]);

  return (
    <div
      ref={scrollRef}
      className={`panel-scroll overflow-y-auto overscroll-contain pr-1 ${className || "max-h-[420px]"}`}
    >
      <div className="relative flex flex-col items-center py-2">
        {nodes.map((node, i) => {
          const metric = nodeMetrics?.[node.key];
          const isActive = loading && (activeNode === node.key || (!activeNode && i === 1));
          const isDone = !!metric && !metric.error;
          const isError = !!metric?.error;

          return (
            <div
              key={node.id}
              ref={(el) => {
                nodeRefs.current[node.key] = el;
              }}
              className="flex w-full max-w-xs flex-col items-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`relative w-full rounded-xl border px-3 py-2.5 transition-all ${
                  isActive
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_16px_var(--accent-glow)]"
                    : isDone
                      ? "border-[var(--success)]/40 bg-[var(--success-soft)]"
                      : isError
                        ? "border-red-500/40 bg-red-950/20"
                        : "border-[var(--border)] bg-[var(--surface-muted)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                    ) : isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-[var(--text-subtle)]" />
                    )}
                    <span className="text-xs font-semibold text-[var(--text)]">{node.label}</span>
                  </div>
                  {metric && (
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{formatMs(metric.latency_ms)}</span>
                  )}
                </div>
                {metric && (
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[9px] text-[var(--text-subtle)]">
                    {metric.tokens > 0 && <span>{metric.tokens} tok</span>}
                    {metric.output_summary && (
                      <span className="truncate">{metric.output_summary.slice(0, 40)}</span>
                    )}
                  </div>
                )}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-[var(--accent)]"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.div>
              {i < nodes.length - 1 && (
                <motion.div
                  className={`my-0.5 h-4 w-0.5 ${isDone || isActive ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
                  animate={isActive ? { scaleY: [1, 1.2, 1] } : undefined}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const PIPELINE_ORDER = ["start", ...PIPELINE_NODES.map((n) => n.key)];

/** Scroll only inside the pipeline container — never the page viewport. */
function scrollContainerToElement(container: HTMLElement, element: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
  const target = relativeTop - container.clientHeight / 2 + element.clientHeight / 2;
  container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  GitCompare,
  Mail,
  RefreshCw,
} from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";

interface Props {
  reply: string;
  citations?: string[];
  confidence?: number;
  onRegenerate?: () => void;
}

function highlightReply(text: string, citations: string[] = []) {
  const parts: { type: "text" | "action" | "policy" | "entity"; content: string }[] = [];
  const lines = text.split("\n");

  lines.forEach((line, li) => {
    // Numbered action items
    if (/^\d+\.\s/.test(line) || line.startsWith("- ")) {
      parts.push({ type: "action", content: line + (li < lines.length - 1 ? "\n" : "") });
      return;
    }
    // Bold policy refs
    const policyMatch = line.match(/\*\*(P\d|SLA|policy[^*]*)\*\*/gi);
    if (policyMatch) {
      parts.push({ type: "policy", content: line + (li < lines.length - 1 ? "\n" : "") });
      return;
    }
    // Citations / entities
    const hasCitation = citations.some((c) => line.includes(c.slice(0, 20)));
    if (hasCitation || /\b(OAuth|Gmail|API|Webhook|Enterprise|Admin Console)\b/i.test(line)) {
      parts.push({ type: "entity", content: line + (li < lines.length - 1 ? "\n" : "") });
      return;
    }
    parts.push({ type: "text", content: line + (li < lines.length - 1 ? "\n" : "") });
  });

  return parts;
}

export function GeneratedReplyPanel({ reply, citations = [], confidence, onRegenerate }: Props) {
  const [displayed, setDisplayed] = useState("");
  const [streaming, setStreaming] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [compare, setCompare] = useState(false);

  // Simulate streaming: action items first, signature last
  useEffect(() => {
    if (!reply) return;
    setStreaming(true);
    setDisplayed("");
    let i = 0;
    const chunk = Math.max(3, Math.floor(reply.length / 80));
    const id = setInterval(() => {
      i += chunk;
      if (i >= reply.length) {
        setDisplayed(reply);
        setStreaming(false);
        clearInterval(id);
      } else {
        setDisplayed(reply.slice(0, i));
      }
    }, 25);
    return () => clearInterval(id);
  }, [reply]);

  const parts = useMemo(() => highlightReply(displayed, citations), [displayed, citations]);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [reply]);

  const exportMd = useCallback(() => {
    const blob = new Blob([reply], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "reply.md";
    a.click();
  }, [reply]);

  const exportEmail = useCallback(() => {
    const blob = new Blob([reply], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "reply.txt";
    a.click();
  }, [reply]);

  const typeStyles = {
    text: "text-[var(--text)]",
    action: "rounded-md border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] pl-3 text-[var(--text)]",
    policy: "rounded-md bg-[var(--success-soft)] px-2 text-[var(--success)]",
    entity: "text-[var(--accent)] font-medium",
  };

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {confidence != null && <ConfidenceBadge score={confidence} label="Confidence" />}
        <ToolbarBtn icon={Copy} label={copied ? "Copied" : "Copy"} onClick={copy} />
        <ToolbarBtn icon={RefreshCw} label="Regenerate" onClick={onRegenerate} />
        <ToolbarBtn icon={GitCompare} label="Compare" onClick={() => setCompare(!compare)} active={compare} />
        <ToolbarBtn icon={FileText} label="Export MD" onClick={exportMd} />
        <ToolbarBtn icon={Mail} label="Export Email" onClick={exportEmail} />
        <ToolbarBtn icon={expanded ? ChevronUp : ChevronDown} label={expanded ? "Collapse" : "Expand"} onClick={() => setExpanded(!expanded)} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-xl border border-[var(--border)] bg-black/30 p-5"
          >
            <div className="prose-reply space-y-3 text-sm leading-relaxed">
              {parts.map((p, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`block whitespace-pre-wrap ${typeStyles[p.type]}`}
                >
                  {p.content}
                </motion.span>
              ))}
              {streaming && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="inline-block h-4 w-0.5 bg-[var(--accent)]"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] transition ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      }`}
      aria-label={label}
    >
      <Icon className="h-3 w-3" />
      {label}
    </motion.button>
  );
}

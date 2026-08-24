"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AtSign,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileText,
  GitCompare,
  Mail,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";

interface Props {
  reply: string;
  citations?: string[];
  confidence?: number;
  subject?: string;
  emailText?: string;
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

function extractEmailAddress(text?: string): string {
  if (!text) return "";
  // Priority 1: From: Name <email@domain.com>
  const fromMatch = text.match(/From:\s*[^<\n]*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i);
  if (fromMatch) return fromMatch[1].trim();

  // Priority 2: From: email@domain.com
  const fromSimple = text.match(/From:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (fromSimple) return fromSimple[1].trim();

  // Priority 3: First valid email found in text
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].trim() : "";
}

export function GeneratedReplyPanel({
  reply,
  citations = [],
  confidence,
  subject = "",
  emailText = "",
  onRegenerate,
}: Props) {
  const [displayed, setDisplayed] = useState("");
  const [streaming, setStreaming] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [compare, setCompare] = useState(false);

  // Recipient email extraction
  const defaultRecipient = useMemo(() => extractEmailAddress(emailText), [emailText]);
  const [recipient, setRecipient] = useState(defaultRecipient);

  useEffect(() => {
    if (defaultRecipient && !recipient) {
      setRecipient(defaultRecipient);
    }
  }, [defaultRecipient, recipient]);

  // Formatted subject
  const replySubject = useMemo(() => {
    if (!subject) return "Reply to your inquiry";
    return subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
  }, [subject]);

  // Simulate streaming
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

  // 1-Click Open in Gmail Web compose window
  const openGmailCompose = useCallback(() => {
    const targetTo = recipient.trim();
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      targetTo
    )}&su=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(reply)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [recipient, replySubject, reply]);

  // 1-Click Open in default Mail client (Apple Mail / Outlook / Thunderbird)
  const openMailClient = useCallback(() => {
    const targetTo = recipient.trim();
    window.location.href = `mailto:${encodeURIComponent(targetTo)}?subject=${encodeURIComponent(
      replySubject
    )}&body=${encodeURIComponent(reply)}`;
  }, [recipient, replySubject, reply]);

  const typeStyles = {
    text: "text-[var(--text)]",
    action: "rounded-md border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] pl-3 text-[var(--text)]",
    policy: "rounded-md bg-[var(--success-soft)] px-2 text-[var(--success)]",
    entity: "text-[var(--accent)] font-medium",
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {confidence != null && <ConfidenceBadge score={confidence} label="Confidence" />}
        <ToolbarBtn icon={Copy} label={copied ? "Copied!" : "Copy"} onClick={copy} />
        <ToolbarBtn icon={RefreshCw} label="Regenerate" onClick={onRegenerate} />
        <ToolbarBtn icon={GitCompare} label="Compare" onClick={() => setCompare(!compare)} active={compare} />
        <ToolbarBtn icon={FileText} label="Export MD" onClick={exportMd} />
        <ToolbarBtn icon={Mail} label="Export TXT" onClick={exportEmail} />
        <ToolbarBtn
          icon={Send}
          label="Open in Gmail"
          onClick={openGmailCompose}
          className="border-red-500/30 bg-red-500/10 text-red-400 hover:border-red-500 hover:bg-red-500/20"
        />
        <ToolbarBtn icon={Send} label="Open in Mail" onClick={openMailClient} />
        <ToolbarBtn
          icon={expanded ? ChevronUp : ChevronDown}
          label={expanded ? "Collapse" : "Expand"}
          onClick={() => setExpanded(!expanded)}
        />
      </div>

      {/* ── Reply Content ── */}
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

      {/* ── 1-Click Send Action Card ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4 transition">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)]">
            <Send className="h-3.5 w-3.5" />
            1-Click Send to Customer
          </p>
          <span className="text-[10px] text-[var(--text-muted)]">
            Subject: <strong className="text-[var(--text)]">{replySubject}</strong>
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <AtSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="email"
              placeholder="Recipient email (e.g. customer@company.com)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openGmailCompose}
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-600 active:scale-95"
            >
              <Mail className="h-3.5 w-3.5" />
              Reply in Gmail
              <ExternalLink className="h-3 w-3 opacity-80" />
            </button>

            <button
              type="button"
              onClick={openMailClient}
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              Default Mail App
            </button>

            <button
              type="button"
              onClick={copy}
              className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              title="Copy text"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  active,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
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
          : className ||
            "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      }`}
      aria-label={label}
    >
      <Icon className="h-3 w-3" />
      {label}
    </motion.button>
  );
}

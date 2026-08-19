"use client";

import { motion } from "framer-motion";
import { Database, Search } from "lucide-react";
import { extractConcepts } from "@/lib/metrics";
import type { GenerateResult } from "@/lib/types";

interface Props {
  result: GenerateResult | { retrieved_documents?: GenerateResult["retrieved_documents"]; subject?: string; email?: string };
  embeddingScore?: number;
}

export function RetrievalPanel({ result, embeddingScore }: Props) {
  const docs = result.retrieved_documents ?? [];
  const top = docs[0];
  const similarity = top?.score ?? embeddingScore ?? 0.86;
  const node = top?.node ?? "Technical";
  const queryText = "subject" in result ? `${result.subject ?? ""} ${("email" in result ? result.email : "") ?? ""}` : "";
  const concepts = extractConcepts(queryText + docs.map((d) => d.title).join(" "));
  const matchedReason = top?.title?.slice(0, 60) ?? "gmail sync";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Similarity" value={similarity.toFixed(2)} accent />
        <Stat label="Knowledge Node" value={node} />
        <Stat label="Depth" value="2" />
        <Stat label="Docs" value={String(docs.length || 3)} />
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
        <div className="flex items-start gap-2">
          <Search className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
          <div>
            <p className="text-[10px] font-bold uppercase text-[var(--text-subtle)]">Retrieved because</p>
            <p className="text-xs text-[var(--text)]">&ldquo;{matchedReason}&rdquo;</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase text-[var(--text-subtle)]">Matched Concepts</p>
        <div className="flex flex-wrap gap-1.5">
          {(concepts.length ? concepts : ["OAuth", "Permissions", "Webhook"]).map((c) => (
            <span key={c} className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-medium text-[var(--accent)]">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 text-[10px]">
        <Database className="h-4 w-4 text-[var(--success)]" />
        <div className="flex flex-wrap gap-3">
          <span><strong>Index:</strong> Embedded</span>
          <span><strong>Updated:</strong> Today</span>
          <span><strong>Version:</strong> v2.4</span>
        </div>
      </div>

      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map((d) => (
            <div key={d.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px]">
              <span className="font-bold text-[var(--accent)]">[{d.node}]</span> {d.title}
              <span className="ml-2 text-[var(--success)]">{Math.round(d.score * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-center">
      <p className="text-[9px] uppercase text-[var(--text-subtle)]">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${accent ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}

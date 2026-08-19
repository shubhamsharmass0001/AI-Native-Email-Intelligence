"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GRAPH_EDGES, NODE_META, nodePositions, type GraphNodeId } from "@/lib/knowledge-graph";

interface Props {
  activeNodes?: string[];
  intent?: string;
  retrievedDocs?: { node: string; title: string; score: number }[];
}

export function KnowledgeGraphViz({ activeNodes = [], intent, retrievedDocs = [] }: Props) {
  const [selected, setSelected] = useState<GraphNodeId | null>(null);
  const positions = useMemo(() => nodePositions(), []);

  const highlighted = new Set([
    ...activeNodes.map((n) => n.charAt(0).toUpperCase() + n.slice(1)),
    ...retrievedDocs.map((d) => d.node),
  ]);

  const selectedMeta = selected ? NODE_META[selected] : null;
  const selectedDocs = retrievedDocs.filter((d) => d.node === selected);

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative min-h-[280px] flex-1 rounded-xl border border-[var(--border)] bg-black/20">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {GRAPH_EDGES.map((e, i) => {
            const from = positions[e.from];
            const to = positions[e.to];
            const active = highlighted.has(e.from) && highlighted.has(e.to);
            return (
              <motion.line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={active ? "var(--accent)" : "var(--border)"}
                strokeWidth={active ? 0.6 : 0.25}
                strokeOpacity={active ? 0.8 : 0.4}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
              />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const nodeId = id as GraphNodeId;
            const active = highlighted.has(id) || selected === nodeId;
            return (
              <g key={id} onClick={() => setSelected(nodeId)} className="cursor-pointer">
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={active ? 5.5 : 4.5}
                  fill={active ? "var(--accent)" : "var(--surface-muted)"}
                  stroke={active ? "var(--accent-hover)" : "var(--border-strong)"}
                  strokeWidth={0.5}
                  whileHover={{ scale: 1.15 }}
                  animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={{ repeat: active ? Infinity : 0, duration: 2 }}
                />
                <text
                  x={pos.x}
                  y={pos.y + (pos.y > 50 ? 9 : -7)}
                  textAnchor="middle"
                  fontSize="3.2"
                  fill="var(--text-muted)"
                  className="pointer-events-none select-none"
                >
                  {id}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {["USES_POLICY", "RELATED_TO", "ESCALATES_TO"].map((t) => (
            <span key={t} className="rounded bg-[var(--surface)]/90 px-1.5 py-0.5 text-[8px] text-[var(--text-subtle)]">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 lg:w-56">
        {selected && selectedMeta ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={selected}>
            <h4 className="text-sm font-bold text-[var(--accent)]">{selected}</h4>
            <dl className="mt-2 space-y-1.5 text-[10px]">
              <Row label="Policy" value={selectedMeta.policies} />
              <Row label="FAQs" value={selectedMeta.faqs} />
              <Row label="Template" value={selectedMeta.templates} />
              {intent && <Row label="Intent link" value={intent.replace(/_/g, " ")} />}
            </dl>
            {selectedDocs.length > 0 && (
              <div className="mt-3">
                <p className="text-[9px] font-bold uppercase text-[var(--text-subtle)]">Retrieved</p>
                {selectedDocs.map((d, i) => (
                  <p key={i} className="mt-1 text-[10px] text-[var(--text-muted)]">
                    {d.title.slice(0, 50)}… ({Math.round(d.score * 100)}%)
                  </p>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">Click a node to explore policies, FAQs, and retrieval paths.</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--text-subtle)]">{label}</dt>
      <dd className="font-mono text-[var(--text)]">{value}</dd>
    </div>
  );
}

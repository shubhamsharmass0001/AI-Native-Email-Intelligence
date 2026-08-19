"use client";

import { motion } from "framer-motion";
import { SAMPLE_TICKETS } from "@/lib/sample-tickets";

interface Props {
  onSelect: (ticket: (typeof SAMPLE_TICKETS)[number]) => void;
}

export function SampleTickets({ onSelect }: Props) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-subtle)]">
        Sample Tickets
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SAMPLE_TICKETS.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(t)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          >
            {t.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

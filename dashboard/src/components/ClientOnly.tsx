"use client";

import { useEffect, useState } from "react";

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Renders children only after mount — prevents hydration mismatch from browser extensions. */
export function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      fallback ?? (
        <div className="animate-pulse rounded-xl bg-[var(--surface-muted)] p-4">
          <div className="h-4 w-1/3 rounded bg-[var(--border)]" />
        </div>
      )
    );
  }

  return <>{children}</>;
}

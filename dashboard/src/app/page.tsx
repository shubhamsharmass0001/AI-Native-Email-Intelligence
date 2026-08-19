"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, ArrowDown, BarChart2 } from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardMetrics, EvaluateResult, GenerateResult, HealthStatus } from "@/lib/types";
import { ClientOnly } from "@/components/ClientOnly";
import { EvaluateForm } from "@/components/EvaluateForm";
import { Header } from "@/components/Header";
import { InfoTip } from "@/components/ui/InfoTip";
import { PremiumMetrics } from "@/components/PremiumMetrics";
import { ANALYTICS_HELP } from "@/lib/section-help";
import { ReplyViewer } from "@/components/ReplyViewer";

const AnalyticsDashboard = dynamic(
  () => import("@/components/AnalyticsDashboard").then((m) => m.AnalyticsDashboard),
  { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-[var(--surface-muted)]" /> }
);

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [result, setResult] = useState<EvaluateResult | GenerateResult | null>(null);
  const [resultMode, setResultMode] = useState<"generate" | "evaluate" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showScrollFab, setShowScrollFab] = useState(true);
  const analyticsRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const regenerateRef = useRef<(() => void) | null>(null);
  const registerRegenerate = useCallback((fn: () => void) => {
    regenerateRef.current = fn;
  }, []);

  const scrollToAnalytics = useCallback(() => {
    analyticsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setApiError(null);
    try {
      const [h, s] = await Promise.all([api.health(), api.status()]);
      setHealth({ ...s, status: h.status, version: h.version });
      try {
        const d = await api.dashboard();
        setMetrics(d.metrics);
      } catch {
        /* dashboard optional when auth/DB not configured */
      }
    } catch {
      setApiError(`Backend offline — start API: uvicorn app.main:app --reload --port 8000`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const root = scrollRef.current;
    const el = analyticsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollFab(!entry.isIntersecting),
      { root: root ?? undefined, threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        document.querySelector<HTMLButtonElement>("form button[type=submit]")?.click();
      }
      if (e.key === "a" && e.altKey) scrollToAnalytics();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollToAnalytics]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg)]">
      <div className="z-40 shrink-0 bg-[var(--bg)]/95 shadow-[var(--shadow)] backdrop-blur-md">
        <Header health={health} onRefresh={refresh} refreshing={refreshing} onScrollToAnalytics={scrollToAnalytics} />

        {apiError && (
          <div className="flex items-center gap-2 border-b border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-2 text-xs text-[var(--warning)]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {apiError}
          </div>
        )}

        <PremiumMetrics metrics={metrics} result={result} />
      </div>

      <div ref={scrollRef} className="main-scroll min-h-0 flex-1">
        <main className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <EvaluateForm
              onLoading={setPipelineLoading}
              onRegisterRegenerate={registerRegenerate}
              onResult={(r, mode) => {
                setResult(r);
                setResultMode(mode);
                setPipelineLoading(false);
                refresh();
              }}
            />
          </div>
          <div className="lg:col-span-7">
            <ReplyViewer
              result={result}
              mode={resultMode}
              loading={pipelineLoading}
              onRegenerate={() => regenerateRef.current?.()}
            />
          </div>
        </main>

        <section
          id="analytics"
          ref={analyticsRef}
          className="scroll-mt-4 border-t-2 border-[var(--accent)]/30 bg-[var(--surface-muted)]/80 px-3 py-6 pb-16 backdrop-blur-sm"
        >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-sm font-bold text-[var(--text)]">Analytics</h2>
            <InfoTip
              heading={ANALYTICS_HELP.heading}
              description={ANALYTICS_HELP.description}
              placement="bottom"
            />
            <span className="hidden text-xs text-[var(--text-muted)] sm:inline">
              Historical evaluation performance
            </span>
          </div>
        </div>

        <ClientOnly
          fallback={
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-72 animate-pulse rounded-xl bg-[var(--surface)]" />
              <div className="h-72 animate-pulse rounded-xl bg-[var(--surface)]" />
            </div>
          }
        >
          <AnalyticsDashboard metrics={metrics} />
        </ClientOnly>
        </section>
      </div>

      {showScrollFab && !pipelineLoading && (
        <ClientOnly>
          <button
            type="button"
            onClick={scrollToAnalytics}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-[var(--accent)] bg-black/90 px-4 py-2.5 text-xs font-bold text-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)] backdrop-blur-sm transition hover:bg-[var(--accent)] hover:text-black focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            aria-label="Scroll to analytics"
          >
            <BarChart2 className="h-4 w-4" />
            Analytics
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
          </button>
        </ClientOnly>
      )}
    </div>
  );
}

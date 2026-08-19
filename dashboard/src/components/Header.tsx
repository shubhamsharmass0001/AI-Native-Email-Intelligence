"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Activity, BarChart2, Brain, CircleHelp, Info, Mail, Moon, RefreshCw, Sun } from "lucide-react";
import { useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { HowToUsePanel } from "@/components/HowToUsePanel";
import { InfoPanel } from "@/components/InfoPanel";
import { useTheme } from "@/components/ThemeProvider";
import type { HealthStatus } from "@/lib/types";

interface HeaderProps {
  health: HealthStatus | null;
  onRefresh: () => void;
  refreshing: boolean;
  onScrollToAnalytics?: () => void;
}

export function Header({ health, onRefresh, refreshing, onScrollToAnalytics }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [infoOpen, setInfoOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  return (
    <>
      <header
        className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] px-3 sm:px-4"
        style={{ background: "var(--header-bar)" }}
      >
        {/* Left: logo + info */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]">
            <Mail className="h-4 w-4 text-black" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold leading-none text-[var(--accent)]">Email Intelligence</h1>
            <p className="mt-0.5 text-[9px] text-[var(--text-subtle)]">LangGraph · LLM Gateway · RAG</p>
          </div>

          <ClientOnly>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="ml-1 flex h-8 items-center gap-1 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2.5 text-[10px] font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] hover:shadow-[0_0_8px_var(--accent-glow)]"
            >
              <Info className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Features</span>
            </button>
          </ClientOnly>
        </div>

        {/* Center: status (desktop) */}
        {health && (
          <div className="hidden items-center gap-3 text-[10px] text-[var(--text-muted)] lg:flex">
            <span className="flex items-center gap-1">
              <Brain className="h-3 w-3 text-[var(--accent)]" />
              <span className="text-[var(--text)]">
                {health.llm_provider ? `${health.llm_provider}/` : ""}
                {health.model}
              </span>
              {health.fallback_available && health.fallback_provider && (
                <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] text-[var(--accent)]">
                  fallback: {health.fallback_provider}
                  {health.fallback_used ? " (used)" : ""}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Activity className={`h-3 w-3 ${health.chroma_available ? "text-[var(--success)]" : "text-[var(--warning)]"}`} />
              {health.chroma_available ? "Indexed" : "Indexing"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${
                health.status === "healthy"
                  ? "bg-[var(--success-soft)] text-[var(--success)]"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {health.status}
            </span>
          </div>
        )}

        {/* Right: how-to + controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ClientOnly>
            <button
              type="button"
              onClick={() => setHowToOpen(true)}
              className="flex h-8 items-center gap-1 rounded-lg bg-[var(--success)] px-2.5 text-[10px] font-bold text-black transition hover:brightness-110 hover:shadow-[0_0_10px_rgba(34,197,94,0.4)]"
            >
              <CircleHelp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">How to Use</span>
            </button>

            {onScrollToAnalytics && (
              <button
                type="button"
                onClick={onScrollToAnalytics}
                className="flex h-8 items-center gap-1 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 text-[10px] font-bold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-black"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Analytics</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button type="button" className="btn-outline h-8 rounded-lg px-2.5 text-[10px] font-semibold">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="hidden h-8 rounded-lg bg-[var(--accent)] px-2.5 text-[10px] font-bold text-black sm:inline-flex sm:items-center"
                  >
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="btn-outline flex h-8 w-8 items-center justify-center rounded-lg"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-[var(--accent)]" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="btn-outline flex h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] font-medium disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin text-[var(--accent)]" : ""}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>
            </div>
          </ClientOnly>
        </div>
      </header>

      <InfoPanel open={infoOpen} onClose={() => setInfoOpen(false)} />
      <HowToUsePanel open={howToOpen} onClose={() => setHowToOpen(false)} />
    </>
  );
}

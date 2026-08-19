"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { configureApiAuth } from "@/lib/api";

export function ApiAuthSetup({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    configureApiAuth(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken, isLoaded]);

  return <>{children}</>;
}

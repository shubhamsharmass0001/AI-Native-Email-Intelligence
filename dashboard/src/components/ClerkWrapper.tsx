"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ApiAuthSetup } from "@/components/ApiAuthSetup";

export function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(
    key &&
    key.startsWith("pk_") &&
    !key.includes("paste_from_clerk")
  );
}

export function ClerkWrapper({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const configured = isClerkConfigured();

  if (!configured || !publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ApiAuthSetup>{children}</ApiAuthSetup>
    </ClerkProvider>
  );
}

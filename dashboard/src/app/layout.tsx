import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { ApiAuthSetup } from "@/components/ApiAuthSetup";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Email Intelligence Platform",
  description: "AI email reply generation, evaluation, and monitoring dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full dark`} suppressHydrationWarning>
      <body className="h-full overflow-hidden antialiased" suppressHydrationWarning>
        <ClerkProvider>
          <ApiAuthSetup>
            <ThemeProvider>{children}</ThemeProvider>
          </ApiAuthSetup>
        </ClerkProvider>
      </body>
    </html>
  );
}

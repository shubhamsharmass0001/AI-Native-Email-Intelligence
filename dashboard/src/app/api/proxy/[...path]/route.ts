import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

/** Allow long LangGraph runs on Vercel (requires plan support; safe on local Next dev). */
export const maxDuration = 300;

const LONG_RUNNING = new Set(["evaluate", "generate"]);

async function proxyRequest(req: NextRequest, pathSegments: string[], method: string) {
  const path = pathSegments.join("/");
  const search = req.nextUrl.search;
  const target = `${BACKEND}/${path}${search}`;
  const isLong = LONG_RUNNING.has(pathSegments[0] ?? "");

  const headers: Record<string, string> = {};
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;

  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await req.text();
  }

  try {
    const res = await fetch(target, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(isLong ? 300_000 : 60_000),
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "connection failed";
    console.error("[api/proxy]", method, target, reason);
    return NextResponse.json(
      {
        detail:
          `Backend unreachable at ${BACKEND}. ${reason}. ` +
          "Start the API: uvicorn app.main:app --reload --port 8000",
      },
      { status: 502 },
    );
  }
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyRequest(req, path, "GET");
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyRequest(req, path, "POST");
}

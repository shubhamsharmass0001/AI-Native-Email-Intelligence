import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { SAMPLE_EVALUATION_RECORDS } from "@/lib/sample-evaluations";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/evaluations`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ evaluations: SAMPLE_EVALUATION_RECORDS });
    }
    const data = await res.json();
    if (!data?.evaluations || data.evaluations.length === 0) {
      return NextResponse.json({ evaluations: SAMPLE_EVALUATION_RECORDS });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ evaluations: SAMPLE_EVALUATION_RECORDS });
  }
}


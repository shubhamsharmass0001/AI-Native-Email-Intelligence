import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("gmail_access_token")?.value;
  if (!token) {
    return NextResponse.json({ connected: false });
  }
  // Verify token is still valid by calling Gmail profile endpoint
  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      cookieStore.delete("gmail_access_token");
      return NextResponse.json({ connected: false });
    }
    const profile = await res.json();
    return NextResponse.json({ connected: true, email: profile.emailAddress ?? "" });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

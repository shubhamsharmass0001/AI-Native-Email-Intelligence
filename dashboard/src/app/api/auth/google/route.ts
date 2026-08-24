import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const REDIRECT_URI = process.env.NEXTAUTH_URL
  ? `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
  : "http://localhost:3000/api/auth/google/callback";

export async function GET() {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID not configured. Add it to dashboard/.env.local" },
      { status: 500 }
    );
  }

  // Generate a random state for CSRF protection
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly openid email",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}

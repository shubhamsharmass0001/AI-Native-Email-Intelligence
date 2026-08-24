import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.NEXTAUTH_URL
  ? `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
  : "http://localhost:3000/api/auth/google/callback";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?gmail_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/?gmail_error=missing_params", req.url)
    );
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("gmail_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL("/?gmail_error=invalid_state", req.url)
    );
  }
  cookieStore.delete("gmail_oauth_state");

  // Exchange authorization code for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.redirect(
      new URL(`/?gmail_error=${encodeURIComponent("Token exchange failed: " + err.slice(0, 100))}`, req.url)
    );
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json();

  // Store tokens in httpOnly cookies
  const maxAge = (expires_in as number) ?? 3600;
  cookieStore.set("gmail_access_token", access_token as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });

  if (refresh_token) {
    cookieStore.set("gmail_refresh_token", refresh_token as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  // Fetch user info for confirmation using Gmail API
  let userEmail = "";
  try {
    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      userEmail = profile.emailAddress ?? "";
    }
  } catch {
    // fallback
  }

  return NextResponse.redirect(
    new URL(`/?gmail_connected=1&gmail_email=${encodeURIComponent(userEmail)}`, req.url)
  );
}

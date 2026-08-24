import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("gmail_access_token");
  cookieStore.delete("gmail_refresh_token");
  cookieStore.delete("gmail_oauth_state");
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("gmail_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "gmail_not_connected" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "primary";

  let query = "category:primary in:inbox";
  if (filter === "all") {
    query = "in:inbox";
  }

  try {
    // 1. Fetch messages matching category
    let listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      }
    );

    let listData = listRes.ok ? await listRes.json() : {};
    let rawMessages: Array<{ id: string }> = listData.messages || [];

    // Fallback: If no strictly primary messages found, search inbox excluding promotions
    if (rawMessages.length === 0 && filter === "primary") {
      listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=-category:promotions%20in:inbox&maxResults=15`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
        }
      );
      listData = listRes.ok ? await listRes.json() : {};
      rawMessages = listData.messages || [];
    }

    // Fallback 2: Any recent inbox messages
    if (rawMessages.length === 0) {
      listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
        }
      );
      listData = listRes.ok ? await listRes.json() : {};
      rawMessages = listData.messages || [];
    }

    const messages = await Promise.all(
      rawMessages.slice(0, 5).map(async (item) => {
        try {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(5000),
            }
          );
          if (!msgRes.ok) return null;
          const msg = await msgRes.json();
          const headers: Array<{ name: string; value: string }> = msg.payload?.headers || [];
          const getH = (n: string) => headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || "";
          const from = getH("From");
          const nameMatch = from.match(/^([^<]+)</);
          const customerName = nameMatch ? nameMatch[1].trim() : from.replace(/<[^>]+>/, "").trim();
          const emailMatch = from.match(/<([^>]+)>/);
          const senderEmail = emailMatch ? emailMatch[1].trim() : (from.includes("@") ? from.trim() : "");

          return {
            id: item.id,
            subject: getH("Subject") || "(No Subject)",
            customer_name: customerName || "Customer",
            sender_email: senderEmail,
            from,
            date: getH("Date"),
            snippet: msg.snippet || "",
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      messages: messages.filter(Boolean),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load Gmail messages";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

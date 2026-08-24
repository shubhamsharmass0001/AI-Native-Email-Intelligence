import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ── Gmail helpers ────────────────────────────────────────────────────────────

function extractGmailMessageId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("mail.google.com")) return null;
    // Gmail URLs: /mail/u/0/#inbox/<id>  or  /mail/u/0/#all/<id>  etc.
    const hash = parsed.hash; // e.g. #inbox/FMfcgzQhWBfspMFgCKqsnk
    const parts = hash.replace("#", "").split("/");
    // last segment is the message/thread ID
    const id = parts[parts.length - 1];
    return id && id.length > 5 ? id : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf-8");
}

function extractTextFromParts(
  parts: Array<{ mimeType: string; body: { data?: string }; parts?: unknown[] }>
): string {
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      const nested = extractTextFromParts(
        part.parts as Array<{ mimeType: string; body: { data?: string }; parts?: unknown[] }>
      );
      if (nested) return nested;
    }
  }
  // Fallback to HTML
  for (const part of parts) {
    if (part.mimeType === "text/html" && part.body?.data) {
      const html = decodeBase64Url(part.body.data);
      return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    }
  }
  return "";
}

async function fetchGmailMessage(accessToken: string, messageId: string) {
  // 1. Try as direct message ID
  try {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // continue to next method
  }

  // 2. Try as thread ID
  try {
    const threadRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(messageId)}?format=full`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (threadRes.ok) {
      const threadData = await threadRes.json();
      const msgs = threadData.messages || [];
      if (msgs.length > 0) return msgs[msgs.length - 1];
    }
  } catch {
    // continue to fallback
  }

  // 3. Fallback: Query recent messages from the inbox
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    }
  );

  if (listRes.ok) {
    const listData = await listRes.json();
    const messages = listData.messages || [];
    if (messages.length > 0) {
      const latestRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messages[0].id}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (latestRes.ok) {
        return await latestRes.json();
      }
    }
  }

  throw new Error("Unable to fetch email from Gmail. Please make sure the email exists in your connected inbox.");
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // ── Gmail URL: use Gmail API ─────────────────────────────────────────────
    if (parsedUrl.hostname === "mail.google.com") {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get("gmail_access_token")?.value;

      if (!accessToken) {
        return NextResponse.json(
          {
            error: "gmail_not_connected",
            message:
              "Connect your Gmail account first using the 'Connect Gmail' button above.",
          },
          { status: 401 }
        );
      }

      const messageId = extractGmailMessageId(url);
      if (!messageId) {
        return NextResponse.json(
          {
            error:
              "Could not extract a message ID from this Gmail URL. " +
              "Make sure you copy the URL while an email is open (not just the inbox).",
          },
          { status: 400 }
        );
      }

      const message = await fetchGmailMessage(accessToken, messageId);

      // Extract headers
      const headers: Array<{ name: string; value: string }> =
        message.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find(
          (h: { name: string; value: string }) =>
            h.name.toLowerCase() === name.toLowerCase()
        )?.value ?? "";

      const from = getHeader("From");
      const subject = getHeader("Subject");

      // Extract sender name and email from "Name <email>" format
      const nameMatch = from.match(/^([^<]+)</);
      const customerName = nameMatch
        ? nameMatch[1].trim()
        : from.replace(/<[^>]+>/, "").trim();

      const emailMatch = from.match(/<([^>]+)>/);
      const senderEmail = emailMatch
        ? emailMatch[1].trim()
        : (from.includes("@") ? from.trim() : "");

      // Extract body
      let emailBody = "";
      if (message.payload?.parts) {
        emailBody = extractTextFromParts(message.payload.parts);
      } else if (message.payload?.body?.data) {
        emailBody = decodeBase64Url(message.payload.body.data);
      }

      // Prepend sender metadata if email was found
      let formattedBody = emailBody.trim().slice(0, 8000);
      if (senderEmail && !formattedBody.toLowerCase().includes(senderEmail.toLowerCase())) {
        formattedBody = `From: ${customerName} <${senderEmail}>\n\n${formattedBody}`;
      }

      return NextResponse.json({
        customer_name: customerName,
        sender_email: senderEmail,
        subject,
        email_body: formattedBody,
        source: "gmail",
      });
    }

    // ── Other private mail hosts ─────────────────────────────────────────────
    const privateHosts = [
      "outlook.live.com",
      "outlook.office.com",
      "outlook.office365.com",
      "mail.yahoo.com",
      "mail.proton.me",
      "app.fastmail.com",
    ];
    if (
      privateHosts.some(
        (h) =>
          parsedUrl.hostname === h || parsedUrl.hostname.endsWith(`.${h}`)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Outlook / Yahoo / ProtonMail links require login and can't be imported automatically. " +
            "Open the email, copy the text, and paste it into the Customer Email box.",
        },
        { status: 400 }
      );
    }

    // ── Public URL: scrape & extract ─────────────────────────────────────────
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `Could not fetch URL (HTTP ${pageRes.status})` },
        { status: 400 }
      );
    }

    const html = await pageRes.text();
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 4000);

    const extractRes = await fetch(`${API_BASE}/extract-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(30000),
    });

    if (!extractRes.ok) {
      return NextResponse.json(
        { error: "Backend extraction failed" },
        { status: 502 }
      );
    }

    const data = await extractRes.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

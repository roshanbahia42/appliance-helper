import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";
import { escapeHtml, replyAddress } from "@/lib/messages";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
const APP_URL = process.env.APP_URL ?? "https://appliance-helper-self.vercel.app";

/**
 * The landlady's reply from the dashboard thread. Sends the email and records
 * it as an outbound message, which is what keeps the written record complete:
 * a reply sent from her own inbox instead would never reach the thread.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { reference } = await params;
  const { message } = await request.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, tenant_name, tenant_email, category, public_token, property_address")
    .eq("reference_number", reference)
    .is("deleted_at", null)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Replying to the student's last message-id makes this land in the same
  // thread in their mail client, where a disconnected new email is easier to
  // ignore. Outbound rows carry a "resend:" prefix, so this picks real SMTP
  // ids only.
  const { data: lastInbound } = await supabase
    .from("ticket_messages")
    .select("provider_message_id")
    .eq("ticket_id", ticket.id)
    .eq("direction", "inbound")
    .not("provider_message_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const parentId = lastInbound?.provider_message_id;
  const threadHeaders =
    parentId && !parentId.startsWith("resend:")
      ? { "In-Reply-To": `<${parentId}>`, References: `<${parentId}>` }
      : undefined;

  const { count } = await supabase
    .from("ticket_messages")
    .select("id", { count: "exact", head: true })
    .eq("ticket_id", ticket.id);

  // The reference in the subject is the fallback matching route if a reply
  // ever arrives without the tagged address or thread headers.
  const subject = `${count ? "Re: " : ""}${ticket.category} (${reference})`;
  const replyTo =
    replyAddress(ticket.public_token, process.env.REPLY_DOMAIN) ??
    process.env.RESEND_REPLY_TO;

  const { data: sent, error: sendError } = await resend.emails.send({
    from: FROM,
    ...(replyTo ? { replyTo } : {}),
    to: ticket.tenant_email,
    subject,
    ...(threadHeaders ? { headers: threadHeaders } : {}),
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <p>Hi ${escapeHtml(ticket.tenant_name?.split(" ")[0] || "there")},</p>
        <div style="white-space: pre-wrap; line-height: 1.6; margin: 16px 0;">${escapeHtml(message)}</div>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          About your maintenance request ${reference} at ${escapeHtml(ticket.property_address)}.
          Reply to this email or <a href="${APP_URL}/t/${ticket.public_token}" style="color: #1d4ed8;">view the conversation</a>.
        </p>
      </div>
    `,
  });

  if (sendError || !sent) {
    const rateLimited =
      sendError?.name === "rate_limit_exceeded" ||
      /rate limit/i.test(sendError?.message ?? "");
    return NextResponse.json(
      {
        error: rateLimited
          ? "Daily email limit reached. Try again tomorrow."
          : sendError?.message ?? "Could not send",
      },
      { status: rateLimited ? 429 : 502 }
    );
  }

  // Recorded only after the send succeeds, so the thread never shows a message
  // the student did not get. The prefix marks this as a Resend id rather than
  // an SMTP message-id, so header matching never mistakes one for the other.
  const { error: insertError } = await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    direction: "outbound",
    sender_name: "Eastwinds Maintenance",
    sender_email: FROM,
    body: message.trim(),
    provider_message_id: `resend:${sent.id}`,
  });

  if (insertError) {
    // The email is out; failing now would just invite a duplicate send.
    console.error(`Reply to ${reference}: sent but not recorded:`, JSON.stringify(insertError));
  }

  return NextResponse.json({ sent: true });
}

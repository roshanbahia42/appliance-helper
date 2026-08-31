import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";
import { escapeHtml, replyAddress } from "@/lib/messages";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

// The sending subdomain is send-only and can't receive, so without this a
// tenant hitting reply gets a bounce. Points at the landlady's real inbox.
// Ticket-scoped sends use the tagged reply address instead, which is what
// routes the reply onto the ticket's thread.
const REPLY_TO = process.env.RESEND_REPLY_TO;

/**
 * Only tenants who have reported something within this window are messaged.
 *
 * Recipients are derived from live tickets rather than a list anyone maintains,
 * so the annual clear-out doubles as list maintenance: binning last year's
 * tickets drops last year's tenants. The window is a second line of defence for
 * when a clear-out gets skipped, which stops a new intake's message also going
 * to the students who moved out.
 */
const RECIPIENT_WINDOW_DAYS = 365;

/**
 * Emails tenants about a ticket, or sends a plain property announcement.
 *
 * With a `reference` this is ticket-scoped: the email carries the ticket's
 * details, replies come back to the ticket's tagged address, and the send is
 * recorded as one outbound message so the whole house shares a single thread.
 * Pass `scope: "property"` to reach everyone there, or omit it for just the
 * ticket's tenant.
 *
 * Without a `reference` (the property filter's Message tenants button) it is a
 * plain announcement: no thread, replies go to the landlady's inbox.
 */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { reference, scope, property_address, subject, message } =
    await request.json();

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "Subject and message are both required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  type TicketRow = {
    id: string;
    tenant_name: string;
    tenant_email: string;
    property_address: string;
    category: string;
    description: string;
    created_at: string;
    public_token: string;
  };

  let ticket: TicketRow | null = null;
  if (reference) {
    const { data } = await supabase
      .from("tickets")
      .select(
        "id, tenant_name, tenant_email, property_address, category, description, created_at, public_token"
      )
      .eq("reference_number", reference)
      .is("deleted_at", null)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    ticket = data;
  } else if (!property_address) {
    return NextResponse.json(
      { error: "A ticket or a property is required" },
      { status: 400 }
    );
  }

  const targetProperty = ticket?.property_address ?? property_address;
  const recipients = new Map<string, string>();

  if (ticket && scope !== "property") {
    recipients.set(ticket.tenant_email.toLowerCase(), ticket.tenant_name ?? "");
  } else {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RECIPIENT_WINDOW_DAYS);

    const { data, error } = await supabase
      .from("tickets")
      .select("tenant_email, tenant_name")
      .eq("property_address", targetProperty)
      .is("deleted_at", null)
      .gte("created_at", cutoff.toISOString());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // One entry per address. A tenant with five tickets should get one email.
    for (const t of data ?? []) {
      if (t.tenant_email) recipients.set(t.tenant_email.toLowerCase(), t.tenant_name);
    }
  }

  if (recipients.size === 0) {
    return NextResponse.json(
      { error: "Nobody at that property has reported anything in the last year" },
      { status: 400 }
    );
  }

  // The reference in the subject doubles as the fallback matching route for
  // replies that arrive without the tagged address.
  const fullSubject =
    ticket && !subject.includes(reference)
      ? `${subject.trim()} (${reference})`
      : subject.trim();

  const ticketReplyTo = ticket
    ? replyAddress(ticket.public_token, process.env.REPLY_DOMAIN)
    : null;
  const effectiveReplyTo = ticketReplyTo ?? REPLY_TO;

  const contextBlock = ticket
    ? `
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; line-height: 1.8; font-size: 14px;">
        <p style="margin: 0;"><strong>Reference:</strong> ${reference}</p>
        <p style="margin: 0;"><strong>Issue:</strong> ${escapeHtml(ticket.category)}</p>
        <p style="margin: 0;"><strong>Reported:</strong> ${new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        ${ticket.description ? `<p style="margin: 8px 0 0;"><strong>Details:</strong> ${escapeHtml(ticket.description)}</p>` : ""}
      </div>
    `
    : "";

  // Sent individually rather than as one email with everyone in `to`, which
  // would disclose every tenant's address to the whole house.
  const results = await Promise.allSettled(
    [...recipients].map(([email, name]) =>
      resend.emails.send({
        from: FROM,
        ...(effectiveReplyTo ? { replyTo: effectiveReplyTo } : {}),
        to: email,
        subject: fullSubject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
            <p>Hi ${escapeHtml(name?.split(" ")[0] || "there")},</p>
            <div style="white-space: pre-wrap; line-height: 1.6; margin: 16px 0;">${escapeHtml(message)}</div>
            ${contextBlock}
            <p style="color: #6b7280; font-size: 13px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Sent regarding ${escapeHtml(targetProperty)}.${ticket ? " You can reply to this email." : ""}
            </p>
          </div>
        `,
      })
    )
  );

  const failed = results.filter(
    (r) => r.status === "rejected" || r.value?.error
  ).length;
  const sent = recipients.size - failed;

  // The free tier caps sends per day, shared with receiving. A big
  // property-wide send hitting the cap must say so, not quietly shrink.
  const rateLimited = results.some(
    (r) =>
      r.status === "fulfilled" &&
      (r.value?.error?.name === "rate_limit_exceeded" ||
        /rate limit/i.test(r.value?.error?.message ?? ""))
  );

  if (failed > 0) {
    console.error(
      `Tenant message: ${failed}/${recipients.size} failed for ${targetProperty}` +
        (rateLimited ? " (rate limited)" : "")
    );
  }

  // One row for the whole send: a property-wide question is one conversation,
  // and every reply to it should land in the same place.
  if (ticket && sent > 0) {
    const { error: insertError } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      direction: "outbound",
      sender_name: "Eastwinds Maintenance",
      sender_email: FROM,
      body: message.trim(),
    });
    if (insertError) {
      console.error(
        `Tenant message for ${reference}: sent but not recorded:`,
        JSON.stringify(insertError)
      );
    }
  }

  return NextResponse.json({ sent, failed, rateLimited });
}

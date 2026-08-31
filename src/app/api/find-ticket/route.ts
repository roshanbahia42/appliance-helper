import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";
import { escapeHtml } from "@/lib/messages";
import { STATUS_LABELS } from "@/lib/tickets";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
const REPLY_TO = process.env.RESEND_REPLY_TO;
const APP_URL = process.env.APP_URL ?? "https://appliance-helper-self.vercel.app";

/** Matches the messaging window: last year's tenants shouldn't get links. */
const LOOKUP_WINDOW_DAYS = 365;

/**
 * Emails a student links to their tickets. The confirmation email is the only
 * copy of a ticket's link, so anyone who tidied their inbox has no way back
 * in without this.
 *
 * The response never says whether the address has tickets: this is public,
 * and answering differently would let anyone test which emails have reported
 * something. The links go to the inbox that owns them, nowhere else.
 */
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKUP_WINDOW_DAYS);

  const supabase = createAdminClient();
  const { data: tickets } = await supabase
    .from("tickets")
    .select("reference_number, category, status, created_at, public_token")
    .ilike("tenant_email", email.trim())
    .is("deleted_at", null)
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: false });

  if (tickets?.length) {
    const rows = tickets
      .map(
        (t) => `
          <p style="margin: 0 0 12px;">
            <a href="${APP_URL}/t/${t.public_token}" style="color: #1d4ed8; font-weight: 600;">${t.reference_number}</a>
            · ${escapeHtml(t.category)}
            · ${STATUS_LABELS[t.status] ?? t.status}
            · ${new Date(t.created_at).toLocaleDateString("en-GB")}
          </p>`
      )
      .join("");

    const { error } = await resend.emails.send({
      from: FROM,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      to: email.trim(),
      subject: "Your maintenance requests",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
          <p>Hi,</p>
          <p>Here ${tickets.length === 1 ? "is the maintenance request" : "are the maintenance requests"} linked to this email address. Each link shows the conversation and lets you send an update.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            ${rows}
          </div>
          <p style="color: #6b7280; font-size: 13px;">If you didn't request this, you can ignore it.</p>
        </div>
      `,
    });

    if (error) {
      console.error(`Find-ticket email to ${email} failed:`, JSON.stringify(error));
    }
  }

  return NextResponse.json({ success: true });
}

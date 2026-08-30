import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

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

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { property_address, subject, message } = await request.json();

  if (!property_address || !subject?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "Property, subject and message are all required" },
      { status: 400 }
    );
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECIPIENT_WINDOW_DAYS);

  const supabase = createAdminClient();
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("tenant_email, tenant_name")
    .eq("property_address", property_address)
    .is("deleted_at", null)
    .gte("created_at", cutoff.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // One entry per address. A tenant with five tickets should get one email.
  const recipients = new Map<string, string>();
  for (const t of tickets ?? []) {
    if (t.tenant_email) recipients.set(t.tenant_email.toLowerCase(), t.tenant_name);
  }

  if (recipients.size === 0) {
    return NextResponse.json(
      { error: "Nobody at that property has reported anything in the last year" },
      { status: 400 }
    );
  }

  // Sent individually rather than as one email with everyone in `to`, which
  // would disclose every tenant's address to the whole house.
  const results = await Promise.allSettled(
    [...recipients].map(([email, name]) =>
      resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
            <p>Hi ${name?.split(" ")[0] ?? "there"},</p>
            <div style="white-space: pre-wrap; line-height: 1.6; margin: 16px 0;">${escapeHtml(message)}</div>
            <p style="color: #6b7280; font-size: 13px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Sent regarding ${escapeHtml(property_address)}.
            </p>
          </div>
        `,
      })
    )
  );

  const failed = results.filter(
    (r) => r.status === "rejected" || r.value?.error
  ).length;

  if (failed > 0) {
    console.error(`Property message: ${failed}/${recipients.size} failed for ${property_address}`);
  }

  return NextResponse.json({ sent: recipients.size - failed, failed });
}

/** The message is typed by the landlady, but it still shouldn't build markup. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

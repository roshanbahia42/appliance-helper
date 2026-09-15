import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";
import { RESOLVED_TICKET_FIELDS, sendResolvedEmails } from "@/lib/notify";

// Media is deliberately kept when a ticket is resolved — the landlady needs a
// written record, and Reopen/Restore would otherwise leave dead image links.
// Files are removed only when a ticket is purged from the bin.
//
// Behind a session. This used to be open so the tenant's own close-ticket link
// could reach it, which meant anyone could resolve any ticket, and trigger a
// notification email to its tenant, by guessing a five digit reference. The
// tenant path now lives at /api/thread/[token]/resolve.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { reference } = await params;
  const supabase = createAdminClient();

  // Only rows actually changing state come back, which is what gates the
  // notification: this route is public (the tenant's own close-ticket link
  // uses it), so re-posting a resolved reference must not send more email.
  const { data: updated, error } = await supabase
    .from("tickets")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("reference_number", reference)
    .neq("status", "resolved")
    .select(RESOLVED_TICKET_FIELDS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (updated) await sendResolvedEmails([updated], supabase);

  return NextResponse.json({ success: true });
}

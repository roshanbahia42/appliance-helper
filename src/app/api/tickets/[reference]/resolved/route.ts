import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendResolvedEmails } from "@/lib/notify";

// Media is deliberately kept when a ticket is resolved — the landlady needs a
// written record, and Reopen/Restore would otherwise leave dead image links.
// Files are removed only when a ticket is purged from the bin.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
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
    .select("reference_number, tenant_name, tenant_email, category, public_token")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (updated) await sendResolvedEmails([updated]);

  return NextResponse.json({ success: true });
}

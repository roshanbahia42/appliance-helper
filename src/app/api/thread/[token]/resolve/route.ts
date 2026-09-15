import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * A tenant closing their own ticket from the confirmation page.
 *
 * Public, like the thread it belongs to, and keyed on the unguessable token.
 * The admin equivalent is /api/tickets/[reference]/resolved, which is keyed on
 * the reference and gated behind a session. Keeping them separate is the point:
 * the reference is five random digits, so a public route accepting one let
 * anyone resolve every ticket by walking the range.
 *
 * No notification email is sent. The tenant is the one doing the closing, so
 * telling them their ticket was closed is noise.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: updated, error } = await supabase
    .from("tickets")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("public_token", token)
    .is("deleted_at", null)
    .neq("status", "resolved")
    .select("reference_number")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Already resolved, or no such token. Both answer the same way, so this
  // cannot be used to test whether a token is real.
  return NextResponse.json({ success: true, changed: !!updated });
}

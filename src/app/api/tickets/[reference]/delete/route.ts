import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";

// Soft delete — moves the ticket to the bin. Media is kept so the ticket can be
// restored. Permanent removal happens via /purge, or automatically after 30 days.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { reference } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("tickets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("reference_number", reference);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

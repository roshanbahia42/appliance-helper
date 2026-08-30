import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";
import { deleteTicketMedia } from "@/lib/storage";

// Permanent delete — removes the ticket row and its stored media for good.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { reference } = await params;
  const supabase = createAdminClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("media_urls")
    .eq("reference_number", reference)
    .single();

  if (ticket) await deleteTicketMedia(supabase, [ticket]);

  const { error } = await supabase
    .from("tickets")
    .delete()
    .eq("reference_number", reference);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";

/**
 * Marks a ticket's inbound messages as read. Called when the landlady opens
 * the ticket, which is the moment the unread badge has done its job.
 */
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
    .select("id")
    .eq("reference_number", reference)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("ticket_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("ticket_id", ticket.id)
    .eq("direction", "inbound")
    .is("read_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

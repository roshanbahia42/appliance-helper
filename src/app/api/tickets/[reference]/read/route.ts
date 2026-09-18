import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";

/**
 * Marks a ticket as seen and its inbound messages as read. Called when the
 * landlady opens the ticket, which is the moment both badges have done their
 * job.
 *
 * A ticket is unseen until opened, which is what makes a brand new report
 * visible. Before this, the only hint a ticket was new was the age column
 * reading "Today", so one arriving between visits could sit unnoticed among
 * the others.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { reference } = await params;
  const supabase = createAdminClient();

  const now = new Date().toISOString();

  const { data: ticket } = await supabase
    .from("tickets")
    .update({ seen_at: now })
    .eq("reference_number", reference)
    .select("id")
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("ticket_messages")
    .update({ read_at: now })
    .eq("ticket_id", ticket.id)
    .eq("direction", "inbound")
    .is("read_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

// Matches what a reasonable reply needs; stops the public endpoint being used
// to fill the database with novels.
const MAX_MESSAGE_LENGTH = 5000;

/**
 * A student's reply from the public thread page. Deliberately not behind
 * auth: the unguessable token in the URL is what grants access, the same
 * model as the handyman's job sheets. This is also the fallback path when a
 * student's emailed reply can't be matched, so it must stay available.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { message } = await request.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, status, tenant_name, tenant_email")
    .eq("public_token", token)
    .is("deleted_at", null)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const { error } = await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    direction: "inbound",
    sender_name: ticket.tenant_name,
    sender_email: ticket.tenant_email,
    body: message.trim(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Same rule as emailed replies: writing to a resolved ticket means it is
  // not actually resolved.
  if (ticket.status === "resolved") {
    await supabase
      .from("tickets")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", ticket.id);
  }

  return NextResponse.json({ success: true });
}

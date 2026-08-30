import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";
import { deleteTicketMedia } from "@/lib/storage";

const ACTIONS = ["delete", "restore", "purge", "resolve", "reopen", "escalate"] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { reference_numbers, action } = await request.json();

  if (!Array.isArray(reference_numbers) || reference_numbers.length === 0) {
    return NextResponse.json({ error: "No tickets selected" }, { status: 400 });
  }
  if (!ACTIONS.includes(action as Action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (action === "purge") {
    const { data: doomed } = await supabase
      .from("tickets")
      .select("media_urls")
      .in("reference_number", reference_numbers);

    if (doomed) await deleteTicketMedia(supabase, doomed);

    const { error } = await supabase
      .from("tickets")
      .delete()
      .in("reference_number", reference_numbers);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, count: reference_numbers.length });
  }

  const now = new Date().toISOString();
  const STATUS_FOR: Record<string, string> = {
    resolve: "resolved",
    reopen: "open",
    escalate: "escalated",
  };

  const update = STATUS_FOR[action]
    ? { status: STATUS_FOR[action], updated_at: now }
    : { deleted_at: action === "delete" ? now : null };

  const { error } = await supabase
    .from("tickets")
    .update(update)
    .in("reference_number", reference_numbers);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, count: reference_numbers.length });
}

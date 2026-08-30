import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/utils/supabase/requireAdmin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { reference } = await params;
  const { notes } = await request.json();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tickets")
    .update({ admin_notes: notes || null })
    .eq("reference_number", reference);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

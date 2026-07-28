import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  const supabase = createAdminClient();

  await supabase
    .from("tickets")
    .update({ status: "escalated", updated_at: new Date().toISOString() })
    .eq("reference_number", reference);

  return NextResponse.json({ success: true });
}

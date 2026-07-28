import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  const supabase = createAdminClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("media_urls")
    .eq("reference_number", reference)
    .single();

  if (ticket?.media_urls?.length) {
    const paths: string[] = ticket.media_urls.map((url: string) => {
      const marker = "/object/public/ticket-media/";
      const idx = url.indexOf(marker);
      return idx !== -1 ? url.slice(idx + marker.length) : "";
    }).filter(Boolean);

    if (paths.length) {
      await supabase.storage.from("ticket-media").remove(paths);
    }
  }

  await supabase
    .from("tickets")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("reference_number", reference);

  return NextResponse.json({ success: true });
}

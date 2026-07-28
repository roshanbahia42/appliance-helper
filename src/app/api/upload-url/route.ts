import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(request: NextRequest) {
  const { filename, contentType } = await request.json();

  const supabase = createAdminClient();
  const folderId = crypto.randomUUID();
  const ext = (filename as string).split(".").pop() ?? "bin";
  const path = `${folderId}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("ticket-media")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create upload URL" }, { status: 500 });
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ticket-media/${path}`;

  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl });
}

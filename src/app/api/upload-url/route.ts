import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

// The bucket is public, so anything uploaded is served straight back by
// Supabase. Restricting the extension stops someone storing an .html or .svg
// that would execute script when opened. Anything unrecognised is stored as
// .bin, which browsers download rather than render.
const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "mp4",
  "mov",
  "webm",
  "mkv",
  "avi",
]);

export async function POST(request: NextRequest) {
  const { filename } = await request.json();

  if (typeof filename !== "string" || !filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

  const rawExtension = filename.split(".").pop()?.toLowerCase() ?? "";
  const extension = ALLOWED_EXTENSIONS.has(rawExtension) ? rawExtension : "bin";

  // The random folder is what keeps stored files unguessable — the bucket is
  // public, so the URL is the only thing protecting them.
  const path = `${crypto.randomUUID()}/${Date.now()}.${extension}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("ticket-media")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create upload URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ticket-media/${path}`,
  });
}

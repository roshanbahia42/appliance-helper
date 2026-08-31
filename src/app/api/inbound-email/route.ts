import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { Webhook } from "svix";
import sharp from "sharp";
import { createAdminClient } from "@/utils/supabase/admin";
import { MAX_VIDEO_BYTES } from "@/lib/media";
import {
  extractReference,
  extractToken,
  htmlToText,
  isAutoReply,
  parseSender,
  referencedMessageIds,
} from "@/lib/messages";
import { stripQuotedText } from "@/lib/stripReply";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
const FORWARD_TO = process.env.RESEND_REPLY_TO;

// Attachment downloads and sharp add up; the platform default can cut a
// multi-photo reply off halfway through.
export const maxDuration = 60;

// Mirrors the browser-side compression in media.ts. Emailed photos skip that
// entirely and arrive around 10x larger, so this is the main storage control.
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 80;

// The bucket is public, so file types are restricted for the same reason as
// upload-url: an .html or .svg would execute script when opened.
const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

/**
 * Receives student replies from Resend and threads them onto tickets.
 *
 * This endpoint is publicly reachable and the Svix signature is the only thing
 * protecting it, so unsigned requests are rejected outright. Failures return
 * 500 on purpose: Resend retains and retries anything that doesn't get a 2xx,
 * and the dedupe on provider_message_id makes those retries safe.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("INBOUND_WEBHOOK_SECRET is not set; rejecting inbound email");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Verification needs the exact bytes Resend signed, so the body is read raw
  // and only parsed once the signature checks out.
  const payload = await request.text();
  let event: {
    type: string;
    data: { email_id: string; from: string; to: string[]; subject: string; message_id: string };
  };
  try {
    event = new Webhook(secret).verify(payload, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    }) as unknown as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ignored: true });
  }

  const { email_id, from, to, subject, message_id } = event.data;
  const supabase = createAdminClient();

  // Retries and duplicate webhook deliveries both land here.
  const { data: existing } = await supabase
    .from("ticket_messages")
    .select("id")
    .eq("provider_message_id", message_id)
    .maybeSingle();
  if (existing) return NextResponse.json({ duplicate: true });

  // The webhook payload is metadata only; body and headers come separately.
  const { data: email, error: fetchError } = await resend.emails.receiving.get(email_id);
  if (fetchError || !email) {
    console.error(`Inbound ${message_id}: fetch failed:`, JSON.stringify(fetchError));
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }

  if (isAutoReply(subject, email.headers)) {
    console.log(`Inbound ${message_id}: dropped auto-reply from ${from}`);
    return NextResponse.json({ dropped: "auto-reply" });
  }

  // Matching chain: address token, then reply headers, then subject reference.
  let ticket = null;
  const ticketFields = "id, reference_number, status, tenant_email, deleted_at";

  const token = extractToken(to ?? []);
  if (token) {
    const { data } = await supabase
      .from("tickets")
      .select(ticketFields)
      .eq("public_token", token)
      .maybeSingle();
    ticket = data;
  }

  if (!ticket) {
    const ids = referencedMessageIds(email.headers);
    if (ids.length > 0) {
      const { data: parent } = await supabase
        .from("ticket_messages")
        .select("ticket_id")
        .in("provider_message_id", ids)
        .limit(1)
        .maybeSingle();
      if (parent) {
        const { data } = await supabase
          .from("tickets")
          .select(ticketFields)
          .eq("id", parent.ticket_id)
          .maybeSingle();
        ticket = data;
      }
    }
  }

  if (!ticket) {
    const reference = extractReference(subject);
    if (reference) {
      const { data } = await supabase
        .from("tickets")
        .select(ticketFields)
        .eq("reference_number", reference)
        .maybeSingle();
      ticket = data;
    }
  }

  // A binned ticket is invisible in the dashboard, so a reply attached to it
  // would never be seen. Treated the same as no match: the landlady's inbox.
  if (!ticket || ticket.deleted_at) {
    if (!FORWARD_TO) {
      console.error(`Inbound ${message_id}: unmatched and RESEND_REPLY_TO unset`);
      return NextResponse.json({ error: "Cannot forward" }, { status: 500 });
    }
    const { error: forwardError } = await resend.emails.receiving.forward({
      emailId: email_id,
      to: FORWARD_TO,
      from: FROM,
      passthrough: true,
    });
    if (forwardError) {
      // 500 rather than dropping: a student's message must never vanish.
      console.error(`Inbound ${message_id}: forward failed:`, JSON.stringify(forwardError));
      return NextResponse.json({ error: "Forward failed" }, { status: 500 });
    }
    console.log(`Inbound ${message_id}: unmatched, forwarded to landlady`);
    return NextResponse.json({ forwarded: true });
  }

  const rawBody = email.text ?? (email.html ? htmlToText(email.html) : "");
  const body = stripQuotedText(rawBody);

  // One bad attachment shouldn't lose the message, so each is processed
  // independently and failures are logged rather than thrown.
  const attachmentUrls: string[] = [];
  for (const attachment of email.attachments ?? []) {
    try {
      const url = await storeAttachment(supabase, email_id, attachment);
      if (url) attachmentUrls.push(url);
    } catch (err) {
      console.error(`Inbound ${message_id}: attachment ${attachment.id} failed:`, err);
    }
  }

  const sender = parseSender(from);
  const { error: insertError } = await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    direction: "inbound",
    sender_name: sender.name || null,
    sender_email: sender.email || null,
    body,
    attachments: attachmentUrls,
    provider_message_id: message_id,
  });

  if (insertError) {
    // A retry can race the first attempt past the dedupe check; the unique
    // constraint catching it means the message is already stored.
    if (insertError.code === "23505") return NextResponse.json({ duplicate: true });
    console.error(`Inbound ${message_id}: insert failed:`, JSON.stringify(insertError));
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  // "It's not actually fixed" is the most likely content of a reply to a
  // resolved ticket, so it comes back into the open list by itself.
  if (ticket.status === "resolved") {
    await supabase
      .from("tickets")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", ticket.id);
  }

  return NextResponse.json({ stored: true });
}

/**
 * Downloads one attachment from Resend and stores it in the public bucket.
 * Images are recompressed with sharp; known video types are stored as-is up to
 * the same cap the student form applies. Everything else is skipped.
 * Returns the public URL, or null for a skipped type.
 */
async function storeAttachment(
  supabase: ReturnType<typeof createAdminClient>,
  emailId: string,
  meta: { id: string; content_type: string; size: number }
) {
  const isImage = meta.content_type.startsWith("image/");
  const videoExt = VIDEO_EXTENSIONS[meta.content_type];
  if (!isImage && !videoExt) return null;
  if (videoExt && meta.size > MAX_VIDEO_BYTES) return null;

  const { data: full, error } = await resend.emails.receiving.attachments.get({
    emailId,
    id: meta.id,
  });
  if (error || !full) throw new Error(JSON.stringify(error));

  const download = await fetch(full.download_url);
  if (!download.ok) throw new Error(`Download failed (${download.status})`);
  let buffer = Buffer.from(await download.arrayBuffer());

  let extension = videoExt ?? "jpg";
  let contentType = meta.content_type;
  if (isImage) {
    buffer = Buffer.from(
      await sharp(buffer)
        .rotate() // Bakes in EXIF orientation, which resizing would otherwise lose.
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer()
    );
    extension = "jpg";
    contentType = "image/jpeg";
  }

  // Random folder for unguessability, same as upload-url: the bucket is
  // public, so the URL is the only thing protecting the file.
  const path = `${crypto.randomUUID()}/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("ticket-media")
    .upload(path, buffer, { contentType });
  if (uploadError) throw new Error(uploadError.message);

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ticket-media/${path}`;
}

import type { SupabaseClient } from "@supabase/supabase-js";

const MARKER = "/object/public/ticket-media/";

/** Turns public ticket-media URLs into bucket-relative paths. */
export function mediaUrlsToPaths(urls: (string | null)[] | null | undefined) {
  return (urls ?? [])
    .map((url) => {
      if (!url) return "";
      const idx = url.indexOf(MARKER);
      return idx !== -1 ? url.slice(idx + MARKER.length) : "";
    })
    .filter(Boolean);
}

/** Removes every stored file belonging to the given tickets. */
export async function deleteTicketMedia(
  supabase: SupabaseClient,
  tickets: { media_urls: string[] | null }[]
) {
  const paths = tickets.flatMap((t) => mediaUrlsToPaths(t.media_urls));
  if (paths.length === 0) return;
  await supabase.storage.from("ticket-media").remove(paths);
}

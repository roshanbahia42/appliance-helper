import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Gate for API routes only the landlady should be able to call.
 *
 * The middleware guards /admin/dashboard, but that only stops someone loading
 * the page — it does nothing for the routes behind it. Without this, anyone who
 * knew the URL could POST to /api/tickets/bulk and purge every ticket.
 *
 * Returns null when the caller is signed in, or the 401 to return when not:
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  return null;
}

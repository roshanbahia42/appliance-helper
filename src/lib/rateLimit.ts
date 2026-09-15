import "server-only";
import { NextRequest, NextResponse } from "next/server";

/**
 * Per-IP rate limiting for the routes that have no session behind them.
 *
 * The thing being protected is the Resend daily send cap. /submit and
 * /find-ticket both send email on an unauthenticated request, so a few dozen
 * scripted calls could exhaust the day's quota and leave real students with no
 * confirmation and the landlady with no urgent alerts. That failure looks like
 * the system being broken rather than like an attack, which is what makes it
 * worth preventing.
 *
 * Limits are deliberately generous. Students share IP addresses: a whole house
 * sits behind one router, and university wifi puts hundreds of people behind a
 * single address. The aim is to stop automation, which makes hundreds of
 * requests, not to police someone reporting three faults in one sitting.
 *
 * State is in-process, so it resets on cold start and is not shared between
 * serverless instances. That makes it partial rather than airtight: it stops a
 * script hammering from one address, which is the realistic threat here, but a
 * determined distributed attempt would get through. Moving to a shared store
 * such as Upstash is the upgrade if that ever matters. For a maintenance form
 * used by 80 students, it isn't worth the extra service today.
 */

type Window = { count: number; resetAt: number };

const WINDOW_MS = 10 * 60 * 1000;
const buckets = new Map<string, Window>();

/** Stops the map growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

function clientIp(request: NextRequest) {
  // Vercel sets x-forwarded-for; the client address is the first entry.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns a 429 to return, or null to carry on:
 *
 *   const limited = rateLimit(request, "submit", 10);
 *   if (limited) return limited;
 */
export function rateLimit(
  request: NextRequest,
  /** Keeps each route's budget separate, so uploads cannot eat submissions. */
  bucket: string,
  limit: number,
  message = "Too many requests. Please wait a few minutes and try again."
): NextResponse | null {
  const now = Date.now();
  sweep(now);

  const key = `${bucket}:${clientIp(request)}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return NextResponse.json(
      { error: message },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  return null;
}

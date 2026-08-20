import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for Google Places Autocomplete, so the API key never
 * reaches the browser.
 *
 * Every failure still returns an empty suggestion list — a tenant should see
 * "no matches" rather than a stack trace — but the cause is logged. Silent
 * failures here are indistinguishable from a genuine no-match, which makes an
 * expired key or a suspended billing account very hard to spot.
 */
export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input") ?? "";
  if (input.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("Places lookup skipped: GOOGLE_PLACES_API_KEY is not set");
    return NextResponse.json({ suggestions: [], error: "not_configured" });
  }

  let res: Response;
  try {
    res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input,
        // Buildings only. Routes and postcodes were tried and removed: Google
        // autocomplete matches text, it can't enumerate, so selecting a street
        // just returns the same street — there's no way to drill into it.
        // Listing every house in a postcode needs a UK PAF-backed API instead.
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        locationRestriction: {
          circle: {
            center: { latitude: 52.4862, longitude: -1.8904 },
            radius: 15000,
          },
        },
      }),
    });
  } catch (err) {
    console.error("Places lookup could not reach Google:", err);
    return NextResponse.json({ suggestions: [], error: "unreachable" });
  }

  if (!res.ok) {
    // Google puts the real reason in the body — billing disabled, key
    // restricted, API not enabled, quota exceeded. Worth having in the logs.
    const detail = await res.text().catch(() => "");
    console.error(`Places lookup failed (HTTP ${res.status}):`, detail.slice(0, 500));
    return NextResponse.json({ suggestions: [], error: "lookup_failed" });
  }

  const data = await res.json();
  const suggestions: string[] = (data.suggestions ?? [])
    .map(
      (s: { placePrediction?: { text?: { text?: string } } }) =>
        s.placePrediction?.text?.text ?? ""
    )
    .filter(Boolean);

  return NextResponse.json({ suggestions });
}

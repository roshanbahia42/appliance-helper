import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input") ?? "";

  if (input.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [] });
  }

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input,
      // Routes and postcodes are included so a street name or postcode returns
      // something. They aren't valid answers on their own — the client uses them
      // to re-search and narrow down to an actual building.
      includedPrimaryTypes: [
        "street_address",
        "premise",
        "subpremise",
        "route",
        "postal_code",
      ],
      locationRestriction: {
        circle: {
          center: { latitude: 52.4862, longitude: -1.8904 },
          radius: 15000,
        },
      },
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ suggestions: [] });
  }

  const data = await res.json();

  const SPECIFIC = new Set(["street_address", "premise", "subpremise"]);

  const suggestions = (data.suggestions ?? [])
    .map((s: { placePrediction?: { text?: { text?: string }; types?: string[] } }) => {
      const text = s.placePrediction?.text?.text ?? "";
      const types = s.placePrediction?.types ?? [];
      return {
        text,
        // A specific building can be submitted as-is; anything broader is only a
        // stepping stone. Falls back to "starts with a number" if the API omits
        // types, which covers most UK addresses.
        specific: types.length ? types.some((t) => SPECIFIC.has(t)) : /^\d/.test(text),
      };
    })
    .filter((s: { text: string }) => s.text);

  return NextResponse.json({ suggestions });
}

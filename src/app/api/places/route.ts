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
      includedPrimaryTypes: ["street_address", "premise", "subpremise"],
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

  const suggestions: string[] = (data.suggestions ?? [])
    .map((s: { placePrediction?: { text?: { text?: string } } }) =>
      s.placePrediction?.text?.text ?? ""
    )
    .filter(Boolean);

  return NextResponse.json({ suggestions });
}

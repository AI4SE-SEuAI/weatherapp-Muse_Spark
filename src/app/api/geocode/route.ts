import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const count = Math.min(
    Math.max(Number(searchParams.get("count") ?? "6") || 6, 1),
    10
  );

  if (!name || name.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}` +
    `&count=${count}&language=en&format=json`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(
      { results: data.results ?? [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Failed to search places" }, { status: 500 });
  }
}

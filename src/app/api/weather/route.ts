import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("latitude");
  const lon = searchParams.get("longitude");
  const name = searchParams.get("name") ?? undefined;
  const country = searchParams.get("country") ?? undefined;
  const admin1 = searchParams.get("admin1") ?? undefined;

  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!lat || !lon || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return NextResponse.json(
      { error: "Missing or invalid latitude/longitude" },
      { status: 400 }
    );
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Coordinates out of range" }, { status: 400 });
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&hourly=temperature_2m,precipitation_probability,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max` +
    `&timezone=auto&forecast_days=7`;

  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream weather provider failed" },
        { status: 502 }
      );
    }
    const data = await res.json();
    if (name) {
      data.place = { name, country, admin1 };
    }
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}

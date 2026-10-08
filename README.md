# Aurora Weather — Full-stack Next.js + Tailwind

Modern weather web app built with the **Next.js App Router (full-stack)** + **Tailwind CSS v4** + **lucide-react icons**.
Live, free and open data from **Open-Meteo** — no API key required.

## Features (as requested + extras)

- **Current weather**: temperature, feels-like, condition, humidity, wind speed
- Plus: wind direction/gust, pressure, cloud cover, precipitation, UV, sunrise/sunset
- **Search any city/location** with autocomplete (`/api/geocode` → Open-Meteo Geocoding)
- **°C / °F toggle**, quick-pick cities, favorites (localStorage), geolocation “Locate me” with reverse-geocode label
- **Hourly (24h) strip + 7-day forecast** (`/api/weather` → Open-Meteo Forecast)
- Dynamic gradient background by weather code + day/night, glassmorphism, responsive, dark-modern UI

## Architecture (full-stack)

```
src/app/page.tsx              # client UI
src/app/api/weather/route.ts  # GET ?latitude=&longitude=&name=&country=&admin1= → Open-Meteo forecast
src/app/api/geocode/route.ts  # GET ?name=&count= → Open-Meteo geocoding search
src/lib/weather.ts            # types, WMO mapping, unit helpers
```

API routes add validation, `Cache-Control` + Next `revalidate` caching, and keep the Open-Meteo upstream calls server-side.

Data sources:
- Forecast: `https://api.open-meteo.com/v1/forecast?...` (CC-BY 4.0)
- Geocoding: `https://geocoding-api.open-meteo.com/v1/search?...`
- Reverse label (browser only): `api.bigdatacloud.net` free client API

## Getting Started

```bash
cd weather-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run lint
npm run build
npm start
```

## Deploy

Any Node host / Vercel works with `npm run build && npm start`. No env vars needed.

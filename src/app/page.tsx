"use client";
/* eslint-disable react-hooks/set-state-in-effect -- data-fetch + autocomplete effects legitimately sync async results into state */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CloudSun,
  Droplets,
  Eye,
  Gauge,
  LocateFixed,
  MapPin,
  Search,
  Star,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  Wind,
  X,
  Loader2,
  CloudRainWind,
} from "lucide-react";
import {
  GeoPlace,
  WeatherResponse,
  backgroundFor,
  fmtTemp,
  toF,
  weatherCodeInfo,
  windDirection,
} from "@/lib/weather";

type Unit = "C" | "F";

interface FavPlace {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_PLACES: FavPlace[] = [
  { name: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.41 },
  { name: "New York", country: "United States", latitude: 40.71, longitude: -74.0 },
  { name: "Tokyo", country: "Japan", latitude: 35.68, longitude: 139.69 },
  { name: "London", country: "United Kingdom", latitude: 51.5, longitude: -0.12 },
];

function useDebounced(value: string, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [place, setPlace] = useState<FavPlace>(DEFAULT_PLACES[0]);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>(() => {
    try {
      const u = localStorage.getItem("aurora:unit");
      return u === "F" ? "F" : "C";
    } catch {
      return "C";
    }
  });
  const [favorites, setFavorites] = useState<FavPlace[]>(() => {
    try {
      const f = localStorage.getItem("aurora:favorites");
      return f ? (JSON.parse(f) as FavPlace[]) : [];
    } catch {
      return [];
    }
  });
  const [locating, setLocating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounced(query);

  useEffect(() => {
    localStorage.setItem("aurora:favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("aurora:unit", unit);
  }, [unit]);

  // close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setShowDrop(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // autocomplete
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    fetch(`/api/geocode?name=${encodeURIComponent(debouncedQuery)}&count=6`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setSuggestions(d.results ?? []);
          setShowDrop(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const fetchWeather = useCallback(async (p: FavPlace) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        latitude: String(p.latitude),
        longitude: String(p.longitude),
        name: p.name,
        country: p.country ?? "",
        admin1: p.admin1 ?? "",
      });
      const res = await fetch(`/api/weather?${params.toString()}`);
      if (!res.ok) throw new Error("Weather request failed");
      const data: WeatherResponse = await res.json();
      setWeather(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load weather");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(place);
  }, [place, fetchWeather]);

  const selectPlace = (p: FavPlace) => {
    setPlace(p);
    setQuery("");
    setSuggestions([]);
    setShowDrop(false);
    // recent
    try {
      const raw = localStorage.getItem("aurora:recent");
      const arr: FavPlace[] = raw ? JSON.parse(raw) : [];
      const next = [p, ...arr.filter((x) => x.name !== p.name)].slice(0, 5);
      localStorage.setItem("aurora:recent", JSON.stringify(next));
    } catch {}
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let label = "Current location";
        try {
          const r = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const j = await r.json();
          label = j.city || j.locality || j.principalSubdivision || label;
        } catch {}
        selectPlace({ name: label, latitude, longitude });
        setLocating(false);
      },
      () => {
        setError("Location permission denied");
        setLocating(false);
      }
    );
  };

  const isFav = favorites.some(
    (f) => Math.abs(f.latitude - place.latitude) < 0.01 && Math.abs(f.longitude - place.longitude) < 0.01
  );

  const toggleFav = () => {
    if (isFav) {
      setFavorites((f) =>
        f.filter((x) => Math.abs(x.latitude - place.latitude) > 0.01)
      );
    } else {
      setFavorites((f) => [...f, place].slice(0, 12));
    }
  };

  const info = weather ? weatherCodeInfo(weather.current.weather_code) : null;
  const bg = weather
    ? backgroundFor(weather.current.weather_code, weather.current.is_day)
    : "from-slate-950 via-indigo-950 to-slate-900";

  const hourlySlice = (() => {
    if (!weather) return [];
    const now = new Date(weather.current.time).getTime();
    let start = weather.hourly.time.findIndex((t) => new Date(t).getTime() >= now);
    if (start < 0) start = 0;
    return weather.hourly.time.slice(start, start + 24).map((t, i) => ({
      time: t,
      temp: weather.hourly.temperature_2m[start + i],
      prob: weather.hourly.precipitation_probability[start + i],
      code: weather.hourly.weather_code[start + i],
    }));
  })();

  const windKmh = weather?.current.wind_speed_10m ?? 0;
  const windDisplay =
    unit === "C" ? `${Math.round(windKmh)} km/h` : `${Math.round(windKmh * 0.621)} mph`;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bg} transition-colors duration-700`}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-white/15 text-2xl shadow-lg backdrop-blur">
              <CloudSun className="size-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Aurora Weather
              </h1>
              <p className="text-xs text-white/70">
                Open-Meteo · free & open data · no API key
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-white/10 p-1 backdrop-blur">
              {(["C", "F"] as Unit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    unit === u
                      ? "bg-white text-slate-900 shadow"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  °{u}
                </button>
              ))}
            </div>
            <button
              onClick={locateMe}
              disabled={locating}
              className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LocateFixed className="size-4" />
              )}
              <span className="hidden sm:inline">Locate me</span>
            </button>
          </div>
        </header>

        {/* Search */}
        <div ref={boxRef} className="relative z-20 mx-auto mt-8 max-w-2xl">
          <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur-xl">
            <Search className="ml-2 size-5 shrink-0 text-white/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length && setShowDrop(true)}
              placeholder="Search city… e.g. Paris, Hanoi, New York"
              className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/50"
            />
            {searching ? (
              <Loader2 className="mr-2 size-5 animate-spin text-white/70" />
            ) : query ? (
              <button
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                }}
                className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            ) : null}
            <button
              onClick={() => query.trim().length >= 2 && setShowDrop(true)}
              className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Search
            </button>
          </div>

          {showDrop && suggestions.length > 0 && (
            <div className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    selectPlace({
                      name: s.name,
                      country: s.country,
                      admin1: s.admin1,
                      latitude: s.latitude,
                      longitude: s.longitude,
                    })
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/10"
                >
                  <MapPin className="size-4 shrink-0 text-sky-300" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {s.name}
                    </span>
                    <span className="block truncate text-xs text-white/60">
                      {[s.admin1, s.country].filter(Boolean).join(", ")} ·{" "}
                      {s.latitude.toFixed(2)}, {s.longitude.toFixed(2)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* quick picks + favorites */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {DEFAULT_PLACES.map((d) => (
              <button
                key={d.name}
                onClick={() => selectPlace(d)}
                className={`rounded-full border px-3 py-1 text-xs font-medium backdrop-blur transition ${
                  place.name === d.name
                    ? "border-white bg-white text-slate-900"
                    : "border-white/20 bg-white/10 text-white/85 hover:bg-white/20"
                }`}
              >
                {d.name}
              </button>
            ))}
            {favorites.map((f) => (
              <button
                key={`${f.latitude}-${f.longitude}`}
                onClick={() => selectPlace(f)}
                className="flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-xs font-medium text-amber-100 backdrop-blur transition hover:bg-amber-300/25"
              >
                <Star className="size-3 fill-amber-300 text-amber-300" />
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <main className="mt-8">
          {error && (
            <div className="mx-auto mb-4 max-w-2xl rounded-2xl border border-red-300/30 bg-red-500/20 px-4 py-3 text-sm text-red-100 backdrop-blur">
              {error}{" "}
              <button onClick={() => fetchWeather(place)} className="underline">
                Retry
              </button>
            </div>
          )}

          {loading || !weather ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-3xl bg-white/10 backdrop-blur"
                />
              ))}
            </div>
          ) : (
            <div className="animate-fade-up grid gap-4 lg:grid-cols-3">
              {/* Hero current */}
              <section className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl lg:col-span-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-white/80">
                      <MapPin className="size-4" />
                      <span className="text-sm font-medium">
                        {[weather.place?.name ?? place.name, weather.place?.country ?? place.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {new Date(weather.current.time).toLocaleString(undefined, {
                        weekday: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {weather.timezone}
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <span className="text-7xl">{info?.icon}</span>
                      <div>
                        <div className="text-6xl font-extrabold tracking-tighter text-white sm:text-7xl">
                          {fmtTemp(weather.current.temperature_2m, unit)}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-white/85">
                          <Thermometer className="size-4" />
                          Feels like {fmtTemp(weather.current.apparent_temperature, unit)} ·{" "}
                          {info?.label}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={toggleFav}
                    title={isFav ? "Remove favorite" : "Save favorite"}
                    className={`rounded-full p-2.5 backdrop-blur transition ${
                      isFav
                        ? "bg-amber-300 text-slate-900"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    <Star className={`size-5 ${isFav ? "fill-slate-900" : ""}`} />
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat
                    icon={<Droplets className="size-4 text-sky-300" />}
                    label="Humidity"
                    value={`${weather.current.relative_humidity_2m}%`}
                  />
                  <Stat
                    icon={<Wind className="size-4 text-emerald-300" />}
                    label="Wind"
                    value={windDisplay}
                    sub={`${windDirection(weather.current.wind_direction_10m)} · gust ${unit === "C" ? Math.round(weather.current.wind_gusts_10m) + " km/h" : Math.round(weather.current.wind_gusts_10m * 0.621) + " mph"}`}
                  />
                  <Stat
                    icon={<Gauge className="size-4 text-violet-300" />}
                    label="Pressure"
                    value={`${Math.round(weather.current.pressure_msl)} hPa`}
                  />
                  <Stat
                    icon={<Umbrella className="size-4 text-blue-300" />}
                    label="Precipitation"
                    value={`${weather.current.precipitation} mm`}
                  />
                </div>

                {/* hourly */}
                <div className="mt-6">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/60">
                    Next 24 hours
                  </h3>
                  <div className="nice-scroll flex gap-2 overflow-x-auto pb-1">
                    {hourlySlice.map((h) => (
                      <div
                        key={h.time}
                        className="w-[72px] shrink-0 rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center backdrop-blur"
                      >
                        <div className="text-[11px] text-white/60">
                          {new Date(h.time).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="my-1 text-xl">
                          {weatherCodeInfo(h.code).icon}
                        </div>
                        <div className="text-sm font-bold text-white">
                          {fmtTemp(h.temp, unit)}
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-0.5 text-[11px] text-sky-200">
                          <Droplets className="size-3" />
                          {h.prob}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Side column */}
              <div className="flex flex-col gap-4">
                <section className="rounded-3xl border border-white/15 bg-slate-950/40 p-5 shadow-2xl backdrop-blur-xl">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-white/60">
                    Details
                  </h3>
                  <ul className="mt-3 space-y-3 text-sm">
                    <Detail
                      icon={<Eye className="size-4 text-white/60" />}
                      k="Cloud cover"
                      v={`${weather.current.cloud_cover}%`}
                    />
                    <Detail
                      icon={<CloudRainWind className="size-4 text-white/60" />}
                      k="High / Low today"
                      v={`${fmtTemp(weather.daily.temperature_2m_max[0], unit)} / ${fmtTemp(weather.daily.temperature_2m_min[0], unit)}`}
                    />
                    <Detail
                      icon={<Sunrise className="size-4 text-amber-300" />}
                      k="Sunrise"
                      v={new Date(weather.daily.sunrise[0]).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                    <Detail
                      icon={<Sunset className="size-4 text-orange-300" />}
                      k="Sunset"
                      v={new Date(weather.daily.sunset[0]).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                    <Detail
                      k="UV index (max)"
                      v={String(weather.daily.uv_index_max[0] ?? "—")}
                    />
                    <Detail
                      k="Rain chance"
                      v={`${weather.daily.precipitation_probability_max[0] ?? 0}%`}
                    />
                    <Detail
                      k="Coordinates"
                      v={`${weather.latitude.toFixed(2)}, ${weather.longitude.toFixed(2)}`}
                    />
                  </ul>
                  <div className="mt-4 rounded-2xl bg-white/5 p-3 text-[11px] leading-relaxed text-white/60">
                    Data: Open-Meteo forecast + geocoding (open, no key).{" "}
                    {unit === "C"
                      ? `Switch to °F: ${Math.round(toF(weather.current.temperature_2m))}°F feels ${Math.round(toF(weather.current.apparent_temperature))}°F.`
                      : "Showing imperial for temp & wind."}
                  </div>
                </section>

                <section className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-white/60">
                    7-day forecast
                  </h3>
                  <ul className="mt-2 divide-y divide-white/10">
                    {weather.daily.time.map((d, i) => {
                      const c = weatherCodeInfo(weather.daily.weather_code[i]);
                      return (
                        <li key={d} className="flex items-center justify-between gap-2 py-2.5">
                          <span className="w-20 text-sm text-white/80">
                            {i === 0
                              ? "Today"
                              : new Date(d).toLocaleDateString(undefined, {
                                  weekday: "short",
                                })}
                          </span>
                          <span className="flex items-center gap-2 text-sm text-white">
                            <span className="text-lg">{c.icon}</span>
                            <span className="hidden text-xs text-white/60 sm:inline">
                              {weather.daily.precipitation_probability_max[i] ?? 0}%
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {fmtTemp(weather.daily.temperature_2m_max[i], unit)}{" "}
                            <span className="font-normal text-white/55">
                              {fmtTemp(weather.daily.temperature_2m_min[i], unit)}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            </div>
          )}
        </main>

        <footer className="mt-10 text-center text-xs text-white/50">
          Built with Next.js App Router (full-stack API routes) + Tailwind CSS · Data ©
          Open-Meteo.com (CC-BY 4.0)
        </footer>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/60">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
      {sub && <div className="text-[11px] text-white/55">{sub}</div>}
    </div>
  );
}

function Detail({
  icon,
  k,
  v,
}: {
  icon?: React.ReactNode;
  k: string;
  v: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-white/65">
        {icon}
        {k}
      </span>
      <span className="font-semibold text-white">{v}</span>
    </li>
  );
}

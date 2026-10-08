export interface GeoPlace {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  country_code?: string;
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_probability_max: number[];
  };
  place?: {
    name: string;
    country?: string;
    admin1?: string;
  };
}

export function weatherCodeInfo(code: number): {
  label: string;
  icon: string;
} {
  if (code === 0) return { label: "Clear sky", icon: "☀️" };
  if (code === 1) return { label: "Mainly clear", icon: "🌤️" };
  if (code === 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { label: "Rain", icon: "🌧️" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { label: "Snow", icon: "❄️" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Unknown", icon: "🌡️" };
}

export function windDirection(deg: number): string {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function toF(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fmtTemp(celsius: number, unit: "C" | "F"): string {
  const v = unit === "C" ? celsius : toF(celsius);
  return `${Math.round(v)}°`;
}

export function backgroundFor(code: number, isDay: number): string {
  const night = isDay === 0;
  if (code === 0 || code === 1)
    return night
      ? "from-slate-950 via-indigo-950 to-slate-900"
      : "from-sky-500 via-sky-400 to-blue-500";
  if (code === 2)
    return night
      ? "from-slate-950 via-slate-900 to-indigo-950"
      : "from-sky-400 via-blue-400 to-indigo-500";
  if (code === 3 || code === 45 || code === 48)
    return "from-slate-700 via-slate-600 to-slate-800";
  if (code >= 51 && code <= 67)
    return "from-slate-800 via-blue-900 to-slate-900";
  if (code >= 71 && code <= 86)
    return "from-slate-200 via-blue-100 to-slate-300";
  if (code >= 95) return "from-slate-900 via-purple-950 to-slate-900";
  return night
    ? "from-slate-950 via-indigo-950 to-slate-900"
    : "from-blue-500 via-indigo-500 to-sky-500";
}

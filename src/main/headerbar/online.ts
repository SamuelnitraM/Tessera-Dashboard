import {
  sanitizePlace,
  type CurrencyRates,
  type Place,
  type WeatherReport
} from '@shared/header-bar'

/**
 * Services en ligne de la barre des pages, sans compte ni clé : météo et recherche de villes
 * (Open-Meteo), taux de change du jour (Banque centrale européenne, via Frankfurter).
 */

const WEATHER_CACHE_MS = 15 * 60_000
const RATES_CACHE_MS = 6 * 60 * 60_000

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as T
}

/* ---------- Villes ---------- */

interface GeocodingResult {
  name?: string
  latitude?: number
  longitude?: number
  country?: string
  admin1?: string
  timezone?: string
}

export async function searchPlaces(query: string, language: string): Promise<Place[]> {
  const name = String(query).trim().slice(0, 100)
  if (name.length < 2) return []
  const params = new URLSearchParams({
    name,
    count: '8',
    language: language === 'en' ? 'en' : 'fr',
    format: 'json'
  })
  const data = await getJson<{ results?: GeocodingResult[] }>(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`
  )
  return (data.results ?? [])
    .map((result) =>
      sanitizePlace({
        name: result.name,
        region: result.admin1 ?? '',
        country: result.country ?? '',
        latitude: result.latitude,
        longitude: result.longitude,
        timeZone: result.timezone
      })
    )
    .filter((place): place is Place => place !== null)
}

/* ---------- Météo ---------- */

interface ForecastResponse {
  current: {
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    is_day: number
    weather_code: number
    wind_speed_10m: number
  }
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; is_day: number[] }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: (number | null)[]
  }
}

const weatherCache = new Map<string, WeatherReport>()

export async function getWeather(latitude: number, longitude: number): Promise<WeatherReport> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('invalid place')
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`
  const cached = weatherCache.get(key)
  if (cached && Date.now() - cached.updatedAt < WEATHER_CACHE_MS) return cached

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '7',
    forecast_hours: '24'
  })
  const data = await getJson<ForecastResponse>(`https://api.open-meteo.com/v1/forecast?${params}`)
  const report: WeatherReport = {
    current: {
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m
    },
    hours: data.hourly.time.map((time, index) => ({
      time,
      temperature: data.hourly.temperature_2m[index],
      weatherCode: data.hourly.weather_code[index],
      isDay: data.hourly.is_day[index] === 1
    })),
    days: data.daily.time.map((date, index) => ({
      date,
      min: data.daily.temperature_2m_min[index],
      max: data.daily.temperature_2m_max[index],
      weatherCode: data.daily.weather_code[index],
      precipitationProbability: data.daily.precipitation_probability_max[index] ?? null
    })),
    updatedAt: Date.now()
  }
  weatherCache.set(key, report)
  return report
}

/* ---------- Taux de change ---------- */

let rates: (CurrencyRates & { fetchedAt: number }) | null = null

export async function getCurrencyRates(): Promise<CurrencyRates> {
  if (rates && Date.now() - rates.fetchedAt < RATES_CACHE_MS) return rates
  const data = await getJson<{ date: string; rates: Record<string, number> }>(
    'https://api.frankfurter.dev/v1/latest'
  )
  rates = { date: data.date, rates: { EUR: 1, ...data.rates }, fetchedAt: Date.now() }
  return rates
}

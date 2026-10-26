import { createElement, useState } from 'react'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Moon,
  Sun,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Place, WeatherReport } from '@shared/header-bar'
import { useSettingsStore } from '../../stores/settings'
import { HeaderPopover } from './HeaderPopover'
import { formatPercent, placeLabel, useBlockSize, usePolling } from './helpers'
import { PanelTitle, PlaceSearch } from './parts'
import styles from './Widgets.module.css'

const REFRESH_MS = 10 * 60_000

/** Temps d'après les codes météo de l'OMS (Open-Meteo `weather_code`). */
type WeatherKind =
  | 'clear'
  | 'mainlyClear'
  | 'partlyCloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'freezingDrizzle'
  | 'rain'
  | 'freezingRain'
  | 'snow'
  | 'snowGrains'
  | 'showers'
  | 'snowShowers'
  | 'thunderstorm'
  | 'thunderstormHail'

function kindOf(code: number): WeatherKind {
  if (code === 0) return 'clear'
  if (code === 1) return 'mainlyClear'
  if (code === 2) return 'partlyCloudy'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 55) return 'drizzle'
  if (code === 56 || code === 57) return 'freezingDrizzle'
  if (code >= 61 && code <= 65) return 'rain'
  if (code === 66 || code === 67) return 'freezingRain'
  if (code >= 71 && code <= 75) return 'snow'
  if (code === 77) return 'snowGrains'
  if (code >= 80 && code <= 82) return 'showers'
  if (code === 85 || code === 86) return 'snowShowers'
  if (code === 95) return 'thunderstorm'
  if (code === 96 || code === 99) return 'thunderstormHail'
  return 'overcast'
}

function iconOf(code: number, isDay: boolean): LucideIcon {
  switch (kindOf(code)) {
    case 'clear':
      return isDay ? Sun : Moon
    case 'mainlyClear':
    case 'partlyCloudy':
      return isDay ? CloudSun : CloudMoon
    case 'fog':
      return CloudFog
    case 'drizzle':
    case 'freezingDrizzle':
      return CloudDrizzle
    case 'rain':
    case 'freezingRain':
    case 'showers':
      return CloudRain
    case 'snow':
    case 'snowGrains':
    case 'snowShowers':
      return CloudSnow
    case 'thunderstorm':
      return CloudLightning
    case 'thunderstormHail':
      return CloudHail
    default:
      return Cloud
  }
}

/** Icône du temps (code météo de l'OMS). */
function WeatherIcon({
  code,
  isDay = true,
  size,
  strokeWidth
}: {
  code: number | null
  isDay?: boolean
  size: number
  strokeWidth?: number
}): React.JSX.Element {
  const props = { size, strokeWidth, 'aria-hidden': true }
  if (code === null) return <CloudSun {...props} />
  return createElement(iconOf(code, isDay), props)
}

const degrees = (value: number): string => `${Math.round(value)}°`

const CHART_HEIGHT = 92

/** Courbe des températures des prochaines 24 heures (bloc Météo large). */
function WeatherChart({
  hours,
  width,
  format
}: {
  hours: WeatherReport['hours']
  width: number
  format: Intl.DateTimeFormat
}): React.JSX.Element {
  const pad = 16
  const top = 20
  const bottom = CHART_HEIGHT - 6
  const temperatures = hours.map((hour) => hour.temperature)
  const low = Math.min(...temperatures)
  const high = Math.max(...temperatures)
  // Au moins 4 degrés d'écart, sinon une petite variation paraît énorme
  const span = Math.max(4, high - low)
  const base = low - (span - (high - low)) / 2
  const x = (index: number): number =>
    pad + (index * (width - 2 * pad)) / Math.max(1, hours.length - 1)
  const y = (value: number): number => bottom - ((value - base) / span) * (bottom - top)
  const line = hours
    .map(
      (hour, index) =>
        `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(hour.temperature).toFixed(1)}`
    )
    .join(' ')
  const area = `${line} L${x(hours.length - 1).toFixed(1)},${CHART_HEIGHT} L${x(0).toFixed(1)},${CHART_HEIGHT} Z`
  const step = width >= 900 ? 2 : 3
  const marks = hours.map((_hour, index) => index).filter((index) => index % step === 0)

  return (
    <div className={styles.weatherChart}>
      <svg width={width} height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`} aria-hidden>
        <path d={area} className={styles.weatherChartArea} />
        <path d={line} className={styles.weatherChartLine} />
        {marks.map((index) => (
          <g key={hours[index].time}>
            <circle cx={x(index)} cy={y(hours[index].temperature)} r={2.5} />
            <text x={x(index)} y={y(hours[index].temperature) - 7} textAnchor="middle">
              {degrees(hours[index].temperature)}
            </text>
          </g>
        ))}
      </svg>
      <ol className={styles.weatherChartHours}>
        {marks.map((index) => (
          <li key={hours[index].time} style={{ left: x(index) }}>
            <WeatherIcon code={hours[index].weatherCode} isDay={hours[index].isDay} size={16} />
            <span>{format.format(new Date(hours[index].time))}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Météo de la ville choisie : température dans la barre, prévisions dans le panneau. */
function useWeather(): {
  place: Place | null
  report: WeatherReport | null
  failed: boolean
  refresh: () => void
} {
  const place = useSettingsStore((state) => state.settings.headerBar.weather.place)
  const { data, failed, refresh } = usePolling(
    () =>
      place
        ? window.tessera.headerBar.weather(place.latitude, place.longitude)
        : Promise.resolve(null),
    REFRESH_MS,
    place !== null,
    place ? `${place.latitude},${place.longitude}` : ''
  )
  return { place, report: place ? data : null, failed, refresh }
}

export function WeatherItem(): React.JSX.Element {
  const { t } = useTranslation()
  const { place, report, failed, refresh } = useWeather()
  return (
    <HeaderPopover
      label={
        report && place
          ? `${t('headerBar.names.weather')} · ${place.name} · ${degrees(report.current.temperature)}`
          : t('headerBar.names.weather')
      }
      button={
        <>
          <WeatherIcon
            code={report?.current.weatherCode ?? null}
            isDay={report?.current.isDay}
            size={16}
          />
          {report && (
            <span className={styles.chipValue}>{degrees(report.current.temperature)}</span>
          )}
        </>
      }
    >
      {() => <WeatherPanel place={place} report={report} failed={failed} onRetry={refresh} />}
    </HeaderPopover>
  )
}

function WeatherPanel({
  place,
  report,
  failed,
  onRetry
}: {
  place: Place | null
  report: WeatherReport | null
  failed: boolean
  onRetry: () => void
}): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const update = useSettingsStore((state) => state.update)
  const [settings, setSettings] = useState(place === null)
  // Grand bloc : courbe des températures et jours côte à côte
  const blockSize = useBlockSize()
  const blockWidth = blockSize?.width ?? 0
  const wide = blockWidth >= 520
  const setPlace = (next: Place | null): void => {
    void update({ headerBar: { weather: { place: next } } })
    if (next) setSettings(false)
  }

  if (settings || !place) {
    return (
      <div className={styles.weather}>
        <PanelTitle
          title={t('headerBar.names.weather')}
          settings
          onSettings={place ? () => setSettings(false) : undefined}
        />
        {place ? (
          <div className={styles.currentPlace}>
            <span>{placeLabel(place)}</span>
            <button
              type="button"
              className={styles.iconButton}
              title={t('headerBar.weather.removePlace')}
              aria-label={t('headerBar.weather.removePlace')}
              onClick={() => setPlace(null)}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        ) : (
          <p className={styles.muted}>{t('headerBar.weather.choosePlace')}</p>
        )}
        {/* En bloc, pas de focus à l'affichage (la page sauterait jusqu'à lui) : seulement
            après un clic sur les réglages */}
        <PlaceSearch autoFocus={blockSize === null || place !== null} onPick={setPlace} />
        <p className={styles.footnote}>{t('headerBar.weather.source')}</p>
      </div>
    )
  }

  const hourFormat = new Intl.DateTimeFormat(i18n.language, { hour: 'numeric' })
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  const timeFormat = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={styles.weather}>
      <PanelTitle title={place.name} onSettings={() => setSettings(true)} />
      {!report ? (
        failed ? (
          <div className={styles.empty}>
            <p>{t('headerBar.weather.error')}</p>
            <button type="button" className={styles.textButton} onClick={onRetry}>
              {t('headerBar.retry')}
            </button>
          </div>
        ) : (
          <p className={styles.muted}>{t('headerBar.loading')}</p>
        )
      ) : (
        <>
          <div className={styles.weatherNow}>
            <WeatherIcon
              code={report.current.weatherCode}
              isDay={report.current.isDay}
              size={44}
              strokeWidth={1.5}
            />
            <span className={styles.weatherTemperature}>{degrees(report.current.temperature)}</span>
            <span className={styles.weatherDetails}>
              <strong>{t(`headerBar.weather.kinds.${kindOf(report.current.weatherCode)}`)}</strong>
              <span>
                {t('headerBar.weather.feelsLike', {
                  value: Math.round(report.current.apparentTemperature)
                })}
              </span>
              <span>
                {t('headerBar.weather.humidity', { value: report.current.humidity })} ·{' '}
                {t('headerBar.weather.wind', { value: Math.round(report.current.windSpeed) })}
              </span>
            </span>
          </div>
          {wide ? (
            <WeatherChart hours={report.hours} width={blockWidth} format={hourFormat} />
          ) : (
            <ol className={styles.weatherHours}>
              {report.hours
                .filter((_hour, index) => index % 3 === 0)
                .slice(0, 8)
                .map((hour) => {
                  return (
                    <li key={hour.time}>
                      <span>{hourFormat.format(new Date(hour.time))}</span>
                      <WeatherIcon code={hour.weatherCode} isDay={hour.isDay} size={18} />
                      <strong>{degrees(hour.temperature)}</strong>
                    </li>
                  )
                })}
            </ol>
          )}
          <ol className={styles.weatherDays} data-wide={wide}>
            {report.days.map((day, index) => {
              return (
                <li key={day.date} title={t(`headerBar.weather.kinds.${kindOf(day.weatherCode)}`)}>
                  <span className={styles.weatherDay}>
                    {index === 0
                      ? t('headerBar.weather.today')
                      : dayFormat.format(new Date(`${day.date}T12:00:00`))}
                  </span>
                  <WeatherIcon code={day.weatherCode} size={17} />
                  <span className={styles.weatherRain}>
                    {day.precipitationProbability !== null &&
                      day.precipitationProbability >= 10 && (
                        <>
                          <Droplets size={12} aria-hidden />{' '}
                          {formatPercent(day.precipitationProbability, i18n.language)}
                        </>
                      )}
                  </span>
                  <span className={styles.weatherRange}>
                    <span className={styles.muted}>{degrees(day.min)}</span> {degrees(day.max)}
                  </span>
                </li>
              )
            })}
          </ol>
          <p className={styles.footnote}>
            {t('headerBar.weather.updated', { time: timeFormat.format(report.updatedAt) })}
          </p>
        </>
      )}
    </div>
  )
}

/** En bloc sur une page : le panneau du widget, sans le bouton de la barre. */
export function WeatherBlock(): React.JSX.Element {
  const { place, report, failed, refresh } = useWeather()
  return <WeatherPanel place={place} report={report} failed={failed} onRetry={refresh} />
}

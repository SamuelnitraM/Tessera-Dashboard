import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, LoaderCircle, Search, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Place } from '@shared/header-bar'
import styles from './Widgets.module.css'

/**
 * Pièces communes des widgets de la barre des pages : titre de panneau avec réglages,
 * recherche de ville, jauge, interrogation régulière du processus principal.
 */

/** Titre d'un panneau, avec le bouton des réglages du widget (ou le retour). */
export function PanelTitle({
  title,
  settings,
  onSettings,
  children
}: {
  title: ReactNode
  /** Réglages affichés : le bouton devient « Retour ». */
  settings?: boolean
  onSettings?: () => void
  /** Autres boutons (actualiser…). */
  children?: ReactNode
}): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className={styles.panelTitle}>
      <strong>{title}</strong>
      <span className={styles.panelActions}>
        {children}
        {onSettings && (
          <button
            type="button"
            className={styles.iconButton}
            title={settings ? t('headerBar.back') : t('headerBar.settings')}
            aria-label={settings ? t('headerBar.back') : t('headerBar.settings')}
            onClick={onSettings}
          >
            {settings ? <ArrowLeft size={15} aria-hidden /> : <Settings2 size={15} aria-hidden />}
          </button>
        )}
      </span>
    </div>
  )
}

/** Recherche de ville (Open-Meteo), pour la météo et les horloges du monde. */
export function PlaceSearch({
  onPick,
  autoFocus = false
}: {
  onPick: (place: Place) => void
  autoFocus?: boolean
}): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => inputRef.current?.focus())
  }, [autoFocus])

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      window.tessera.headerBar
        .searchPlaces(text, i18n.language)
        .then((places) => {
          if (cancelled) return
          setResults(places)
          setFailed(false)
        })
        .catch(() => !cancelled && setFailed(true))
        .finally(() => !cancelled && setLoading(false))
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, i18n.language])

  const searching = query.trim().length >= 2
  return (
    <div className={styles.placeSearch}>
      <label className={styles.searchInput}>
        {loading ? (
          <LoaderCircle size={14} className={styles.spin} aria-hidden />
        ) : (
          <Search size={14} aria-hidden />
        )}
        <input
          ref={inputRef}
          value={query}
          placeholder={t('headerBar.places.search')}
          aria-label={t('headerBar.places.search')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {searching && failed && <p className={styles.muted}>{t('headerBar.offline')}</p>}
      {searching && !failed && results?.length === 0 && !loading && (
        <p className={styles.muted}>{t('headerBar.places.noResults')}</p>
      )}
      {searching && !failed && results && results.length > 0 && (
        <ul className={styles.placeResults}>
          {results.map((place) => (
            <li key={`${place.latitude},${place.longitude}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(place)
                  setQuery('')
                  setResults(null)
                }}
              >
                <strong>{place.name}</strong>
                <span>{[place.region, place.country].filter(Boolean).join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Jauge horizontale (0 à 100). */
export function Meter({ value }: { value: number }): React.JSX.Element {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <span
      className={styles.meter}
      data-level={clamped >= 90 ? 'high' : clamped >= 70 ? 'mid' : 'low'}
    >
      <span style={{ width: `${clamped}%` }} />
    </span>
  )
}

/**
 * Valeur ou texte court sur le bouton d'un widget de la barre (nombre, titre en cours…), aux
 * couleurs de ceux de Tessera ; `text` : un texte qui se coupe s'il est trop long.
 */
export function HeaderButtonText({
  children,
  text = false
}: {
  children: ReactNode
  text?: boolean
}): React.JSX.Element {
  return <span className={text ? styles.chipText : styles.chipValue}>{children}</span>
}

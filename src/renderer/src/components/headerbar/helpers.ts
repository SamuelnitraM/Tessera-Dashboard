import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Place } from '@shared/header-bar'

/** Fonctions communes des widgets de la barre des pages. */

/** Libellé d'un lieu : « Lyon, Auvergne-Rhône-Alpes, France ». */
export function placeLabel(place: Place): string {
  return [place.name, place.region, place.country].filter(Boolean).join(', ')
}

/**
 * Appelle `load` tout de suite puis toutes les `interval` ms tant que `enabled` ; le dernier
 * résultat est renvoyé (`failed` si le dernier appel a échoué). Les réponses arrivées après
 * un changement sont ignorées.
 */
export function usePolling<T>(
  load: () => Promise<T>,
  interval: number,
  enabled = true,
  /** Recharge tout de suite quand cette clé change (ville choisie…). */
  key = ''
): { data: T | null; failed: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let timer = 0
    const run = (): void => {
      // Fenêtre masquée (zone de notification) : rien à rafraîchir
      if (document.hidden) {
        timer = window.setTimeout(run, interval)
        return
      }
      loadRef
        .current()
        .then((value) => {
          if (cancelled) return
          setData(value)
          setFailed(false)
        })
        .catch(() => !cancelled && setFailed(true))
        .finally(() => {
          if (!cancelled) timer = window.setTimeout(run, interval)
        })
    }
    run()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [enabled, interval, tick, key])

  return { data, failed, refresh: () => setTick((value) => value + 1) }
}

/**
 * Taille du bloc qui affiche un widget de la barre (module Boîte à outils) : `null` dans le
 * panneau de la barre. Un grand bloc en profite (graphiques, semaine…).
 */
export const BlockSizeContext = createContext<{ width: number; height: number } | null>(null)

export const useBlockSize = (): { width: number; height: number } | null =>
  useContext(BlockSizeContext)

/** 1,2 Go ; 850 Mo ; 12 Ko. */
export function formatBytes(bytes: number, language: string): string {
  const units = language === 'en' ? ['B', 'KB', 'MB', 'GB', 'TB'] : ['o', 'Ko', 'Mo', 'Go', 'To']
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value >= 100 || unit === 0 ? 0 : 1
  return `${value.toLocaleString(language, { maximumFractionDigits: digits })} ${units[unit]}`
}

/** Bouton « Copier » qui affiche « Copié » un instant. */
export function useCopied(): [string | null, (key: string, text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(null), 1200)
    return () => window.clearTimeout(timer)
  }, [copied])
  return [
    copied,
    (key, text) => {
      void navigator.clipboard.writeText(text)
      setCopied(key)
    }
  ]
}

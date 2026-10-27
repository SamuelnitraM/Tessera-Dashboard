import { useEffect, useState } from 'react'

/**
 * Garde un élément affiché le temps de son animation de disparition (`--motion-exit`) :
 * `mounted` reste vrai un instant après `open`, avec `closing` vrai pendant cette attente
 * (à mettre sur l'élément : `data-closing`, que son CSS anime). Immédiat si les animations
 * sont réduites dans Windows.
 */
export function usePresence(open: boolean): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open)
  // Ouverture : affiché tout de suite (mise à jour pendant le rendu, sans rendu de plus)
  if (open && !mounted) setMounted(true)

  useEffect(() => {
    if (open || !mounted) return
    const timer = setTimeout(() => setMounted(false), exitDuration())
    return () => clearTimeout(timer)
  }, [open, mounted])

  return { mounted: open || mounted, closing: !open && mounted }
}

/**
 * `usePresence` pour une valeur affichée tant qu'elle n'est pas nulle (menu, petit message…) :
 * la dernière valeur reste rendue (`shown`) pendant sa disparition.
 */
export function useLingering<T>(value: T | null): { shown: T | null; closing: boolean } {
  const { mounted, closing } = usePresence(value !== null)
  const [last, setLast] = useState(value)
  if (value !== null && value !== last) setLast(value)
  return { shown: mounted ? (value ?? last) : null, closing }
}

/** Durée de `--motion-exit` (ms). */
function exitDuration(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--motion-exit')
  return parseFloat(value) || 0
}

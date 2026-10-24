import { useEffect, useMemo, useState } from 'react'
import type { ThemeTokens } from '@shared/module-bridge'
import { getReadableTextColor } from '../lib/appearance'
import { useResolvedAccentColor } from '../stores/settings'

/** Variables CSS de l'interface transmises aux modules tiers (voir styles/global.css). */
const TOKENS = [
  '--color-bg',
  '--color-sidebar',
  '--color-surface',
  '--color-surface-hover',
  '--color-text',
  '--color-text-muted',
  '--color-border',
  '--color-danger',
  '--color-danger-soft',
  '--color-grid-cell',
  '--color-accent',
  '--color-on-accent',
  '--color-accent-hover',
  '--color-accent-soft',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--focus-ring'
]

const darkScheme = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)')

/**
 * Valeurs actuelles des variables du thème, recalculées quand l'accent ou le thème clair /
 * sombre change. Les valeurs qui citent d'autres variables (`color-mix(… var(--color-accent)…)`)
 * restent telles quelles : le module ayant toutes les variables, elles s'y résolvent pareil.
 */
export function useThemeTokens(): ThemeTokens {
  const accent = useResolvedAccentColor()
  const [dark, setDark] = useState(() => darkScheme().matches)

  useEffect(() => {
    const query = darkScheme()
    const update = (): void => setDark(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return useMemo(() => {
    // `dark` ne sert qu'à recalculer : les valeurs sont lues sur la page
    void dark
    const style = getComputedStyle(document.documentElement)
    const tokens = Object.fromEntries(
      TOKENS.map((name) => [name, style.getPropertyValue(name).trim()])
    )
    // L'accent est appliqué à la page juste après ce rendu (App.tsx) : on le prend à la source
    return {
      ...tokens,
      '--color-accent': accent,
      '--color-on-accent': getReadableTextColor(accent)
    }
  }, [accent, dark])
}

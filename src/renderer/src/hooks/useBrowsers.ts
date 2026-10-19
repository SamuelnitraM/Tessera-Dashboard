import { useEffect, useState } from 'react'
import type { InstalledBrowser } from '@shared/browsers'

/** Détection faite une seule fois par lancement, partagée par tous les composants. */
let detection: Promise<InstalledBrowser[]> | null = null

/** Navigateurs installés sur le PC (Brave, Chrome…), pour ouvrir une application web. */
export function useBrowsers(): InstalledBrowser[] {
  const [browsers, setBrowsers] = useState<InstalledBrowser[]>([])
  useEffect(() => {
    let active = true
    detection ??= window.tessera.browsers.list()
    void detection.then((list) => active && setBrowsers(list))
    return () => {
      active = false
    }
  }, [])
  return browsers
}

import { flushSync } from 'react-dom'
import type { SidebarMode } from '@shared/settings'
import { coverDesktopApps } from '../stores/desktopApps'
import { useSettingsStore } from '../stores/settings'

/**
 * Change la disposition de toute l'interface avec une transition animée (View Transitions :
 * l'ancienne et la nouvelle disposition glissent l'une vers l'autre). Les fenêtres des
 * applications installées ne suivraient pas l'animation : elles sont remplacées par leur image
 * le temps de la transition. Immédiat si les animations sont réduites dans Windows.
 */
export async function animateLayout(name: string, change: () => void): Promise<void> {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return change()
  }
  const release = await coverDesktopApps(name)
  try {
    // Nouvelle disposition rendue par React tout de suite : l'affichage est figé pendant la mise
    // à jour (aucune image ne serait dessinée en l'attendant)
    const transition = document.startViewTransition(() => flushSync(change))
    await transition.finished
  } finally {
    release()
  }
}

/** Déplie ou rabat le menu latéral, avec une transition. */
export function setSidebarMode(sidebar: SidebarMode): void {
  const { settings, update } = useSettingsStore.getState()
  if (settings.appearance.sidebar === sidebar) return
  void animateLayout('menu latéral', () => void update({ appearance: { sidebar } }))
}

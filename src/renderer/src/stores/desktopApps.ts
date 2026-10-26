import { useEffect } from 'react'
import { create } from 'zustand'
import {
  DESKTOP_APP_WIDGET,
  type DesktopAppSnapshot,
  type DesktopAppState
} from '@shared/desktop-apps'
import { isDesktopApp } from '@shared/user-apps'
import { useDashboardStore } from './dashboard'
import { useNavigationStore } from './navigation'
import { useSettingsStore } from './settings'

/**
 * Applications installées dont la fenêtre est affichée dans Tessera.
 *
 * Leur fenêtre est une vraie fenêtre Windows, posée au-dessus de l'interface : dès qu'un
 * élément de Tessera doit passer devant (fenêtre de dialogue, menu du clic droit, mode
 * édition), elles sont masquées et remplacées par une image d'elles-mêmes.
 */
interface DesktopAppsState {
  states: Record<string, DesktopAppState>
  /** Images des fenêtres (taille réelle), affichées pendant qu'elles sont masquées. */
  snapshots: Record<string, DesktopAppSnapshot>
  /** Éléments de l'interface ouverts par-dessus les fenêtres (nom pour le journal -> nombre). */
  overlays: Record<string, number>
  suspended: boolean
}

export const useDesktopAppsStore = create<DesktopAppsState>()(() => ({
  states: {},
  snapshots: {},
  overlays: {},
  suspended: false
}))

/** Ce qui passe par-dessus les fenêtres en ce moment (journal). */
const overlayNames = (overlays: Record<string, number>): string =>
  Object.entries(overlays)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => (count > 1 ? `${name} ×${count}` : name))
    .join(', ')

/**
 * Note une ligne dans le journal des applications installées (`logs/applications.log`), pour
 * comprendre un bloc resté gris ou vide.
 */
export function logDesktopApps(message: string): void {
  void window.tessera.desktopApps.log(message)
}

const IDLE: DesktopAppState = { status: 'idle', hostId: null, error: null }

export function useDesktopAppState(appId: string | null | undefined): DesktopAppState {
  return useDesktopAppsStore((state) => (appId ? state.states[appId] : undefined) ?? IDLE)
}

/** Prochaine image affichée (ou 50 ms : une fenêtre recouverte ne dessine plus d'images). */
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
    setTimeout(resolve, 50)
  })

/** Numéro de la dernière demande : une demande plus récente annule la précédente. */
let suspendRequest = 0

async function updateSuspension(): Promise<void> {
  const request = ++suspendRequest
  const { overlays: open, suspended } = useDesktopAppsStore.getState()
  const reasons = overlayNames(open)
  const overlays = reasons ? 1 : 0
  if (overlays > 0 && !suspended) {
    // Image d'abord, puis masquage une fois l'image affichée : pas de clignotement
    const snapshots = await window.tessera.desktopApps.capture()
    if (request !== suspendRequest) return
    useDesktopAppsStore.setState({ snapshots, suspended: true })
    await nextFrame()
    await nextFrame()
    if (request !== suspendRequest) return
    await window.tessera.desktopApps.setSuspended(true, reasons)
  } else if (overlays === 0 && suspended) {
    useDesktopAppsStore.setState({ suspended: false })
    await window.tessera.desktopApps.setSuspended(false)
    if (request === suspendRequest) useDesktopAppsStore.setState({ snapshots: {} })
  }
}

function changeOverlays(name: string, delta: 1 | -1): void {
  useDesktopAppsStore.setState((state) => ({
    overlays: { ...state.overlays, [name]: Math.max(0, (state.overlays[name] ?? 0) + delta) }
  }))
  void updateSuspension()
}

/**
 * Masque les fenêtres d'applications tant que `active` est vrai (dialogue ouvert…). `name` dit
 * ce qui passe par-dessus, dans le journal.
 */
export function useCoverDesktopApps(active: boolean, name: string): void {
  useEffect(() => {
    if (!active) return
    changeOverlays(name, 1)
    return () => changeOverlays(name, -1)
  }, [active, name])
}

/** Applications installées affichées quelque part : dans un bloc (toutes pages) ou un onglet. */
function usedApps(): Set<string> {
  const desktopIds = new Set(
    useSettingsStore
      .getState()
      .settings.apps.items.filter(isDesktopApp)
      .map((app) => app.id)
  )
  const used = new Set<string>()
  for (const page of useDashboardStore.getState().dashboard.pages) {
    for (const widget of page.widgets) {
      if (widget.type !== DESKTOP_APP_WIDGET) continue
      const { appId, parked } = widget.config
      if (typeof appId === 'string') used.add(appId)
      // Navigateurs mis de côté par le bloc (changement de navigateur) : ouverts, cachés
      if (Array.isArray(parked)) {
        for (const id of parked) if (typeof id === 'string') used.add(id)
      }
    }
    // Autres blocs qui affichent une application installée (fenêtre d'un jeu dans le bloc Jeux)
    for (const widget of page.widgets) {
      if (typeof widget.config.embeddedAppId === 'string') used.add(widget.config.embeddedAppId)
    }
  }
  for (const appId of useNavigationStore.getState().openedApps) used.add(appId)
  return new Set([...used].filter((appId) => desktopIds.has(appId)))
}

/**
 * Suit les états envoyés par le processus principal, et ferme une application qui n'est plus
 * affichée nulle part (bloc retiré, onglet fermé, application supprimée). Une application
 * marquée `release: 'desktop'` (jeu) est rendue au bureau au lieu d'être fermée.
 */
export async function initDesktopAppsStore(): Promise<void> {
  useDesktopAppsStore.setState({ states: await window.tessera.desktopApps.getStates() })
  window.tessera.desktopApps.onChange((appId, state) =>
    useDesktopAppsStore.setState((current) => ({ states: { ...current.states, [appId]: state } }))
  )

  let used = usedApps()
  const check = (): void => {
    const next = usedApps()
    const items = useSettingsStore.getState().settings.apps.items
    for (const appId of used) {
      if (next.has(appId)) continue
      const app = items.find((item) => item.id === appId)
      if (app && isDesktopApp(app) && app.release === 'desktop') {
        void window.tessera.desktopApps.takeOut(appId)
      } else {
        void window.tessera.desktopApps.close(appId)
      }
    }
    used = next
  }
  useDashboardStore.subscribe(check)
  useNavigationStore.subscribe(check)
  useSettingsStore.subscribe(check)
}

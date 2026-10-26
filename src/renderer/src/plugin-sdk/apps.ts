import { useEffect, useMemo, useState } from 'react'
import type { BrowserChoice } from '@shared/browsers'
import { DESKTOP_APP_WIDGET } from '@shared/desktop-apps'
import { isDesktopApp, isWebApp } from '@shared/user-apps'
import { focusBlock } from '../stores/activeBlock'
import { useDashboardStore } from '../stores/dashboard'
import { useNavigationStore } from '../stores/navigation'
import { useSettingsStore } from '../stores/settings'

/** Application web de l'utilisateur (Paramètres → Applications). */
export interface UserWebApp {
  id: string
  name: string
  url: string
  icon: string | null
}

/** Application installée de l'utilisateur (Paramètres → Applications). */
export interface UserInstalledApp {
  id: string
  name: string
  icon: string | null
}

/** Applications web de l'utilisateur, pour proposer d'en afficher une dans un widget. */
export function useWebApps(): readonly UserWebApp[] {
  const items = useSettingsStore((state) => state.settings.apps.items)
  return useMemo(() => items.filter(isWebApp), [items])
}

/** Applications installées de l'utilisateur, pour proposer d'en afficher une dans un widget. */
export function useInstalledApps(): readonly UserInstalledApp[] {
  const items = useSettingsStore((state) => state.settings.apps.items)
  return useMemo(() => items.filter(isDesktopApp), [items])
}

/** Sort la fenêtre de l'application de Tessera : elle retrouve sa place sur le bureau. */
export function takeOutInstalledApp(appId: string): Promise<void> {
  return window.tessera.desktopApps.takeOut(appId)
}

/**
 * Rafraîchit la fenêtre de l'application dans son bloc (bloc gris ou vide) : elle est remise
 * en place et forcée à se redessiner.
 */
export function refreshInstalledApp(appId: string): Promise<void> {
  return window.tessera.desktopApps.refresh(appId)
}

export type { BrowserChoice }

/**
 * Navigateurs installés sur le PC, avec l'application installée de Tessera qui affiche chacun
 * (`appId`, `null` s'il n'est pas encore ajouté) : pour passer d'un navigateur à l'autre.
 */
export function useBrowserChoices(): readonly BrowserChoice[] {
  const items = useSettingsStore((state) => state.settings.apps.items)
  const [choices, setChoices] = useState<BrowserChoice[]>([])
  useEffect(() => {
    let cancelled = false
    void window.tessera.browsers.choices().then((list) => !cancelled && setChoices(list))
    return () => {
      cancelled = true
    }
  }, [items])
  return choices
}

/** Application installée qui affiche ce navigateur (ajoutée à Tessera au besoin). */
export function installedAppForBrowser(browserId: string): Promise<string | null> {
  return window.tessera.browsers.appFor(browserId)
}

/**
 * Ouvre une page web (http ou https) dans le navigateur affiché par un bloc de Tessera, et
 * montre ce bloc ; sans navigateur dans Tessera, dans le navigateur par défaut du PC.
 */
export async function openWebPage(url: string): Promise<void> {
  const appId = await window.tessera.browsers.openPage(url)
  if (appId) revealInstalledApp(appId)
}

/**
 * Montre l'application installée : sa page s'ouvre et son bloc prend le focus (de préférence
 * sur la page affichée). Navigateur mis de côté dans un bloc : le bloc repasse sur lui. Sinon,
 * son onglet. Renvoie `false` si elle n'est affichée nulle part.
 */
export function revealInstalledApp(appId: string): boolean {
  const { view, navigate, openedApps } = useNavigationStore.getState()
  const pages = [...useDashboardStore.getState().dashboard.pages].sort(
    (a, b) =>
      Number(view.type === 'page' && b.id === view.pageId) -
      Number(view.type === 'page' && a.id === view.pageId)
  )
  for (const page of pages) {
    const block = page.widgets.find(
      (widget) => widget.type === DESKTOP_APP_WIDGET && widget.config.appId === appId
    )
    if (block) {
      navigate({ type: 'page', pageId: page.id })
      focusBlock(block.id)
      return true
    }
  }
  // Navigateur mis de côté dans un bloc (changement de navigateur) : le bloc repasse sur lui
  for (const page of pages) {
    const block = page.widgets.find(
      (widget) =>
        widget.type === DESKTOP_APP_WIDGET &&
        Array.isArray(widget.config.parked) &&
        widget.config.parked.includes(appId)
    )
    if (!block) continue
    const current = typeof block.config.appId === 'string' ? [block.config.appId] : []
    const parked = (block.config.parked as unknown[]).filter((id) => id !== appId)
    useDashboardStore.getState().updateWidgetConfig(page.id, block.id, {
      appId,
      offset: { x: 0, y: 0 },
      parked: [...parked, ...current]
    })
    navigate({ type: 'page', pageId: page.id })
    focusBlock(block.id)
    return true
  }
  if (openedApps.includes(appId)) {
    navigate({ type: 'app', appId })
    return true
  }
  return false
}

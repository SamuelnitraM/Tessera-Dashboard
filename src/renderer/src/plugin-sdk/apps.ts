import { useMemo } from 'react'
import { isDesktopApp, isWebApp } from '@shared/user-apps'
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

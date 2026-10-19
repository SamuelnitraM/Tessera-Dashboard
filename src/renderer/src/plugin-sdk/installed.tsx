import { useContext } from 'react'
import { isDesktopApp } from '@shared/user-apps'
import { DesktopAppHost } from '../components/desktop/DesktopAppHost'
import { useSettingsStore } from '../stores/settings'
import { PluginContext } from './context'

export interface InstalledAppViewProps {
  /** Application installée à afficher (voir `useInstalledApps`). */
  appId: string
  /** Identifiant unique de l'emplacement, en général l'`instanceId` du widget. */
  hostId: string
}

/**
 * Fenêtre d'une application installée (Discord, Obsidian…), affichée à cet emplacement.
 * L'application est lancée si besoin ; fermée par l'utilisateur, elle propose de la rouvrir.
 * Nécessite `"permissions": ["apps"]`.
 */
export function InstalledAppView({ appId, hostId }: InstalledAppViewProps): React.JSX.Element {
  const plugin = useContext(PluginContext)
  const app = useSettingsStore((state) =>
    state.settings.apps.items.find((item) => item.id === appId)
  )
  if (!plugin?.permissions.includes('apps')) {
    return <p role="alert">Permission « apps » manquante dans le manifeste de l’extension.</p>
  }
  if (!app || !isDesktopApp(app)) return <></>
  return <DesktopAppHost app={app} hostId={`${plugin.id}:${hostId}`} active />
}

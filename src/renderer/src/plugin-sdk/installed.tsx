import { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { isPrivateAppId, privateApp, publicAppId } from '@shared/browsers'
import type { FullScreenMode } from '@shared/desktop-apps'
import { isDesktopApp } from '@shared/user-apps'
import { DesktopAppHost, type PanOffset } from '../components/desktop/DesktopAppHost'
import { useSettingsStore } from '../stores/settings'
import { PluginContext } from './context'

export type { PanOffset }

export interface InstalledAppViewProps {
  /**
   * Application installée à afficher (voir `useInstalledApps`), ou navigation privée d'un
   * navigateur (voir `usePrivateWindow`).
   */
  appId: string
  /** Identifiant unique de l'emplacement, en général l'`instanceId` du widget. */
  hostId: string
  /**
   * Fenêtre plus grande que l'emplacement (taille minimale de l'application) : partie
   * affichée, en px depuis son coin haut gauche.
   */
  offset?: PanOffset
  /** Partie affichée choisie par l'utilisateur en glissant (à enregistrer dans `config`). */
  onOffsetChange?: (offset: PanOffset) => void
  /** Élément à glisser pour choisir la partie affichée (ex. la barre du widget). */
  panHandle?: React.RefObject<HTMLElement | null>
  /** Plein écran de l'application (vidéo d'un navigateur…) : tout l'écran, ou le bloc. */
  fullScreen?: FullScreenMode
}

/**
 * Fenêtre d'une application installée (Discord, Obsidian…), affichée à cet emplacement.
 * L'application est lancée si besoin ; fermée par l'utilisateur, elle propose de la rouvrir.
 * Nécessite `"permissions": ["apps"]`.
 */
export function InstalledAppView({
  appId,
  hostId,
  ...pan
}: InstalledAppViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const plugin = useContext(PluginContext)
  const found = useSettingsStore((state) =>
    state.settings.apps.items.find((item) => item.id === publicAppId(appId))
  )
  // Navigation privée : fenêtre privée du même navigateur, sous son propre identifiant
  const app = useMemo(() => {
    if (!found || !isDesktopApp(found) || !isPrivateAppId(appId)) return found
    const shown = privateApp(found)
    return shown && { ...shown, name: t('desktopApps.privateName', { name: found.name }) }
  }, [found, appId, t])
  if (!plugin?.permissions.includes('apps')) {
    return <p role="alert">Permission « apps » manquante dans le manifeste de l’extension.</p>
  }
  if (!app || !isDesktopApp(app)) return <></>
  return <DesktopAppHost app={app} hostId={`${plugin.id}:${hostId}`} active {...pan} />
}

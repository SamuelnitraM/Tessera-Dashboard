import type {
  ModuleInstalledApp,
  ModuleMailSnapshot,
  ModuleMediaSnapshot
} from '@shared/module-bridge'
import { isDesktopApp } from '@shared/user-apps'
import { useMailStore } from '../stores/mail'
import { useMediaStatusStore } from '../stores/mediaStatus'
import { useSettingsStore } from '../stores/settings'

/**
 * Données de l'interface transmises aux modules tiers (comptes, applications…), et leur suivi.
 * Les modules n'en reçoivent qu'une copie réduite : jamais de serveur, d'identifiant de
 * connexion ou de chemin de programme.
 */

export function mailSnapshot(): ModuleMailSnapshot {
  const accounts = useSettingsStore.getState().settings.mail.accounts
  return {
    accounts: accounts.map(({ id, provider, name, address }) => ({ id, provider, name, address })),
    states: useMailStore.getState().states
  }
}

export function mediaSnapshot(): ModuleMediaSnapshot {
  const { status, live } = useMediaStatusStore.getState()
  const accounts = useSettingsStore.getState().settings.media.youtubeAccounts
  return {
    status,
    youtubeAccounts: accounts.map((account) => ({
      ...account,
      error: status.youtube.errors[account.id] ?? null
    })),
    live
  }
}

export function installedApps(): ModuleInstalledApp[] {
  return useSettingsStore
    .getState()
    .settings.apps.items.filter(isDesktopApp)
    .map(({ id, name, icon }) => ({ id, name, icon }))
}

export interface DataListeners {
  /** `fresh` : compte qui vient de recevoir des mails (`null` : autre changement). */
  mail: (snapshot: ModuleMailSnapshot, fresh: string | null) => void
  media: (snapshot: ModuleMediaSnapshot) => void
  apps: (apps: ModuleInstalledApp[]) => void
}

/** Prévient à chaque changement de ces données. Renvoie la fonction de désabonnement. */
export function watchData(listeners: DataListeners): () => void {
  const stops = [
    useSettingsStore.subscribe((state, previous) => {
      const now = state.settings
      const before = previous.settings
      if (now.mail.accounts !== before.mail.accounts) listeners.mail(mailSnapshot(), null)
      if (now.media.youtubeAccounts !== before.media.youtubeAccounts) {
        listeners.media(mediaSnapshot())
      }
      if (now.apps.items !== before.apps.items) listeners.apps(installedApps())
    }),
    useMailStore.subscribe((state, previous) => {
      if (state.states === previous.states && state.arrivals === previous.arrivals) return
      const fresh =
        Object.keys(state.arrivals).find((id) => state.arrivals[id] !== previous.arrivals[id]) ??
        null
      listeners.mail(mailSnapshot(), fresh)
    }),
    useMediaStatusStore.subscribe((state, previous) => {
      if (state.status !== previous.status || state.live !== previous.live) {
        listeners.media(mediaSnapshot())
      }
    })
  ]
  return () => {
    for (const stop of stops) stop()
  }
}

/**
 * Notification d'un module cliquée : ce qu'elle désigne est remis au premier bloc du module
 * qui le demande (comme `useNotificationTarget` des extensions intégrées).
 */
export function takeNotificationTarget(pluginId: string): string | null {
  const request = useMediaStatusStore.getState().target
  if (!request || request.pluginId !== pluginId) return null
  useMediaStatusStore.setState({ target: null })
  return request.target
}

export function watchNotificationTargets(listener: () => void): () => void {
  return useMediaStatusStore.subscribe((state, previous) => {
    if (state.target && state.target !== previous.target) listener()
  })
}

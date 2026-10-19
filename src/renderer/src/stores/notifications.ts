import { create } from 'zustand'
import type { TesseraNotification } from '@shared/notifications'
import { playSound } from '../lib/sounds'
import { useDashboardStore } from './dashboard'
import { useNavigationStore } from './navigation'
import { useSettingsStore } from './settings'

/** Centre de notifications : historique (tenu par le processus principal) et panneau ouvert. */
interface NotificationsState {
  notifications: TesseraNotification[]
  open: boolean
  setOpen: (open: boolean) => void
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  notifications: [],
  open: false,
  setOpen: (open) => set({ open })
}))

export function useUnreadCount(): number {
  return useNotificationsStore(
    (state) => state.notifications.filter((notification) => !notification.read).length
  )
}

/**
 * Va vers ce qui a envoyé la notification : l'onglet de l'application web, ou la page qui
 * contient un bloc du widget.
 */
export function openNotificationSource(notification: TesseraNotification): void {
  const { navigate } = useNavigationStore.getState()
  const [kind, id] = notification.source.split(/:(.*)/s)
  if (
    kind === 'app' &&
    useSettingsStore.getState().settings.apps.items.some((app) => app.id === id)
  ) {
    navigate({ type: 'app', appId: id })
  } else if (kind === 'plugin') {
    const page = useDashboardStore
      .getState()
      .dashboard.pages.find((candidate) =>
        candidate.widgets.some((widget) => widget.type.startsWith(`${id}/`))
      )
    if (page) navigate({ type: 'page', pageId: page.id })
  }
}

export async function initNotificationsStore(): Promise<void> {
  useNotificationsStore.setState({ notifications: await window.tessera.notifications.list() })
  window.tessera.notifications.onChange((notifications) =>
    useNotificationsStore.setState({ notifications })
  )
  window.tessera.notifications.onPlay((sound, volume) => void playSound(sound, volume))
  // Clic sur une bannière Windows
  window.tessera.notifications.onActivated((notification) => {
    useNotificationsStore.setState({ open: false })
    openNotificationSource(notification)
  })
}

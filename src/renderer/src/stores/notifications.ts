import { create } from 'zustand'
import type { TesseraNotification } from '@shared/notifications'
import { playSound } from '../lib/sounds'
import { useDashboardStore } from './dashboard'
import { MAIL_WIDGET_TYPE, useMailStore } from './mail'
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
 * Va vers ce qui a envoyé la notification : l'onglet de l'application web, la page qui
 * contient un bloc du widget, ou le mail (bloc Mails du compte).
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
  } else if (kind === 'mail') {
    // Page d'un bloc Mails du compte (sinon d'un autre bloc Mails), puis le mail lui-même
    const pages = useDashboardStore.getState().dashboard.pages
    const isMail = (type: string): boolean => type === MAIL_WIDGET_TYPE
    const page =
      pages.find((candidate) =>
        candidate.widgets.some((widget) => isMail(widget.type) && widget.config.accountId === id)
      ) ?? pages.find((candidate) => candidate.widgets.some((widget) => isMail(widget.type)))
    if (page) navigate({ type: 'page', pageId: page.id })
    if (notification.target) useMailStore.getState().requestOpen(id, notification.target)
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

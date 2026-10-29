import i18n from 'i18next'
import { create } from 'zustand'
import { MAIN_PAGE_ID, type WidgetInstance } from '@shared/dashboard'
import { isBrowserProcess } from '@shared/browsers'
import { BROWSER_WIDGET, DESKTOP_APP_WIDGET, isInstalledAppBlock } from '@shared/desktop-apps'
import type { TesseraNotification } from '@shared/notifications'
import { localize, widgetKey } from '@shared/plugins'
import type { Language } from '@shared/settings'
import { playSound } from '../lib/sounds'
import { getPlugins, WEB_APP_WIDGET } from '../plugins/registry'
import { focusBlock } from './activeBlock'
import { useDashboardStore } from './dashboard'
import { MAIL_WIDGET_TYPE, useMailStore } from './mail'
import { useMediaStatusStore } from './mediaStatus'
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
 * Bloc proposé quand la source d'une notification n'a de bloc sur aucune page (notification
 * Twitch sans bloc Twitch…) : l'utilisateur peut l'ajouter sur la page affichée.
 */
export interface BlockProposal {
  /** Nom de la source (Twitch, Discord…). */
  name: string
  /** Widget à ajouter et sa configuration. */
  type: string
  config: Record<string, unknown>
  /** Après l'ajout (ouvrir le mail, la chaîne…). */
  onAdded?: () => void
  /** Application : l'ouvrir plutôt dans un onglet. */
  openTab?: () => void
}

export const useBlockProposalStore = create<{ proposal: BlockProposal | null }>()(() => ({
  proposal: null
}))

/** Ajoute le bloc proposé sur la page affichée (sinon la page d'accueil) et lui donne le focus. */
export function addProposedBlock(proposal: BlockProposal): void {
  useBlockProposalStore.setState({ proposal: null })
  const { view, navigate } = useNavigationStore.getState()
  const pageId = view.type === 'page' ? view.pageId : MAIN_PAGE_ID
  const blockId = useDashboardStore.getState().addWidget(pageId, proposal.type, proposal.config)
  if (!blockId) return
  navigate({ type: 'page', pageId })
  focusBlock(blockId)
  proposal.onAdded?.()
}

/**
 * Bloc correspondant, de préférence sur la page affichée, sinon sur la première page qui en a
 * un. `preferred` départage plusieurs blocs (ex. le bloc Mails du bon compte).
 */
function findBlock(
  matches: (widget: WidgetInstance) => boolean,
  preferred: (widget: WidgetInstance) => boolean = () => true
): { pageId: string; blockId: string } | null {
  const { view } = useNavigationStore.getState()
  const pages = [...useDashboardStore.getState().dashboard.pages].sort(
    (a, b) =>
      Number(view.type === 'page' && b.id === view.pageId) -
      Number(view.type === 'page' && a.id === view.pageId)
  )
  for (const filter of [
    (widget: WidgetInstance) => matches(widget) && preferred(widget),
    matches
  ]) {
    for (const page of pages) {
      const widget = page.widgets.find(filter)
      if (widget) return { pageId: page.id, blockId: widget.id }
    }
  }
  return null
}

/** Ouvre la page du bloc et lui donne le focus. */
function goToBlock(block: { pageId: string; blockId: string }): void {
  useNavigationStore.getState().navigate({ type: 'page', pageId: block.pageId })
  focusBlock(block.blockId)
}

const language = (): Language => (i18n.language === 'en' ? 'en' : 'fr')

/**
 * Clic sur une notification : va vers le bloc qui l'a envoyée (sa page s'ouvre, sa barre se
 * colore) et lui fait ouvrir ce qu'elle désigne (mail, chaîne…). Sans bloc sur aucune page,
 * propose d'en ajouter un (une application déjà ouverte en onglet s'ouvre dans son onglet).
 */
export function openNotificationSource(notification: TesseraNotification): void {
  const { navigate, openedApps } = useNavigationStore.getState()
  const [kind, id] = notification.source.split(/:(.*)/s)

  if (kind === 'app') {
    const app = useSettingsStore.getState().settings.apps.items.find((item) => item.id === id)
    if (!app) return
    const type =
      app.kind === 'web'
        ? WEB_APP_WIDGET
        : isBrowserProcess(app.processName)
          ? BROWSER_WIDGET
          : DESKTOP_APP_WIDGET
    const block = findBlock(
      (widget) =>
        (app.kind === 'web' ? widget.type === type : isInstalledAppBlock(widget.type)) &&
        widget.config.appId === id
    )
    const openTab = (): void => navigate({ type: 'app', appId: id })
    if (block) goToBlock(block)
    else if (openedApps.includes(id)) openTab()
    else {
      useBlockProposalStore.setState({
        proposal: { name: app.name, type, config: { appId: id }, openTab }
      })
    }
    return
  }

  if (kind === 'plugin') {
    // Ce que la notification désigne (chaîne d'un direct…) : l'extension l'ouvre
    const openTarget = (): void => {
      if (notification.target) {
        useMediaStatusStore.setState({ target: { pluginId: id, target: notification.target } })
      }
    }
    const block = findBlock((widget) => widget.type.startsWith(`${id}/`))
    if (block) {
      goToBlock(block)
      openTarget()
      return
    }
    const plugin = getPlugins().find((candidate) => candidate.id === id)
    const widget = plugin?.manifest?.widgets[0]
    const disabled = useSettingsStore.getState().settings.plugins.disabled.includes(id)
    if (!plugin?.manifest || !widget || disabled || plugin.error) return
    useBlockProposalStore.setState({
      proposal: {
        name: localize(plugin.manifest.name, language()),
        type: widgetKey(id, widget.type),
        config: {},
        onAdded: openTarget
      }
    })
    return
  }

  if (kind === 'mail') {
    // Bloc Mails du compte (sinon un autre bloc Mails), puis le mail lui-même
    const openMail = (): void => {
      if (notification.target) useMailStore.getState().requestOpen(id, notification.target)
    }
    const block = findBlock(
      (widget) => widget.type === MAIL_WIDGET_TYPE,
      (widget) => widget.config.accountId === id
    )
    if (block) {
      goToBlock(block)
      openMail()
      return
    }
    const mail = getPlugins().find((candidate) => candidate.id === MAIL_WIDGET_TYPE.split('/')[0])
    useBlockProposalStore.setState({
      proposal: {
        name: mail?.manifest ? localize(mail.manifest.name, language()) : 'Mails',
        type: MAIL_WIDGET_TYPE,
        config: { accountId: id },
        onAdded: openMail
      }
    })
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

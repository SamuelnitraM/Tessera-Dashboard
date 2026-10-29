import { useEffect } from 'react'
import { isInstalledAppBlock } from '@shared/desktop-apps'
import { AppDialogs } from './components/AppDialogs'
import { ProgramPickerHost } from './components/desktop/ProgramPicker'
import { releaseLeftoverDoNotDisturb } from './components/headerbar/focusDoNotDisturb'
import { MediaLayer } from './components/media/MediaLayer'
import { BlockProposalDialog } from './components/notifications/BlockProposalDialog'
import { NotificationCenter } from './components/notifications/NotificationCenter'
import { PageDialogs } from './components/PageDialogs'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { ContextMenuHost } from './components/ui/ContextMenuHost'
import { changeLanguage } from './i18n'
import { applyAccentColor } from './lib/appearance'
import { setSidebarMode } from './lib/layoutTransition'
import { revealInstalledApp } from './plugin-sdk/apps'
import { focusBlock } from './stores/activeBlock'
import { useDashboardStore } from './stores/dashboard'
import { useNavigationStore } from './stores/navigation'
import { useResolvedAccentColor, useResolvedLanguage, useSettingsStore } from './stores/settings'
import { watchTerminalSessions } from './stores/terminalSessions'
import { AppTabs } from './views/apps/AppTabs'
import { PageView } from './views/page/PageView'
import { SettingsView } from './views/settings/SettingsView'
import styles from './App.module.css'

export function App(): React.JSX.Element {
  const view = useNavigationStore((state) => state.view)
  const sidebar = useSettingsStore((state) => state.settings.appearance.sidebar)
  const accentColor = useResolvedAccentColor()
  const language = useResolvedLanguage()

  // Répercute en direct les changements de couleur et de langue
  useEffect(() => applyAccentColor(accentColor), [accentColor])
  useEffect(() => void changeLanguage(language), [language])

  // Ne pas déranger laissé par une séance de concentration interrompue (Tessera quitté)
  useEffect(() => releaseLeftoverDoNotDisturb(), [])
  // Bloc Terminal retiré : ses sessions sont fermées
  useEffect(() => watchTerminalSessions(), [])

  // Ctrl+B : rabattre / déplier le menu latéral (sauf dans un champ : Ctrl+B y met en gras)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey || event.key.toLowerCase() !== 'b' || event.altKey || event.shiftKey)
        return
      if ((event.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) return
      event.preventDefault()
      setSidebarMode(sidebar === 'collapsed' ? 'expanded' : 'collapsed')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sidebar])

  // Une application installée demande à s'afficher (clic sur sa notification, son icône…) :
  // on va vers son onglet s'il est ouvert, sinon vers son bloc (navigateur mis de côté
  // compris), ou le bloc Jeux qui affiche sa fenêtre ; à défaut, vers un nouvel onglet
  useEffect(
    () =>
      window.tessera.desktopApps.onReveal((appId) => {
        const { view, openedApps, navigate } = useNavigationStore.getState()
        const pages = useDashboardStore.getState().dashboard.pages
        const showsApp = (pageId: string): boolean =>
          !!pages
            .find((page) => page.id === pageId)
            ?.widgets.some(
              (widget) =>
                (isInstalledAppBlock(widget.type) && widget.config.appId === appId) ||
                widget.config.embeddedAppId === appId
            )
        if (view.type === 'app' && view.appId === appId) return
        if (view.type === 'page' && showsApp(view.pageId)) return
        if (openedApps.includes(appId)) return navigate({ type: 'app', appId })
        if (revealInstalledApp(appId)) return
        const page = pages.find((p) => showsApp(p.id))
        const block = page?.widgets.find((widget) => widget.config.embeddedAppId === appId)
        if (!page || !block) return navigate({ type: 'app', appId })
        navigate({ type: 'page', pageId: page.id })
        focusBlock(block.id)
      }),
    []
  )

  return (
    <div className={styles.shell} data-sidebar={sidebar}>
      {sidebar === 'collapsed' ? <TopBar /> : <Sidebar />}
      <main className={styles.content}>
        {view.type === 'settings' && <SettingsView section={view.section} />}
        {view.type === 'page' && <PageView pageId={view.pageId} />}
        {/* Onglets d'applications : toujours montés, pour rester chargés en arrière-plan */}
        <AppTabs />
      </main>
      <PageDialogs />
      <AppDialogs />
      <ContextMenuHost />
      <ProgramPickerHost />
      <MediaLayer />
      <NotificationCenter />
      <BlockProposalDialog />
    </div>
  )
}

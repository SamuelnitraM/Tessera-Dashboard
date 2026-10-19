import { useEffect } from 'react'
import { DESKTOP_APP_WIDGET } from '@shared/desktop-apps'
import { ProgramPickerHost } from './components/desktop/ProgramPicker'
import { PageDialogs } from './components/PageDialogs'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { ContextMenuHost } from './components/ui/ContextMenuHost'
import { changeLanguage } from './i18n'
import { applyAccentColor } from './lib/appearance'
import { useDashboardStore } from './stores/dashboard'
import { useNavigationStore } from './stores/navigation'
import { useResolvedAccentColor, useResolvedLanguage, useSettingsStore } from './stores/settings'
import { AppTabs } from './views/apps/AppTabs'
import { PageView } from './views/page/PageView'
import { SettingsView } from './views/settings/SettingsView'
import styles from './App.module.css'

export function App(): React.JSX.Element {
  const view = useNavigationStore((state) => state.view)
  const sidebar = useSettingsStore((state) => state.settings.appearance.sidebar)
  const updateSettings = useSettingsStore((state) => state.update)
  const accentColor = useResolvedAccentColor()
  const language = useResolvedLanguage()

  // Répercute en direct les changements de couleur et de langue
  useEffect(() => applyAccentColor(accentColor), [accentColor])
  useEffect(() => void changeLanguage(language), [language])

  // Ctrl+B : rabattre / déplier le menu latéral (sauf dans un champ : Ctrl+B y met en gras)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey || event.key.toLowerCase() !== 'b' || event.altKey || event.shiftKey)
        return
      if ((event.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) return
      event.preventDefault()
      void updateSettings({
        appearance: { sidebar: sidebar === 'collapsed' ? 'expanded' : 'collapsed' }
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sidebar, updateSettings])

  // Une application installée demande à s'afficher (clic sur sa notification, son icône…) :
  // on va vers son bloc, ou à défaut vers son onglet
  useEffect(
    () =>
      window.tessera.desktopApps.onReveal((appId) => {
        const { view, openedApps, navigate } = useNavigationStore.getState()
        const pages = useDashboardStore.getState().dashboard.pages
        const showsApp = (pageId: string): boolean =>
          !!pages
            .find((page) => page.id === pageId)
            ?.widgets.some(
              (widget) => widget.type === DESKTOP_APP_WIDGET && widget.config.appId === appId
            )
        if (view.type === 'app' && view.appId === appId) return
        if (view.type === 'page' && showsApp(view.pageId)) return
        const page = openedApps.includes(appId) ? undefined : pages.find((p) => showsApp(p.id))
        navigate(page ? { type: 'page', pageId: page.id } : { type: 'app', appId })
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
      <ContextMenuHost />
      <ProgramPickerHost />
    </div>
  )
}

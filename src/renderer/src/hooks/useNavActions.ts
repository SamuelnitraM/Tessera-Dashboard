import { useCallback } from 'react'
import { ExternalLink, FolderOpen, Pencil, SquarePen, Settings, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DashboardPage } from '@shared/dashboard'
import { OPEN_IN_TESSERA, type WebApp } from '@shared/web-apps'
import type { MenuItem } from '../stores/contextMenu'
import { useNavigationStore } from '../stores/navigation'
import { usePageDialogsStore } from '../stores/pageDialogs'
import { useBrowsers } from './useBrowsers'

/**
 * Actions du menu latéral (et des onglets du menu rabattu) : ouvrir une page ou une
 * application, et menus du clic droit correspondants.
 */
export function useNavActions(): {
  openApp: (app: WebApp) => void
  pageMenu: (page: DashboardPage) => MenuItem[]
  appMenu: (app: WebApp) => MenuItem[]
} {
  const { t } = useTranslation()
  const browsers = useBrowsers()
  const navigate = useNavigationStore((state) => state.navigate)
  const setEditing = useNavigationStore((state) => state.setEditing)
  const closeApp = useNavigationStore((state) => state.closeApp)
  const openedApps = useNavigationStore((state) => state.openedApps)
  const { openRename, openDelete } = usePageDialogsStore()

  /** Onglet de Tessera, ou fenêtre du navigateur choisi pour cette application. */
  const openApp = useCallback(
    (app: WebApp) => {
      const browser = browsers.find((candidate) => candidate.id === app.openWith)
      if (app.openWith !== OPEN_IN_TESSERA && browser) {
        void window.tessera.browsers.open(browser.id, app.url)
      } else {
        navigate({ type: 'app', appId: app.id })
      }
    },
    [browsers, navigate]
  )

  const pageMenu = (page: DashboardPage): MenuItem[] => [
    {
      label: t('nav.pageMenu.open'),
      icon: FolderOpen,
      onSelect: () => navigate({ type: 'page', pageId: page.id })
    },
    {
      label: t('nav.pageMenu.edit'),
      icon: SquarePen,
      onSelect: () => {
        navigate({ type: 'page', pageId: page.id })
        setEditing(true)
      }
    },
    { label: t('nav.pageMenu.rename'), icon: Pencil, onSelect: () => openRename(page.id) },
    'separator',
    {
      label: t('nav.pageMenu.delete'),
      icon: Trash2,
      danger: true,
      // La page principale ne peut pas être supprimée
      disabled: page.isMain,
      onSelect: () => openDelete(page.id)
    }
  ]

  const appMenu = (app: WebApp): MenuItem[] => [
    {
      label: t('nav.appMenu.open'),
      icon: FolderOpen,
      onSelect: () => navigate({ type: 'app', appId: app.id })
    },
    ...browsers.map((browser) => ({
      label: t('nav.appMenu.openIn', { browser: browser.name }),
      icon: ExternalLink,
      onSelect: () => void window.tessera.browsers.open(browser.id, app.url)
    })),
    'separator',
    {
      label: t('nav.appMenu.closeTab'),
      icon: X,
      disabled: !openedApps.includes(app.id),
      onSelect: () => closeApp(app.id)
    },
    {
      label: t('nav.appMenu.settings'),
      icon: Settings,
      onSelect: () => navigate({ type: 'settings', section: 'applications' })
    }
  ]

  return { openApp, pageMenu, appMenu }
}

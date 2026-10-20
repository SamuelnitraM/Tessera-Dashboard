import { useCallback } from 'react'
import {
  ExternalLink,
  FolderOpen,
  LogOut,
  Pencil,
  SquarePen,
  Settings,
  Trash2,
  X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DashboardPage } from '@shared/dashboard'
import type { UserApp } from '@shared/user-apps'
import { OPEN_IN_TESSERA } from '@shared/web-apps'
import { useAppDialogsStore } from '../stores/appDialogs'
import type { MenuItem } from '../stores/contextMenu'
import { useDesktopAppsStore } from '../stores/desktopApps'
import { useNavigationStore } from '../stores/navigation'
import { usePageDialogsStore } from '../stores/pageDialogs'
import { useBrowsers } from './useBrowsers'

/**
 * Actions du menu latéral (et des onglets du menu rabattu) : ouvrir une page ou une
 * application, et menus du clic droit correspondants.
 */
export function useNavActions(): {
  openApp: (app: UserApp) => void
  pageMenu: (page: DashboardPage) => MenuItem[]
  appMenu: (app: UserApp) => MenuItem[]
} {
  const { t } = useTranslation()
  const browsers = useBrowsers()
  const navigate = useNavigationStore((state) => state.navigate)
  const setEditing = useNavigationStore((state) => state.setEditing)
  const closeApp = useNavigationStore((state) => state.closeApp)
  const openedApps = useNavigationStore((state) => state.openedApps)
  const { openRename, openDelete } = usePageDialogsStore()
  const openDeleteApp = useAppDialogsStore((state) => state.openDelete)

  /** Onglet de Tessera, ou fenêtre du navigateur choisi pour cette application web. */
  const openApp = useCallback(
    (app: UserApp) => {
      const browser =
        app.kind === 'web' && app.openWith !== OPEN_IN_TESSERA
          ? browsers.find((candidate) => candidate.id === app.openWith)
          : undefined
      if (app.kind === 'web' && browser) {
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

  const appMenu = (app: UserApp): MenuItem[] => [
    {
      label: t('nav.appMenu.open'),
      icon: FolderOpen,
      onSelect: () => navigate({ type: 'app', appId: app.id })
    },
    ...(app.kind === 'web'
      ? browsers.map((browser) => ({
          label: t('nav.appMenu.openIn', { browser: browser.name }),
          icon: ExternalLink,
          onSelect: () => void window.tessera.browsers.open(browser.id, app.url)
        }))
      : []),
    'separator',
    {
      label: t('nav.appMenu.closeTab'),
      icon: X,
      disabled: !openedApps.includes(app.id),
      onSelect: () => closeApp(app.id)
    },
    // Application installée affichée dans Tessera : la remettre sur le bureau
    ...(app.kind === 'desktop' &&
    useDesktopAppsStore.getState().states[app.id]?.status === 'running'
      ? [
          {
            label: t('desktopApps.takeOut'),
            icon: LogOut,
            onSelect: () => void window.tessera.desktopApps.takeOut(app.id)
          }
        ]
      : []),
    {
      label: t('nav.appMenu.settings'),
      icon: Settings,
      onSelect: () => navigate({ type: 'settings', section: 'applications' })
    },
    'separator',
    {
      label: t('nav.appMenu.delete'),
      icon: Trash2,
      danger: true,
      onSelect: () => openDeleteApp(app.id)
    }
  ]

  return { openApp, pageMenu, appMenu }
}

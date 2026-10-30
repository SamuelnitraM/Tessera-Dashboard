import { House, PanelLeftOpen, PanelsTopLeft, Plus, Settings, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DashboardPage } from '@shared/dashboard'
import { useAddPage } from '../hooks/useAddPage'
import { pageTabAttributes, startPageTabDrag, usePageDragStore } from '../hooks/usePageTabDrag'
import { useOwnPages } from '../lib/windows'
import { useNavActions } from '../hooks/useNavActions'
import { usePageName } from '../hooks/usePageName'
import { openContextMenu } from '../stores/contextMenu'
import { useNavigationStore } from '../stores/navigation'
import { usePageDialogsStore } from '../stores/pageDialogs'
import { setSidebarMode } from '../lib/layoutTransition'
import { useSettingsStore } from '../stores/settings'
import { useWebAppsStore } from '../stores/webApps'
import { useWindowPagesStore } from '../stores/windowPages'
import { AppIcon } from './AppIcon'
import { Badge } from './Badge'
import { Logo } from './Logo'
import { NotificationBell } from './notifications/NotificationBell'
import { FullScreenButton } from './FullScreenButton'
import { UpdateButton } from './UpdateButton'
import styles from './TopBar.module.css'

/**
 * Menu latéral rabattu : les pages deviennent des onglets en haut de la fenêtre, suivies des
 * applications (icônes) ; le bouton Paramètres est à droite.
 */
export function TopBar(): React.JSX.Element {
  const { t } = useTranslation()
  // Pages de cette fenêtre (les autres fenêtres de Tessera ont les leurs)
  const pages = useOwnPages()
  const dropTarget = useWindowPagesStore((state) => state.dropTarget)
  const apps = useSettingsStore((state) => state.settings.apps.items)
  const view = useNavigationStore((state) => state.view)
  const navigate = useNavigationStore((state) => state.navigate)
  const badges = useWebAppsStore((state) => state.badges)
  const { openApp, pageMenu, appMenu } = useNavActions()
  const addPage = useAddPage()

  return (
    <nav className={styles.topBar} aria-label={t('nav.pages')}>
      <span className={styles.logo}>
        <Logo size={22} />
      </span>

      <div
        className={styles.tabs}
        role="tablist"
        data-drop-target={dropTarget}
        title={dropTarget ? t('nav.dropPage') : undefined}
      >
        {pages.map((page) => (
          <PageTab
            key={page.id}
            page={page}
            active={view.type === 'page' && view.pageId === page.id}
            onClick={() => navigate({ type: 'page', pageId: page.id })}
            onContextMenu={openContextMenu(() => pageMenu(page))}
          />
        ))}
        <button
          type="button"
          className={styles.iconButton}
          title={t('nav.newPage')}
          aria-label={t('nav.newPage')}
          onClick={addPage}
        >
          <Plus size={16} aria-hidden />
        </button>
      </div>

      {apps.length > 0 && (
        <div className={styles.apps}>
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              className={styles.appButton}
              data-active={view.type === 'app' && view.appId === app.id}
              title={app.name}
              aria-label={app.name}
              onClick={() => openApp(app)}
              onContextMenu={openContextMenu(() => appMenu(app))}
            >
              <AppIcon app={app} />
              <span className={styles.appBadge}>
                <Badge value={badges[app.id]} />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.end}>
        <UpdateButton variant="icon" className={styles.iconButton} />
        <NotificationBell
          variant="icon"
          className={styles.iconButton}
          badgeClassName={styles.appBadge}
        />
        <FullScreenButton variant="icon" className={styles.iconButton} />
        <button
          type="button"
          className={styles.iconButton}
          title={t('nav.expand')}
          aria-label={t('nav.expand')}
          onClick={() => setSidebarMode('expanded')}
        >
          <PanelLeftOpen size={16} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          data-active={view.type === 'settings'}
          title={t('nav.settings')}
          aria-label={t('nav.settings')}
          onClick={() => navigate({ type: 'settings', section: 'general' })}
        >
          <Settings size={17} aria-hidden />
        </button>
      </div>
    </nav>
  )
}

interface PageTabProps {
  page: DashboardPage
  active: boolean
  onClick: () => void
  onContextMenu: (event: React.MouseEvent) => void
}

function PageTab({ page, active, onClick, onContextMenu }: PageTabProps): React.JSX.Element {
  const { t } = useTranslation()
  const name = usePageName(page)
  const openDelete = usePageDialogsStore((state) => state.openDelete)
  const drag = usePageDragStore()
  const Icon = page.isMain ? House : PanelsTopLeft

  return (
    // Glisser l'onglet : le ranger, ou l'ouvrir dans une autre fenêtre
    <div
      className={styles.tab}
      data-active={active}
      onContextMenu={onContextMenu}
      onPointerDown={(event) => startPageTabDrag(event, page.id, 'x')}
      title={t('nav.dragPage')}
      {...pageTabAttributes(drag, page.id)}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active}
        className={styles.tabButton}
        onClick={onClick}
      >
        <Icon size={15} aria-hidden />
        <span className={styles.tabLabel}>{name}</span>
      </button>
      {!page.isMain && (
        <button
          type="button"
          data-no-tab-drag
          className={styles.tabClose}
          title={t('nav.pageMenu.delete')}
          aria-label={`${t('pages.delete')} : ${name}`}
          onClick={() => openDelete(page.id)}
        >
          <X size={13} aria-hidden />
        </button>
      )}
    </div>
  )
}

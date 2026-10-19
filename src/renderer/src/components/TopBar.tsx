import { House, PanelLeftOpen, PanelsTopLeft, Plus, Settings, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DashboardPage } from '@shared/dashboard'
import { useAddPage } from '../hooks/useAddPage'
import { useNavActions } from '../hooks/useNavActions'
import { usePageName } from '../hooks/usePageName'
import { openContextMenu } from '../stores/contextMenu'
import { useDashboardStore } from '../stores/dashboard'
import { useNavigationStore } from '../stores/navigation'
import { usePageDialogsStore } from '../stores/pageDialogs'
import { useSettingsStore } from '../stores/settings'
import { useWebAppsStore } from '../stores/webApps'
import { AppIcon } from './AppIcon'
import { Badge } from './Badge'
import { Logo } from './Logo'
import styles from './TopBar.module.css'

/**
 * Menu latéral rabattu : les pages deviennent des onglets en haut de la fenêtre, suivies des
 * applications (icônes) ; le bouton Paramètres est à droite.
 */
export function TopBar(): React.JSX.Element {
  const { t } = useTranslation()
  const pages = useDashboardStore((state) => state.dashboard.pages)
  const apps = useSettingsStore((state) => state.settings.apps.items)
  const updateSettings = useSettingsStore((state) => state.update)
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

      <div className={styles.tabs} role="tablist">
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
        <button
          type="button"
          className={styles.iconButton}
          title={t('nav.expand')}
          aria-label={t('nav.expand')}
          onClick={() => void updateSettings({ appearance: { sidebar: 'expanded' } })}
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
  const Icon = page.isMain ? House : PanelsTopLeft

  return (
    <div className={styles.tab} data-active={active} onContextMenu={onContextMenu}>
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

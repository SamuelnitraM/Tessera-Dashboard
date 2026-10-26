import { House, PanelLeftClose, PanelsTopLeft, Plus, Settings, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
import { NotificationBell } from './notifications/NotificationBell'
import { FullScreenButton } from './FullScreenButton'
import { UpdateButton } from './UpdateButton'
import styles from './Sidebar.module.css'

/** Menu latéral déplié : pages, applications et paramètres. */
export function Sidebar(): React.JSX.Element {
  const { t } = useTranslation()
  const pages = useDashboardStore((state) => state.dashboard.pages)
  const apps = useSettingsStore((state) => state.settings.apps.items)
  const updateSettings = useSettingsStore((state) => state.update)
  const view = useNavigationStore((state) => state.view)
  const navigate = useNavigationStore((state) => state.navigate)
  const openedApps = useNavigationStore((state) => state.openedApps)
  const badges = useWebAppsStore((state) => state.badges)
  const { openApp, pageMenu, appMenu } = useNavActions()
  const addPage = useAddPage()

  return (
    <nav className={styles.sidebar} aria-label={t('nav.pages')}>
      <div className={styles.brand}>
        <Logo />
        <span className={styles.brandName}>
          Tessera <span className={styles.brandSuffix}>Dashboard</span>
        </span>
        <button
          type="button"
          className={styles.groupAction}
          title={t('nav.collapse')}
          aria-label={t('nav.collapse')}
          onClick={() => void updateSettings({ appearance: { sidebar: 'collapsed' } })}
        >
          <PanelLeftClose size={16} aria-hidden />
        </button>
      </div>

      <div className={styles.group}>
        <div className={styles.groupHeader}>
          <h2 className={styles.groupTitle}>{t('nav.pages')}</h2>
          <button
            type="button"
            className={styles.groupAction}
            title={t('nav.newPage')}
            aria-label={t('nav.newPage')}
            onClick={addPage}
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>
        {pages.map((page) => (
          <PageItem
            key={page.id}
            page={page}
            active={view.type === 'page' && view.pageId === page.id}
            onClick={() => navigate({ type: 'page', pageId: page.id })}
            onContextMenu={openContextMenu(() => pageMenu(page))}
          />
        ))}
      </div>

      <div className={styles.group}>
        <div className={styles.groupHeader}>
          <h2 className={styles.groupTitle}>{t('nav.apps')}</h2>
          <button
            type="button"
            className={styles.groupAction}
            title={t('nav.addApp')}
            aria-label={t('nav.addApp')}
            onClick={() => navigate({ type: 'settings', section: 'applications' })}
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>
        {apps.length === 0 && <p className={styles.hint}>{t('nav.noApps')}</p>}
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            className={styles.item}
            data-active={view.type === 'app' && view.appId === app.id}
            data-open={openedApps.includes(app.id)}
            aria-current={view.type === 'app' && view.appId === app.id ? 'page' : undefined}
            onClick={() => openApp(app)}
            onContextMenu={openContextMenu(() => appMenu(app))}
          >
            <AppIcon app={app} />
            <span className={styles.itemLabel}>{app.name}</span>
            <Badge value={badges[app.id]} />
          </button>
        ))}
      </div>

      <div className={styles.footer}>
        <UpdateButton variant="item" className={styles.item} />
        <NotificationBell variant="item" className={styles.item} />
        <FullScreenButton variant="item" className={styles.item} />
        <NavItem
          icon={Settings}
          label={t('nav.settings')}
          active={view.type === 'settings'}
          onClick={() => navigate({ type: 'settings', section: 'general' })}
        />
      </div>
    </nav>
  )
}

interface PageItemProps {
  page: DashboardPage
  active: boolean
  onClick: () => void
  onContextMenu: (event: React.MouseEvent) => void
}

function PageItem({ page, active, onClick, onContextMenu }: PageItemProps): React.JSX.Element {
  const { t } = useTranslation()
  const name = usePageName(page)
  const openDelete = usePageDialogsStore((state) => state.openDelete)
  const Icon = page.isMain ? House : PanelsTopLeft

  return (
    <div className={styles.pageRow} data-active={active} onContextMenu={onContextMenu}>
      <button
        type="button"
        className={styles.item}
        data-active={active}
        aria-current={active ? 'page' : undefined}
        onClick={onClick}
      >
        <Icon size={18} strokeWidth={1.75} aria-hidden />
        <span className={styles.itemLabel}>{name}</span>
      </button>
      {/* Suppression rapide au survol (jamais pour la page principale) */}
      {!page.isMain && (
        <button
          type="button"
          className={styles.rowAction}
          title={t('nav.pageMenu.delete')}
          aria-label={`${t('pages.delete')} : ${name}`}
          onClick={() => openDelete(page.id)}
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  )
}

interface NavItemProps {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={styles.item}
      data-active={active}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden />
      <span className={styles.itemLabel}>{label}</span>
    </button>
  )
}
